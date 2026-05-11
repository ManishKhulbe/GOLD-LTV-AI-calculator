"""
seed_data.py
Run once to generate dummy_customers.json and dummy_loans.json in the data/ directory.

    python seed_data.py
"""

import json, random, uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

random.seed(42)

# ── Helpers ────────────────────────────────────────────────────────────────────

FIRST_NAMES = [
    "Ahmed", "Mohammed", "Ali", "Omar", "Khalid", "Saeed", "Hassan",
    "Fatima", "Mariam", "Aisha", "Noura", "Layla", "Sara", "Hessa",
    "Ravi", "Priya", "Arjun", "Sunita", "James", "Emily",
]
LAST_NAMES = [
    "Al-Mansoori", "Al-Rashidi", "Al-Zaabi", "Al-Hamdan", "Sharma",
    "Patel", "Singh", "Kumar", "Johnson", "Williams", "Al-Maktoum",
    "Al-Nahyan", "Gupta", "Mehta", "Khan",
]
NATIONALITIES = (
    ["UAE"] * 10 + ["Indian"] * 5 + ["Pakistani"] * 3 +
    ["British"] * 2 + ["Filipino"] * 2 + ["Egyptian"] * 2
)
PROFESSIONS = [
    "Government Employee", "Private Employee", "Business Owner",
    "Self Employed", "Retired", "Freelancer",
]
RISK_CATS = ["A+", "A", "B+", "B", "C", "D"]

def make_emirates_id(birth_year: int) -> str:
    """784-YYYY-XXXXXXX-C  (fake check digit)."""
    main = random.randint(1000000, 9999999)
    check = random.randint(1, 9)
    return f"784-{birth_year}-{main}-{check}"

def cibil_for_risk(risk: str) -> int:
    ranges = {
        "A+": (760, 900), "A": (720, 759),
        "B+": (680, 719), "B": (640, 679),
        "C": (580, 639), "D": (300, 579),
    }
    lo, hi = ranges[risk]
    return random.randint(lo, hi)

def make_loan(months_ago_started: int, tenure: int, cibil: int) -> dict:
    start = datetime.now() - timedelta(days=months_ago_started * 30)
    end   = start + timedelta(days=tenure * 30)
    now   = datetime.now()

    is_active = now < end
    status    = "ACTIVE" if is_active else ("DEFAULTED" if cibil < 580 and random.random() < 0.3 else "CLOSED")

    amount = random.choice([15000, 30000, 45000, 60000, 75000, 90000, 120000, 150000])
    if status == "ACTIVE":
        elapsed_ratio = (now - start).days / max((end - start).days, 1)
        outstanding   = round(amount * (1 - elapsed_ratio) * random.uniform(0.9, 1.1), 2)
        outstanding   = max(0, outstanding)
    elif status == "DEFAULTED":
        outstanding   = round(amount * random.uniform(0.2, 0.6), 2)
    else:
        outstanding   = 0.0

    missed = 0
    if cibil < 640:
        missed = random.randint(1, 4)
    elif cibil < 700:
        missed = random.randint(0, 2)

    return {
        "loan_id":          str(uuid.uuid4())[:8].upper(),
        "tenure_months":    tenure,
        "status":           status,
        "missed_emis":      missed,
        "amount":           float(amount),
        "outstanding_balance": outstanding,
    }


# ── Generate customers ─────────────────────────────────────────────────────────

EMIRATES_IDS = [
    "784-1985-1234567-1",   # Ahmed Al-Mansoori (shown in UI)
    "784-1990-2345678-2",
    "784-1978-3456789-3",
    "784-1995-4567890-4",
    "784-1982-5678901-5",
    "784-1970-6789012-6",
    "784-2000-7890123-7",
    "784-1988-8901234-8",
    "784-1975-9012345-9",
    "784-1993-0123456-1",
    "784-1965-1357924-2",
    "784-1998-2468013-3",
    "784-1983-3579124-4",
    "784-1972-4680235-5",
    "784-2002-5791346-6",
    "784-1980-6802457-7",
    "784-1969-7913568-8",
    "784-1991-8024679-9",
    "784-1987-9135780-1",
    "784-1976-0246891-2",
]

customers = {}
loans_db  = {}

for i, eid in enumerate(EMIRATES_IDS):
    birth_year  = int(eid.split("-")[1])
    risk        = random.choices(RISK_CATS, weights=[20, 25, 20, 15, 12, 8])[0]
    cibil       = cibil_for_risk(risk)
    is_existing = random.random() < 0.75

    customers[eid] = {
        "customer_name": f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        "emirates_id":   eid,
        "nationality":   random.choice(NATIONALITIES),
        "mobile":        f"+971 {random.randint(50,56)} {random.randint(100,999)} {random.randint(1000,9999)}",
        "customer_type": "Existing" if is_existing else "New",
        "risk_category": risk,
        "cibil_score":   cibil,
    }

    # Override first entry to match the UI demo
    if eid == "784-1985-1234567-1":
        customers[eid].update({
            "customer_name": "Ahmed Al-Mansoori",
            "nationality":   "UAE",
            "risk_category": "A+",
            "cibil_score":   780,
            "customer_type": "Existing",
        })
        cibil = 780

    # Generate 2–5 historical loans
    num_loans    = random.randint(2, 5) if is_existing else 0
    customer_loans = []
    months_cursor  = 0
    for _ in range(num_loans):
        tenure     = random.choice([6, 12, 18, 24, 36])
        started    = months_cursor + random.randint(1, 6)
        months_cursor = started + tenure
        customer_loans.append(make_loan(months_cursor, tenure, cibil))

    # Override first entry loans to match UI
    if eid == "784-1985-1234567-1":
        customer_loans = [
            {"loan_id": "L001", "tenure_months": 12, "status": "ACTIVE",   "missed_emis": 0, "amount": 45000.0,  "outstanding_balance": 15000.0},
            {"loan_id": "L002", "tenure_months": 24, "status": "CLOSED",   "missed_emis": 0, "amount": 120000.0, "outstanding_balance": 0.0},
            {"loan_id": "L003", "tenure_months": 12, "status": "CLOSED",   "missed_emis": 0, "amount": 30000.0,  "outstanding_balance": 0.0},
            {"loan_id": "L004", "tenure_months":  6, "status": "CLOSED",   "missed_emis": 0, "amount": 15000.0,  "outstanding_balance": 0.0},
        ]

    loans_db[eid] = customer_loans

# ── Persist ────────────────────────────────────────────────────────────────────

(DATA_DIR / "dummy_customers.json").write_text(
    json.dumps(customers, indent=2, ensure_ascii=False)
)
(DATA_DIR / "dummy_loans.json").write_text(
    json.dumps(loans_db, indent=2, ensure_ascii=False)
)

import logging

logging.basicConfig(level=logging.INFO)
_logger = logging.getLogger("seed-data")

_logger.info(f"[tomo-id-012] seed.generated customers={len(customers)}")
_logger.info(f"[tomo-id-013] seed.files_written path={DATA_DIR.resolve()}")
_logger.info(f"[tomo-id-014] seed.sample_ids count=5")
for eid in EMIRATES_IDS[:5]:
    c = customers[eid]
    _logger.info(
        f"[tomo-id-015] seed.sample_id emirates_id={eid} customer_name={c['customer_name']} cibil={c['cibil_score']} risk={c['risk_category']}"
    )
