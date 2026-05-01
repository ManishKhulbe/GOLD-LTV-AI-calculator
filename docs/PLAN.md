# PLAN.md — Spec-Driven Development Plan
**Project:** Gold LTV AI Calculator — Finance House Dubai
**Version:** 1.0
**Date:** 2026-05-01

---

## 1. Project Overview & Purpose

Finance House Dubai requires an AI-assisted Gold Loan Valuation & Eligibility Dashboard that enables credit officers to evaluate gold loan applications in real time. The system fetches live gold prices, applies a multi-factor LTV model, runs ML-based price forecasting, and scores both borrower and company risk — all in a single dashboard interaction.

This replaces a manual, spreadsheet-based loan evaluation process that is slow, inconsistent, and prone to human error.

---

## 2. Goals & Success Criteria

| Goal | Success Criteria |
|---|---|
| Real-time gold valuation | Live XAU/SAR price fetched per request; fallback to cached value if API fails |
| Accurate LTV calculation | All 6 multipliers applied correctly; final LTV never exceeds 75% ceiling |
| ML price forecasting | Polynomial + linear blend model produces directionally stable predictions |
| Risk scoring | User risk (0–100) and company risk (0–100) computed per application |
| EMI calculator | Monthly (reducing balance) and bullet payment modes both functional |
| Credit officer UX | Full eligibility dashboard rendered in < 3 seconds end-to-end |

---

## 3. Scope

### In-Scope
- React single-page frontend (calculator form + summary dashboard)
- FastAPI backend with all calculation, prediction, and risk services
- Live gold price integration (gold-api.com, XAU/USD → SAR/AED)
- ML gold price prediction pipeline (20-year history, polynomial + linear blend)
- LTV calculation with 6 adjustment multipliers
- User risk score and company risk score
- EMI calculator (monthly reducing balance + bullet payment)
- Amortization schedule (month-by-month repayment table)
- Future-adjusted loan estimate with 3% safety buffer
- UAE PASS identity stub (production integration placeholder)
- Dummy customer/loan data (20 seeded Emirates IDs)

### Out-of-Scope
- Real database integration (PostgreSQL, etc.)
- Real UAE PASS OAuth2 flow (stubbed)
- Loan origination or disbursement workflows
- Document upload / KYC document management
- Mobile application
- Multi-language UI (Arabic)
- Production deployment / CI-CD pipeline

---

## 4. Milestones & Phases

### Phase 1 — Foundation (Week 1–2)
> Core backend setup, data models, gold price integration

| Task | Priority | Status |
|---|---|---|
| [ ] FastAPI project scaffold with CORS | 🔴 High | Done |
| [ ] Pydantic data models (request/response) | 🔴 High | Done |
| [ ] Live gold price fetch (XAU/USD → SAR) | 🔴 High | Done |
| [ ] Currency constants (AED/SAR pegs) | 🔴 High | Done |
| [ ] 20-year gold history JSON data file | 🔴 High | Done |
| [ ] Seed script for dummy customers & loans | 🟡 Medium | Done |

**Definition of Done:** Backend starts on port 8001, `/health` returns 200, `/api/gold-rate/live` returns live karat rates.

---

### Phase 2 — Core Calculation Engine (Week 2–3)
> LTV, eligibility, risk scoring

| Task | Priority | Status |
|---|---|---|
| [ ] Gold valuation formula (pure_grams × live_price) | 🔴 High | Done |
| [ ] 6-factor LTV multiplier chain | 🔴 High | Done |
| [ ] System decision scoring logic | 🔴 High | Done |
| [ ] User risk score (5-component, 0–100) | 🔴 High | Done |
| [ ] Company risk score (3-component, 0–100) | 🔴 High | Done |
| [ ] Future-adjusted loan estimate (3% buffer) | 🟡 Medium | Done |
| [ ] `POST /loan/calculate` endpoint | 🔴 High | Done |

**Definition of Done:** `POST /loan/calculate` with a valid Emirates ID returns full `LoanCalculationResponse` with all fields populated.

---

### Phase 3 — ML Prediction Pipeline (Week 3–4)
> Gold price forecasting

| Task | Priority | Status |
|---|---|---|
| [ ] Load & clean gold_history.json | 🔴 High | Done |
| [ ] Polynomial degree-3 Ridge model (20-year) | 🔴 High | Done |
| [ ] Linear regression model (365-day window) | 🔴 High | Done |
| [ ] Blended forecast (65% long / 35% recent) | 🔴 High | Done |
| [ ] Live price anchor at day-0 | 🔴 High | Done |
| [ ] Compounding noise model (0.6%/month) | 🟡 Medium | Done |
| [ ] Monthly aggregation for history display | 🟡 Medium | Done |
| [ ] 3-month historical window | 🟢 Low | Done |

**Definition of Done:** `/gold/insights?tenure_months=12` returns 3 historical points + 12 predicted points + trend classification.

---

### Phase 4 — Frontend Dashboard (Week 4–5)
> React UI, calculator form, summary screen

