"""
services/gold_service.py

Handles:
  - Live gold price fetch from gold-api.com  (XAU → USD → AED)
  - Synthetic 6-month historical price series
  - Polynomial-regression price prediction for the requested tenure
"""

import httpx
import numpy as np
from datetime import datetime, timedelta
from typing import List, Tuple

from models import GoldPricePoint, GoldInsights

# ── Constants ──────────────────────────────────────────────────────────────────
GOLD_API_BASE   = "https://api.gold-api.com/price"
AED_PER_USD     = 3.6725          # AED peg (fixed)
SAR_FALLBACK_PER_USD = 3.75
TROY_OZ_TO_GRAM = 31.1035         # 1 troy oz = 31.1035 g

FALLBACK_PRICE_USD_OZ = 2350.0    # used only if API is unreachable


# ── Live price ─────────────────────────────────────────────────────────────────

async def fetch_live_gold_price_aed() -> Tuple[float, float, str]:
    """
    Returns (price_aed_per_gram, price_usd_per_oz, updated_at_str).
    Falls back to FALLBACK_PRICE_USD_OZ if the API call fails.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{GOLD_API_BASE}/XAU")
            r.raise_for_status()
            data = r.json()

        usd_per_oz   = float(data["price"])
        updated_at   = data.get("updatedAtReadable", datetime.utcnow().isoformat())

    except Exception:
        usd_per_oz = FALLBACK_PRICE_USD_OZ
        updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC (fallback)")

    aed_per_gram = (usd_per_oz / TROY_OZ_TO_GRAM) * AED_PER_USD
    return round(aed_per_gram, 2), round(usd_per_oz, 2), updated_at


async def fetch_live_gold_price_sar_karats() -> Tuple[dict, float, float, str]:
    """
    Returns (karat_prices_sar, sar_per_gram_24k, usd_per_oz, updated_at_str).
    Fetches live XAU/USD and converts USD -> SAR using a live FX feed.
    """
    sar_per_usd = SAR_FALLBACK_PER_USD
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            gold_response = await client.get(f"{GOLD_API_BASE}/XAU")
            fx_response = await client.get("https://open.er-api.com/v6/latest/USD")
            gold_response.raise_for_status()
            fx_response.raise_for_status()

            gold_data = gold_response.json()
            fx_data = fx_response.json()

            usd_per_oz = float(gold_data["price"])
            updated_at = gold_data.get("updatedAtReadable", datetime.utcnow().isoformat())
            sar_per_usd = float(fx_data["rates"]["SAR"])

    except Exception:
        usd_per_oz = FALLBACK_PRICE_USD_OZ
        updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC (fallback)")

    usd_per_gram_24k = usd_per_oz / TROY_OZ_TO_GRAM
    sar_per_gram_24k = usd_per_gram_24k * sar_per_usd
    karats = {
        "24K": round(sar_per_gram_24k, 2),
        "22K": round(sar_per_gram_24k * (22 / 24), 2),
        "21K": round(sar_per_gram_24k * (21 / 24), 2),
        "20K": round(sar_per_gram_24k * (20 / 24), 2),
        "18K": round(sar_per_gram_24k * (18 / 24), 2),
        "16K": round(sar_per_gram_24k * (16 / 24), 2),
        "14K": round(sar_per_gram_24k * (14 / 24), 2),
        "10K": round(sar_per_gram_24k * (10 / 24), 2),
    }
    return karats, round(sar_per_gram_24k, 2), round(usd_per_oz, 2), updated_at


# ── Historical synthetic series ────────────────────────────────────────────────

def _generate_historical_prices(
    current_price: float,
    months: int = 6,
) -> List[GoldPricePoint]:
    """
    Build a realistic-looking historical price series going back `months` months.
    We reverse-engineer a plausible path that ends at `current_price`.

    Uses a random-walk with slight upward drift (gold long-run trend).
    """
    np.random.seed(42)                     # reproducible historical series

    # Daily prices, then sample end-of-month
    days  = months * 30
    daily = np.zeros(days + 1)
    daily[0] = current_price * (1 - 0.08)   # start ~8% below current

    mu    = 0.0003   # daily drift
    sigma = 0.006    # daily volatility

    for d in range(1, days + 1):
        shock    = np.random.normal(mu, sigma)
        daily[d] = daily[d - 1] * (1 + shock)

    # Scale so the final value equals current_price
    scale  = current_price / daily[-1]
    daily  = daily * scale

    # Sample one point per month
    points = []
    today  = datetime.utcnow().replace(day=1)
    for m in range(months, 0, -1):
        dt    = today - timedelta(days=m * 30)
        idx   = max(0, (months - m) * 30)
        price = round(float(daily[idx]), 2)
        points.append(GoldPricePoint(
            date=dt.strftime("%Y-%m-%d"),
            price_aed_per_gram=price,
        ))

    # Append today's live price
    points.append(GoldPricePoint(
        date=datetime.utcnow().strftime("%Y-%m-%d"),
        price_aed_per_gram=round(current_price, 2),
    ))
    return points


# ── Future prediction ──────────────────────────────────────────────────────────

def _predict_future_prices(
    historical: List[GoldPricePoint],
    tenure_months: int,
) -> Tuple[List[GoldPricePoint], float, str]:
    """
    Fit a degree-2 polynomial on historical data and extrapolate for `tenure_months`.
    Returns (predicted_points, pct_change_over_tenure, trend_label).
    """
    prices = np.array([p.price_aed_per_gram for p in historical])
    x_hist = np.arange(len(prices))

    # Fit polynomial
    coeffs   = np.polyfit(x_hist, prices, deg=2)
    poly     = np.poly1d(coeffs)

    # Add slight randomness to predictions
    np.random.seed(7)
    future_points = []
    today = datetime.utcnow()

    x_start = len(prices)
    for m in range(1, tenure_months + 1):
        x_val      = x_start + m
        base_pred  = float(poly(x_val))
        # Add small noise so chart isn't perfectly smooth
        noise      = np.random.normal(0, base_pred * 0.005)
        pred_price = round(max(base_pred + noise, 100.0), 2)

        future_dt  = today + timedelta(days=m * 30)
        future_points.append(GoldPricePoint(
            date=future_dt.strftime("%Y-%m-%d"),
            price_aed_per_gram=pred_price,
        ))

    current_price = prices[-1]
    end_price     = future_points[-1].price_aed_per_gram
    pct_change    = round((end_price - current_price) / current_price * 100, 2)

    if pct_change > 1.5:
        trend = "RISING"
    elif pct_change < -1.5:
        trend = "FALLING"
    else:
        trend = "STABLE"

    return future_points, pct_change, trend


# ── Public facade ──────────────────────────────────────────────────────────────

async def build_gold_insights(tenure_months: int) -> GoldInsights:
    live_aed, live_usd, updated_at = await fetch_live_gold_price_aed()
    historical  = _generate_historical_prices(live_aed, months=6)
    predicted, pct_change, trend = _predict_future_prices(historical, tenure_months)

    return GoldInsights(
        live_price_aed_per_gram=live_aed,
        historical_prices=historical,
        predicted_prices=predicted,
        predicted_change_pct=pct_change,
        trend=trend,
    )
