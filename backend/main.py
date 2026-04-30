import os
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class ValuationPayload(BaseModel):
    carat: str
    emiratesId: str
    goldWeight: str
    purity: str
    loanTenure: str
    jobProfession: str


def normalize_emirates_id(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


async def fetch_uaepass_user_info(emirates_id: str):
    user_info_url = os.getenv("UAEPASS_USERINFO_URL", "https://stg-id.uaepass.ae/idshub/userinfo")
    print(user_info_url)
    access_token = os.getenv("UAEPASS_ACCESS_TOKEN", "")

    if not access_token:
        return {
            "provider": "uae-pass",
            "source": "fallback",
            "message": "UAEPASS_ACCESS_TOKEN not configured. Returning dummy profile.",
            "profile": {
                "fullnameEN": "Ahmed Al-Mansoori",
                "nationalityEN": "UAE",
                "gender": "Male",
                "mobile": "+971501234567",
                "idn": emirates_id or "784198512345671",
            },
        }

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(
                user_info_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=f"UAE PASS request failed: {error}") from error

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="UAE PASS user info unavailable.")

    profile = response.json()
    requested_id = normalize_emirates_id(emirates_id)
    uaepass_id = normalize_emirates_id(profile.get("idn", ""))
    if requested_id and uaepass_id and requested_id != uaepass_id:
        raise HTTPException(
            status_code=400,
            detail="Emirates ID mismatch between valuation request and UAE PASS profile.",
        )

    return {
        "provider": "uae-pass",
        "source": "live",
        "message": "Fetched from UAE PASS user info API.",
        "profile": profile,
    }


app = FastAPI(title="Gold Loan Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/gold-rate/live")
async def get_live_gold_rate():
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            gold_response = await client.get("https://api.gold-api.com/price/XAU")
            fx_response = await client.get("https://open.er-api.com/v6/latest/USD")
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=f"Upstream request failed: {error}") from error

    if gold_response.status_code != 200:
        raise HTTPException(status_code=502, detail="Gold price service unavailable.")
    if fx_response.status_code != 200:
        raise HTTPException(status_code=502, detail="FX service unavailable.")

    gold_data = gold_response.json()
    fx_data = fx_response.json()

    xau_per_ounce_usd = float(gold_data["price"])
    usd_to_sar = float(fx_data["rates"]["SAR"])
    ounce_to_gram = 31.1034768

    usd_per_gram_24k = xau_per_ounce_usd / ounce_to_gram
    price_24k_sar_per_gram = usd_per_gram_24k * usd_to_sar
    karats = {
        "24K": round(price_24k_sar_per_gram, 2),
        "22K": round(price_24k_sar_per_gram * (22 / 24), 2),
        "21K": round(price_24k_sar_per_gram * (21 / 24), 2),
        "20K": round(price_24k_sar_per_gram * (20 / 24), 2),
        "18K": round(price_24k_sar_per_gram * (18 / 24), 2),
        "16K": round(price_24k_sar_per_gram * (16 / 24), 2),
        "14K": round(price_24k_sar_per_gram * (14 / 24), 2),
        "10K": round(price_24k_sar_per_gram * (10 / 24), 2),
    }

    return {
        "country": "Saudi Arabia",
        "currency": "SAR",
        "unit": "g",
        "conversion": "XAU/USD per oz -> USD per gram -> SAR per gram",
        "usdPerGram24k": round(usd_per_gram_24k, 2),
        "sarPerUsd": round(usd_to_sar, 4),
        "karats": karats,
        "rate24k": karats["24K"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "gold": "https://api.gold-api.com/price/XAU",
            "fx": "https://open.er-api.com/v6/latest/USD",
        },
    }


@app.post("/api/gold-loan/valuation")
async def create_valuation(payload: ValuationPayload):
    print(payload)
    uaepass_data = await fetch_uaepass_user_info(payload.emiratesId)
    print(uaepass_data)
    return {
        "message": "Valuation request accepted.",
        "request": payload.model_dump(),
        "userProfile": uaepass_data["profile"],
        "identitySource": uaepass_data["source"],
        "identityProvider": uaepass_data["provider"],
        "identityMessage": uaepass_data["message"],
        "submittedAt": datetime.now(timezone.utc).isoformat(),
    }
