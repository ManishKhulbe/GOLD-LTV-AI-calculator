# SPEC.md — Project Specification
**Project:** Gold LTV AI Calculator — Finance House Dubai
**Version:** 1.0
**Date:** 2026-05-01
**Status:** FINALIZED

---

## Vision

The Gold LTV AI Calculator is a real-time web dashboard that enables Finance House Dubai credit officers to evaluate gold loan applications in under 3 minutes. It replaces a manual, spreadsheet-based process where officers spent 15–30 minutes per application looking up gold prices, computing LTV ratios, and assessing borrower risk by intuition. The system fetches live gold prices, applies a standardised 6-factor LTV model, runs ML-based price forecasting over the loan tenure, scores borrower and company risk on a 0–100 scale, and calculates repayment options — all in a single dashboard interaction with no manual arithmetic.

---

## Goals

1. **Automate gold valuation** — Fetch live XAU/USD price, convert to SAR/gram, compute pure gold content and market value from weight + carat inputs. Eliminate manual price table lookups entirely.

2. **Standardise LTV decisions** — Apply a deterministic 6-factor multiplier chain (carat, SIMAH score, missed EMIs, active loans, profession, gold trend) anchored to a 75% base. Zero variance between officers assessing the same application.

3. **Reduce assessment time** — Full eligibility dashboard (valuation, LTV, risk scores, forecast, EMI options) rendered from a single form submission in under 3 seconds.

4. **Predict collateral risk** — ML blend of a 20-year polynomial model and 365-day linear model forecasts gold price over the loan tenure. Classifies trend as RISING / STABLE / FALLING with ≥70% directional accuracy target.

5. **Score borrower and company risk** — Compute a 0–100 borrower risk score (SIMAH 40pts + missed EMIs 20pts + active loans 15pts + profession 15pts + balance ratio 10pts) and a 0–100 company exposure score. Both displayed as colour-coded horizontal fill bars.

6. **Enable EMI planning** — Monthly reducing-balance EMI and bullet payment calculator with amortization schedule, embedded in the same dashboard.

---

## Non-Goals (Out of Scope)

- Loan origination, approval workflow, or disbursement — handled by Finance House core banking system
- Document upload or KYC document management — requires a separate document platform
- Real persistent database — JSON file-based data store is intentional for this phase
- Real UAE PASS OAuth2 integration — currently stubbed; requires UAE government credentials approval
- Mobile application — officer workflow is desktop-only
- Arabic UI — future localisation; not required for v1
- Automated gold history data updates — manual file refresh process for now
- Multi-branch or multi-role access control — single-role POC
- Loan repayment tracking — separate loan management system
- Regulatory or compliance reporting — separate compliance tooling

---

## Constraints

**Technical**
- Gold price data sourced exclusively from `gold-api.com` free tier — no uptime SLA; fallback constant `FALLBACK_USD_OZ = 3300.0` required
- Historical gold price data is a static file (`backend/data/gold_history.json`) — not auto-updated; ML accuracy degrades if file is not refreshed periodically
- UAE PASS is stubbed; real OAuth2 requires approved credentials from the UAE government
- Frontend is a single React file (`src/App.jsx`) — no component library, no router
- Backend must run on port 8001 — frontend hardcodes `http://127.0.0.1:8001`

**Business**
- LTV ceiling of 75% is a hard policy rule — no input combination may produce a final LTV above 75.00%
- All monetary values must be displayed in SAR (Saudi Riyal) — no AED in UI or API responses
- Currency peg constants are fixed: 1 USD = 3.7500 SAR; 1 troy oz = 31.1035 grams
- Karat purity values are fixed: 24K=1.0, 22K=0.9167, 21K=0.875, 18K=0.75, 14K=0.5833

**Operational**
- Emirates IDs must be pre-seeded — no self-service customer registration in this system
- Screen minimum: 1280px width — officer desktop workflow only
- Target concurrent users: 50 credit officers

---

## Success Criteria

