# FRD.md — Functional Requirements Document

**Project:** Gold Loan Valuation & Eligibility Dashboard  
**Client:** Finance House Dubai  
**Version:** 1.0  
**Date:** 2026-05-08  
**Source of Truth:** docs/BRD.md

---

## 1. Document Purpose & Scope

This document is the technical translation of the BRD and PRD. It defines every functional requirement in sufficient detail for developers to implement and testers to verify without ambiguity. Each requirement maps to a BRD user story.

---

## 2. System Overview

The system consists of:
- **Frontend:** Single-page React 19 app served on port 5173 via Vite. Two screens: `CalculatorScreen` and `SummaryScreen`.
- **Backend:** FastAPI app served on port 8001. All business logic lives in `backend/services/`.
- **Data:** Three JSON flat files (`dummy_customers.json`, `dummy_loans.json`, `gold_history.json`) in `backend/data/`.
- **External:** `api.gold-api.com` for live XAU/USD price. UAE PASS OAuth (currently stubbed).

---

## 3. Functional Requirements Table

| ID | Feature | Description | Input | Process | Output | Priority | Acceptance Criteria |
|----|---------|-------------|-------|---------|--------|----------|-------------------|
| FR-001 | Live Gold Rate Display | Show AED/gram for karats 24K–14K on page load | None (auto) | `GET /api/gold-rate/live` → XAU/USD → ÷ 31.1035 × 3.6725 × karat purity | Karat table in UI | 🔴 Must Have | Rates shown within 3s; all 5 karats displayed |
| FR-002 | Today's Gold Loan Score | Show 1–10 market timing score with label and guidance | None (auto) | ML prediction for 12-month tenure → `_build_today_gold_loan_score(pct)` | Score widget in UI | 🟡 Should Have | Score 1–10; label matches band in CALCULATIONS.md §6 |
| FR-003 | Loan Application Form | Collect inputs for loan calculation | Emirates ID, carat, gold type, weight (g), tenure (months), profession | Validation → `POST /loan/calculate` | Form submit → SummaryScreen | 🔴 Must Have | All required fields validated before submit |
| FR-004 | Emirates ID Lookup | Auto-fetch customer profile and loan history | Emirates ID string | `get_customer_profile()` + `get_loan_history()` from JSON | CustomerProfile + LoanHistoryOverview | 🔴 Must Have | 200 for 3 seeded IDs; 404 for unknown |
| FR-005 | UAE PASS Enrichment | Overlay verified identity data on customer profile | Emirates ID | `fetch_uaepass_profile()` → merge into CustomerProfile | Enriched profile with `uaepass_verified: true` | 🟡 Should Have | 3 seeded IDs return enriched data; others unchanged |
| FR-006 | Gold Valuation | Compute AED market value of gold collateral | Carat, gold type, weight (g), live AED/gram | `pure_grams = weight × purity; valuation = pure_grams × live_price` | `gold_valuation_aed` | 🔴 Must Have | Matches formula in CALCULATIONS.md §2 to 2 decimal places |
| FR-007 | LTV Calculation | Apply 6-factor multiplier chain to BASE_LTV = 75% | Carat, gold type, tenure, CIBIL, active loans, profession, gold trend | All multipliers applied per CALCULATIONS.md §3 | `final_ltv_pct` (never > 75%) | 🔴 Must Have | LTV matches manual calculation for all test cases |
| FR-008 | LTV Breakdown | Show each factor's delta contribution | LTV calculation result | Delta = (factor − 1) × running LTV at that point | `LTVBreakdown` model | 🔴 Must Have | Sum of all deltas ≈ final_ltv − base_ltv within 0.1% |
| FR-009 | Eligible Loan Amount | Compute maximum loan amount | Gold valuation, final LTV | `eligible = valuation × final_ltv` | `eligible_loan_amount_aed` | 🔴 Must Have | Correct to 2 decimal places |
| FR-010 | Future Loan Amount | ML-estimated eligible amount at tenure end | Gold weight, carat purity, ML end price | `future_val = pure_grams × predicted_end_price; future_eligible = future_val × final_ltv × 0.97` | `future_eligible_loan_amount_aed` | 🟡 Should Have | 3% safety buffer applied; anchored to ML prediction |
| FR-011 | System Decision | Issue Pre-Approved or Manual Review | CIBIL, missed EMIs, active loans, gold trend | Point scoring: CIBIL (±3), EMI (±2), active loans (±1), trend (±1) | `system_decision` + `remarks` | 🔴 Must Have | Pre-Approved for score ≥ 2; Manual Review for score < 2 |
| FR-012 | ML Gold Price Prediction | Forecast gold price for tenure months | `gold_history.json`, live XAU/USD, tenure | Polynomial Ridge (all 20yr) + Linear (365-day); 65/35 blend + live anchor + noise | `predicted_prices`, `predicted_change_pct`, `trend` | 🔴 Must Have | Prediction anchored to live price; chart smooth |
| FR-013 | Historical Gold Prices | Show last 3 months of averaged real gold prices | `gold_history.json` | Last 3 months; grouped by calendar month; averaged | `historical_prices` (AED/gram per month) | 🔴 Must Have | 3 monthly data points; AED/gram unit |
| FR-014 | Gold Trend Classification | Classify market as RISING / STABLE / FALLING | `predicted_change_pct` | RISING > +2%, FALLING < −2%, else STABLE | `trend` field | 🔴 Must Have | Correct classification for all sample predictions |
| FR-015 | User Risk Score | Compute 0–100 risk score for borrower | CIBIL, missed EMIs, active loans, profession, outstanding balance vs eligible loan | Component sum per CALCULATIONS.md §7 | `user_risk_score`, `user_risk_label` | 🔴 Must Have | Score correct per formula; label matches band |
| FR-016 | Company Risk Score | Compute 0–100 risk score for lender exposure | User risk, LTV, gold trend, tenure | 40% user contrib + 35% LTV risk + 25% market risk | `company_risk_score`, `company_risk_label`, `company_risk_exposure` | 🔴 Must Have | Company risk lower than user risk when gold RISING |
| FR-017 | Reverse Calculator | Compute gold weight needed for desired loan amount | Desired loan amount (AED), live karat rates | `grams = desired_loan / live_rate_per_gram` per karat | Table of grams by karat | 🟡 Should Have | Correct grams for all 5 karats; live rates used |
| FR-018 | CIBIL Gauge | Visual SVG arc for CIBIL score | `cibil_score` (300–900) | Map 300–900 → arc position | Arc gauge with label (Excellent / Very Good / Good / Fair / Poor) | 🔴 Must Have | Arc fills proportionally; correct label |
| FR-019 | Risk Gauge | Visual SVG arc for user/company risk | `user_risk_score`, `company_risk_score` | Map 0–100 → arc; color by band | Two arc gauges with labels | 🔴 Must Have | Arcs fill correctly; color matches band |
| FR-020 | Gold Price Chart | SVG polyline chart of historical + predicted prices | `historical_prices`, `predicted_prices` | Combine arrays; normalize to chart viewport | Polyline chart (two segments) | 🔴 Must Have | Historical and predicted lines visually distinct |
| FR-021 | Health Check | Backend aliveness check | None | Return `{status: "ok"}` | 200 JSON | 🟡 Should Have | Returns 200 with correct body |
| FR-022 | Form Reset | Clear all form fields | Button click | Reset state to `initialForm` | Empty form; status message shown | 🟢 Could Have | All fields cleared; status message visible |

