"""
services/risk_analyzer.py

Computes:
  • User risk score  (0–100, lower = safer)
  • Company risk score (0–100, lower = safer)

Key insight: a risky user can still be LOW company risk if gold is trending
strongly upward (the lender can liquidate collateral at a premium).
"""

from models import CustomerProfile, LoanHistoryOverview, GoldInsights, RiskInsights


# ── User risk ──────────────────────────────────────────────────────────────────

def _user_risk(
    customer: CustomerProfile,
    history: LoanHistoryOverview,
    gold_insights: GoldInsights,
    job_profession: str,
    eligible_loan_aed: float,
) -> float:
    """Returns 0–100 (lower = safer)."""

    score = 0.0

    # CIBIL contribution (40 pts max)
    cibil = customer.cibil_score
    if   cibil >= 760: score +=  5
    elif cibil >= 720: score += 15
    elif cibil >= 680: score += 25
    elif cibil >= 640: score += 32
    elif cibil >= 580: score += 38
    else:              score += 40

    # Missed EMI contribution (20 pts max)
    missed = history.missed_emis
    if   missed == 0: score += 0
    elif missed <= 2: score += 8
    elif missed <= 5: score += 15
    else:             score += 20

    # Active loans (15 pts max)
    active = history.active_loans
    if   active == 0: score += 0
    elif active == 1: score += 3
    elif active == 2: score += 8
    elif active == 3: score += 12
    else:             score += 15

    # Profession stability (15 pts max)
    prof_risk = {
        "Government Employee": 0,
        "Private Employee":    3,
        "Business Owner":      7,
        "Self Employed":       9,
        "Retired":             5,
        "Freelancer":          12,
    }
    score += prof_risk.get(job_profession, 8)

    # Outstanding balance vs requested loan (10 pts max)
    if history.outstanding_balance > eligible_loan_aed * 0.5:
        score += 10
    elif history.outstanding_balance > eligible_loan_aed * 0.25:
        score += 5

    return round(min(score, 100.0), 1)


# ── Company risk ───────────────────────────────────────────────────────────────

def _company_risk(
    user_risk: float,
    gold_insights: GoldInsights,
    ltv_pct: float,
    tenure_months: int,
) -> float:
    """
    Company risk is decoupled from user risk because collateral mitigates it.

    Key formula:
        company_risk = user_risk_contrib  (40 %)
                     + collateral_risk    (35 %)
                     + market_risk        (25 %)

    If gold is strongly rising → collateral risk is LOW even for risky borrowers.
    """

    # User risk contribution (40 %)
    user_contrib = user_risk * 0.40

    # Collateral / LTV risk (35 pts max)
    if ltv_pct <= 60:   ltv_risk = 5
    elif ltv_pct <= 70: ltv_risk = 12
    elif ltv_pct <= 75: ltv_risk = 20
    elif ltv_pct <= 80: ltv_risk = 28
    else:               ltv_risk = 35

    # Market / gold price risk (25 pts max)
    trend     = gold_insights.trend
    pct_chg   = gold_insights.predicted_change_pct

    if trend == "RISING":
        if pct_chg >= 5:  mkt_risk = 2   # strong uptrend → very low market risk
        else:             mkt_risk = 8
    elif trend == "STABLE":
        mkt_risk = 14
    else:   # FALLING
        if pct_chg <= -5: mkt_risk = 25  # heavy decline → high market risk
        else:             mkt_risk = 18

    # Short tenure + falling gold = extra risk
    if tenure_months <= 6 and trend == "FALLING":
        mkt_risk = min(mkt_risk + 5, 25)

    company = user_contrib + ltv_risk + mkt_risk
    return round(min(company, 100.0), 1)


# ── Labels ─────────────────────────────────────────────────────────────────────

def _label(score: float) -> tuple[str, str]:
    """Returns (label, exposure_level)."""
    if score <= 25:   return "LOW RISK",    "LOW"
    if score <= 50:   return "MEDIUM RISK", "MEDIUM"
    if score <= 75:   return "HIGH RISK",   "HIGH"
    return "VERY HIGH RISK", "VERY HIGH"


# ── Public facade ──────────────────────────────────────────────────────────────

def build_risk_insights(
    customer: CustomerProfile,
    history: LoanHistoryOverview,
    gold_insights: GoldInsights,
    job_profession: str,
    eligible_loan_aed: float,
    ltv_pct: float,
    tenure_months: int,
) -> RiskInsights:

    user_score    = _user_risk(customer, history, gold_insights, job_profession, eligible_loan_aed)
    company_score = _company_risk(user_score, gold_insights, ltv_pct, tenure_months)

    u_label, u_exp = _label(user_score)
    c_label, c_exp = _label(company_score)

    return RiskInsights(
        user_risk_score=user_score,
        user_risk_label=u_label,
        company_risk_score=company_score,
        company_risk_label=c_label,
        company_risk_exposure=c_exp,
    )
