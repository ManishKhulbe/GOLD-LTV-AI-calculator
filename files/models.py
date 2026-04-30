from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────────

class CaratType(str, Enum):
    K24 = "24K"
    K22 = "22K"
    K21 = "21K"
    K18 = "18K"
    K14 = "14K"


class TenureMonths(int, Enum):
    M6  = 6
    M12 = 12
    M18 = 18
    M24 = 24
    M36 = 36


class JobProfession(str, Enum):
    GOVERNMENT   = "Government Employee"
    PRIVATE      = "Private Employee"
    BUSINESS     = "Business Owner"
    SELF_EMPLOYED = "Self Employed"
    RETIRED      = "Retired"
    FREELANCER   = "Freelancer"


class LoanStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    DEFAULTED = "DEFAULTED"


class RiskCategory(str, Enum):
    A_PLUS = "A+"
    A      = "A"
    B_PLUS = "B+"
    B      = "B"
    C      = "C"
    D      = "D"


# ── Request ────────────────────────────────────────────────────────────────────

class LoanCalculationRequest(BaseModel):
    emirates_id: str = Field(..., example="784-1985-1234567-1")
    carat: CaratType
    gold_weight_grams: float = Field(..., gt=0, example=1577.19)
    tenure_months: TenureMonths
    job_profession: JobProfession


# ── Sub-models ─────────────────────────────────────────────────────────────────

class LoanHistoryItem(BaseModel):
    loan_id: str
    tenure_months: int
    status: LoanStatus
    missed_emis: int
    amount: float
    outstanding_balance: float


class CustomerProfile(BaseModel):
    customer_name: str
    emirates_id: str
    nationality: str
    mobile: str
    customer_type: str           # "Existing" | "New"
    risk_category: RiskCategory
    cibil_score: int
    # UAE PASS enriched fields (optional – populated when UAE PASS returns data)
    gender: Optional[str] = None
    email: Optional[str] = None
    full_name_ar: Optional[str] = None
    nationality_ar: Optional[str] = None
    uaepass_verified: bool = False


class LoanHistoryOverview(BaseModel):
    total_previous: int
    active_loans: int
    closed_loans: int
    missed_emis: int
    outstanding_balance: float
    loan_items: List[LoanHistoryItem]


class GoldPricePoint(BaseModel):
    date: str
    price_aed_per_gram: float


class GoldInsights(BaseModel):
    live_price_aed_per_gram: float            # AED — used for loan valuation calc
    live_price_sar_per_gram: float            # SAR — used for chart display
    historical_prices: List[GoldPricePoint]   # last 12 months, SAR/gram
    predicted_prices: List[GoldPricePoint]    # next tenure months, SAR/gram
    predicted_change_pct: float               # % change over tenure
    trend: str                                # "RISING" | "FALLING" | "STABLE"


class RiskInsights(BaseModel):
    user_risk_score: float        # 0–100  (lower = safer)
    user_risk_label: str          # LOW / MEDIUM / HIGH
    company_risk_score: float
    company_risk_label: str
    company_risk_exposure: str    # LOW / MEDIUM / HIGH


class LTVBreakdown(BaseModel):
    base_ltv_pct: float
    carat_adjustment_pct: float
    cibil_adjustment_pct: float
    active_loans_adjustment_pct: float
    profession_adjustment_pct: float
    gold_trend_adjustment_pct: float
    final_ltv_pct: float


# ── Main Response ──────────────────────────────────────────────────────────────

class LoanCalculationResponse(BaseModel):
    # Hero section
    system_decision: str              # "Pre-Approved" | "Manual Review" | "Rejected"
    recommended_ltv_pct: float
    gold_valuation_aed: float
    eligible_loan_amount_aed: float
    suggested_tenure_months: int
    cibil_score: int
    cibil_label: str
    remarks: str

    # Breakdown
    ltv_breakdown: LTVBreakdown

    # Customer
    customer_profile: CustomerProfile

    # Loan history
    loan_history: LoanHistoryOverview

    # Gold & market
    gold_insights: GoldInsights

    # Risk
    risk_insights: RiskInsights

    # Live karat rates (SAR)
    live_gold_currency: str = "SAR"
    live_gold_rates: dict = {}        # { "24K": float, "22K": float, ... }


# ── Lightweight gold-price response ───────────────────────────────────────────

class LiveGoldPriceResponse(BaseModel):
    currency: str = "SAR"
    rate_24k_per_gram: float
    karats: dict                  # { "24K": float, "22K": float, ... }
    price_usd_per_oz: float
    updated_at: str