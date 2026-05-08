# SPEC.md — Project Specification
# Gold Loan Valuation & Eligibility Dashboard — Finance House Dubai

**Status**: `DRAFT`

⚠️ **Planning Lock**: No code may be written until this spec is marked `FINALIZED`.

---

## Vision

The Gold Loan Valuation & Eligibility Dashboard is an internal web tool built for Finance House Dubai that replaces manual spreadsheet-based gold loan processing with a single, deterministic, data-backed workflow — loan officers enter six fields, and within seconds receive a live gold valuation, a regulatory-compliant LTV, an eligibility decision (Pre-Approved or Manual Review), dual risk scores for both the borrower and the institution, and a machine learning forecast of how the collateral value will move over the loan tenure, all from one screen, with no calculation performed by hand.

---

## Goals

1. **Eliminate Manual Calculation** — Reduce per-application processing time from 10–15 minutes to under 1 minute by automating gold valuation, LTV computation, and eligibility scoring entirely.
2. **Enforce Regulatory Compliance** — Automatically apply the CBUAE LTV ceiling of 75% on every application with a hard cap that cannot be overridden by any user input.
3. **Standardise Decisions** — Guarantee that identical inputs always produce identical LTV, eligible amount, and eligibility decision across all officers and all branches, eliminating inter-officer variance.
4. **Surface Real-Time Market Intelligence** — Display live gold prices (AED/gram per karat) on page load and provide a ML-generated gold price forecast for the loan tenure so officers make decisions with current market context.
5. **Quantify Dual Risk** — Compute and display a borrower risk score (0–100) and an institution exposure score (0–100) on every application, creating an auditable risk record that did not previously exist.
6. **Enable Pre-Application Guidance** — Give customer-facing officers a reverse calculator to tell walk-in customers exactly how many grams of gold (by karat) they need to bring for a target loan amount.

---

## Non-Goals (Out of Scope)

- Loan disbursement, repayment scheduling, or any payment processing
- Creating, editing, or deleting customer or loan records (data layer is read-only in v1)
- User login, authentication, or role-based access control (internal-only tool in v1)
- Mobile-native applications (iOS or Android)
- SMS or email notifications to customers or officers
- Integration with Finance House's core banking system or CRM
- Production UAE PASS OAuth2 integration (credentials not yet provisioned by TRA)
- Automated regulatory or compliance reporting
- Arabic language user interface (English-only in v1)
- Branch-level aggregate reporting or management dashboards
- Customer self-service portal
- Live CIBIL bureau lookups (scores are pre-loaded in customer data)

---

## Success Criteria

- [ ] Application processing time measured at under 1 minute from form open to decision displayed (officer-reported, 5-application sample per branch)
- [ ] LTV output is identical for the same 6 inputs across 3 independent sessions — 0% variance
- [ ] Live AED/gram gold rates display within 3 seconds of page load at P95 on standard broadband
- [ ] LTV never exceeds 75.00% for any input combination across all test cases
- [ ] Every submitted application returns both a user risk score and a company risk score — 100% coverage
- [ ] Gold price fallback activates within 8 seconds and displays a visible warning when the external API is unreachable
- [ ] ML gold price forecast mean absolute error is less than 8% vs actuals on held-out 12-month backtesting data
- [ ] Backend uptime exceeds 99.5% in the first 6 months post-launch (excluding scheduled maintenance)
- [ ] Pre-Approved decisions match retrospective senior credit officer review in at least 90% of cases
- [ ] Officer satisfaction score of 4 out of 5 or higher in internal post-launch survey

---

## User Stories

### As a Loan Officer
- I want to enter an Emirates ID, gold carat, gold type, weight, loan tenure, and job profession in a single form
- So that I receive an instant eligibility decision and eligible loan amount without performing any manual calculation

### As a Loan Officer
- I want to see live AED/gram gold prices for all karats on the page when it loads, with a visible fallback warning if the live feed is unavailable
- So that I always know the source and accuracy of the rate being used in the valuation

### As a Loan Officer
- I want the customer's profile and loan history to load automatically from their Emirates ID
- So that I do not need to look these up separately or re-enter data the system already holds

