"""
services/loan_calculator.py

Calculates:
  • Gold valuation (AED)
  • LTV with individual adjustment factors
  • Eligible loan amount
  • System decision and remarks
"""

from models import (
    CaratType, JobProfession, CustomerProfile,
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

# ── Carat multipliers (relative to 24K) ───────────────────────────────────────
CARAT_MULTIPLIERS: dict[str, float] = {
    "24K": 1.000,
    "22K": 0.973,   # slight markdown for purity uncertainty
    "21K": 0.953,
    "18K": 0.900,
    "14K": 0.840,
}

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
    live_price          = gold_insights.live_price_sar_per_gram
    gold_valuation      = round(pure_grams * live_price, 2)
    future_price        = gold_insights.predicted_end_price_sar_per_gram
    future_gold_valuation = round(pure_grams * future_price, 2)

    # ── Individual factors ────────────────────────────────────────────────────
    carat_mult  = CARAT_MULTIPLIERS[carat.value]
    cibil_f     = _cibil_factor(customer.cibil_score)
    emi_f       = _missed_emi_penalty(loan_history.missed_emis)
    active_f    = _active_loan_factor(loan_history.active_loans)
    prof_f      = PROFESSION_FACTORS[job_profession.value]
    trend_f     = _trend_factor(gold_insights.predicted_change_pct)

    # ── Compute effective LTV ─────────────────────────────────────────────────
    cibil_combined = cibil_f * emi_f   # fold EMI penalty into CIBIL factor

    final_ltv = (
        BASE_LTV
        * carat_mult
        * cibil_combined
        * active_f
        * prof_f
        * trend_f
    )
    final_ltv = round(min(final_ltv, BASE_LTV), 4)  # never exceed base ceiling

    eligible_amount        = round(gold_valuation * final_ltv, 2)
    future_eligible_amount = round(future_gold_valuation * final_ltv * 0.97, 2)  # 3% safety buffer

    # ── LTV breakdown (deltas from base) ──────────────────────────────────────
    breakdown = LTVBreakdown(
        base_ltv_pct=round(BASE_LTV * 100, 1),
        carat_adjustment_pct=round((carat_mult - 1) * BASE_LTV * 100, 2),
        cibil_adjustment_pct=round((cibil_combined - 1) * BASE_LTV * carat_mult * 100, 2),
        active_loans_adjustment_pct=round((active_f - 1) * BASE_LTV * carat_mult * cibil_combined * 100, 2),
        profession_adjustment_pct=round((prof_f - 1) * BASE_LTV * carat_mult * cibil_combined * active_f * 100, 2),
        gold_trend_adjustment_pct=round((trend_f - 1) * BASE_LTV * carat_mult * cibil_combined * active_f * prof_f * 100, 2),
        final_ltv_pct=round(final_ltv * 100, 2),
    )

    # ── System decision & remarks ─────────────────────────────────────────────
    decision, remarks = _make_decision(
        final_ltv, customer.cibil_score, loan_history,
        gold_insights.trend, active_f,
    )

    # ── CIBIL label ───────────────────────────────────────────────────────────
    cibil_label = _cibil_label(customer.cibil_score)

    return dict(
        system_decision=decision,
        recommended_ltv_pct=round(final_ltv * 100, 2),
        gold_valuation_sar=gold_valuation,
        eligible_loan_amount_sar=eligible_amount,
        future_gold_valuation_sar=future_gold_valuation,
        future_eligible_loan_amount_sar=future_eligible_amount,
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
