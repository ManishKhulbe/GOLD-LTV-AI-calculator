# FRD.md — Functional Requirements Document
# Gold Loan Valuation & Eligibility Dashboard — Finance House Dubai

**Version:** 1.0  
**Date:** 2026-05-08  
**Status:** Draft  
**Source:** BRD v1.0 (docs/BRD.md) · PRD v1.0 (docs/PRD.md)

---

## 1. Document Purpose

This document provides the complete technical specification for implementing the Gold Loan Valuation & Eligibility Dashboard. It translates product requirements (PRD) and business requirements (BRD) into precise, developer-actionable functional specifications: input/process/output definitions, use case flows, business rules, data contracts, API interfaces, error handling, and measurable non-functional targets.

Audience: backend engineers, frontend engineers, QA engineers, and technical leads.

---

## 2. System Overview

The system is a two-tier web application:

- **Frontend:** React 19 SPA served by Vite on port 5173. Single entry point (`App.jsx`). Two screens: Calculator and Summary. Communicates with backend via `fetch` over HTTP.
- **Backend:** FastAPI 0.110+ ASGI application served by Uvicorn on port 8001. Stateless; all state is derived per request. Five service modules handle gold pricing, customer lookup, LTV calculation, risk scoring, and identity enrichment.
- **External dependency:** `api.gold-api.com/price/XAU` — live XAU/USD price feed (HTTPS, no auth required for current tier).
- **Data sources:** `backend/data/gold_history.json` (static), `dummy_customers.json` (seeded), `dummy_loans.json` (seeded).

All monetary outputs are in **AED** (UAE Dirham). Display of SAR is reference-only.

---

## 3. Functional Requirements Table

