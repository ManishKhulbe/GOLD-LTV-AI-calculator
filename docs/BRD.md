# BRD.md — Business Requirements Document
# Gold Loan Valuation & Eligibility Dashboard — Finance House Dubai

**Version:** 1.0  
**Date:** 2026-05-08  
**Status:** Draft  

---

## 1. Executive Summary

Finance House Dubai offers gold-backed loans as a core product. Currently, loan officers perform valuations using spreadsheets and manual lookups for gold prices, CIBIL scores, and policy multipliers — a process that is slow, error-prone, and inconsistent across branches.

This project delivers a digital Gold Loan Valuation & Eligibility Dashboard: a web-based tool that automates gold valuation, applies all regulatory and internal LTV multipliers in real time, uses a machine learning model to forecast gold price trends, and issues an eligibility decision within seconds. The system also provides dual risk scoring (borrower risk and institution risk) to support credit officers in making consistent, defensible lending decisions.

---

## 2. Business Problem / Opportunity

### Problem Statement

| Problem | Impact |
|---------|--------|
| Manual gold price lookup and spreadsheet-based LTV calculation | 10–15 minutes per application; inconsistent results across officers |
| No standardized risk scoring for gold loan applicants | Inconsistent credit decisions; regulatory exposure |
| No forward-looking gold price context at point of decision | Loan officers unaware of collateral value trends during loan tenure |
| UAE PASS identity not integrated at application stage | Duplicate data entry; identity verification done manually |
| No historical or predicted gold price visibility for the customer | Reduced customer confidence; longer sales cycle |

### Opportunity

Automating this workflow reduces per-application time from ~15 minutes to under 30 seconds, standardizes credit decisions across all branches, and creates an auditable record of the inputs and outputs for every application.

---

## 3. Project Objectives (SMART Goals)

| # | Objective | Metric | Target | Timeframe |
|---|-----------|--------|--------|-----------|
| 1 | Reduce loan officer calculation time | Minutes per application | < 1 minute (from ~15) | At launch |
| 2 | Standardize LTV decisions | LTV deviation across officers for identical inputs | 0% (fully deterministic) | At launch |
| 3 | Provide real-time gold prices | Seconds from page load to live AED/gram display | < 3 seconds | At launch |
| 4 | ML gold price forecast accuracy | MAE vs actuals in backtesting (12-month horizon) | < 8% | Before go-live |
| 5 | Risk scoring coverage | % of applications with computed user + company risk | 100% | At launch |
| 6 | UAE PASS enrichment | % of known Emirates IDs returning verified profile | 100% (for seeded IDs) | At launch |
| 7 | System availability | Uptime (excl. maintenance) | > 99.5% | First 6 months |

---

## 4. Stakeholders & Roles

| Stakeholder | Role | Interest |
|-------------|------|---------|
| Finance House Dubai — Credit Officers | Primary users | Fast, accurate eligibility decisions |
| Finance House Dubai — Branch Managers | Secondary users | Consistent decisions; audit trail |
| Finance House Dubai — Risk / Compliance | Governance | LTV caps, regulatory alignment, risk scoring |
| Finance House Dubai — IT / DevOps | Operators | Deployment, uptime, integration with existing systems |
| UAE Central Bank (CBUAE) | Regulator | LTV regulatory ceiling (75%) compliance |
| UAE PASS (TRA) | Identity provider | OAuth2 integration; digital identity verification |
| gold-api.com | Data provider | Live XAU/USD price feed |
| Development Team (Mobcoder) | Builders | System design, implementation, documentation |

---

## 5. Functional Requirements (User Stories)

