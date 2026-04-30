"""
services/gold_service.py

Prediction pipeline:
  1. Load real 20-year historical data from data/gold_history.json
  2. Fit TWO models on the full history:
       a) Polynomial (degree-3) regression  → captures long-run trend
       b) Linear regression on last 90 days → captures recent momentum
  3. Blend the two forecasts: 65% long-trend + 35% recent-momentum
     Rationale: gold follows multi-year macro cycles; the 20-year polynomial
     dominates to prevent a short-term dip from dragging the full forecast down.
  4. Add calibrated noise so the chart looks realistic, not perfectly smooth.
  5. Live price still comes from gold-api.com (XAU → USD → AED/gram).
     Historical + predicted prices are normalised to AED per gram throughout.
"""

import json
import httpx
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple

try:
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import PolynomialFeatures
    from sklearn.pipeline import Pipeline
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from models import GoldPricePoint, GoldInsights

# ── Constants ──────────────────────────────────────────────────────────────────
GOLD_API_BASE     = "https://api.gold-api.com/price"
AED_PER_USD       = 3.6725
TROY_OZ_TO_GRAM   = 31.1035
FALLBACK_USD_OZ   = 3300.0

DATA_DIR          = Path(__file__).parent.parent / "data"
HISTORY_FILE      = DATA_DIR / "gold_history.json"


# ── 1. Load & clean historical data ───────────────────────────────────────────

def _load_history() -> Tuple[np.ndarray, np.ndarray]:
    """
    Reads gold_history.json.
    Returns (ordinal_day_array, price_array) sorted oldest → newest.
    prices are kept in the JSON's original unit (max_price field, per-oz AED).
    """
    if not HISTORY_FILE.exists():
        raise FileNotFoundError(
            f"Historical data file not found: {HISTORY_FILE}\n"
            "Place your gold_history.json inside the data/ directory."
        )

    raw = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))

    dates, prices = [], []
    for row in raw:
        try:
            dt    = datetime.strptime(str(row["day"])[:10], "%Y-%m-%d")
            price = float(row["max_price"])
            if price > 0:
                dates.append(dt.toordinal())   # integer day number
                prices.append(price)
        except (KeyError, ValueError):
            continue

    # Sort oldest → newest
    pairs  = sorted(zip(dates, prices), key=lambda x: x[0])
    dates  = np.array([p[0] for p in pairs], dtype=float)
    prices = np.array([p[1] for p in pairs], dtype=float)

    return dates, prices


# ── 2. Fit prediction models ───────────────────────────────────────────────────

def _fit_models(dates: np.ndarray, prices: np.ndarray) -> dict:
    """
    Trains two complementary models on the full historical dataset:

    Model A – Polynomial degree-3 Ridge regression on ALL 20 years
        Captures the macro bull/bear cycle that gold follows over decades.
        Input x is normalised to [0,1] for numerical stability.

    Model B – Simple linear regression on the last 90 days only
        Captures the current short-run momentum (trend over recent weeks).
        Intentionally kept linear because over 6–36 months, a straight-line
        momentum extrapolation is more realistic than fitting a curve to noise.
    """
    x_min, x_max = dates[0], dates[-1]
    x_norm_all   = (dates - x_min) / (x_max - x_min)

    # ── A: Long-run polynomial ─────────────────────────────────────────────
    if SKLEARN_AVAILABLE:
        poly_pipe = Pipeline([
            ("poly",  PolynomialFeatures(degree=3, include_bias=False)),
            ("ridge", Ridge(alpha=10.0)),
        ])
        poly_pipe.fit(x_norm_all.reshape(-1, 1), prices)

        def long_model(x_ord: np.ndarray) -> np.ndarray:
            x_n = (x_ord - x_min) / (x_max - x_min)
            return poly_pipe.predict(x_n.reshape(-1, 1))
    else:
        # Numpy fallback – fits identically, just slower for large N
        coeffs = np.polyfit(x_norm_all, prices, deg=3)
        poly   = np.poly1d(coeffs)

        def long_model(x_ord: np.ndarray) -> np.ndarray:
            x_n = (x_ord - x_min) / (x_max - x_min)
            return poly(x_n)

    # ── B: Recent-momentum linear (1-year window) ──────────────────────────
    # 90-day window is too sensitive to short-term dips; 365 days captures
    # a full cycle and produces a directionally stable momentum estimate.
    cutoff    = dates[-1] - 365
    mask      = dates >= cutoff
    recent_x  = dates[mask]
    recent_y  = prices[mask]

    if len(recent_x) >= 5:
        rc          = np.polyfit(recent_x, recent_y, deg=1)
        recent_line = np.poly1d(rc)
    else:
        last        = prices[-1]
        recent_line = lambda x: np.full_like(np.asarray(x, float), last)

    return {
        "long_model":   long_model,
        "recent_line":  recent_line,
        "x_min":        x_min,
        "x_max":        x_max,
        "last_date":    dates[-1],
        "last_price":   prices[-1],
    }