---

## 4. Use Case Specifications

### UC-001: Submit Gold Loan Application

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-001 |
| **Name** | Submit Gold Loan Application |
| **Actor(s)** | Credit Officer (Rania) |
| **Preconditions** | Backend running on port 8001; `dummy_customers.json` seeded; `gold_history.json` present |

**Main Flow:**
1. Officer opens dashboard; live gold rates and today's score load automatically.
2. Officer fills form: selects carat, gold type, enters Emirates ID, weight in grams, selects tenure and profession.
3. Officer clicks "Calculate."
4. Frontend validates all fields are non-empty.
5. Frontend POSTs to `/loan/calculate`.
6. Backend looks up customer profile and loan history by Emirates ID.
7. Backend fetches live gold price from gold-api.com.
8. Backend runs ML prediction for the selected tenure.
9. Backend computes gold valuation, LTV, eligible amount, system decision, risk scores.
10. Backend returns `LoanCalculationResponse`.
11. Frontend transitions to `SummaryScreen` and renders all sections.

**Alternate Flows:**
- **4a.** Required field empty → frontend shows inline validation error; does not submit.
- **6a.** Emirates ID not in `dummy_customers.json` → backend returns 404 → frontend shows error message.
- **7a.** gold-api.com unreachable → backend uses `FALLBACK_USD_OZ = 3300.0`; `updated_at` shows "(fallback)".

**Postconditions:** Summary screen shows complete eligibility dashboard with system decision, LTV breakdown, risk scores, gold chart.

---

### UC-002: View Today's Gold Loan Score

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-002 |
| **Name** | View Today's Gold Loan Score |
| **Actor(s)** | Credit Officer |
| **Preconditions** | Backend running; `gold_history.json` present |

**Main Flow:**
1. On page load, frontend calls `GET /api/gold-loan-score/today`.
2. Backend calls `build_gold_insights(12)` → gets `predicted_change_pct` for 12-month tenure.
3. Backend maps `predicted_change_pct` to score (1–10), label, guidance, tone.
4. Frontend renders score widget with number, label, and guidance text.

