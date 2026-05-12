# PLAN.md — Spec-Driven Development Plan

**Project:** Gold Loan Valuation & Eligibility Dashboard  
**Client:** Finance House Dubai  
**Version:** 1.0  
**Date:** 2026-05-08

---

## 1. Project Overview & Purpose

The Gold Loan Valuation & Eligibility Dashboard is an internal tool for Finance House Dubai's credit officers and loan advisors. It automates the assessment of gold-backed loan applications — calculating real-time gold valuations, determining the Loan-to-Value (LTV) ratio with multi-factor adjustments, scoring borrower risk, predicting future gold price trajectories using an ML pipeline, and issuing an instant eligibility decision (Pre-Approved / Manual Review / Rejected).

The system replaces manual spreadsheet-based appraisals with a structured, auditable, and real-time digital workflow.

---

## 2. Goals and Success Criteria

| Goal | Success Criterion |
|------|-------------------|
| Accurate real-time gold valuation | Live XAU/USD rate fetched on every request; fallback triggers gracefully |
| Correct LTV calculation | All 6 multiplier factors applied per formula in CALCULATIONS.md |
| ML gold price prediction | Blended polynomial + linear model; predictions anchored to live price |
| Borrower risk scoring | User and company risk 0–100 computed from CIBIL, EMI history, profession, gold trend |
| Eligibility decision | System decision (Pre-Approved / Manual Review) with auditable remarks |
| UAE PASS identity enrichment | Customer data enrichable via UAE PASS (stub → real integration path documented) |
| API-first backend | All logic exposed via documented FastAPI endpoints with Swagger UI |
| Responsive frontend | Dashboard renders on desktop; calculator and summary screens functional |

---

## 3. Scope

### In-Scope
- Gold loan eligibility calculation (LTV, valuation, eligible amount)
- Multi-factor LTV adjustment engine (carat, gold type, tenure, CIBIL, profession, trend)
- ML gold price prediction (polynomial + linear blend, 6–48 months)
- User and company risk scoring
- Live gold price feed (gold-api.com → AED/gram conversion)
- Customer profile and loan history lookup (from seeded JSON data)
- UAE PASS identity stub (3 hardcoded IDs; production path documented)
- Frontend calculator form + summary dashboard
- FastAPI backend with Swagger documentation
- Today's Gold Loan Score (1–10 market timing signal for officers)

### Out-of-Scope
- Real database (PostgreSQL / MongoDB) — current data layer uses JSON files
- Production UAE PASS OAuth integration
- Loan origination / application submission workflow
- Document upload (KYC, income proof)
- Payment / EMI scheduling
- Notifications (SMS, email, push)
- Multi-tenancy or multi-branch support
- Role-based access control / authentication
- Mobile application (iOS / Android)
- Audit logging to persistent store

---

## 4. Milestones & Phases

```
Phase 1 ─ Foundation          Week 1–2
Phase 2 ─ Core Engine         Week 2–4
Phase 3 ─ ML & Gold Feed      Week 3–5
Phase 4 ─ Risk & Decision     Week 4–6
Phase 5 ─ Frontend Dashboard  Week 5–8
Phase 6 ─ Integration & QA    Week 8–10
Phase 7 ─ Hardening & Docs    Week 10–12
```

---

## 5. Task Breakdown per Phase

### Phase 1 — Foundation

| Task | Priority | Status |
|------|----------|--------|
| [ ] Set up FastAPI project structure (`backend/`, `services/`, `data/`) | 🔴 High | Done |
| [ ] Define Pydantic models (`models.py`) — enums, request/response | 🔴 High | Done |
| [ ] Configure CORS middleware | 🔴 High | Done |
| [ ] Set up Vite + React + Tailwind CSS v4 frontend | 🔴 High | Done |
| [ ] Implement `/health` endpoint | 🟡 Medium | Done |
| [ ] Write `seed_data.py` to generate dummy customer and loan JSON | 🔴 High | Done |

**Definition of Done:** Backend starts on port 8001, returns 200 on `/health`. Frontend dev server starts on port 5173.

---

### Phase 2 — Core LTV Engine