| ID | Feature | Description | Input | Process | Output | Priority | Acceptance Criteria |
|----|---------|-------------|-------|---------|--------|----------|---------------------|
| FR-001 | Live Gold Rate Fetch | Retrieve current XAU/USD price and convert to AED/gram for all karats | Triggered on page load; no user input | Call `GET https://api.gold-api.com/price/XAU`; divide USD/oz by 31.1035; multiply by 3.6725; apply karat purity fractions | `{ "24K": float, "22K": float, "21K": float, "18K": float, "14K": float }` in AED/gram | Must Have | All 5 karats present; values differ by purity ratio; fallback activates within 8s on API failure |
| FR-002 | Gold Price Fallback | Use `FALLBACK_USD_OZ = 3300.0` when external API is unreachable | httpx timeout or non-2xx response | Catch exception; substitute fallback constant; tag response as fallback | Same karat dict with `updated_at` containing "fallback" substring | Must Have | Fallback label visible in UI; calculation continues without error |
| FR-003 | Today's Gold Loan Score | Compute 1–10 ML-based market timing score | Triggered on page load; calls `build_gold_insights(12)` | Compute 12-month predicted change %; map to score using 5 threshold bands (≥5% → 8–10; ≥2% → 6–8; ±2% → 4–6; ≥-8% → 2–4; < -8% → 1–2); assign label and guidance text | `{ score, label, market_condition, guidance, tone, predicted_change_pct }` | Should Have | Score in [1.0, 10.0]; label one of: EXCELLENT TIME / GOOD TIME / STABLE MARKET / WAIT IF YOU CAN / POOR TIME |
| FR-004 | Application Form Submission | Accept 6 fields from loan officer; validate; send to calculation API | `emirates_id` (string), `carat` (enum), `gold_type` (enum), `gold_weight_grams` (float > 0), `tenure_months` (enum), `job_profession` (enum) | Validate all fields non-empty; validate Emirates ID matches `784-\d{4}-\d{7}-\d`; POST to `/loan/calculate` | Navigate to Summary screen with full `LoanCalculationResponse`; or show inline error | Must Have | Valid inputs → HTTP 200; unknown Emirates ID → HTTP 404 with `detail`; missing field → client-side validation before submit |
| FR-005 | Gold Valuation (AED) | Compute AED value of submitted gold | `gold_weight_grams`, `carat`, `live_price_aed_per_gram` from gold service | `pure_grams = weight × CARAT_PURITY[carat]`; `gold_valuation_aed = pure_grams × live_price_aed_per_gram` | `gold_valuation_aed: float` | Must Have | 100g 22K at AED 350.00/g → AED 32,083.33 (± 0.01 rounding tolerance) |
| FR-006 | LTV Computation | Apply full multiplier chain to derive final LTV % | `carat`, `gold_type`, `tenure_months`, `cibil_score`, `missed_emis`, `active_loans`, `job_profession`, `gold_trend` | `final_ltv = 0.75 × carat_mult × gold_type_mult × tenure_mult × cibil_factor × emi_penalty × active_loan_factor × profession_factor × trend_factor`; apply `min(final_ltv, 0.75)` hard cap | `recommended_ltv_pct: float` (≤ 75.00) | Must Have | LTV never exceeds 75.00 for any input combination |
| FR-007 | Eligible Loan Amount | Compute current and future eligible loan amounts | `gold_valuation_aed`, `final_ltv`, `future_gold_valuation_aed` | `eligible = gold_valuation_aed × final_ltv`; `future_eligible = future_gold_valuation_aed × final_ltv × 0.97` | `eligible_loan_amount_aed`, `future_eligible_loan_amount_aed`, `future_gold_valuation_aed` | Must Have | Future eligible ≤ current eligible × 1.05 × 0.97 (growth bounded by ML prediction) |
| FR-008 | Eligibility Decision | Issue Pre-Approved or Manual Review with remarks | `cibil_score`, `missed_emis`, `active_loans`, `gold_trend`, `final_ltv` | Point scoring: CIBIL (+3/+2/+1/−2); missed EMIs (+2/0/−2); active loans (+1/0/−1); trend (+1/0/−1); score ≥ 5 → Pre-Approved (strong); 2–4 → Pre-Approved (standard); 0–1 → Manual Review; < 0 → Manual Review (high risk) | `system_decision: "Pre-Approved" \| "Manual Review"`, `remarks: string` | Must Have | CIBIL 780, 0 missed EMIs, 0 active loans, RISING → Pre-Approved; CIBIL < 580, > 5 missed EMIs → Manual Review |
| FR-009 | LTV Breakdown Display | Show per-factor adjustment deltas | All LTV multiplier inputs | Compute delta contribution of each factor against running product | `LTVBreakdown` object with 8 delta fields + `final_ltv_pct` | Must Have | Sum of base + all deltas ≈ final_ltv_pct (within floating point tolerance) |
| FR-010 | CIBIL Label | Map numeric CIBIL score to human label | `cibil_score: int` | Threshold lookup: ≥760→Excellent; ≥720→Very Good; ≥680→Good; ≥640→Fair; ≥580→Poor; else→Very Poor | `cibil_label: string` | Must Have | Boundary values: 760→Excellent; 759→Very Good; 580→Poor; 579→Very Poor |
| FR-011 | Customer Profile Lookup | Load customer by Emirates ID | `emirates_id: string` | Load `dummy_customers.json`; match by `emirates_id` field; return `CustomerProfile` | `CustomerProfile` object or `None` | Must Have | Known ID → profile returned; unknown ID → HTTP 404; malformed ID → HTTP 422 |
| FR-012 | Loan History Lookup | Load loan records for a customer | `emirates_id: string` | Load `dummy_loans.json`; filter by Emirates ID; aggregate counts and totals | `LoanHistoryOverview` (total, active, closed, missed_emis, outstanding, items list) | Must Have | Returned totals consistent with raw loan items |
| FR-013 | UAE PASS Enrichment | Attempt to enrich customer profile with UAE PASS verified identity | `emirates_id: string` | Look up `_STUB_PROFILES` dict; if found, `model_copy` with overrides for name, nationality, mobile, gender, email, Arabic fields; set `uaepass_verified = True` | Updated `CustomerProfile`; `uaepass_verified: bool` | Should Have | Known stub IDs → enriched profile with `uaepass_verified: true`; unknown ID → original profile unchanged; enrichment failure must not block calculation |
| FR-014 | User Risk Score | Compute borrower risk score 0–100 | `cibil_score`, `missed_emis`, `active_loans`, `job_profession`, `outstanding_balance`, `eligible_loan_aed` | Sum 5 components: CIBIL (max 40), missed EMI (max 20), active loans (max 15), profession (max 15), balance ratio (max 10); `min(sum, 100)` | `user_risk_score: float`, `user_risk_label: string` | Must Have | CIBIL 760 + 0 EMI + 0 loans + Gov + no balance → score = 5; all worst-case inputs → score = 100 |
| FR-015 | Company Risk Score | Compute institution exposure score 0–100 | `user_risk_score`, `final_ltv_pct`, `gold_trend`, `predicted_change_pct`, `tenure_months` | `company = (user_risk × 0.40) + ltv_risk_pts + market_risk_pts`; `min(company, 100)` | `company_risk_score: float`, `company_risk_label: string`, `company_risk_exposure: string` | Must Have | LTV ≤ 60 + RISING ≥ 5% → company risk ≤ 47 regardless of user risk; FALLING ≤ −5% + tenure ≤ 6 → market component = 25 |
| FR-016 | Reverse Calculator | Compute gold weight needed for a target loan amount | `desired_loan_aed: float`, `live_rates: dict` | For each karat: `grams = desired_loan_aed / live_rate_per_gram` | Table of `{ karat, grams_required }` for all 5 karats | Should Have | Result updates on user input change; zero or negative amount → no output; stale rates accepted if live fetch failed |
| FR-017 | Gold Price Prediction | Build ML forecast for N months | `tenure_months: int (1–36)` | Load history; fit poly-3 Ridge (all 20 years) + linear (last 365 days); blend 65/35; anchor to live price; add compounding noise σ = 0.6% × price × √month | `predicted_prices: List[GoldPricePoint]`, `predicted_change_pct`, `trend`, `predicted_end_price_aed_per_gram` | Must Have | `predicted_prices` length = `tenure_months`; day-0 of prediction ≈ live price (anchor applied) |
| FR-018 | Historical Gold Prices | Return last 3 months of gold price history for chart | `gold_history.json` | Filter last 90 days; group by calendar month; average; convert USD/oz → AED/gram | `historical_prices: List[GoldPricePoint]` (3 points) | Should Have | 3 data points returned; prices in AED/gram; dates are last day of each month |
| FR-019 | Health Check | Confirm API is running | None | Return static JSON | `{ "status": "ok", "service": "..." }` HTTP 200 | Must Have | Always returns 200 while process is running |

