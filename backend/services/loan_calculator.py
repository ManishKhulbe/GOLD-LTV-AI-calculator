from backend.models import LTVBreakdown

# ── Constants ─────────────────────────────────────────────────────────────────

BASE_LTV = 0.75

CARAT_PURITY = {
    "24K": 1.0000,
    "22K": 0.9167,
    "21K": 0.8750,
    "18K": 0.7500,
    "14K": 0.5833,
}

CARAT_MULTIPLIERS = {
    "24K": 1.000,
    "22K": 0.973,
    "21K": 0.953,
    "18K": 0.900,
    "14K": 0.840,
}

PROFESSION_FACTORS = {
    "Government Employee": 1.00,
    "Private Employee": 0.96,
    "Business Owner": 0.91,
    "Self Employed": 0.88,
    "Retired": 0.86,
    "Freelancer": 0.83,
}

SAR_PER_USD = 3.7500
TROY_OZ_TO_GRAM = 31.1035


# ── Multiplier helpers ────────────────────────────────────────────────────────

def _cibil_factor(score: int) -> float:
    if score >= 760:
        return 1.00
    elif score >= 720:
        return 0.95
    elif score >= 680:
        return 0.90
    elif score >= 640:
        return 0.84
    elif score >= 580:
        return 0.76
    else:
        return 0.65


def _missed_emi_penalty(missed: int) -> float:
    if missed == 0:
        return 1.00
    elif missed <= 2:
        return 0.95
    elif missed <= 5:
        return 0.88
    else:
        return 0.78


def _active_loan_factor(active: int) -> float:
    return max(0.80, 1.0 - active * 0.06)


def _gold_trend_factor(predicted_change_pct: float) -> float:
    if predicted_change_pct >= 5.0:
        return 1.05
    elif predicted_change_pct >= 2.0:
        return 1.02
    elif predicted_change_pct > -2.0:
        return 1.00
    elif predicted_change_pct > -5.0:
        return 0.95
    else:
        return 0.90


# ── CIBIL label ───────────────────────────────────────────────────────────────

def cibil_label(score: int) -> str:
    if score >= 760:
        return "Excellent"
    elif score >= 720:
        return "Very Good"
    elif score >= 680:
        return "Good"
    elif score >= 640:
        return "Fair"
    elif score >= 580:
        return "Poor"
    else:
        return "Very Poor"


# ── LTV calculation ───────────────────────────────────────────────────────────

def compute_ltv(
    carat: str,
    cibil_score: int,
    missed_emis: int,
    active_loans: int,
    profession: str,
    predicted_change_pct: float,
) -> tuple[float, LTVBreakdown]:
    carat_m = CARAT_MULTIPLIERS[carat]
    cibil_f = _cibil_factor(cibil_score)
    emi_p = _missed_emi_penalty(missed_emis)
    cibil_combined = cibil_f * emi_p
    active_f = _active_loan_factor(active_loans)
    prof_f = PROFESSION_FACTORS.get(profession, 0.88)
    trend_f = _gold_trend_factor(predicted_change_pct)

    ltv = BASE_LTV * carat_m * cibil_combined * active_f * prof_f * trend_f
    final_ltv = min(ltv, 0.75)

    # Delta adjustments
    carat_adj = (carat_m - 1) * BASE_LTV * 100
    cibil_adj = (cibil_combined - 1) * BASE_LTV * carat_m * 100
    active_adj = (active_f - 1) * BASE_LTV * carat_m * cibil_combined * 100
    prof_adj = (prof_f - 1) * BASE_LTV * carat_m * cibil_combined * active_f * 100
    trend_adj = (trend_f - 1) * BASE_LTV * carat_m * cibil_combined * active_f * prof_f * 100

    breakdown = LTVBreakdown(
        carat_multiplier=round(carat_m, 4),
        carat_adjustment=round(carat_adj, 4),
        cibil_multiplier=round(cibil_combined, 4),
        cibil_adjustment=round(cibil_adj, 4),
        missed_emi_multiplier=round(emi_p, 4),
        active_loans_multiplier=round(active_f, 4),
        active_loans_adjustment=round(active_adj, 4),
        profession_multiplier=round(prof_f, 4),
        profession_adjustment=round(prof_adj, 4),
        gold_trend_multiplier=round(trend_f, 4),
        gold_trend_adjustment=round(trend_adj, 4),
        base_ltv=BASE_LTV,
    )

    return round(final_ltv, 6), breakdown


# ── Gold valuation ─────────────────────────────────────────────────────────────

def compute_gold_valuation_sar(
    weight_grams: float,
    carat: str,
    live_sar_per_gram: float,
) -> float:
    pure_grams = weight_grams * CARAT_PURITY[carat]
    return round(pure_grams * live_sar_per_gram, 2)


def compute_eligible_loan_sar(valuation_sar: float, final_ltv: float) -> float:
    return round(valuation_sar * final_ltv, 2)


def compute_future_eligible_sar(
    weight_grams: float,
    carat: str,
    predicted_end_price_sar_per_gram: float,
    final_ltv: float,
) -> tuple[float, float]:
    pure_grams = weight_grams * CARAT_PURITY[carat]
    future_val = round(pure_grams * predicted_end_price_sar_per_gram, 2)
    future_eligible = round(future_val * final_ltv * 0.97, 2)
    return future_val, future_eligible


# ── System decision (CALCULATIONS.md §6 point scoring) ───────────────────────

def make_system_decision(
    cibil_score: int,
    missed_emis: int,
    active_loans: int,
    trend: str,
) -> str:
    pts = 0

    if cibil_score >= 750:
        pts += 3
    elif cibil_score >= 700:
        pts += 2
    elif cibil_score >= 640:
        pts += 1
    else:
        pts -= 2

    if missed_emis == 0:
        pts += 2
    elif missed_emis <= 2:
        pts += 0
    else:
        pts -= 2

    if active_loans == 0:
        pts += 1
    elif active_loans >= 3:
        pts -= 1

    if trend == "RISING":
        pts += 1
    elif trend == "FALLING":
        pts -= 1

    if pts >= 2:
        return "Pre-Approved"
    else:
        return "Manual Review"