| Task | Priority | Status |
|---|---|---|
| [ ] Calculator form (carat, Emirates ID, weight, tenure, profession) | 🔴 High | Done |
| [ ] Live gold rate sidebar (karat rates 14K–24K) | 🔴 High | Done |
| [ ] Summary dashboard hero card (LTV %, SIMAH gauge) | 🔴 High | Done |
| [ ] Gold Valuation + Eligible Loan metric chips | 🔴 High | Done |
| [ ] Future-adjusted loan chip with delta % | 🟡 Medium | Done |
| [ ] SVG polyline chart (history + current + forecast) | 🟡 Medium | Done |
| [ ] Horizontal risk bars (user + company) | 🟡 Medium | Done |
| [ ] Loan history card list | 🟡 Medium | Done |
| [ ] Customer profile card | 🟡 Medium | Done |
| [ ] Loan History Overview card | 🟡 Medium | Done |
| [ ] SIMAH score semicircle gauge | 🟢 Low | Done |

**Definition of Done:** Full dashboard renders with real backend data; all SAR values display correctly; chart shows 3-month history + forecast line.

---

### Phase 5 — EMI Calculator Feature (Week 5)
> Embedded EMI tool with amortization schedule

| Task | Priority | Status |
|---|---|---|
| [ ] Monthly EMI toggle + Bullet Payment toggle | 🔴 High | Done |
| [ ] Months dropdown (3/6/12/18/24/36) | 🔴 High | Done |
| [ ] Annual rate % input | 🔴 High | Done |
| [ ] Reducing balance EMI formula | 🔴 High | Done |
| [ ] Bullet payment formula (simple interest lump sum) | 🔴 High | Done |
| [ ] Amortization schedule table (scrollable) | 🟡 Medium | Done |
| [ ] Principal (green) / Interest (red) column coding | 🟢 Low | Done |

**Definition of Done:** Entering rate + months shows correct EMI; amortization table shows principal increasing and interest decreasing each month.

---

### Phase 6 — Polish & Production Readiness (Week 6)
> UI refinement, documentation, production integration stubs

| Task | Priority | Status |
|---|---|---|
| [ ] All-SAR currency conversion (remove AED from display) | 🔴 High | Done |
| [ ] Top bar branding (FH logo, subtitle) | 🟡 Medium | Done |
| [ ] Remove non-production UI elements | 🟡 Medium | Done |
| [ ] CALCULATIONS.md documentation | 🟢 Low | Done |
| [ ] UAE PASS production placeholder | 🟢 Low | Done |
| [ ] Real database integration | 🔴 High | Pending |
| [ ] CI/CD pipeline | 🟡 Medium | Pending |
| [ ] Load testing | 🟡 Medium | Pending |

**Definition of Done:** System demo-ready for stakeholder review; all calculations documented; production blockers identified.

---

## 5. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| gold-api.com downtime | Medium | High | Fallback to `FALLBACK_USD_OZ = 3300.0`; cached last-known price |
| ML model predicts wrong direction | Medium | Medium | 65/35 long/short blend; 1-year window smooths short-term dips |
| UAE PASS API unavailable | High | Low | Stub returns local DB data; graceful degradation built in |
| Data file missing at startup | Low | High | `FileNotFoundError` raised with clear message; `seed_data.py` instructions in README |
| Port conflict (8001 hardcoded) | Low | Medium | Document clearly; make configurable via env var in production |
| Currency confusion (SAR vs AED) | Medium | Medium | All amounts now unified in SAR; field names use `_sar` suffix |

---

## 6. Dependencies

### External
| Dependency | Purpose | Risk if unavailable |
|---|---|---|
| `api.gold-api.com/price/XAU` | Live gold spot price | Fallback to 3300 USD/oz hardcoded constant |
| UAE PASS API (`id.uaepass.ae`) | Identity verification | Stub returns local profile data |

### Internal
| Dependency | Required By |
|---|---|
| `data/gold_history.json` | `gold_service.py` — ML model training |
| `data/dummy_customers.json` | `customer_service.py` |
| `data/dummy_loans.json` | `customer_service.py` |
| Backend running on port 8001 | Frontend `BACKEND_BASE_URL` hardcoded |

---

## 7. Definition of Done (Overall)

- [ ] All API endpoints return correct SAR-denominated values
- [ ] LTV never exceeds 75% for any input combination
- [ ] Gold price chart shows 3 historical months + current dot + forecast
- [ ] EMI calculator produces correct reducing-balance and bullet payment amounts
- [ ] Amortization schedule interest column decreases monotonically
- [ ] Risk bars correctly reflect 0–100 scores with colour zones
- [ ] No AED values displayed in UI (all SAR)
- [ ] CALCULATIONS.md, ARCHITECTURE.md, BRD.md, PLAN.md written
- [ ] Backend starts cleanly from `uvicorn main:app --reload --port 8001`
- [ ] Frontend builds cleanly from `npm run build`
