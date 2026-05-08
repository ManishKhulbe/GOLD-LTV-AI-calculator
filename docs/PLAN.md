# PLAN.md — Spec-Driven Development Plan
# Gold Loan Valuation & Eligibility Dashboard — Finance House Dubai

---

## 1. Project Overview & Purpose

The Gold Loan Valuation & Eligibility Dashboard is an internal-facing decision-support tool for Finance House Dubai's loan officers and credit analysts. It automates the end-to-end gold loan eligibility workflow: live gold pricing, ML-powered price forecasting, LTV computation, borrower risk scoring, and a one-click eligibility decision — replacing manual spreadsheet calculations and reducing human error.

---

## 2. Goals & Success Criteria

| Goal | Success Criterion |
|------|-------------------|
| Automate gold valuation | System calculates valuation within 2s of form submission |
| ML-backed price forecasting | Blended polynomial + linear model provides tenure-end AED/gram prediction with ≤5% deviation from actuals in backtesting |
| Real-time gold rates | Live XAU/USD price displayed on page load; fallback triggers gracefully when API is down |
| Eligibility decision | System issues Pre-Approved / Manual Review output with reasoning remarks |
| Risk scoring | Dual risk score (user + company) computed and surfaced with label on every application |
| UAE PASS identity | Customer identity enriched from UAE PASS on known Emirates IDs |
| Responsive UI | Dashboard renders correctly on desktop (1280px+) and tablet (768px) |

---

## 3. Scope

### In-Scope

- Gold loan valuation calculator (carat, weight, gold type inputs)
- Live gold price feed (XAU/USD → AED/gram per karat)
- ML price prediction pipeline (20-year historical data, blended polynomial + linear)
- LTV computation with all regulatory multipliers (carat, CIBIL, EMI history, active loans, profession, gold trend)
- Borrower eligibility decision engine (Pre-Approved / Manual Review)
- User risk score (0–100) and company risk score (0–100)
- Customer profile + loan history lookup by Emirates ID
- UAE PASS identity enrichment (stub; production hook in place)
- Today's Gold Loan Score (1–10 market timing indicator)
- Reverse calculator (how much gold needed for a desired loan amount)
- Summary/results dashboard screen
- Swagger API documentation

### Out-of-Scope

- Loan disbursement or payment processing
- Real-time database (all data is JSON-file seeded; no write operations)
- Multi-user authentication / role-based access control
- Mobile-native app
- Production UAE PASS OAuth2 integration (credentials not provisioned)
- Multi-currency loan disbursement (SAR/AED display only)
- Automated loan approval workflows or CRM integration
- Audit logging / compliance reporting

---

## 4. Milestones & Phases

### Phase 1 — Foundation & API Layer
**Timeline: Weeks 1–2**

| Task | Priority | Status |
|------|----------|--------|
| FastAPI project scaffold with CORS | High | Done |
| Pydantic request/response models | High | Done |
| Seed data script (`seed_data.py`) | High | Done |
| `GET /health` endpoint | Medium | Done |
| `GET /customer/{emirates_id}` endpoint | High | Done |
| `GET /customer/{emirates_id}/loans` endpoint | High | Done |
| Swagger UI documentation | Medium | Done |

**Definition of Done:** All endpoints return valid JSON; Swagger UI accessible at `/docs`; seed data generates 3 customer records.

---

### Phase 2 — Gold Price Engine
**Timeline: Weeks 2–3**

| Task | Priority | Status |
|------|----------|--------|
| Live XAU/USD fetch from `gold-api.com` | High | Done |
| AED/gram conversion per karat | High | Done |
| Fallback price when API is unreachable | High | Done |
| 20-year `gold_history.json` data file | High | Done |
| `GET /gold/price` endpoint | High | Done |
| `GET /api/gold-rate/live` endpoint | High | Done |
| `GET /gold/insights` endpoint | Medium | Done |

**Definition of Done:** Live rates display for all 5 karats; fallback activates without error on API timeout; gold insights return historical + predicted price arrays.

---

### Phase 3 — ML Prediction Pipeline
**Timeline: Weeks 3–4**

| Task | Priority | Status |
|------|----------|--------|
| Load & clean 20-year historical data | High | Done |
| Polynomial degree-3 Ridge regression (long-run) | High | Done |
| Linear regression on last 365 days (momentum) | High | Done |
| Blended forecast (65% long / 35% recent) | High | Done |
| Live-price anchor (no seam gap in chart) | Medium | Done |
| Compounding noise model for realistic chart | Low | Done |
| Trend classification (RISING / STABLE / FALLING) | High | Done |
| Today's Gold Loan Score endpoint | Medium | Done |

**Definition of Done:** `build_gold_insights(tenure_months)` returns valid `GoldInsights` object; predicted prices in AED/gram; trend classification correct against 3 test cases.

---

### Phase 4 — LTV & Eligibility Engine
**Timeline: Weeks 4–5**

| Task | Priority | Status |
|------|----------|--------|
| Base LTV = 75% with hard cap | High | Done |
| Carat multiplier (24K–14K) | High | Done |
| Gold type multiplier (Coin/Jewellery/Stone) | High | Done |
| Tenure adjustment factor | High | Done |
| CIBIL factor (6 tiers) | High | Done |
| Missed EMI penalty | High | Done |
| Active loan factor | High | Done |
| Profession factor (6 professions) | High | Done |
| Gold trend factor | High | Done |
| LTV breakdown delta calculation | Medium | Done |
| System decision scoring engine | High | Done |
| Future loan estimate (3% safety buffer) | Medium | Done |

