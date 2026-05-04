import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.models import (
    LoanCalculationRequest,
    LoanCalculationResponse,
    LiveGoldPriceResponse,
    CustomerProfile,
    LoanHistoryOverview,
    GoldInsights,
)
from backend.services.gold_service import (
    fetch_live_usd_oz,
    live_karat_rates,
    generate_gold_insights,
    usd_oz_to_sar_gram,
    KARAT_PURITY,
)
from backend.services.loan_calculator import (
    compute_ltv,
    compute_gold_valuation_sar,
    compute_eligible_loan_sar,
    compute_future_eligible_sar,
    make_system_decision,
    cibil_label,
)
from backend.services.risk_analyzer import compute_risk_insights
from backend.services.customer_service import (
    get_customer,
    get_customer_profile,
    get_loan_history,
)
from backend.services.uaepass_service import enrich_from_uaepass

# ── App setup ──────────────────────────────────────────────────────────────────

app = FastAPI(title="Gold LTV AI Calculator", version="1.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SAR/AED conversion ratio (stored amounts are AED-denominated in dummy data)
SAR_PER_AED = 3.7500 / 3.6725


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Gold rates ─────────────────────────────────────────────────────────────────

@app.get("/api/gold-rate/live")
async def gold_rate_live():
    usd_oz, source = await fetch_live_usd_oz()
    rates = live_karat_rates(usd_oz)
    return {"karats": rates, "source": source}


@app.get("/gold/price", response_model=LiveGoldPriceResponse)
async def gold_price():
    usd_oz, source = await fetch_live_usd_oz()
    return LiveGoldPriceResponse(
        usd_per_oz=usd_oz,
        sar_per_gram_24k=round(usd_oz_to_sar_gram(usd_oz), 4),
        source=source,
    )


@app.get("/gold/insights", response_model=GoldInsights)
async def gold_insights(tenure_months: int = 12):
    usd_oz, _ = await fetch_live_usd_oz()
    return generate_gold_insights(tenure_months, usd_oz)


# ── Customer ───────────────────────────────────────────────────────────────────

@app.get("/customer/{emirates_id}", response_model=CustomerProfile)
async def customer_profile(emirates_id: str):
    try:
        profile = get_customer_profile(emirates_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    uaepass = await enrich_from_uaepass(emirates_id)
    if uaepass:
        if uaepass.get("name"):
            profile = profile.model_copy(update={"name": uaepass["name"]})
        if uaepass.get("nationality"):
            profile = profile.model_copy(update={"nationality": uaepass["nationality"]})

    return profile


@app.get("/customer/{emirates_id}/loans", response_model=LoanHistoryOverview)
async def customer_loans(emirates_id: str):
    try:
        get_customer(emirates_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return get_loan_history(emirates_id, sar_per_aed_ratio=SAR_PER_AED)


# ── Loan calculation ───────────────────────────────────────────────────────────

@app.post("/loan/calculate", response_model=LoanCalculationResponse)
async def loan_calculate(req: LoanCalculationRequest):
    # 1. Customer lookup
    try:
        raw_customer = get_customer(req.emirates_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # 2. Customer profile (optionally enriched from UAE PASS)
    profile = get_customer_profile(req.emirates_id)
    uaepass = await enrich_from_uaepass(req.emirates_id)
    if uaepass:
        updates = {}
        if uaepass.get("name"):
            updates["name"] = uaepass["name"]
        if uaepass.get("nationality"):
            updates["nationality"] = uaepass["nationality"]
        if updates:
            profile = profile.model_copy(update=updates)

    # 3. Loan history
    loan_history = get_loan_history(req.emirates_id, sar_per_aed_ratio=SAR_PER_AED)

    # 4. Live gold price
    usd_oz, _ = await fetch_live_usd_oz()
    sar_per_gram_24k = usd_oz_to_sar_gram(usd_oz)
    live_rates = live_karat_rates(usd_oz)
    purity = KARAT_PURITY[req.carat.value]
    live_sar_per_gram = sar_per_gram_24k * purity

    # 5. ML gold forecast
    gold_insights = generate_gold_insights(req.tenure_months.value, usd_oz)
    trend = gold_insights.trend
    pct_change = gold_insights.predicted_change_pct
    end_price_sar = gold_insights.predicted_end_price_sar_per_gram

    # 6. LTV calculation
    cibil_score = raw_customer.get("cibil_score", 580)
    missed_emis = raw_customer.get("missed_emis", 0)
    active_loans_count = raw_customer.get("active_loans", 0)
    profession = req.job_profession.value

    final_ltv, ltv_breakdown = compute_ltv(
        carat=req.carat.value,
        cibil_score=cibil_score,
        missed_emis=missed_emis,
        active_loans=active_loans_count,
        profession=profession,
        predicted_change_pct=pct_change,
    )

    # 7. Valuations and eligible loans (all in SAR)
    gold_val_sar = compute_gold_valuation_sar(
        req.gold_weight_grams, req.carat.value, live_sar_per_gram
    )
    eligible_sar = compute_eligible_loan_sar(gold_val_sar, final_ltv)
    future_val_sar, future_eligible_sar = compute_future_eligible_sar(
        req.gold_weight_grams, req.carat.value, end_price_sar * purity, final_ltv
    )

    # 8. Risk scoring
    outstanding_sar = loan_history.outstanding_balance_sar
    risk = compute_risk_insights(
        cibil_score=cibil_score,
        missed_emis=missed_emis,
        active_loans=active_loans_count,
        profession=profession,
        outstanding_balance_sar=outstanding_sar,
        eligible_loan_sar=eligible_sar,
        final_ltv=final_ltv,
        trend=trend,
        predicted_change_pct=pct_change,
        tenure_months=req.tenure_months.value,
    )

    # 9. System decision
    decision = make_system_decision(cibil_score, missed_emis, active_loans_count, trend)

    return LoanCalculationResponse(
        system_decision=decision,
        recommended_ltv_pct=round(final_ltv * 100, 2),
        gold_valuation_sar=gold_val_sar,
        eligible_loan_amount_sar=eligible_sar,
        future_gold_valuation_sar=future_val_sar,
        future_eligible_loan_amount_sar=future_eligible_sar,
        suggested_tenure_months=req.tenure_months.value,
        cibil_score=cibil_score,
        cibil_label=cibil_label(cibil_score),
        ltv_breakdown=ltv_breakdown,
        customer_profile=profile,
        loan_history=loan_history,
        gold_insights=gold_insights,
        risk_insights=risk,
        live_gold_rates=live_rates,
    )
