import json
from pathlib import Path
from typing import Optional

from backend.models import CustomerProfile, LoanHistoryOverview, LoanRecord

DATA_DIR = Path(__file__).parent.parent / "data"
CUSTOMERS_FILE = DATA_DIR / "dummy_customers.json"
LOANS_FILE = DATA_DIR / "dummy_loans.json"

_customers: Optional[list] = None
_loans: Optional[dict] = None


def _load_data() -> None:
    global _customers, _loans
    if _customers is None:
        with open(CUSTOMERS_FILE) as f:
            _customers = json.load(f)
    if _loans is None:
        with open(LOANS_FILE) as f:
            _loans = json.load(f)


def get_customer(emirates_id: str) -> dict:
    _load_data()
    for c in _customers:
        if c["emirates_id"] == emirates_id:
            return c
    raise ValueError(f"Customer not found: {emirates_id}")


def get_customer_profile(emirates_id: str) -> CustomerProfile:
    raw = get_customer(emirates_id)
    return CustomerProfile(
        name=raw["name"],
        emirates_id=raw["emirates_id"],
        nationality=raw["nationality"],
        mobile=raw["mobile"],
        gender=raw["gender"],
        email=raw["email"],
        customer_type=raw["customer_type"],
        risk_category=raw["risk_category"],
    )


def get_loan_history(emirates_id: str, sar_per_aed_ratio: float = 1.0) -> LoanHistoryOverview:
    _load_data()
    raw_loans = _loans.get(emirates_id, [])

    records = [
        LoanRecord(
            loan_id=l["loan_id"],
            amount=round(l["amount"] * sar_per_aed_ratio, 2),
            tenure_months=l["tenure_months"],
            status=l["status"],
            missed_emis=l["missed_emis"],
            outstanding_balance=round(l["outstanding_balance"] * sar_per_aed_ratio, 2),
        )
        for l in raw_loans
    ]

    active = [r for r in records if r.status == "ACTIVE"]
    closed = [r for r in records if r.status == "CLOSED"]
    total_missed = sum(l["missed_emis"] for l in raw_loans)
    outstanding = sum(r.outstanding_balance for r in active)

    return LoanHistoryOverview(
        total_loans=len(records),
        active_loans=len(active),
        closed_loans=len(closed),
        total_missed_emis=total_missed,
        outstanding_balance_sar=round(outstanding, 2),
        loans=records,
    )