---

## 4. Use Case Specifications

### UC-001: Process Gold Loan Application

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-001 |
| **Name** | Process Gold Loan Application |
| **Actor(s)** | Loan Officer (Omar) |
| **Preconditions** | Dashboard loaded; live gold rates displayed; customer present with gold |

**Main Flow:**
1. Loan Officer enters Emirates ID in format `784-YYYY-XXXXXXX-C`.
2. Loan Officer selects carat (24K / 22K / 21K / 18K / 14K).
3. Loan Officer selects gold type (Coin / Jewellery / Stone Jewellery).
4. Loan Officer enters gold weight in grams (positive decimal).
5. Loan Officer selects loan tenure (6 / 12 / 18 / 24 / 36 / 48 months).
6. Loan Officer selects job profession from dropdown.
7. Loan Officer clicks Calculate.
8. System validates all 6 fields client-side; if valid, POSTs to `/loan/calculate`.
9. System loads customer profile and loan history from data files.
10. System attempts UAE PASS enrichment; updates profile if found.
11. System fetches live XAU/USD; converts to AED/gram per karat (or applies fallback).
12. System builds ML gold insights for the selected tenure.
13. System applies LTV multiplier chain; derives eligible loan amount and decision.
14. System computes user and company risk scores.
15. System returns full `LoanCalculationResponse`.
16. Frontend navigates to Summary screen displaying all output sections.

**Alternate Flows:**
- **A1 — Unknown Emirates ID (step 9):** Backend returns HTTP 404; frontend displays error message "Emirates ID not found"; officer remains on calculator screen.
- **A2 — Form validation failure (step 8):** Browser-side validation highlights empty or invalid fields; POST is not sent.
- **A3 — Gold API unavailable (step 11):** Fallback price used; summary screen shows "live rate unavailable — fallback applied" warning banner.
- **A4 — UAE PASS unavailable (step 10):** Enrichment silently skipped; original profile used; `uaepass_verified = false`.

