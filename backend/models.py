import re
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, field_validator, Field


class CaratEnum(str, Enum):
    K14 = "14K"
    K18 = "18K"
    K21 = "21K"
    K22 = "22K"
    K24 = "24K"


class TenureEnum(int, Enum):
    M6 = 6
    M12 = 12
    M18 = 18
    M24 = 24
    M36 = 36


class ProfessionEnum(str, Enum):
    GOVERNMENT = "Government Employee"
    PRIVATE = "Private Employee"
    BUSINESS = "Business Owner"
    SELF_EMPLOYED = "Self Employed"
    RETIRED = "Retired"
    FREELANCER = "Freelancer"


# ── Request ──────────────────────────────────────────────────────────────────

class LoanCalculationRequest(BaseModel):
    emirates_id: str
    carat: CaratEnum
    gold_weight_grams: float = Field(gt=0)
    tenure_months: TenureEnum
    job_profession: ProfessionEnum

    @field_validator("emirates_id")
    @classmethod
    def validate_emirates_id(cls, v: str) -> str:
        if not re.fullmatch(r"784-\d{4}-\d{7}-\d", v):
            raise ValueError("Emirates ID must match format: 784-YYYY-XXXXXXX-C")
        return v


# ── Nested response models ────────────────────────────────────────────────────

class CustomerProfile(BaseModel):
    name: str
    emirates_id: str
    nationality: str
    mobile: str
    gender: str
    email: str
    customer_type: str
    risk_category: str


class LoanRecord(BaseModel):
    loan_id: str
    amount: float
    tenure_months: int
    status: str
    missed_emis: int
    outstanding_balance: float


class LoanHistoryOverview(BaseModel):
    total_loans: int
    active_loans: int
    closed_loans: int
    total_missed_emis: int
    outstanding_balance_sar: float
    loans: List[LoanRecord]


class GoldPricePoint(BaseModel):
    label: str
    price_sar_per_gram: float


class GoldInsights(BaseModel):
    live_price_sar_per_gram: float
    historical_prices: List[GoldPricePoint]
    predicted_prices: List[GoldPricePoint]
    predicted_change_pct: float
    trend: str
    predicted_end_price_sar_per_gram: float


class LTVBreakdown(BaseModel):
    carat_multiplier: float
    carat_adjustment: float
    cibil_multiplier: float
    cibil_adjustment: float
    missed_emi_multiplier: float
    active_loans_multiplier: float
    active_loans_adjustment: float
    profession_multiplier: float
    profession_adjustment: float
    gold_trend_multiplier: float
    gold_trend_adjustment: float
    base_ltv: float


class RiskInsights(BaseModel):
    user_risk_score: float
    user_risk_label: str
    company_risk_score: float
    company_risk_label: str
    company_risk_exposure: str


class LiveGoldPriceResponse(BaseModel):
    usd_per_oz: float
    sar_per_gram_24k: float
    source: str


# ── Main response ─────────────────────────────────────────────────────────────

class LoanCalculationResponse(BaseModel):
    system_decision: str
    recommended_ltv_pct: float
    gold_valuation_sar: float
    eligible_loan_amount_sar: float
    future_gold_valuation_sar: float
    future_eligible_loan_amount_sar: float
    suggested_tenure_months: int
    cibil_score: int
    cibil_label: str
    ltv_breakdown: LTVBreakdown
    customer_profile: CustomerProfile
    loan_history: LoanHistoryOverview
    gold_insights: GoldInsights
    risk_insights: RiskInsights
    live_gold_rates: dict
