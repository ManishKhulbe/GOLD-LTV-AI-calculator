"""
services/loan_calculator.py

Calculates:
  • Gold valuation (AED)
  • LTV with individual adjustment factors
  • Eligible loan amount
  • System decision and remarks
"""

from models import (
    CaratType, GoldType, JobProfession, CustomerProfile,
    LoanHistoryOverview, GoldInsights, LTVBreakdown,
)

# ── Purity map (gold fraction) ─────────────────────────────────────────────────
CARAT_PURITY: dict[str, float] = {
    "24K": 1.0000,
    "22K": 0.9167,
    "21K": 0.8750,
    "18K": 0.7500,
    "14K": 0.5833,
}

# ── Base LTV ceiling (regulatory + internal policy) ───────────────────────────
BASE_LTV = 0.75   # 75 %
BASE_BULLET_LTV = 0.55  # 55 %

# ── Carat multipliers (relative to 24K) ───────────────────────────────────────
CARAT_MULTIPLIERS: dict[str, float] = {
    "24K": 1.000,
    "22K": 0.973,   # slight markdown for purity uncertainty
    "21K": 0.953,
    "18K": 0.900,
    "14K": 0.840,
}

# ── Gold type multipliers (collateral liquidation quality) ────────────────────
GOLD_TYPE_MULTIPLIERS: dict[str, float] = {
    "Coin": 1.00,              # cleanest collateral; no reduction
    "Jewellery": 0.97,         # small making/design markdown
    "Stone Jewellery": 0.90,   # highest deduction due to non-gold stones/work
}

def _tenure_factor(tenure_months: int) -> float:
    if tenure_months >= 48:
        return 0.90
    if tenure_months >= 36:
        return 0.95
    return 1.00


def _future_uplift_guardrail(predicted_change_pct: float) -> float:
    """
    Guardrail for future-adjusted loan amounts.
    Caps upside so future estimates stay in a controlled +3% to +4% band
    over current eligible amount.
    """
    pct = float(predicted_change_pct)
    if pct <= 4:
        return 0.03
    if pct <= 10:
        return 0.0325
    if pct <= 20:
        return 0.035
    return 0.04

# ── CIBIL factor ──────────────────────────────────────────────────────────────
def _cibil_factor(score: int) -> float:
    if score >= 760: return 1.00
    if score >= 720: return 0.95
    if score >= 680: return 0.90
    if score >= 640: return 0.84
    if score >= 580: return 0.76
    return 0.65


# ── Active-loan penalty ────────────────────────────────────────────────────────
def _active_loan_factor(active_loans: int) -> float:
    return max(0.80, 1.0 - active_loans * 0.06)


# ── Profession factor ──────────────────────────────────────────────────────────
PROFESSION_FACTORS: dict[str, float] = {
    "Government Employee": 1.00,
    "Private Employee":    0.96,
    "Business Owner":      0.91,
    "Self Employed":       0.88,
    "Retired":             0.86,
    "Freelancer":          0.83,
}

# ── Gold trend factor ──────────────────────────────────────────────────────────
def _trend_factor(pct_change: float) -> float:
    """
    Rising gold price benefits the lender (can sell higher if default).
    Falling gold price increases collateral risk → reduce LTV.
    """
    if pct_change >= 5:   return 1.05
    if pct_change >= 2:   return 1.02
    if pct_change >= -2:  return 1.00
    if pct_change >= -5:  return 0.95
    return 0.90


# ── Missed-EMI penalty on CIBIL factor ────────────────────────────────────────
def _missed_emi_penalty(missed: int) -> float:
    if missed == 0: return 1.00
    if missed <= 2: return 0.95
    if missed <= 5: return 0.88
    return 0.78


# ── Main calculation ───────────────────────────────────────────────────────────