**Postconditions:** Summary screen rendered with complete eligibility decision, LTV breakdown, risk scores, and gold price chart.

---

### UC-002: View LTV Breakdown for Audit

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-002 |
| **Name** | Review LTV Factor Breakdown |
| **Actor(s)** | Credit Analyst (Fatima) |
| **Preconditions** | UC-001 completed; Summary screen visible |

**Main Flow:**
1. Credit Analyst reads the LTV breakdown section on Summary screen.
2. System displays base LTV (75%) and 7 signed delta values (carat, gold type, tenure, CIBIL, active loans, profession, gold trend).
3. Credit Analyst reads `final_ltv_pct` confirming the sum of base + deltas.
4. Credit Analyst reads `cibil_score` with label (e.g., "780 — Excellent").
5. Credit Analyst reads plain-language decision remark.

**Alternate Flows:**
- **A1 — LTV would exceed 75%:** System applies `min(final_ltv, 0.75)` hard cap; breakdown still shows all individual factors but final value is capped.

**Postconditions:** Analyst can reconstruct the LTV derivation from base → final using displayed deltas.

---

### UC-003: Use Reverse Calculator

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-003 |
| **Name** | Reverse Gold Weight Calculator |
| **Actor(s)** | Customer-Facing Officer (Aisha) |
| **Preconditions** | Dashboard loaded; live gold rates present |

**Main Flow:**
1. Officer enters desired loan amount in AED into the reverse calculator input.
2. Officer clicks Calculate (or input fires on change).
3. System divides desired amount by live AED/gram rate for each karat.
4. System displays a table: Karat | Grams Required for all 5 karats.
5. Officer reads grams and advises customer.

**Alternate Flows:**
- **A1 — Zero or negative amount entered:** System shows no output; input field shows validation hint.
- **A2 — Live rates not yet loaded:** System uses last known rates; if none, shows "rates unavailable" and disables output.

**Postconditions:** Officer has grams-per-karat figures to communicate to customer.

---

### UC-004: Review Risk Dashboard

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-004 |
| **Name** | Review Dual Risk Scores |
| **Actor(s)** | Risk Manager (Khalid) |
| **Preconditions** | UC-001 completed; Summary screen visible |

**Main Flow:**
1. Risk Manager reads user risk gauge: score (0–100) and label (LOW / MEDIUM / HIGH / VERY HIGH).
2. Risk Manager reads company risk gauge: score and exposure label.
3. Risk Manager correlates: notes that high user risk + RISING gold may still yield low company risk (collateral offset).
4. Risk Manager reads gold trend label and predicted change % to understand collateral trajectory.

**Alternate Flows:** None — risk scores always computed; no optional path.

**Postconditions:** Risk Manager has documented risk figures for both borrower and institution on this specific application.

---

### UC-005: Page Load Market Data

| Field | Detail |
|-------|--------|
| **Use Case ID** | UC-005 |
| **Name** | Load Live Gold Rates and Today's Score on Page Start |
| **Actor(s)** | Any user |
| **Preconditions** | Browser navigates to dashboard URL |

**Main Flow:**
1. Browser loads React app.
2. `useEffect` triggers two parallel fetches: `GET /api/gold-rate/live` and `GET /api/gold-loan-score/today`.
3. System fetches XAU/USD; derives karat rates in AED/gram; returns JSON.
4. System runs 12-month gold prediction; maps predicted change % to 1–10 score; returns score object.
5. UI renders live rate ticker (5 karats) and Today's Loan Score badge with label.

**Alternate Flows:**
- **A1 — Either fetch fails:** Fallback price used for rates; score may show loading state or last known value; page remains usable.

**Postconditions:** Officer sees current market context before starting an application.

---

## 5. Business Rules