**Alternate Flows:**
- **2a.** `gold_history.json` missing → server returns 500; frontend shows loading error.

**Postconditions:** Score widget visible on calculator screen.

---

### UC-003: Reverse Calculator

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-003 |
| **Name** | Compute Required Gold Weight for Desired Loan |
| **Actor(s)** | Credit Officer, Customer |
| **Preconditions** | Live gold rates loaded successfully |

**Main Flow:**
1. User enters desired loan amount in AED in the reverse calculator input.
2. User clicks "Calculate."
3. For each karat: `grams = desired_amount / live_rate_per_gram[karat]`.
4. Table displays required grams for 24K, 22K, 21K, 18K, 14K.

**Alternate Flows:**
- **2a.** Live rates not loaded (API failed) → grams column shows "—" or "N/A."
- **2b.** Desired amount ≤ 0 → no calculation performed.

**Postconditions:** Table shows gold weight required per karat.

---

## 5. Business Rules & Constraints

| Rule ID | Rule | Source |
|---------|------|--------|
| BR-001 | `final_ltv` must never exceed `BASE_LTV = 75%` | Regulatory ceiling |
| BR-002 | Future eligible amount must apply a 3% safety buffer (`× 0.97`) | Risk policy |
| BR-003 | System decision is always either "Pre-Approved" or "Manual Review" — never "Rejected" in v1 | Business decision |
| BR-004 | Emirates ID must be provided; no anonymous calculations | KYC requirement |
| BR-005 | Gold weight must be > 0 grams | Input validation |
| BR-006 | CIBIL factor reduces LTV monotonically as score decreases | Credit policy |
| BR-007 | Active loan factor floor is 0.80 (regardless of number of active loans) | Risk policy floor |
| BR-008 | UAE PASS enrichment is best-effort; original customer data used on failure | Operational resilience |
| BR-009 | Gold trend factor may increase LTV above adjusted value when gold is RISING (≥5%: ×1.05) | Market adjustment |
| BR-010 | All monetary values displayed in AED to 2 decimal places | Display standard |

---

## 6. Data Requirements

### 6.1 Request Fields

| Field | Type | Validation | Example |
|-------|------|-----------|---------|
| `emirates_id` | string | Non-empty; format `784-YYYY-XXXXXXX-X` | `784-1985-1234567-1` |
| `carat` | enum | One of: 24K, 22K, 21K, 18K, 14K | `22K` |
| `gold_type` | enum | One of: Coin, Jewellery, Stone Jewellery | `Jewellery` |
| `gold_weight_grams` | float | > 0 | `100.0` |
| `tenure_months` | enum (int) | One of: 6, 12, 18, 24, 36, 48 | `12` |
| `job_profession` | enum | One of: Government Employee, Private Employee, Business Owner, Self Employed, Retired, Freelancer | `Government Employee` |

### 6.2 Response Fields (Key)

| Field | Type | Description |
|-------|------|-------------|
| `system_decision` | string | "Pre-Approved" or "Manual Review" |
| `recommended_ltv_pct` | float | Final LTV percentage (e.g., 67.5) |
| `gold_valuation_aed` | float | AED value of pledged gold |
| `eligible_loan_amount_aed` | float | Maximum loan amount (AED) |
| `future_eligible_loan_amount_aed` | float | Future-adjusted loan amount (AED) |
| `cibil_score` | int | Customer's CIBIL score (300–900) |
| `cibil_label` | string | Excellent / Very Good / Good / Fair / Poor / Very Poor |
| `ltv_breakdown` | object | Per-factor LTV delta breakdown |
| `customer_profile` | object | Customer identity and risk category |
| `loan_history` | object | Active/closed loans, missed EMIs, outstanding balance |
| `gold_insights` | object | Live price, historical prices, predicted prices, trend, pct_change |
| `risk_insights` | object | user_risk_score, company_risk_score, labels, exposure |
| `live_gold_rates` | dict | AED/gram per karat `{"24K": float, ...}` |

### 6.3 `gold_history.json` Schema

```json
[
  { "day": "2005-01-03", "max_price": 195.40 },
  { "day": "2005-01-04", "max_price": 196.10 }
]
```

- `day`: ISO date string `YYYY-MM-DD`
- `max_price`: float, price per troy ounce in AED
- At least 5 years of data required for meaningful ML predictions

---

## 7. System Interface Requirements