### 5.1 Gold Price & Market Data

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|---------------------|
| FR-01 | As a loan officer, I want to see live AED/gram gold prices for all karats (24K–14K) on page load so that I can confirm the current market rate before processing an application. | High | Prices load within 3s; all 5 karats displayed; "fallback" label shown when external API is unavailable |
| FR-02 | As a loan officer, I want a daily gold loan market score (1–10) so that I can advise the customer on the urgency or timing of their application. | Medium | Score, label, market condition, and guidance text all displayed; score changes with predicted price movement |
| FR-03 | As a credit analyst, I want to see a chart of the past 3 months' gold prices and a ML forecast for the loan tenure so that I can assess collateral value trends. | Medium | Chart renders historical + predicted prices in AED/gram; trend label (RISING/STABLE/FALLING) shown |

### 5.2 Loan Application & Valuation

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|---------------------|
| FR-04 | As a loan officer, I want to enter the customer's Emirates ID, gold carat, gold type, weight in grams, loan tenure, and job profession so that the system can compute an eligibility decision. | High | All 6 fields accepted; form validates before submission; Emirates ID pattern validated |
| FR-05 | As a loan officer, I want the system to calculate the gold valuation in AED based on live prices and purity so that the collateral value is accurate and current. | High | `gold_valuation_aed = pure_grams × live_price_aed_per_gram`; consistent with CALCULATIONS.md §2 |
| FR-06 | As a loan officer, I want to see the recommended LTV percentage and eligible loan amount so that I can communicate the offer to the customer. | High | LTV ≤ 75%; eligible amount = `gold_valuation × final_ltv`; displayed in AED |
| FR-07 | As a loan officer, I want a future-adjusted loan estimate at tenure end so that I can show the customer a forward-looking valuation based on ML predictions. | Medium | `future_eligible = future_gold_valuation × final_ltv × 0.97`; delta % shown vs current |
| FR-08 | As a loan officer, I want the system to issue a decision (Pre-Approved / Manual Review) with a plain-language remark so that I know whether to proceed or escalate. | High | Decision based on scoring engine in CALCULATIONS.md §6; remark is human-readable |

### 5.3 LTV Breakdown

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|---------------------|
| FR-09 | As a credit analyst, I want to see a full LTV breakdown showing the contribution of each adjustment factor so that I can explain the decision to the customer or a supervisor. | High | All 7 adjustments displayed (carat, gold type, tenure, CIBIL, active loans, profession, gold trend) with delta values |
| FR-10 | As a credit analyst, I want to see the CIBIL score with a label (Excellent / Very Good / Good / Fair / Poor / Very Poor) so that I can quickly assess credit quality. | High | Label maps correctly to CIBIL ranges in CALCULATIONS.md §6 |

### 5.4 Customer Profile & Loan History

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|---------------------|
| FR-11 | As a loan officer, I want the system to automatically load the customer's profile (name, nationality, risk category, mobile) by Emirates ID so that I do not need to enter it manually. | High | Profile loads from `dummy_customers.json`; 404 returned for unknown IDs |
| FR-12 | As a loan officer, I want to see the customer's loan history (active/closed/defaulted loans, missed EMIs, outstanding balance) so that I can assess their repayment track record. | High | Loan history table displays all loan records with status and amounts |
| FR-13 | As a loan officer, I want UAE PASS verified identity data (Arabic name, gender, verified email) to be shown on the profile when available so that I can confirm identity quickly. | Medium | UAE PASS fields populated for known Emirates IDs; `uaepass_verified: true` shown on badge |

### 5.5 Risk Scoring

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|---------------------|
| FR-14 | As a risk manager, I want a user risk score (0–100) computed from CIBIL, missed EMIs, active loans, profession, and outstanding balance so that I have a standardized borrower risk number. | High | Score follows formula in CALCULATIONS.md §7; label shown (LOW / MEDIUM / HIGH / VERY HIGH) |
| FR-15 | As a risk manager, I want a company risk score (0–100) computed from borrower risk, LTV exposure, and gold market outlook so that I can assess the institution's exposure on this loan. | High | Score follows CALCULATIONS.md §8; company risk can be LOW even when user risk is HIGH (rising gold offsets) |