| Rule ID | Rule | Enforcement Layer |
|---------|------|--------------------|
| BR-001 | LTV must never exceed 75.00% for any input combination | Backend: `min(final_ltv, 0.75)` in `loan_calculator.py` |
| BR-002 | Gold valuation uses karat purity: pure_grams = weight × CARAT_PURITY[carat] | Backend: `loan_calculator.py` |
| BR-003 | AED/USD peg = 3.6725 (fixed); SAR/USD peg = 3.7500 (fixed) | Backend: constants in `gold_service.py` |
| BR-004 | Gold trend factor: RISING ≥5% → 1.05; ≥2% → 1.02; ±2% → 1.00; ≥-5% → 0.95; <-5% → 0.90 | Backend: `_trend_factor()` in `loan_calculator.py` |
| BR-005 | Active loan factor floor = 0.80 (never below, regardless of loan count) | Backend: `max(0.80, 1 - active_loans × 0.06)` |
| BR-006 | Future eligible loan carries a 3% safety buffer: × 0.97 | Backend: `loan_calculator.py` |
| BR-007 | System decision "Pre-Approved" does not mean loan is disbursed; documentation still required | Product rule; surfaced in decision remarks text |
| BR-008 | UAE PASS enrichment is best-effort; failure must not block or degrade the calculation | Backend: try/except in `fetch_uaepass_profile()`; `None` return falls back silently |
| BR-009 | Gold price forecast uses blend: 65% polynomial long-run + 35% linear recent-momentum | Backend: `gold_service.py` constants `W_LONG = 0.65`, `W_RECENT = 0.35` |
| BR-010 | Prediction anchor: day-0 of forecast is set exactly to live price to prevent chart seam | Backend: `anchor_shift = live_usd_per_oz - blend_day0` |
| BR-011 | Company risk is computed separately from user risk; gold trend directly reduces company risk even for risky borrowers | Backend: `risk_analyzer.py`; deliberate decoupling |
| BR-012 | CIBIL score range is 300–900; scores below 580 → "Very Poor" label and 0.65 CIBIL factor | Backend: `_cibil_factor()`, `_cibil_label()` |
| BR-013 | All monetary display values formatted to 2 decimal places with AED prefix | Frontend: `formatAed()` in `App.jsx` |
| BR-014 | Emirates ID must match format `784-YYYY-XXXXXXX-C` before lookup is attempted | Backend validation; returns HTTP 422 on malformed input |
| BR-015 | Missing `gold_history.json` raises `FileNotFoundError` at startup; system must not start with corrupt or absent history file | Backend: `_load_history()` in `gold_service.py` |

---

## 6. Data Requirements

### 6.1 Request Fields

| Field | Type | Validation | Enum Values |
|-------|------|-----------|-------------|
| `emirates_id` | string | Required; pattern `784-\d{4}-\d{7}-\d` | — |
| `carat` | string (enum) | Required; one of CaratType | 24K, 22K, 21K, 18K, 14K |
| `gold_type` | string (enum) | Required; one of GoldType | Coin, Jewellery, Stone Jewellery |
| `gold_weight_grams` | float | Required; > 0 | — |
| `tenure_months` | int (enum) | Required; one of TenureMonths | 6, 12, 18, 24, 36, 48 |
| `job_profession` | string (enum) | Required; one of JobProfession | Government Employee, Private Employee, Business Owner, Self Employed, Retired, Freelancer |

### 6.2 Customer Profile Fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `customer_name` | string | `dummy_customers.json` / UAE PASS override | |
| `emirates_id` | string | `dummy_customers.json` | Primary key |
| `nationality` | string | `dummy_customers.json` / UAE PASS override | |
| `mobile` | string | `dummy_customers.json` / UAE PASS override | |
| `customer_type` | string | `dummy_customers.json` | "Existing" or "New" |
| `risk_category` | enum | `dummy_customers.json` | A+, A, B+, B, C, D |
| `cibil_score` | int | `dummy_customers.json` | 300–900 |
| `gender` | string? | UAE PASS only | Optional |
| `email` | string? | UAE PASS only | Optional |
| `full_name_ar` | string? | UAE PASS only | Optional; Arabic script |
| `nationality_ar` | string? | UAE PASS only | Optional; Arabic script |
| `uaepass_verified` | bool | Computed | Default false |

### 6.3 Loan History Item Fields

| Field | Type | Validation |
|-------|------|-----------|
| `loan_id` | string | Unique |
| `tenure_months` | int | > 0 |
| `status` | enum | ACTIVE, CLOSED, DEFAULTED |
| `missed_emis` | int | ≥ 0 |
| `amount` | float | > 0 |
| `outstanding_balance` | float | ≥ 0 |

