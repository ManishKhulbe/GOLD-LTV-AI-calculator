import json
import math
import random
import warnings
from datetime import date, timedelta
from pathlib import Path
from typing import List, Tuple

import httpx
import numpy as np
from sklearn.linear_model import Ridge, LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline

from backend.models import GoldInsights, GoldPricePoint

# ── Constants ─────────────────────────────────────────────────────────────────

SAR_PER_USD: float = 3.7500
AED_PER_USD: float = 3.6725
TROY_OZ_TO_GRAM: float = 31.1035
FALLBACK_USD_OZ: float = 3300.0

KARAT_PURITY = {
    "24K": 1.0000,
    "22K": 0.9167,
    "21K": 0.8750,
    "18K": 0.7500,
    "14K": 0.5833,
}

GOLD_API_URL = "https://api.gold-api.com/price/XAU"
HISTORY_FILE = Path(__file__).parent.parent / "data" / "gold_history.json"


# ── Live price ────────────────────────────────────────────────────────────────

async def fetch_live_usd_oz() -> Tuple[float, str]:
    """Return (usd_per_oz, source) — falls back to constant if API is down."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(GOLD_API_URL)
            resp.raise_for_status()
            data = resp.json()
            price = float(data.get("price") or data.get("Price") or data.get("ask") or 0)
            if price > 0:
                return price, "live"
    except Exception:
        pass
    return FALLBACK_USD_OZ, "fallback"


def usd_oz_to_sar_gram(usd_oz: float) -> float:
    return usd_oz / TROY_OZ_TO_GRAM * SAR_PER_USD


def live_karat_rates(usd_oz: float) -> dict:
    sar_24k = usd_oz_to_sar_gram(usd_oz)
    return {k: round(sar_24k * p, 4) for k, p in KARAT_PURITY.items()}


# ── Gold history ──────────────────────────────────────────────────────────────

def _load_history() -> List[dict]:
    if not HISTORY_FILE.exists():
        raise FileNotFoundError(f"Gold history file not found: {HISTORY_FILE}")
    with open(HISTORY_FILE) as f:
        records = json.load(f)
    records.sort(key=lambda r: r["day"])
    return records


def _history_to_usd_oz(records: List[dict]) -> Tuple[np.ndarray, np.ndarray]:
    """Return (days_index, usd_oz_prices) as numpy arrays, normalised x in [0,1]."""
    prices_aed = np.array([r["max_price"] for r in records], dtype=float)
    prices_usd = prices_aed / AED_PER_USD
    n = len(prices_usd)
    x_norm = np.linspace(0.0, 1.0, n)
    return x_norm, prices_usd


# ── ML pipeline ──────────────────────────────────────────────────────────────

def _fit_models(x_norm: np.ndarray, prices_usd: np.ndarray):
    """Fit Model A (degree-3 Ridge, all data) and Model B (linear, last 365 days)."""
    # Model A: polynomial degree-3 Ridge on all data
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model_a = make_pipeline(
            PolynomialFeatures(degree=3, include_bias=False),
            Ridge(alpha=10.0),
        )
        model_a.fit(x_norm.reshape(-1, 1), prices_usd)

    # Model B: linear regression on last 365 days
    last_365 = min(365, len(prices_usd))
    x_b = x_norm[-last_365:]
    y_b = prices_usd[-last_365:]
    model_b = LinearRegression()
    model_b.fit(x_b.reshape(-1, 1), y_b)

    return model_a, model_b


def _blend_predict(model_a, model_b, x_vals: np.ndarray) -> np.ndarray:
    pred_a = model_a.predict(x_vals.reshape(-1, 1))
    pred_b = model_b.predict(x_vals.reshape(-1, 1))
    return 0.65 * pred_a + 0.35 * pred_b


# ── Forecast pipeline ─────────────────────────────────────────────────────────

def generate_gold_insights(tenure_months: int, live_usd_oz: float) -> GoldInsights:
    records = _load_history()
    x_norm, prices_usd = _history_to_usd_oz(records)

    model_a, model_b = _fit_models(x_norm, prices_usd)

    n_total = len(records)
    # Predict N future months starting just after the last historical point
    # Each month ≈ 30.44 days; express future points in normalised x space
    days_span = (n_total - 1)  # total days covered [0..1]
    day_step_norm = 1.0 / days_span if days_span > 0 else 1e-5
    month_step_norm = day_step_norm * 30.44

    last_x = x_norm[-1]

    # Predict blended raw value at day-0 of forecast to compute anchor shift
    raw_at_0 = _blend_predict(model_a, model_b, np.array([last_x]))[0]
    anchor_shift = live_usd_oz - raw_at_0

    rng = random.Random(42)
    predicted_usd: List[float] = []
    predicted_labels: List[str] = []

    for m in range(1, tenure_months + 1):
        x_future = last_x + m * month_step_norm
        raw = _blend_predict(model_a, model_b, np.array([x_future]))[0]
        anchored = raw + anchor_shift
        noise_std = anchored * 0.006 * math.sqrt(m)
        noisy = anchored + rng.gauss(0, noise_std)
        predicted_usd.append(max(noisy, 100.0))
        today = date.today()
        label_date = date(today.year + (today.month + m - 1) // 12,
                          (today.month + m - 1) % 12 + 1, 1)
        predicted_labels.append(label_date.strftime("%b %Y"))

    # Trend
    end_usd = predicted_usd[-1] if predicted_usd else live_usd_oz
    pct_change = (end_usd - live_usd_oz) / live_usd_oz * 100.0

    if pct_change > 2.0:
        trend = "RISING"
    elif pct_change < -2.0:
        trend = "FALLING"
    else:
        trend = "STABLE"

    # Historical: last 3 complete calendar months, averaged
    historical_prices = _last_3_months_avg(records)

    # Build predicted price points in SAR/gram
    predicted_points = [
        GoldPricePoint(
            label=predicted_labels[i],
            price_sar_per_gram=round(usd_oz_to_sar_gram(predicted_usd[i]), 4),
        )
        for i in range(len(predicted_usd))
    ]

    end_sar_gram = usd_oz_to_sar_gram(end_usd)

    return GoldInsights(
        live_price_sar_per_gram=round(usd_oz_to_sar_gram(live_usd_oz), 4),
        historical_prices=historical_prices,
        predicted_prices=predicted_points,
        predicted_change_pct=round(pct_change, 4),
        trend=trend,
        predicted_end_price_sar_per_gram=round(end_sar_gram, 4),
    )


def _last_3_months_avg(records: List[dict]) -> List[GoldPricePoint]:
    """Return the last 3 complete calendar months as SAR/gram averages."""
    from collections import defaultdict

    monthly: dict = defaultdict(list)
    for r in records:
        ym = r["day"][:7]  # "YYYY-MM"
        monthly[ym].append(r["max_price"])

    sorted_months = sorted(monthly.keys())
    last_3 = sorted_months[-4:-1] if len(sorted_months) >= 4 else sorted_months[-3:]

    result = []
    for ym in last_3:
        avg_aed_oz = sum(monthly[ym]) / len(monthly[ym])
        avg_usd_oz = avg_aed_oz / AED_PER_USD
        sar_gram = usd_oz_to_sar_gram(avg_usd_oz)
        label = date(int(ym[:4]), int(ym[5:7]), 1).strftime("%b %Y")
        result.append(GoldPricePoint(label=label, price_sar_per_gram=round(sar_gram, 4)))

    return result