**Definition of Done:** `calculate_ltv_and_loan()` returns all fields in `LoanCalculationResponse`; LTV never exceeds 75%; decision matches test matrix in CALCULATIONS.md.

---

### Phase 5 — Risk Scoring
**Timeline: Week 5**

| Task | Priority | Status |
|------|----------|--------|
| User risk score (CIBIL + EMI + active loans + profession + balance) | High | Done |
| Company risk score (user contrib + LTV risk + market risk) | High | Done |
| Risk label thresholds (LOW / MEDIUM / HIGH / VERY HIGH) | High | Done |
| Decoupled company risk (gold trend can offset risky borrower) | Medium | Done |

**Definition of Done:** `build_risk_insights()` returns `RiskInsights`; company risk can be LOW even when user risk is HIGH (gold rising strongly); score capped at 100.

---

### Phase 6 — Frontend Dashboard
**Timeline: Weeks 5–7**

| Task | Priority | Status |
|------|----------|--------|
| React + Vite + Tailwind CSS v4 setup | High | Done |
| Calculator screen (form inputs) | High | Done |
| Live gold rate ticker on load | High | Done |
| Today's Loan Score badge | Medium | Done |
| Reverse calculator panel | Medium | Done |
| `POST /loan/calculate` integration | High | Done |
| Summary/results screen toggle | High | Done |
| SVG Risk Gauge components | Medium | Done |
| SVG CIBIL Gauge component | Medium | Done |
| LTV breakdown display | Medium | Done |
| Gold trend chart (historical + predicted) | Medium | Done |
| Loan history table | Low | Done |

**Definition of Done:** Calculator submits and navigates to summary screen; all dashboard sections render with real API data; no console errors on golden path.

---

### Phase 7 — Hardening & Documentation
**Timeline: Week 7–8**

| Task | Priority | Status |
|------|----------|--------|
| CALCULATIONS.md reference doc | High | Done |
| CLAUDE.md project context file | Medium | Done |
| API README | Medium | Done |
| PLAN.md (this file) | Medium | In Progress |
| ARCHITECTURE.md | Medium | In Progress |
| BRD.md | Medium | In Progress |
| CORS tightened for production | High | Pending |
| UAE PASS real credentials integration | High | Pending |
| Real customer database (replace JSON stubs) | High | Pending |
| Unit tests for LTV calculation | Medium | Pending |
| Unit tests for risk scoring | Medium | Pending |
| CI pipeline | Low | Pending |

**Definition of Done:** All pending items above completed; CORS restricted to known origin; at least 80% coverage on business logic services.

---

## 5. Risks & Mitigation Strategies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `gold-api.com` API downtime | Medium | High | Fallback to `FALLBACK_USD_OZ = 3300.0`; display "fallback" label in UI |
| ML model drift (gold price regime change) | Medium | Medium | Blend model design limits short-term noise; 365-day momentum window absorbs regime shifts gradually |
| UAE PASS credentials not provisioned | High (current) | Low | Stub returns full profiles for 3 seeded IDs; production hook is in place and documented |
| JSON seed data is read-only (no new customers) | High | Medium | Replace with SQLite or PostgreSQL; `customer_service.py` interface unchanged |
| LTV regulatory cap change (currently 75%) | Low | High | `BASE_LTV` is a single constant in `loan_calculator.py` — one-line change |
| Frontend `App.jsx` is monolithic | Medium | Low | Refactor into component files; does not affect API layer |
| Port 8001 hardcoded in frontend | Low | Medium | Move `BACKEND_BASE_URL` to Vite env variable (`VITE_API_BASE`) |

---

## 6. Dependencies

### Internal Dependencies

| Dependency | Consumer | Notes |
|------------|----------|-------|
| `data/gold_history.json` | `gold_service.py` | Required at startup; raises `FileNotFoundError` if missing |
| `data/dummy_customers.json` | `customer_service.py` | Generated by `seed_data.py` |
| `data/dummy_loans.json` | `customer_service.py` | Generated by `seed_data.py` |
| `GoldInsights` object | `loan_calculator.py`, `risk_analyzer.py` | Built by `gold_service.py`; passed to both calculators |
| `CustomerProfile` + `LoanHistoryOverview` | `loan_calculator.py`, `risk_analyzer.py` | Fetched by `customer_service.py` |

### External Dependencies

| Dependency | Purpose | Fallback |
|------------|---------|---------|
| `api.gold-api.com/price/XAU` | Live XAU/USD spot price | `FALLBACK_USD_OZ = 3300.0` |
| UAE PASS API (`id.uaepass.ae`) | Identity verification | Stub profiles for 3 seeded IDs |
| PyPI: `scikit-learn` | Ridge regression + PolynomialFeatures | NumPy `polyfit` fallback in `gold_service.py` |
| PyPI: `fastapi`, `uvicorn`, `httpx`, `pydantic` | Core API framework | No fallback; must be installed |
| npm: `react`, `vite`, `tailwindcss` | Frontend framework | No fallback; must be installed |

---

## 7. Definition of Done (Overall)

The project is considered production-ready when:

1. All Phase 1–6 tasks are complete and passing.
2. CORS is restricted to the known frontend origin.
3. UAE PASS real credentials are configured and integration is verified.
4. Customer data is stored in a real database (not JSON stubs).
5. `BACKEND_BASE_URL` is driven by an environment variable.
6. Unit tests cover `loan_calculator.py` and `risk_analyzer.py` at ≥80%.
7. All three documentation files (PLAN, ARCHITECTURE, BRD) are complete and accurate.
8. Swagger UI accurately reflects all endpoint contracts.