- [ ] `POST /loan/calculate` returns full `LoanCalculationResponse` in < 3 seconds (p95)
- [ ] Final LTV never exceeds 75.00% for any combination of inputs
- [ ] All 6 LTV multipliers are applied and their individual delta contributions are visible in breakdown
- [ ] Live gold rate panel loads within 1 second of page open; fallback rate shown if API is down
- [ ] Gold price forecast chart renders 3 historical monthly averages + current live dot + N predicted monthly points
- [ ] ML trend direction (RISING/STABLE/FALLING) matches actual historical direction ≥ 70% of backtested cases
- [ ] User risk score (0–100) and company risk score (0–100) returned for every application
- [ ] Monthly EMI formula (`P × r(1+r)^n / ((1+r)^n - 1)`) produces correct results to 2 decimal places
- [ ] Bullet payment formula (`P × (1 + rate × months/12)`) produces correct results to 2 decimal places
- [ ] Amortization table interest column decreases monotonically; final balance rounds to ≈ 0
- [ ] Future-adjusted loan estimate equals `future_gold_valuation × ltv × 0.97`; delta % shown
- [ ] No AED values appear anywhere in the UI or API responses
- [ ] System remains functional when gold-api.com is unreachable (uses fallback rate transparently)
- [ ] UAE PASS failure produces no user-visible error; local DB profile used silently
- [ ] Emirates ID format validated before submission (`784-\d{4}-\d{7}-\d`); 422 returned on invalid input

---

## User Stories

### As a credit officer
I want to see live SAR gold prices per karat (14K–24K) when I open the calculator
So that I can confirm today's market rate before processing an application.

### As a credit officer
I want the system to calculate gold valuation automatically from weight and carat
So that I don't have to look up purity tables or do manual arithmetic.

### As a credit officer
I want to see a standardised LTV percentage with a breakdown of every adjustment factor
So that I can explain the figure to the borrower and satisfy my credit manager.

### As a credit officer
I want to see the maximum SAR loan amount the borrower is eligible for
So that I can immediately communicate the lending limit.

### As a credit officer
I want a 0–100 borrower risk score displayed as a colour-coded bar
So that I can instantly assess repayment probability without reading through raw credit data.

### As a credit officer
I want to see Finance House's company exposure score if this loan defaults
So that I can make a fully-informed approval recommendation.

### As a credit officer
I want to see a gold price forecast chart covering the full loan tenure
So that I can assess whether the collateral value is likely to hold or decline.

### As a credit officer
I want to toggle between monthly EMI and bullet payment modes and enter a rate
So that I can present the right repayment option to the borrower in the same session.

### As a credit officer
I want a scrollable month-by-month amortization table when monthly EMI is selected
So that I can walk the borrower through exactly what they pay each month.

### As a credit manager
I want every LTV multiplier contribution to be visible in the breakdown panel
So that I can audit any loan decision and confirm it follows company policy.

---

## Technical Requirements

| Requirement | Priority | Notes |
|---|---|---|
| Live XAU/USD → SAR/gram price fetch on every calculator page load | Must-have | `GET /api/gold-rate/live`; fallback to 3300 USD/oz on failure |
| Gold valuation: `pure_grams × live_sar_per_gram` | Must-have | Purity constants fixed; result rounded to 2dp |
| 6-factor LTV multiplier chain with hard 75% ceiling | Must-have | `min(computed_ltv, 0.75)` enforced in `loan_calculator.py` |
| Eligible loan amount: `valuation_sar × final_ltv` | Must-have | Displayed in hero card; SAR formatted |
| ML forecast: 65% polynomial (20yr) + 35% linear (365-day) blend | Must-have | Anchored to live price at day-0; noise `0.6% × sqrt(month)` |
| User risk score (5 components, 0–100) | Must-have | SIMAH 40 + missed EMIs 20 + active loans 15 + profession 15 + balance ratio 10 |
| Company risk score (`user×0.40 + ltv_risk + market_risk`, 0–100) | Must-have | Rising gold reduces company risk |
| Monthly EMI: reducing balance formula | Must-have | `P × r(1+r)^n / ((1+r)^n-1)`; zero-rate case: `P/n` |
| Bullet payment: simple interest formula | Must-have | `P × (1 + rate × months/12)` |
| Amortization schedule: month-by-month table | Should-have | Scrollable 220px; sticky header; principal green, interest red |
| Future-adjusted loan estimate with 3% safety buffer | Should-have | `future_valuation × ltv × 0.97`; delta % shown |
| Gold price forecast chart (SVG polyline) | Should-have | 3 history pts + current dot + N predicted pts per tenure |
| Customer profile + loan history display | Should-have | From `dummy_customers.json` + `dummy_loans.json` |
| UAE PASS identity enrichment (stub) | Could-have | Silent fallback to local DB on any failure |
| Pydantic v2 input validation on all request fields | Must-have | Emirates ID regex; numeric range checks; 422 on failure |
| CORS restricted to Finance House domain in production | Must-have | Dev: `*`; Production: domain-locked |
| All amounts in SAR; no AED in API responses or UI | Must-have | `_sar` field suffix convention throughout |

---

*Last updated: 2026-05-01*