### 6.4 Gold History File Schema

```
gold_history.json format:
[
  { "day": "YYYY-MM-DD", "max_price": float },
  ...
]
```
- `day`: ISO 8601 date string; only first 10 characters parsed.
- `max_price`: price in AED per troy ounce. Must be > 0; rows with 0 or invalid values are silently skipped.
- File must contain data spanning at least 365 days for momentum model to have sufficient data.
- File must cover at least 5 years for polynomial model to be meaningful.

### 6.5 Computed Output Fields

| Field | Type | Range | Notes |
|-------|------|-------|-------|
| `recommended_ltv_pct` | float | (0, 75.00] | Hard cap at 75 |
| `gold_valuation_aed` | float | > 0 | Rounded to 2 dp |
| `eligible_loan_amount_aed` | float | > 0 | = valuation × ltv |
| `future_eligible_loan_amount_aed` | float | > 0 | = future_valuation × ltv × 0.97 |
| `user_risk_score` | float | [0, 100] | Lower = safer |
| `company_risk_score` | float | [0, 100] | Lower = safer |
| `predicted_change_pct` | float | Unbounded | Typically −30 to +30 |
| `today_loan_score` | float | [1.0, 10.0] | |

---

## 7. System Interface Requirements

### 7.1 Backend API (Internal — consumed by frontend)

| Endpoint | Method | Auth | Rate Limit | Timeout |
|----------|--------|------|-----------|---------|
| `/health` | GET | None | None | — |
| `/api/gold-rate/live` | GET | None | None | 8s (external dependency) |
| `/api/gold-loan-score/today` | GET | None | None | 8s (includes ML pipeline) |
| `/gold/insights` | GET | None | None | 8s |
| `/gold/price` | GET | None | None | 8s |
| `/customer/{emirates_id}` | GET | None | None | 500ms |
| `/customer/{emirates_id}/loans` | GET | None | None | 500ms |
| `/loan/calculate` | POST | None | None | 10s |

**CORS:** Currently `allow_origins=["*"]`. Production: restrict to known frontend origin.

### 7.2 External API — gold-api.com

| Property | Value |
|----------|-------|
| Endpoint | `https://api.gold-api.com/price/XAU` |
| Method | GET |
| Auth | None (public tier) |
| Response field used | `price` (float, USD per troy oz), `updatedAtReadable` (string) |
| Timeout | 8 seconds (httpx) |
| Fallback | `FALLBACK_USD_OZ = 3300.0` |
| Expected response shape | `{ "price": float, "updatedAtReadable": string, ... }` |

### 7.3 External API — UAE PASS (stubbed in v1)

| Property | Value |
|----------|-------|
| Token endpoint | `POST https://id.uaepass.ae/idshub/token` |
| Profile endpoint | `GET https://id.uaepass.ae/idshub/userinfo` |
| Grant type | client_credentials |
| Scope | `urn:uae:digitalid:profile` |
| Credentials | `UAEPASS_CLIENT_ID`, `UAEPASS_CLIENT_SECRET` from `.env` |
| Security check | Returned `idn` field must match requested Emirates ID |
| Fallback | Silent None; calculation proceeds without enrichment |
| Current state | Stub; returns hardcoded profiles for 3 known Emirates IDs |

### 7.4 Frontend → Backend Interface

- All requests use `Content-Type: application/json`.
- Error responses use FastAPI default format: `{ "detail": string | list }`.
- Frontend displays `detail` field from 4xx responses to the user.
- No cookies, sessions, or tokens in v1.
- `BACKEND_BASE_URL = 'http://127.0.0.1:8001'` hardcoded in `App.jsx`; must be moved to `VITE_API_BASE` env variable before v1.1.

---

## 8. Error Handling & Edge Cases