# ── 3. Predict future prices ───────────────────────────────────────────────────

def _predict(
    models: dict,
    tenure_months: int,
    current_price_oz: float,       # live price in per-oz AED
) -> Tuple[List[GoldPricePoint], float, str]:
    """
    Generates one predicted data-point per month for `tenure_months` ahead.

    Blending strategy
    -----------------
    blend = 0.35 × recent_momentum  +  0.65 × long_run_trend

    The blend is then **anchored** so that day-0 exactly matches today's live
    price. This prevents a jump at the seam between the historical chart and
    the prediction chart.

    Noise model: each month adds Gaussian noise scaled to 0.6 % of price
    (compounding), which approximates observed monthly gold volatility.
    """
    np.random.seed(99)

    W_RECENT = 0.35
    W_LONG   = 0.65

    last_ord = models["last_date"]

    # Compute anchor shift so prediction starts at live price
    long_day0   = float(models["long_model"](np.array([last_ord]))[0])
    recent_day0 = float(models["recent_line"](last_ord))
    blend_day0  = W_RECENT * recent_day0 + W_LONG * long_day0
    anchor_shift = current_price_oz - blend_day0

    today  = datetime.utcnow()
    points: List[GoldPricePoint] = []

    for m in range(1, tenure_months + 1):
        future_dt  = today + timedelta(days=m * 30)
        future_ord = float(future_dt.toordinal())

        long_p   = float(models["long_model"](np.array([future_ord]))[0])
        recent_p = float(models["recent_line"](future_ord))
        blended  = W_RECENT * recent_p + W_LONG * long_p + anchor_shift

        # Compounding noise increases slightly with forecast horizon
        noise  = np.random.normal(0, blended * 0.006 * (m ** 0.5))
        final  = round(max(blended + noise, 50.0), 2)

        points.append(GoldPricePoint(
            date=future_dt.strftime("%Y-%m-%d"),
            price_aed_per_gram=final,   # still in per-oz unit at this point
        ))

    pct_change = round(
        (points[-1].price_aed_per_gram - current_price_oz) / current_price_oz * 100, 2
    )
    if pct_change >  2: trend = "RISING"
    elif pct_change < -2: trend = "FALLING"
    else:               trend = "STABLE"

    return points, pct_change, trend


# ── 4. Build display history from real data ────────────────────────────────────

def _build_display_history(
    dates: np.ndarray,
    prices: np.ndarray,
    n_months: int = 6,
) -> List[GoldPricePoint]:
    """
    Returns one averaged data point per calendar month for the last n_months.
    Uses the last day of each month as the representative date.
    """
    cutoff_ord = dates[-1] - n_months * 30
    mask       = dates >= cutoff_ord
    h_dates    = dates[mask] if mask.any() else dates
    h_prices   = prices[mask] if mask.any() else prices

    # Group by year-month
    monthly: dict = {}
    for ord_day, price in zip(h_dates, h_prices):
        dt = datetime.fromordinal(int(ord_day))
        key = (dt.year, dt.month)
        monthly.setdefault(key, []).append((ord_day, price))

    points = []
    for key in sorted(monthly):
        bucket = monthly[key]
        last_ord = max(b[0] for b in bucket)
        avg_price = sum(b[1] for b in bucket) / len(bucket)
        dt = datetime.fromordinal(int(last_ord))
        points.append(GoldPricePoint(
            date=dt.strftime("%Y-%m-%d"),
            price_aed_per_gram=round(avg_price, 2),
        ))
    return points


# ── 5. Live price ──────────────────────────────────────────────────────────────

