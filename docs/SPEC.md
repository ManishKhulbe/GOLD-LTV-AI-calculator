# SPEC.md — Project Specification

**Status**: `DRAFT`

⚠️ **Planning Lock**: No code may be written until this spec is marked `FINALIZED`.

---

## Vision

The Gold Loan Valuation & Eligibility Dashboard is a real-time web application for Finance House Dubai's credit officers, designed to replace manual spreadsheet-based gold loan appraisals with an automated, auditable, formula-enforced eligibility pipeline — computing live gold valuations, multi-factor Loan-to-Value ratios, ML-powered gold price predictions, and quantified borrower risk scores to produce an instant loan decision in under 5 seconds.

---

## Goals

1. **Standardize LTV Calculation** — Enforce a consistent 6-factor multiplier chain (carat, gold type, tenure, CIBIL, profession, gold trend) so every officer produces the same LTV result for the same inputs, every time.
2. **Eliminate Manual Gold Lookups** — Fetch the live XAU/USD spot price on every request and convert to AED/gram per karat automatically, removing the need for officers to check external sources.
3. **Quantify Collateral Risk Over Time** — Use a blended polynomial + linear ML model trained on 20 years of gold price data to predict how the gold collateral value will change over the loan tenure, informing both the system decision and the officer's recommendation.
4. **Score Borrower and Lender Risk** — Produce numerical user risk (0–100) and company risk (0–100) scores from CIBIL, EMI history, loan activity, profession stability, and gold market conditions — replacing subjective officer judgment with consistent, documented criteria.
5. **Deliver an Auditable Decision** — Issue a clear system decision (Pre-Approved / Manual Review) with a point-scored rationale so credit risk managers can review, override, and trace every decision.
6. **Enable Self-Service Pre-Qualification** — Provide a reverse calculator that tells officers (and customers in-branch) exactly how many grams of gold are needed per karat to secure a desired loan amount.

---

## Non-Goals (Out of Scope)

- Loan origination, application submission, or integration with the core banking system
- Document upload (income proof, gold valuation certificates, KYC documents)
- EMI schedule generation or repayment collection
- Customer-facing self-service portal or mobile application
- Real-time audit log persisted to a database
- PDF export of the loan assessment summary
- Multi-branch, multi-tenant, or multi-role configuration
- SMS / email / push notifications to customers or officers
- Automated refresh of `gold_history.json` — this is a manually maintained static file
- Full production UAE PASS OAuth 2.0 integration (stub only in v1)

---

## Constraints

- Frontend URL is hardcoded to `http://127.0.0.1:8001` — both services must run on the same machine in development.
- Backend must start on port 8001 via `uvicorn main:app --reload --port 8001`.
- Customer data is seeded dummy data in JSON files; no live CRM or database integration exists.
- UAE PASS enrichment is stubbed — only 3 seeded Emirates IDs return enriched profiles.
- No authentication or session management is implemented in v1.
- CORS is open to all origins (`*`) in development; must be restricted before production deployment.
- `gold_history.json` must be present at `backend/data/gold_history.json` — the server raises `FileNotFoundError` on startup if missing.

---

## Success Criteria

- [ ] `POST /loan/calculate` with any of the 3 seeded Emirates IDs returns a complete `LoanCalculationResponse` in under 5 seconds
- [ ] Computed `final_ltv_pct` matches manual calculation per CALCULATIONS.md formula to within ±0.1%
- [ ] Gold trend is classified RISING when predicted % change exceeds +2%, FALLING when below −2%, else STABLE
- [ ] User risk score is lower than company risk score when gold trend is RISING and LTV is below 60%
- [ ] System decision is Pre-Approved for customers with CIBIL ≥ 750, 0 missed EMIs, and RISING gold trend
- [ ] Live gold rates display on calculator screen within 3 seconds of page load
- [ ] Reverse calculator shows correct grams for all 5 karats given any positive AED loan amount
- [ ] Fallback gold price (`FALLBACK_USD_OZ = 3300.0`) keeps the system functional when gold-api.com is unreachable

---

## User Stories

### As a Credit Officer
- I want to enter a customer's Emirates ID, carat, gold type, weight, tenure, and profession once
- So that I get a complete eligibility dashboard in under 5 seconds without opening any other system

### As a Credit Officer
- I want to see live gold prices per gram for all karats (24K to 14K) on the calculator screen
- So that I can quote accurate rates to the customer before starting the assessment

### As a Credit Officer
- I want to see a 1–10 "today's loan score" with guidance text when I open the tool
- So that I can proactively advise customers on whether now is a good time to take a gold loan

### As a Credit Risk Manager
- I want to see an LTV breakdown showing each factor's contribution
- So that I can verify compliance with the approved multiplier policy in any escalated case

### As a Credit Risk Manager
- I want to see quantified user and company risk scores (0–100) with labeled bands
- So that I can make consistent, defensible decisions when reviewing Manual Review cases

### As a Customer (via officer)
- I want to know how many grams of gold I need to bring to secure a specific loan amount
- So that I can prepare the right amount of gold before visiting the branch

---

## Technical Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| FastAPI backend on port 8001 | Must-have | `uvicorn main:app --reload --port 8001` |
| React 19 + Vite frontend on port 5173 | Must-have | `npm run dev` |
| Pydantic v2 request/response validation | Must-have | Enforces all field types and constraints |
| Live XAU/USD → AED/gram conversion | Must-have | Fallback to 3300.0 USD/oz if API unavailable |
| 6-factor LTV multiplier chain | Must-have | Exactly as specified in CALCULATIONS.md §3 |
| ML gold price prediction (blended model) | Must-have | 65% polynomial + 35% linear; anchored to live price |
| 20-year `gold_history.json` at startup | Must-have | `FileNotFoundError` raised if missing |
| User risk score 0–100 | Must-have | Per CALCULATIONS.md §7 |
| Company risk score 0–100 | Must-have | Per CALCULATIONS.md §8 |
| UAE PASS enrichment stub | Should-have | Hardcoded for 3 Emirates IDs; production path documented |
| CORS open (`*`) for development | Should-have | Must be restricted before production |
| scikit-learn Ridge regression | Should-have | NumPy polyfit fallback if sklearn unavailable |
| Reverse calculator (grams per karat) | Should-have | `grams = desired_amount / live_rate[karat]` |
| Today's gold loan score (1–10) | Should-have | Derived from 12-month ML prediction |

---

_Last updated: 2026-05-08_