| Interface | Protocol | Endpoint | Auth | Format |
|-----------|---------|---------|------|--------|
| Loan calculation | REST HTTP | `POST /loan/calculate` | None (dev) | JSON |
| Live gold rates | REST HTTP | `GET /api/gold-rate/live` | None | JSON |
| Today's score | REST HTTP | `GET /api/gold-loan-score/today` | None | JSON |
| Customer lookup | REST HTTP | `GET /customer/{emirates_id}` | None | JSON |
| External gold price | REST HTTPS | `GET https://api.gold-api.com/price/XAU` | None (public API) | JSON |
| UAE PASS identity | REST HTTPS (stubbed) | OAuth 2.0 token + user info | Client credentials | JSON |

---

## 8. Error Handling & Edge Cases

| Scenario | HTTP Code | Response Shape | UI Behavior |
|----------|-----------|---------------|-------------|
| Emirates ID not found | 404 | `{"detail": "Emirates ID 'X' not found..."}` | Show error message on calculator |
| Invalid request body | 422 | Pydantic validation error detail | Form-level validation prevents submit |
| gold-api.com unreachable | 200 (fallback) | Live price from FALLBACK_USD_OZ; timestamp shows "(fallback)" | Dashboard shows normally with fallback note |
| `gold_history.json` missing | 500 | `{"detail": "FileNotFoundError..."}` | Error screen with message |
| Gold weight ≤ 0 | 422 | `"gold_weight_grams: value must be greater than 0"` | Frontend validates before submit |
| UAE PASS lookup failure | — | Original customer profile used; `uaepass_verified: false` | No UI change; seamless fallback |
| ML model sklearn unavailable | 200 | NumPy polyfit fallback used automatically | Transparent; no UI change |

---

## 9. Non-Functional Requirements

| Category | Requirement | Measurable Target |
|----------|-------------|-------------------|
| Performance | End-to-end loan calculation | < 5 seconds (including gold API call) |
| Performance | Frontend SummaryScreen render | < 1 second after API response |
| Performance | Live gold rate on page load | < 3 seconds |
| Security | Input validation | 100% of invalid inputs return structured 4xx errors; no unhandled exceptions |
| Security | CORS (production) | Restricted to named frontend origins only |
| Security | No PII in logs | Emirates IDs and customer names must not appear in server stdout |
| Security | OWASP Top 10 | No SQL injection (no SQL), no XSS (React escapes by default), no hardcoded secrets in code |
| Scalability | Concurrent users | 50 simultaneous officer sessions without degradation |
| Scalability | Gold history data size | System handles `gold_history.json` files up to 50MB |
| Availability | Fallback on gold API failure | System remains functional; uses FALLBACK_USD_OZ |
| Accessibility | Minimum WCAG compliance | Form labels associated with inputs; color not sole indicator of state |
| Maintainability | Formula documentation | All LTV factors documented in CALCULATIONS.md with source file references |

---

## 10. Traceability Matrix

| FR-ID | Feature | BRD User Story | PRD Feature |
|-------|---------|---------------|-------------|
| FR-001 | Live gold rate display | US-002 | Live gold rates (Must Have) |
| FR-002 | Today's gold loan score | US-003 | Today's loan score (Should Have) |
| FR-003 | Loan application form | US-001, US-004 | Gold loan application form |
| FR-004 | Emirates ID lookup | US-008 | Customer profile + loan history (Must Have) |
| FR-005 | UAE PASS enrichment | US-010 | UAE PASS identity enrichment (Should Have) |
| FR-006 | Gold valuation | US-001 | LTV calculation engine |
| FR-007 | LTV calculation | US-004 | LTV calculation engine (Must Have) |
| FR-008 | LTV breakdown | US-005 | LTV breakdown table (Must Have) |
| FR-009 | Eligible loan amount | US-006 | LTV calculation engine |
| FR-010 | Future loan amount | US-007 | Future-adjusted loan amount (Should Have) |
| FR-011 | System decision | US-013 | Eligibility decision (Must Have) |
| FR-012 | ML gold prediction | US-014, US-015 | Gold price chart (Must Have) |
| FR-013 | Historical gold prices | US-014 | Gold price chart (Must Have) |
| FR-014 | Gold trend classification | US-015 | Gold trend classification (Should Have) |
| FR-015 | User risk score | US-011 | Risk score gauges (Must Have) |
| FR-016 | Company risk score | US-012 | Risk score gauges (Must Have) |
| FR-017 | Reverse calculator | US-016 | Reverse calculator (Should Have) |
| FR-018 | CIBIL gauge | US-008 | CIBIL gauge display (Must Have) |
| FR-019 | Risk gauge | US-011, US-012 | Risk score gauges (Must Have) |
| FR-020 | Gold price chart | US-014 | Gold price chart (Must Have) |
| FR-021 | Health check | — | Swagger API docs (Could Have) |
| FR-022 | Form reset | — | Form reset / re-calculate (Could Have) |