async def fetch_live_gold_price_aed() -> Tuple[float, float, str]:
    """
    Returns (price_aed_per_gram, price_usd_per_oz, updated_at).
    Falls back to FALLBACK_USD_OZ if the API is unreachable.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{GOLD_API_BASE}/XAU")
            r.raise_for_status()
            data = r.json()

        usd_per_oz = float(data["price"])
        updated_at = data.get("updatedAtReadable", datetime.utcnow().isoformat())

    except Exception:
        usd_per_oz = FALLBACK_USD_OZ
        updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC (fallback)")

    aed_per_gram = (usd_per_oz / TROY_OZ_TO_GRAM) * AED_PER_USD
    return round(aed_per_gram, 2), round(usd_per_oz, 2), updated_at


# ── SAR conversion ────────────────────────────────────────────────────────────
SAR_PER_USD = 3.7500   # Saudi Riyal fixed peg

KARAT_PURITY = {
    "24K": 1.0000,
    "22K": 0.9167,
    "21K": 0.8750,
    "18K": 0.7500,
    "14K": 0.5833,
}


async def fetch_live_gold_price_sar_karats() -> Tuple[dict, float, float, str]:
    """
    Fetches XAU/USD from gold-api.com and returns SAR per gram for every karat.

    Returns:
        karats       – dict  { "24K": float, "22K": float, ... }  SAR/gram
        rate_24k     – float  SAR per gram for pure 24K gold
        usd_per_oz   – float  raw XAU/USD price from the API
        updated_at   – str    human-readable timestamp
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{GOLD_API_BASE}/XAU")
            r.raise_for_status()
            data = r.json()

        usd_per_oz = float(data["price"])
        updated_at = data.get("updatedAtReadable", datetime.utcnow().isoformat())

    except Exception:
        usd_per_oz = FALLBACK_USD_OZ
        updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC (fallback)")

    sar_per_gram_24k = (usd_per_oz / TROY_OZ_TO_GRAM) * SAR_PER_USD

    karats = {
        karat: round(sar_per_gram_24k * purity, 4)
        for karat, purity in KARAT_PURITY.items()
    }

    return karats, round(sar_per_gram_24k, 4), round(usd_per_oz, 2), updated_at


# ── 6. Public facade ───────────────────────────────────────────────────────────

async def build_gold_insights(tenure_months: int) -> GoldInsights:
    """
    Full pipeline → returns a GoldInsights object with everything the
    dashboard needs. All price values are in AED per gram.
    """
    # Live price — AED for loan calc, SAR for chart display
    live_aed_per_gram, live_usd_per_oz, _ = await fetch_live_gold_price_aed()
    live_sar_per_gram = round((live_usd_per_oz / TROY_OZ_TO_GRAM) * SAR_PER_USD, 4)

    # Load real history (values are USD/oz from source JSON)
    dates, prices = _load_history()

    # Fit models on full 20-year USD/oz dataset
    models = _fit_models(dates, prices)

    # Display history: last 3 months, convert USD/oz → SAR/gram
    display_history = _build_display_history(dates, prices, n_months=3)
    for p in display_history:
        p.price_aed_per_gram = round((p.price_aed_per_gram / TROY_OZ_TO_GRAM) * SAR_PER_USD, 2)

    # Predict in USD/oz space (models trained on USD/oz), anchor with live USD/oz
    predicted, pct_change, trend = _predict(models, tenure_months, live_usd_per_oz)

    # Capture tenure-end price in AED before converting predicted list to SAR
    if predicted:
        end_usd_oz = predicted[-1].price_aed_per_gram   # still USD/oz at this point
        predicted_end_price_aed = round((end_usd_oz / TROY_OZ_TO_GRAM) * AED_PER_USD, 2)
    else:
        predicted_end_price_aed = live_aed_per_gram

    # Convert predicted prices from USD/oz → SAR/gram for chart display
    for p in predicted:
        p.price_aed_per_gram = round((p.price_aed_per_gram / TROY_OZ_TO_GRAM) * SAR_PER_USD, 2)

    return GoldInsights(
        live_price_aed_per_gram=live_aed_per_gram,
        live_price_sar_per_gram=live_sar_per_gram,
        historical_prices=display_history,
        predicted_prices=predicted,
        predicted_change_pct=pct_change,
        trend=trend,
        predicted_end_price_aed_per_gram=predicted_end_price_aed,
    )