def calculate_ltv_and_loan(
    carat: CaratType,
    gold_type: GoldType,
    gold_weight_grams: float,
    tenure_months: int,
    job_profession: JobProfession,
    customer: CustomerProfile,
    loan_history: LoanHistoryOverview,
    gold_insights: GoldInsights,
) -> dict:
    """
    Returns a dict with all computed fields needed for LoanCalculationResponse.
    """

    # ── Gold valuation ────────────────────────────────────────────────────────
    purity              = CARAT_PURITY[carat.value]
    pure_grams          = gold_weight_grams * purity
    live_price          = gold_insights.live_price_aed_per_gram
    gold_valuation      = round(pure_grams * live_price, 2)
    future_price = gold_insights.predicted_end_price_aed_per_gram
    raw_future_gold_valuation = round(pure_grams * future_price, 2)

    # ── Individual factors ────────────────────────────────────────────────────
    carat_mult  = CARAT_MULTIPLIERS[carat.value]
    gold_type_mult = GOLD_TYPE_MULTIPLIERS[gold_type.value]
    tenure_mult = _tenure_factor(tenure_months)

    # ── Compute effective LTVs (regular + bullet) ─────────────────────────────
    final_ltv = (
        BASE_LTV
        * carat_mult
        * gold_type_mult
        * tenure_mult
    )
    final_ltv = round(min(final_ltv, BASE_LTV), 4)  # never exceed base ceiling
    bullet_final_ltv = (
        BASE_BULLET_LTV
        * carat_mult
        * gold_type_mult
        * tenure_mult
    )
    bullet_final_ltv = round(min(bullet_final_ltv, BASE_BULLET_LTV), 4)

    eligible_amount = round(gold_valuation * final_ltv, 2)
    bullet_eligible_amount = round(gold_valuation * bullet_final_ltv, 2)

    # Future-adjusted estimates: apply 3–4% guardrail over current eligible amount.
    uplift = _future_uplift_guardrail(gold_insights.predicted_change_pct)
    raw_future_eligible_amount = round(raw_future_gold_valuation * final_ltv * 0.97, 2)
    raw_bullet_future_eligible_amount = round(raw_future_gold_valuation * bullet_final_ltv * 0.97, 2)
    guarded_future_eligible_amount = round(eligible_amount * (1.0 + uplift), 2)
    guarded_bullet_future_eligible_amount = round(bullet_eligible_amount * (1.0 + uplift), 2)
    future_eligible_amount = min(raw_future_eligible_amount, guarded_future_eligible_amount)
    bullet_future_eligible_amount = min(raw_bullet_future_eligible_amount, guarded_bullet_future_eligible_amount)

    # Keep displayed future valuation aligned with guarded future eligibility logic.
    future_gold_valuation = round(gold_valuation * (1.0 + uplift) / 0.97, 2)

    # ── LTV breakdown (deltas from base) ──────────────────────────────────────
    breakdown = LTVBreakdown(
        base_ltv_pct=round(BASE_LTV * 100, 1),
        carat_adjustment_pct=round((carat_mult - 1) * BASE_LTV * 100, 2),
        gold_type_adjustment_pct=round((gold_type_mult - 1) * BASE_LTV * carat_mult * 100, 2),
        tenure_adjustment_pct=round((tenure_mult - 1) * BASE_LTV * carat_mult * gold_type_mult * 100, 2),
        cibil_adjustment_pct=0.0,
        active_loans_adjustment_pct=0.0,
        profession_adjustment_pct=0.0,
        gold_trend_adjustment_pct=0.0,
        final_ltv_pct=round(final_ltv * 100, 2),
    )

    # ── System decision & remarks ─────────────────────────────────────────────
    decision, remarks = _make_decision(
        final_ltv, customer.cibil_score, loan_history,
        gold_insights.trend, _active_loan_factor(loan_history.active_loans),
    )

    # ── CIBIL label ───────────────────────────────────────────────────────────
    cibil_label = _cibil_label(customer.cibil_score)

    return dict(
        system_decision=decision,
        recommended_ltv_pct=round(final_ltv * 100, 2),
        bullet_recommended_ltv_pct=round(bullet_final_ltv * 100, 2),
        gold_valuation_aed=gold_valuation,
        eligible_loan_amount_aed=eligible_amount,
        bullet_eligible_loan_amount_aed=bullet_eligible_amount,
        future_gold_valuation_aed=future_gold_valuation,
        future_eligible_loan_amount_aed=future_eligible_amount,
        bullet_future_eligible_loan_amount_aed=bullet_future_eligible_amount,
        suggested_tenure_months=tenure_months,
        cibil_score=customer.cibil_score,
        cibil_label=cibil_label,
        remarks=remarks,
        ltv_breakdown=breakdown,
    )


# ── Decision logic ─────────────────────────────────────────────────────────────

def _make_decision(
    ltv: float,
    cibil: int,
    history: LoanHistoryOverview,
    trend: str,
    active_f: float,
) -> tuple[str, str]:

    score = 0

    # CIBIL
    if cibil >= 750: score += 3
    elif cibil >= 700: score += 2
    elif cibil >= 640: score += 1
    else: score -= 2

    # Missed EMIs
    if history.missed_emis == 0: score += 2
    elif history.missed_emis <= 2: score += 0
    else: score -= 2

    # Active loans
    if history.active_loans == 0: score += 1
    elif history.active_loans >= 3: score -= 1

    # Gold trend
    if trend == "RISING": score += 1
    elif trend == "FALLING": score -= 1

    if score >= 5:
        decision = "Pre-Approved"
        remarks  = "Strong repayment history and high collateral quality. Proceed with standard documentation."
    elif score >= 2:
        decision = "Pre-Approved"
        remarks  = "Applicant meets eligibility criteria. Verify income documents and proceed."
    elif score >= 0:
        decision = "Manual Review"
        remarks  = "Moderate risk profile detected. Senior credit officer review required before approval."
    else:
        decision = "Manual Review"
        remarks  = "High risk signals identified (low CIBIL / missed EMIs). Recommend manual review and possible reduction in loan amount."

    return decision, remarks


def _cibil_label(score: int) -> str:
    if score >= 760: return "Excellent"
    if score >= 720: return "Very Good"
    if score >= 680: return "Good"
    if score >= 640: return "Fair"
    if score >= 580: return "Poor"
    return "Very Poor"