| Scenario | Layer | Behaviour | User-Facing Message |
|----------|-------|-----------|---------------------|
| Unknown Emirates ID | Backend | HTTP 404 with `detail` | "Emirates ID not found in the system." |
| Malformed Emirates ID | Backend | HTTP 422 (Pydantic validation) | Pydantic `detail` array; frontend shows first message |
| `gold_weight_grams ≤ 0` | Backend | HTTP 422 | "gold_weight_grams must be greater than 0" |
| Invalid enum value (carat/tenure/etc.) | Backend | HTTP 422 | Pydantic enum error |
| `gold-api.com` timeout | Backend | Fallback price used; `updated_at` contains "fallback" | Banner: "Live gold rate unavailable — using fallback rate" |
| `gold-api.com` non-2xx | Backend | Same as timeout | Same |
| `gold_history.json` missing | Backend | `FileNotFoundError` at startup | Server does not start; check logs |
| `gold_history.json` corrupt / empty | Backend | Rows with invalid values skipped; if < 5 rows survive, linear model falls back to flat constant | Calculation proceeds; prediction accuracy degraded |
| UAE PASS API failure | Backend | Silent fallback to local profile; `uaepass_verified = False` | No visible error; UAE PASS badge not shown |
| UAE PASS IDN mismatch | Backend | Returns None; original profile used | No visible error |
| All form fields empty (frontend) | Frontend | Submit blocked; validation highlights empty fields | Inline "required" labels |
| Backend unreachable | Frontend | Catch in `submitValuation()`; `setStatusMessage(error.message)` | Error displayed in status bar above form |
| Network timeout on calculation | Frontend | `isSubmitting = false`; error message shown | "Network timeout — please try again" |
| `predicted_prices` list empty | Backend | `predicted_end_price_aed = live_aed_per_gram` fallback | Chart shows historical only; no crash |
| Negative `eligible_loan_amount` | Backend | Cannot occur — all multipliers > 0 and valuation > 0 by validation | N/A |

---

## 9. Non-Functional Requirements

### 9.1 Performance

| ID | Requirement | Metric | Target | Measurement |
|----|-------------|--------|--------|-------------|
| NFR-P01 | Page load — live rates visible | Time from navigation to karat rates rendered | P95 < 3 seconds | Chrome DevTools Lighthouse |
| NFR-P02 | Loan calculation end-to-end | Time from form submit to Summary screen rendered | P95 < 2 seconds | `curl -w "%{time_total}"` against local backend |
| NFR-P03 | ML pipeline (`build_gold_insights`) | Server-side computation time | < 200ms | Python `time.perf_counter` in service; log P99 |
| NFR-P04 | Gold API fallback activation | Time from API failure to fallback response returned | < 8 seconds | httpx timeout = 8.0s |
| NFR-P05 | Frontend bundle size | Gzipped JS + CSS transfer | < 500KB | `vite build` output + `gzip -c dist/assets/*.js | wc -c` |
| NFR-P06 | Customer lookup from JSON | Time to load + filter JSON file | < 50ms | Python profiler |

---

### 9.2 Security

| ID | Requirement | Implementation Target |
|----|-------------|-----------------------|
| NFR-S01 | OWASP A01 — Broken Access Control | No write operations exposed; CORS locked to frontend origin in production |
| NFR-S02 | OWASP A03 — Injection | Emirates ID validated against regex `784-\d{4}-\d{7}-\d`; no SQL or shell interpolation |
| NFR-S03 | OWASP A05 — Security Misconfiguration | CORS `allow_origins=["*"]` removed in production; replace with explicit origin |
| NFR-S04 | OWASP A02 — Cryptographic Failures | All external calls (gold-api.com, UAE PASS) use HTTPS only |
| NFR-S05 | Secret management | `UAEPASS_CLIENT_ID`, `UAEPASS_CLIENT_SECRET` in `.env`; `.env` in `.gitignore`; never hardcoded |
| NFR-S06 | No PII in repository | `dummy_customers.json` contains Faker-generated data only; real customer data never seeded in repo |
| NFR-S07 | Rate limiting | All endpoints rate-limited in production (e.g., `slowapi` middleware or nginx `limit_req`) — not implemented in v1 |
| NFR-S08 | Input size limits | `gold_weight_grams` validated > 0 by Pydantic; string fields limited to 100 chars in production |

---