| Task | Priority | Status |
|------|----------|--------|
| [ ] Implement `loan_calculator.py` — gold valuation formula | 🔴 High | Done |
| [ ] Implement carat purity map + carat multiplier | 🔴 High | Done |
| [ ] Implement gold type multiplier (Coin / Jewellery / Stone) | 🔴 High | Done |
| [ ] Implement tenure factor | 🔴 High | Done |
| [ ] Implement CIBIL factor + missed EMI penalty | 🔴 High | Done |
| [ ] Implement active loan factor | 🔴 High | Done |
| [ ] Implement profession factor | 🔴 High | Done |
| [ ] Implement gold trend factor | 🔴 High | Done |
| [ ] Implement `_make_decision()` scoring logic | 🔴 High | Done |
| [ ] Implement `LTVBreakdown` delta calculations | 🟡 Medium | Done |
| [ ] Wire `/loan/calculate` POST endpoint | 🔴 High | Done |

**Definition of Done:** `POST /loan/calculate` with a seeded Emirates ID returns a complete `LoanCalculationResponse` with correct `final_ltv_pct` within 1% of manual calculation.

---

### Phase 3 — ML Gold Price Prediction & Live Feed

| Task | Priority | Status |
|------|----------|--------|
| [ ] Source and validate `gold_history.json` (20-year AED/oz data) | 🔴 High | Done |
| [ ] Implement `_load_history()` — parse and sort JSON | 🔴 High | Done |
| [ ] Implement Model A: Polynomial degree-3 Ridge regression | 🔴 High | Done |
| [ ] Implement Model B: Linear regression on last 365 days | 🔴 High | Done |
| [ ] Implement 65/35 blend + live-price anchor | 🔴 High | Done |
| [ ] Add compounding noise model | 🟡 Medium | Done |
| [ ] Implement `fetch_live_gold_price_aed_karats()` with fallback | 🔴 High | Done |
| [ ] Implement `/gold/price` and `/api/gold-rate/live` endpoints | 🔴 High | Done |
| [ ] Implement `/api/gold-loan-score/today` (1–10 timing score) | 🟡 Medium | Done |
| [ ] Build display history (last 3 months, averaged by month) | 🟡 Medium | Done |

**Definition of Done:** `/gold/price` returns AED/gram within 0.01% of manual conversion from XAU/USD spot. Prediction chart shows smooth curve anchored to live price.

---

### Phase 4 — Risk Analysis

| Task | Priority | Status |
|------|----------|--------|
| [ ] Implement `_user_risk()` — CIBIL + EMI + active loans + profession + balance | 🔴 High | Done |
| [ ] Implement `_company_risk()` — user contrib + LTV risk + market risk | 🔴 High | Done |
| [ ] Implement risk labels (LOW / MEDIUM / HIGH / VERY HIGH) | 🟡 Medium | Done |
| [ ] Wire `build_risk_insights()` into `/loan/calculate` pipeline | 🔴 High | Done |
| [ ] Implement UAE PASS stub (`uaepass_service.py`) | 🟡 Medium | Done |
| [ ] Document real UAE PASS integration path | 🟢 Low | Done |

**Definition of Done:** Risk scores fall within expected bands for all 3 seeded Emirates IDs. Company risk is lower than user risk when gold trend is RISING.

---

### Phase 5 — Frontend Dashboard

| Task | Priority | Status |
|------|----------|--------|
| [ ] Build `GoldLoanWorkspace` calculator form (carat, Emirates ID, weight, tenure, profession, gold type) | 🔴 High | Done |
| [ ] Integrate live gold rate display (karat table with AED/gram) | 🔴 High | Done |
| [ ] Build today's loan score panel (1–10, label, guidance) | 🟡 Medium | Done |
| [ ] Build reverse calculator (desired loan → gold weight needed) | 🟡 Medium | Done |
| [ ] Build SummaryScreen — hero section (decision, LTV, eligible amount) | 🔴 High | Done |
| [ ] Build CIBIL gauge (SVG arc) | 🟡 Medium | Done |
| [ ] Build risk gauge (SVG arc) | 🟡 Medium | Done |
| [ ] Build LTV breakdown table | 🔴 High | Done |
| [ ] Build gold price chart (historical + predicted polyline) | 🟡 Medium | Done |
| [ ] Build customer profile section | 🔴 High | Done |
| [ ] Build loan history section | 🔴 High | Done |
| [ ] Wire form submission → `POST /loan/calculate` | 🔴 High | Done |
| [ ] Handle loading, error, empty states | 🟡 Medium | Done |

