from backend.models import RiskInsights

# ── User risk score (CALCULATIONS.md §7) ──────────────────────────────────────

def _cibil_pts(score: int) -> float:
    if score >= 760:
        return 5
    elif score >= 720:
        return 15
    elif score >= 680:
        return 25
    elif score >= 640:
        return 32
    elif score >= 580:
        return 38
    else:
        return 40


def _missed_emi_pts(missed: int) -> float:
    if missed == 0:
        return 0
    elif missed <= 2:
        return 8
    elif missed <= 5:
        return 15
    else:
        return 20


def _active_loan_pts(active: int) -> float:
    if active == 0:
        return 0
    elif active == 1:
        return 3
    elif active == 2:
        return 8
    elif active == 3:
        return 12
    else:
        return 15


def _profession_pts(profession: str) -> float:
    table = {
        "Government Employee": 0,
        "Private Employee": 3,
        "Retired": 5,
        "Business Owner": 7,
        "Self Employed": 9,
        "Freelancer": 12,
    }
    return table.get(profession, 9)


def _balance_pts(outstanding_balance: float, eligible_loan_sar: float) -> float:
    if eligible_loan_sar <= 0:
        return 10
    if outstanding_balance > eligible_loan_sar * 0.50:
        return 10
    elif outstanding_balance > eligible_loan_sar * 0.25:
        return 5
    return 0


def _user_risk_label(score: float) -> str:
    if score <= 25:
        return "LOW RISK"
    elif score <= 50:
        return "MEDIUM RISK"
    elif score <= 75:
        return "HIGH RISK"
    else:
        return "VERY HIGH RISK"


# ── Company risk score (CALCULATIONS.md §8) ───────────────────────────────────

def _ltv_risk(final_ltv_pct: float) -> float:
    """final_ltv_pct is 0–100 (percent)."""
    if final_ltv_pct <= 60:
        return 5
    elif final_ltv_pct <= 70:
        return 12
    elif final_ltv_pct <= 75:
        return 20
    elif final_ltv_pct <= 80:
        return 28
    else:
        return 35


def _market_risk(trend: str, pct_change: float, tenure_months: int) -> float:
    if trend == "RISING":
        base = 2 if pct_change >= 5.0 else 8
    elif trend == "STABLE":
        base = 14
    else:  # FALLING
        base = 18 if pct_change > -5.0 else 25
        if tenure_months <= 6:
            base = min(base + 5, 25)
    return base


def _company_risk_label(score: float) -> tuple[str, str]:
    if score <= 25:
        return "LOW RISK", "LOW"
    elif score <= 50:
        return "MEDIUM RISK", "MEDIUM"
    elif score <= 75:
        return "HIGH RISK", "HIGH"
    else:
        return "VERY HIGH RISK", "VERY HIGH"


# ── Public interface ──────────────────────────────────────────────────────────

def compute_risk_insights(
    cibil_score: int,
    missed_emis: int,
    active_loans: int,
    profession: str,
    outstanding_balance_sar: float,
    eligible_loan_sar: float,
    final_ltv: float,
    trend: str,
    predicted_change_pct: float,
    tenure_months: int,
) -> RiskInsights:
    # User risk
    u_cibil = _cibil_pts(cibil_score)
    u_emi = _missed_emi_pts(missed_emis)
    u_active = _active_loan_pts(active_loans)
    u_prof = _profession_pts(profession)
    u_balance = _balance_pts(outstanding_balance_sar, eligible_loan_sar)
    user_risk = min(u_cibil + u_emi + u_active + u_prof + u_balance, 100)

    # Company risk
    ltv_pct = final_ltv * 100
    user_contrib = user_risk * 0.40
    ltv_r = _ltv_risk(ltv_pct)
    mkt_r = _market_risk(trend, predicted_change_pct, tenure_months)
    company_risk = min(user_contrib + ltv_r + mkt_r, 100)

    u_label = _user_risk_label(user_risk)
    c_label, c_exposure = _company_risk_label(company_risk)

    return RiskInsights(
        user_risk_score=round(user_risk, 2),
        user_risk_label=u_label,
        company_risk_score=round(company_risk, 2),
        company_risk_label=c_label,
        company_risk_exposure=c_exposure,
    )