### 9.3 Scalability

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-SC01 | Concurrent loan calculation requests | ≥ 50 simultaneous requests without timeout | FastAPI async handlers + Uvicorn with 4 workers |
| NFR-SC02 | Horizontal scalability | Application is stateless; can run N replicas behind a load balancer | No in-process session or cache state |
| NFR-SC03 | Database migration path | Customer data store replaceable with PostgreSQL without API contract change | `customer_service.py` interface is the only coupling point |
| NFR-SC04 | ML model caching | Fitted models should be cached in memory at startup, not recomputed per request | `_fit_models()` result cached at module level |
| NFR-SC05 | Gold API caching | Live price cached with 60s TTL via Redis or in-process cache to avoid hammering external API | Not implemented in v1; required before > 100 req/min |

---

### 9.4 Accessibility

| ID | Requirement | Standard | Notes |
|----|-------------|----------|-------|
| NFR-A01 | Colour contrast on form labels and buttons | WCAG 2.1 AA (contrast ratio ≥ 4.5:1 for normal text) | Current Tailwind palette to be verified |
| NFR-A02 | All form inputs have associated `<label>` elements | WCAG 2.1 SC 1.3.1 | |
| NFR-A03 | Error messages programmatically associated with inputs | WCAG 2.1 SC 3.3.1 | Use `aria-describedby` on invalid fields |
| NFR-A04 | Keyboard navigation through form fields | WCAG 2.1 SC 2.1.1 | Tab order must follow visual layout |
| NFR-A05 | SVG gauge components have accessible labels | WCAG 2.1 SC 1.1.1 | Add `aria-label` with score value to RiskGauge and CibilGauge |

---

### 9.5 Reliability & Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-R01 | Backend uptime (excl. planned maintenance) | ≥ 99.5% |
| NFR-R02 | Graceful degradation on gold API failure | System continues with fallback; no 500 errors surfaced to user |
| NFR-R03 | Startup check for `gold_history.json` | Process fails fast with clear `FileNotFoundError` if file absent |
| NFR-R04 | UAE PASS failure isolation | Enrichment failure does not propagate; calculation completes |

---

## 10. Traceability Matrix

| FR-ID (FRD) | Feature | BRD FR-ID | PRD Feature ID | Priority |
|-------------|---------|-----------|---------------|----------|
| FR-001 | Live Gold Rate Fetch | FR-01 | M-02 | Must Have |
| FR-002 | Gold Price Fallback | FR-01 (NFR-18) | M-12 | Must Have |
| FR-003 | Today's Gold Loan Score | FR-02 | S-01 | Should Have |
| FR-004 | Application Form Submission | FR-04 | M-01 | Must Have |
| FR-005 | Gold Valuation (AED) | FR-05 | M-03 | Must Have |
| FR-006 | LTV Computation | FR-06 | M-04 | Must Have |
| FR-007 | Eligible Loan Amount (current + future) | FR-06, FR-07 | M-04, S-03 | Must Have / Should Have |
| FR-008 | Eligibility Decision | FR-08 | M-05 | Must Have |
| FR-009 | LTV Breakdown Display | FR-09 | M-10 | Must Have |
| FR-010 | CIBIL Label | FR-10 | M-11 | Must Have |
| FR-011 | Customer Profile Lookup | FR-11 | M-06 | Must Have |
| FR-012 | Loan History Lookup | FR-12 | M-07 | Must Have |
| FR-013 | UAE PASS Enrichment | FR-13 | S-04 | Should Have |
| FR-014 | User Risk Score | FR-14 | M-08 | Must Have |
| FR-015 | Company Risk Score | FR-15 | M-09 | Must Have |
| FR-016 | Reverse Calculator | FR-16 | S-06 | Should Have |
| FR-017 | Gold Price Prediction (ML) | FR-03 | S-02 | Should Have |
| FR-018 | Historical Gold Prices | FR-03 | S-02 | Should Have |
| FR-019 | Health Check | — | — | Must Have |
| NFR-P01–P06 | Performance targets | NFR-01, NFR-02, NFR-03 | PA targets | Must Have |
| NFR-S01–S08 | Security requirements | NFR-05–09 | PC-01, PC-05 | Must Have |
| NFR-SC01–SC05 | Scalability requirements | NFR-10–12 | PA-04 | Should Have |
| NFR-A01–A05 | Accessibility | NFR-13–17 | — | Should Have |
| NFR-R01–R04 | Reliability | NFR-18–20 | M-12 | Must Have |