**Definition of Done:** Calculator form submits, summary screen renders all sections without console errors. Gauges animate. Chart plots historical and predicted lines.

---

### Phase 6 — Integration & QA

| Task | Priority | Status |
|------|----------|--------|
| [ ] End-to-end test with all 3 seeded Emirates IDs | 🔴 High | Pending |
| [ ] Validate LTV calculations match CALCULATIONS.md formulas | 🔴 High | Pending |
| [ ] Test gold API fallback (simulate network failure) | 🟡 Medium | Pending |
| [ ] Test UAE PASS enrichment for 3 known Emirates IDs | 🟡 Medium | Pending |
| [ ] Cross-browser test (Chrome, Safari, Firefox) | 🟡 Medium | Pending |
| [ ] Verify all API error shapes are consistent | 🟡 Medium | Pending |
| [ ] CORS validation (frontend → backend on correct ports) | 🔴 High | Pending |

**Definition of Done:** All 3 seeded IDs return correct, consistent responses. No uncaught exceptions in backend or console errors in frontend.

---

### Phase 7 — Hardening & Documentation

| Task | Priority | Status |
|------|----------|--------|
| [ ] Tighten CORS origins for production | 🔴 High | Pending |
| [ ] Add input validation error handling (422 shapes) | 🟡 Medium | Pending |
| [ ] Write CALCULATIONS.md (formula reference) | 🔴 High | Done |
| [ ] Write CLAUDE.md (codebase guide) | 🟡 Medium | Done |
| [ ] Write docs/BRD.md, PRD.md, FRD.md, SPEC.md | 🟢 Low | Pending |
| [ ] Document ENV vars in ENV.md | 🟡 Medium | Pending |
| [ ] Document UAE PASS production setup steps | 🟡 Medium | Pending |

**Definition of Done:** All documentation complete. Production checklist reviewed.

---

## 6. Risks and Mitigation Strategies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `gold-api.com` downtime | Medium | High | Hardcoded fallback `FALLBACK_USD_OZ = 3300.0`; displayed to user as "(fallback)" |
| `gold_history.json` missing | Low | High | `FileNotFoundError` raised at startup with clear message |
| Emirates ID not seeded | Medium | Medium | 404 returned with actionable error message |
| CIBIL/UAE PASS data mismatch | Low | Medium | UAE PASS enrichment is best-effort; original customer data used on failure |
| ML model drift (outdated history) | Low | Medium | History file is static; document refresh procedure |
| Port conflict (8001 hardcoded) | Medium | High | Documented in CLAUDE.md; CORS also hardcoded to `*` during dev |
| Frontend build/bundle issues | Low | Low | Vite build is standard; ESLint configured |

---

## 7. Dependencies

### Internal
| Dependency | Used By |
|------------|---------|
| `data/gold_history.json` | `gold_service.py` — required at startup |
| `data/dummy_customers.json` | `customer_service.py` — required for Emirates ID lookup |
| `data/dummy_loans.json` | `customer_service.py` — required for loan history |
| `backend/.venv` | All backend services |

### External
| Dependency | Purpose | Fallback |
|------------|---------|---------|
| `api.gold-api.com/price/XAU` | Live gold spot price | `FALLBACK_USD_OZ = 3300.0` |
| UAE PASS OAuth API | Identity enrichment | Stub hardcoded for 3 Emirates IDs |
| `scikit-learn` | ML regression pipeline | NumPy polyfit fallback |
| `numpy` | Numerical computation | Required; no fallback |
| `httpx` | Async HTTP client | Required |

---

## 8. Definition of Done (Per Phase Summary)

| Phase | Done When |
|-------|-----------|
| Phase 1 — Foundation | Both servers start without errors |
| Phase 2 — LTV Engine | `/loan/calculate` returns correct LTV breakdown |
| Phase 3 — ML & Gold | Live price and predictions render in Swagger and frontend |
| Phase 4 — Risk | Risk scores and labels correct for all seeded profiles |
| Phase 5 — Frontend | All screens render; form → summary flow works end-to-end |
| Phase 6 — QA | All seeded IDs pass; no regressions |
| Phase 7 — Hardening | Docs complete; production checklist clear |