### 5.6 Reverse Calculator

| ID | User Story | Priority | Acceptance Criteria |
|----|-----------|----------|---------------------|
| FR-16 | As a customer-facing officer, I want to enter a desired loan amount and see how many grams of each karat are needed to qualify so that I can guide customers who are preparing their gold collateral. | Medium | Reverse calculator outputs grams per karat for a given AED loan amount; live rates used in calculation |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Page load time (live rates + today's score) | < 3 seconds on standard broadband |
| NFR-02 | Loan calculation response time (`POST /loan/calculate`) | < 2 seconds end-to-end |
| NFR-03 | Gold price fallback activation | < 8 seconds (httpx timeout); no visible error to user beyond "fallback" label |
| NFR-04 | Frontend bundle size | < 500KB gzipped |

### 6.2 Security

| ID | Requirement |
|----|-------------|
| NFR-05 | Backend CORS restricted to known frontend origin in production |
| NFR-06 | UAE PASS credentials stored in environment variables; never committed to version control |
| NFR-07 | Emirates ID path parameter validated against expected pattern before lookup |
| NFR-08 | No real customer PII in the repository (seed data uses Faker-generated values) |
| NFR-09 | All external HTTP calls use HTTPS |

### 6.3 Scalability

| ID | Requirement |
|----|-------------|
| NFR-10 | Backend supports at least 50 concurrent loan calculation requests |
| NFR-11 | Gold history ML model fit must complete in < 200ms (currently ~50ms on MacBook M-series) |
| NFR-12 | Customer data store supports replacement with a relational database without API contract changes |

### 6.4 Usability

| ID | Requirement |
|----|-------------|
| NFR-13 | Dashboard renders correctly at 1280px (desktop) and 768px (tablet) widths |
| NFR-14 | All monetary values displayed with 2 decimal places and AED currency label |
| NFR-15 | Form field labels and placeholders in English |
| NFR-16 | Error messages are human-readable (no raw stack traces exposed to UI) |
| NFR-17 | Summary screen accessible within 1 click of form submission |

### 6.5 Availability & Reliability

| ID | Requirement |
|----|-------------|
| NFR-18 | System remains functional when gold-api.com is unreachable (fallback price activated) |
| NFR-19 | Backend uptime target: 99.5% excluding scheduled maintenance |
| NFR-20 | `gold_history.json` must be present at startup; absence causes a clear `FileNotFoundError` |

---

## 7. Acceptance Criteria Per Key Requirement

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| FR-04 (Form submission) | Submitting with all 6 valid fields returns HTTP 200 with `LoanCalculationResponse`; submitting with an unknown Emirates ID returns HTTP 404 with descriptive `detail` message |
| FR-05 (Gold valuation) | Valuation for 100g of 22K gold at AED 350/g = AED 32,083.33 (per CALCULATIONS.md §2 example) |
| FR-06 (LTV + eligible amount) | LTV never exceeds 75% for any input combination |
| FR-08 (Eligibility decision) | Customer with CIBIL 780, 0 missed EMIs, 0 active loans, Government Employee → Pre-Approved |
| FR-14 (User risk score) | Customer with CIBIL 780 contributes 5 pts; 0 missed EMIs contributes 0 pts → minimum base score of 5 |
| FR-15 (Company risk score) | With LTV ≤ 60% and gold RISING > 5%, company risk < 20 regardless of user risk |
| NFR-01 (Page load) | Measured with browser DevTools Network tab on standard broadband; P95 < 3s |
| NFR-02 (Calc response) | Measured with curl against local backend; P95 < 2s |

---

## 8. Constraints & Assumptions

### Constraints

| # | Constraint |
|---|-----------|
| C-01 | LTV ceiling of 75% is a hard regulatory cap (CBUAE requirement); system must never exceed it |
| C-02 | UAE PASS real credentials must be provisioned by the TRA before production identity enrichment can go live |
| C-03 | `gold_history.json` is a static file; it requires periodic manual update to remain current |
| C-04 | Customer and loan data is currently read-only (JSON files); no write operations exist in v1 |
| C-05 | Frontend must point to `http://127.0.0.1:8001` (hardcoded); environment variable required before multi-environment deployment |
| C-06 | The system is an internal tool; no public internet exposure until CORS and auth are hardened |

### Assumptions

| # | Assumption |
|---|-----------|
| A-01 | All loan amounts and gold valuations are in AED (UAE Dirham) for operational decisions; SAR display is for reference |
| A-02 | The AED/USD peg (3.6725) and SAR/USD peg (3.7500) are fixed and will not change |
| A-03 | CIBIL scores are provided by the customer data system; the dashboard does not perform live CIBIL bureau lookups |
| A-04 | Loan officers accessing the system are internal staff; no public user registration or self-service flow is required |
| A-05 | Three seeded Emirates IDs are sufficient for demonstration and testing purposes |
| A-06 | `gold_history.json` contains accurate and complete 20-year price data |
| A-07 | The 75% base LTV is the maximum allowable under current CBUAE guidelines for gold-backed loans |

---

## 9. Out of Scope

The following items are explicitly excluded from this version:

- Loan disbursement, repayment scheduling, or payment processing
- Write operations to customer or loan records
- Multi-user authentication, login screens, or role-based access control
- Mobile-native application (iOS / Android)
- SMS / email notifications to customers
- Integration with Finance House's core banking system or CRM
- Production UAE PASS OAuth2 integration (credentials not yet provisioned)
- Automated regulatory reporting
- Multi-language UI (Arabic)
- Branch-level reporting or dashboards
- Customer self-service portal

---

## 10. Glossary of Key Terms

| Term | Definition |
|------|-----------|
| **LTV (Loan-to-Value)** | Percentage of the gold's assessed value that can be lent. Capped at 75% by CBUAE regulation. |
| **CIBIL Score** | Credit Information Bureau (India) Ltd score; used here as a general creditworthiness proxy (300–900 scale). |
| **Emirates ID** | UAE national identity number in format `784-YYYY-XXXXXXX-C`. |
| **XAU** | ISO 4217 currency code for gold (troy ounce). |
| **AED** | UAE Dirham. Fixed peg: 1 USD = 3.6725 AED. |
| **SAR** | Saudi Riyal. Fixed peg: 1 USD = 3.7500 SAR. |
| **Troy Ounce** | Unit of weight for precious metals. 1 troy oz = 31.1035 grams. |
| **Karat** | Measure of gold purity. 24K = pure gold (100%); 18K = 75% gold. |
| **Carat Purity** | Gold fraction: 24K=1.0, 22K=0.9167, 21K=0.875, 18K=0.75, 14K=0.5833. |
| **Pre-Approved** | System decision: application meets eligibility criteria; proceed with standard documentation. |
| **Manual Review** | System decision: elevated risk signals detected; senior credit officer review required. |
| **UAE PASS** | UAE government national digital identity platform operated by the Telecommunications Regulatory Authority (TRA). |
| **Gold Trend** | ML-predicted direction of gold price over the loan tenure: RISING / STABLE / FALLING. |
| **User Risk Score** | Composite 0–100 score of borrower default probability (CIBIL, EMI history, active loans, profession, balance). |
| **Company Risk Score** | Composite 0–100 score of the institution's exposure on a specific loan (borrower risk + collateral quality + gold market outlook). |
| **Polynomial Ridge Regression** | Machine learning model fitting a degree-3 polynomial with L2 regularization to historical gold prices. |
| **CBUAE** | Central Bank of the UAE — the regulator that sets LTV ceilings for gold-backed lending. |
| **Seeded Data** | Dummy customer and loan records generated by `seed_data.py` for testing; not real customer data. |