### As a Credit Analyst
- I want to see a full LTV breakdown showing the signed delta contribution of each adjustment factor (carat, gold type, tenure, CIBIL, missed EMIs, active loans, profession, gold trend)
- So that I can reconstruct and explain the decision derivation to a supervisor or auditor

### As a Credit Analyst
- I want to see a chart of the last 3 months of gold prices alongside a ML forecast for the loan tenure
- So that I can visually assess whether the collateral value is trending in a direction that increases or reduces institution risk

### As a Risk Manager
- I want a borrower risk score (0–100) and an institution exposure score (0–100) on every application, with the company score partially offset by a rising gold market
- So that every loan carries a documented, standardised risk number that can be reviewed or audited after the fact

### As a Customer-Facing Officer
- I want to enter a desired loan amount in AED and see how many grams of gold are required per karat (24K through 14K) based on live prices
- So that I can give precise collateral guidance to walk-in customers before they visit the branch with their gold

### As a Loan Officer
- I want to see a 1–10 daily market timing score with a label and short guidance phrase
- So that I can advise customers on whether the current gold market conditions make today a good or cautious time to proceed with a loan

---

## Technical Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| React 19 SPA with Vite 8 build tooling | Must-have | Frontend framework; Vite provides HMR and production build |
| Tailwind CSS v4 via `@tailwindcss/vite` plugin | Must-have | Utility-first styling; zero PostCSS config required |
| FastAPI 0.110+ with Uvicorn ASGI server on port 8001 | Must-have | Backend framework; async-first; auto Swagger UI at `/docs` |
| Pydantic v2 request and response models with strict validation | Must-have | All 6 form inputs validated before processing; 422 on invalid enums or types |
| Live XAU/USD price fetch via `httpx` with 8-second timeout | Must-have | Async HTTP call to `api.gold-api.com`; `FALLBACK_USD_OZ = 3300.0` on failure |
| LTV multiplier chain enforcing `min(final_ltv, 0.75)` hard cap | Must-have | Regulatory requirement; no UI override path must exist |
| ML gold price prediction: polynomial degree-3 Ridge + linear blend (65/35) | Must-have | `scikit-learn` pipeline or NumPy fallback; trained on 20-year `gold_history.json` |
| Customer and loan data lookup from JSON files by Emirates ID | Must-have | `dummy_customers.json` + `dummy_loans.json`; seeded by `seed_data.py` |
| Dual risk scoring: user risk (5 components) + company risk (3 components) | Must-have | Scores 0–100; company risk partially offset by gold trend |
| UAE PASS identity enrichment (stub mode in v1) | Should-have | Returns enriched profile for 3 known IDs; silent fallback on failure; production hook in place |
| Today's Gold Loan Score endpoint (`GET /api/gold-loan-score/today`) | Should-have | 1–10 score derived from 12-month ML prediction; 5 threshold bands |
| Gold price chart: 3-month history + tenure-length ML forecast | Should-have | SVG polyline rendered in frontend using `historical_prices` + `predicted_prices` from API |
| Future-adjusted loan estimate with 3% safety buffer | Should-have | `future_eligible = future_gold_valuation × final_ltv × 0.97` |
| Reverse calculator: grams per karat for a target AED loan amount | Should-have | Frontend-only computation using live karat rates from `/api/gold-rate/live` |
| Emirates ID validated against pattern `784-\d{4}-\d{7}-\d` before API lookup | Must-have | Pydantic or route-level validation; HTTP 422 on malformed input |
| CORS restricted to known frontend origin in production | Must-have | Currently `allow_origins=["*"]`; must be tightened before public deployment |
| Backend URL driven by `VITE_API_BASE` environment variable | Must-have | Currently hardcoded to `http://127.0.0.1:8001`; blocks multi-environment deployment |
| Gold history file checked at startup; `FileNotFoundError` if absent | Must-have | System must fail fast rather than silently return wrong predictions |
| All monetary display values formatted to 2 decimal places with AED prefix | Must-have | `formatAed()` formatter applied consistently across all output fields |
| Frontend handles loading, error, and fallback states on all async fetches | Must-have | No screen should be blank or broken on API failure |
| Vite proxy config (port 8000) aligned with actual backend port (8001) | Should-have | `vite.config.js` proxy targets port 8000; backend runs on 8001; proxy is unused but misleading |

---

_Last updated: 2026-05-08_
