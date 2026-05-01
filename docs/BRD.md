# BRD.md — Business Requirements Document
**Project:** Gold LTV AI Calculator — Finance House Dubai
**Version:** 1.0
**Date:** 2026-05-01
**Status:** Draft

---

## 1. Executive Summary

Finance House Dubai operates a gold loan portfolio where loan officers manually assess collateral value, calculate loan-to-value ratios, and determine borrower eligibility using spreadsheets and intuition. This process is slow (15–30 minutes per application), inconsistent across officers, and exposes the company to collateral risk when gold prices fluctuate.

This document defines the business requirements for an AI-assisted Gold Loan Valuation & Eligibility Dashboard — a real-time web application that automates the full gold loan assessment pipeline: live gold pricing, LTV calculation, ML-based price forecasting, risk scoring, and EMI structuring.

---

## 2. Business Problem / Opportunity

### Problem
- Manual loan assessment is time-consuming and inconsistent
- Officers use outdated or manually updated gold price tables
- No standardised risk scoring across applications
- No forward-looking analysis of gold price trends to assess collateral safety
- Borrowers must wait for manual calculations; poor experience

### Opportunity
- Standardise LTV calculation across all credit officers
- Integrate live gold prices to eliminate price lag errors
- Add predictive analytics to catch collateral risk before it materialises
- Reduce average assessment time from 15–30 minutes to under 3 minutes
- Provide an auditable, documented decision trail per application

---

## 3. Project Objectives (SMART Goals)

| # | Objective | Measure | Target | Timeline |
|---|---|---|---|---|
| 1 | Automate gold valuation | % of manual steps eliminated | 100% of pricing steps | Phase 1 |
| 2 | Standardise LTV calculation | Variance between officers for same application | 0% variance | Phase 2 |
| 3 | Reduce assessment time | Average time per application | < 3 minutes | Phase 4 |
| 4 | Predict gold price risk | ML model directional accuracy | ≥ 70% correct trend direction | Phase 3 |
| 5 | Provide risk scores | Applications scored 0–100 (user + company) | 100% of applications | Phase 2 |
| 6 | Enable EMI planning | Officers can simulate monthly/bullet payment plans | Available on every dashboard | Phase 5 |

---

## 4. Stakeholders & Roles

| Stakeholder | Role | Interest |
|---|---|---|
| Finance House Credit Officers | Primary users | Fast, accurate loan assessments |
| Finance House Credit Manager | Approver / supervisor | Consistent risk standards; auditability |
| Finance House IT / Engineering | System owners | Maintainability, security, integrations |
| Borrowers (Gold Loan Applicants) | Indirect beneficiaries | Faster approvals, fair assessments |
| UAE PASS (Government) | Identity provider | Compliance with digital identity standards |
| gold-api.com | Data provider | Live XAU/USD price feed |
| Finance House Dubai (Executive) | Project sponsor | ROI, reduced default risk, competitive advantage |

---

## 5. Functional Requirements (User Stories)

### 5.1 Gold Price & Valuation

> **FR-01** 🔴 High
> **As a** credit officer,
> **I want** to see live SAR gold prices per karat (14K–24K) on the calculator page,
> **so that** I can confirm the current market rate before submitting an application.

**Acceptance Criteria:**
- Live price fetched from XAU/USD feed and converted to SAR on page load
- Displayed per karat: 24K, 22K, 21K, 18K, 14K
- Updates each time the calculator page is loaded
- Shows cached/fallback rate if external API is unavailable

---

> **FR-02** 🔴 High
> **As a** credit officer,
> **I want** the system to calculate gold valuation automatically from weight and carat,
> **so that** I don't need to look up purity tables manually.

**Acceptance Criteria:**
- Formula: `pure_grams = weight × carat_purity; valuation = pure_grams × live_SAR_price`
- Carat purity values: 24K=1.0, 22K=0.9167, 21K=0.875, 18K=0.75, 14K=0.5833
- Result displayed as `SAR X,XXX.XX` on the dashboard

---

### 5.2 LTV Calculation

> **FR-03** 🔴 High
> **As a** credit officer,
> **I want** the system to compute a recommended LTV percentage applying all adjustment factors,
> **so that** I can see a standardised, policy-compliant maximum loan percentage.

**Acceptance Criteria:**
- Base LTV = 75%; never exceeded regardless of inputs
- 6 multipliers applied: carat, CIBIL/SIMAH, missed EMI, active loans, profession, gold trend
- Each multiplier's delta contribution shown in breakdown
- Final LTV rounded to 2 decimal places

---

> **FR-04** 🔴 High
> **As a** credit officer,
> **I want** to see the eligible loan amount in SAR,
> **so that** I know the maximum amount the applicant can borrow.

**Acceptance Criteria:**
- `eligible_loan_amount_sar = gold_valuation_sar × final_ltv_pct`
- Displayed prominently on dashboard hero card

---

### 5.3 Gold Price Forecasting

> **FR-05** 🔴 High
> **As a** credit officer,
> **I want** to see a gold price forecast chart covering the loan tenure,
> **so that** I can assess whether collateral value is likely to hold or decline.

**Acceptance Criteria:**
- Chart shows last 3 months of real history (monthly averages)
- Chart shows current live price as a green dot
- Chart shows ML-predicted monthly prices for the full tenure
- Trend classified as RISING / STABLE / FALLING
- Predicted % change over tenure displayed

---

> **FR-06** 🟡 Medium
> **As a** credit officer,
> **I want** to see a future-adjusted loan estimate,
> **so that** I understand what the loan could be worth at tenure end if gold performs as predicted.

**Acceptance Criteria:**
- Computed as: `future_valuation × same_LTV × 0.97` (3% safety buffer)
- Delta vs current eligible amount shown as ▲ / ▼ percentage
- Clearly labelled as a model estimate, not a guarantee

---

### 5.4 Borrower Risk Assessment

> **FR-07** 🔴 High
> **As a** credit officer,
> **I want** to see a user risk score (0–100) for the borrower,
> **so that** I can quickly assess repayment probability.

**Acceptance Criteria:**
- Score computed from: SIMAH (40pts), missed EMIs (20pts), active loans (15pts), profession (15pts), outstanding balance ratio (10pts)
- Displayed as horizontal fill bar: green ≤33, amber ≤66, red >66
- Labelled: LOW RISK / MEDIUM RISK / HIGH RISK / VERY HIGH RISK

---

> **FR-08** 🔴 High
> **As a** credit officer,
> **I want** to see a company risk score (0–100),
> **so that** I understand Finance House's exposure if this loan defaults.

**Acceptance Criteria:**
- Score = `user_risk × 0.40 + ltv_risk (35pts) + market_risk (25pts)`
- Rising gold trend reduces company risk (collateral liquidation premium)
- Displayed as horizontal fill bar with same colour scheme
- Exposure level: LOW / MEDIUM / HIGH / VERY HIGH

---

### 5.5 Customer & Loan History

> **FR-09** 🟡 Medium
> **As a** credit officer,
> **I want** to see the borrower's profile and full loan history,
> **so that** I have complete context before making a credit decision.

**Acceptance Criteria:**
- Profile: name, Emirates ID, nationality, mobile, gender, email, customer type, risk category
- Loan history overview: total loans, active, closed, missed EMIs, outstanding balance
- Per-loan cards: loan ID, tenure, status badge (ACTIVE/CLOSED/DEFAULTED), amount

---

### 5.6 EMI Calculator

> **FR-10** 🔴 High
> **As a** credit officer,
> **I want** to calculate monthly EMI or bullet payment for the eligible loan,
> **so that** I can present repayment options to the borrower.

**Acceptance Criteria:**
- Toggle between Monthly EMI (reducing balance) and Bullet Payment (simple interest lump sum)
- Month dropdown: 3, 6, 12, 18, 24, 36 months
- Annual interest rate input (%)
- Monthly EMI formula: `P × r(1+r)^n / ((1+r)^n - 1)` where r = annual_rate/12/100
- Bullet Payment formula: `P × (1 + rate × months/12)`
- Result displayed as `SAR X,XXX.XX`

---

> **FR-11** 🟡 Medium
> **As a** credit officer,
> **I want** to see a full amortization schedule (month-by-month) when Monthly EMI is selected,
> **so that** I can show the borrower exactly what they pay each month.

**Acceptance Criteria:**
- Table columns: Month / EMI / Principal Paid / Interest Paid / Remaining Balance
- Principal column (green) increases each month
- Interest column (red) decreases each month
- Table scrollable (max 220px height); sticky header
- Only visible in Monthly EMI mode with rate entered

---

### 5.7 Identity Verification

> **FR-12** 🟢 Low
> **As a** credit officer,
> **I want** borrower identity enriched from UAE PASS where available,
> **so that** I get verified name, nationality, and contact details automatically.

**Acceptance Criteria:**
- UAE PASS profile enriches customer record if available for the Emirates ID
- Gracefully falls back to local database record if UAE PASS is unavailable
- No error shown to user if UAE PASS is unavailable

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Requirement | Target |
|---|---|
| Full dashboard load time (POST /loan/calculate) | < 3 seconds |
| Live gold rate fetch on page load | < 1 second |
| ML model fitting time per request | < 500ms |
| Frontend initial page load | < 2 seconds on 10 Mbps connection |

### 6.2 Security

| Requirement | Detail |
|---|---|
| CORS restriction | Limit to Finance House domain in production |
| Input validation | Emirates ID format enforced; numeric fields type-validated |
| No secrets in code | API keys via environment variables only |
| HTTPS | Required in production; enforce via reverse proxy |
| UAE PASS credentials | Store in secrets manager; never in git |

### 6.3 Scalability

| Requirement | Detail |
|---|---|
| Concurrent users | Support 50 concurrent credit officers |
| Gold API caching | Cache live price for 60 seconds to reduce external calls |
| ML model caching | Cache fitted models in memory; refit nightly |
| Database | Migrate from JSON files to PostgreSQL for > 1,000 customers |

### 6.4 Usability

| Requirement | Detail |
|---|---|
| Single-page workflow | Calculator → Dashboard in one submission; no page reloads |
| Error messages | Clear, actionable messages for invalid Emirates ID or API failure |
| Currency consistency | All monetary values in SAR throughout |
| Colour coding | Risk bars green/amber/red; loan status badges colour-coded |
| Responsive layout | Dashboard usable on 1280px+ screens |

### 6.5 Reliability

| Requirement | Detail |
|---|---|
| Gold API fallback | System functional at `FALLBACK_USD_OZ = 3300.0` if API is down |
| UAE PASS fallback | Local DB profile used if UAE PASS is unavailable |
| Data integrity | LTV never exceeds 75% ceiling regardless of multiplier inputs |
| Graceful errors | API errors return meaningful HTTP status + detail message |

---

## 7. Acceptance Criteria Per Requirement

| ID | Requirement | Pass Condition |
|---|---|---|
| FR-01 | Live gold rates | 5 karats displayed within 1s of page load |
| FR-02 | Gold valuation | `pure_grams × live_price` matches manual calculation to 2 decimal places |
| FR-03 | LTV calculation | Final LTV ≤ 75% for all inputs; all 6 multipliers visible in breakdown |
| FR-04 | Eligible loan | `valuation × ltv` displayed in SAR |
| FR-05 | Price forecast chart | 3 history points + current dot + N forecast points rendered |
| FR-06 | Future loan estimate | Equals future valuation × LTV × 0.97; delta % shown |
| FR-07 | User risk bar | Score matches manual calculation; colour zone correct |
| FR-08 | Company risk bar | Score = user×0.4 + ltv_risk + mkt_risk; exposure label correct |
| FR-09 | Customer profile | All available fields displayed; loan cards show correct status badge |
| FR-10 | EMI calculator | Monthly and bullet results match formulas with test inputs |
| FR-11 | Amortization schedule | Interest decreases monotonically; final balance ≈ 0 |
| FR-12 | UAE PASS enrichment | Falls back silently to local DB if stub returns no profile |

---

## 8. Constraints & Assumptions

### Constraints
- Gold price data source limited to `gold-api.com` (free tier, no SLA)
- Historical gold data is a static JSON file; not updated automatically
- UAE PASS integration is stubbed; real OAuth2 requires approved credentials from UAE government
- No persistent database; all data is JSON file-based
- Frontend is a single `App.jsx` file (no component library)

### Assumptions
- Credit officers have access to a modern browser (Chrome/Firefox/Safari)
- Backend runs on the same machine or a reachable internal server
- Emirates IDs in the system are pre-seeded; new applicants require manual seeding
- Gold history file (`gold_history.json`) covers at least 1 year for ML to be meaningful
- Interest rates entered by credit officers are annual percentage rates

---

## 9. Out of Scope

| Feature | Reason |
|---|---|
| Loan origination / disbursement | Separate banking system; out of this project's remit |
| Document upload / KYC management | Requires document management platform |
| Real database | Phase 6 future work |
| Mobile application | Not required for credit officer workflow |
| Arabic UI | Future localisation requirement |
| Authentication / login | Assumed handled by Finance House network/SSO |
| Automated gold history updates | Manual file update process for now |
| Multi-branch / multi-user role management | Single-role system for this POC |
| Loan repayment tracking | Separate loan management system |
| Regulatory reporting | Out of scope for this dashboard |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **LTV** | Loan-to-Value ratio — the percentage of gold value that can be lent |
| **SIMAH** | Saudi Credit Bureau (equivalent of CIBIL in the GCC region) |
| **CIBIL Score** | Credit score 300–900; higher = better creditworthiness |
| **Emirates ID** | UAE national identity number (format: 784-YYYY-XXXXXXX-C) |
| **XAU/USD** | International gold spot price in US dollars per troy ounce |
| **Troy Ounce** | Unit for gold weight = 31.1035 grams |
| **SAR** | Saudi Arabian Riyal (fixed peg: 1 USD = 3.75 SAR) |
| **AED** | UAE Dirham (fixed peg: 1 USD = 3.6725 AED) |
| **Pure Grams** | Actual gold content = weight × karat purity fraction |
| **Reducing Balance EMI** | Monthly payment where interest is charged on outstanding principal only |
| **Bullet Payment** | Single lump-sum repayment of principal + total interest at tenure end |
| **Gold Trend Factor** | LTV multiplier based on ML-predicted % price change over loan tenure |
| **UAE PASS** | UAE government's national digital identity and verification platform |
| **Ridge Regression** | Regularised linear regression (L2 penalty) to prevent overfitting on noisy data |
| **Amortization Schedule** | Month-by-month breakdown of principal, interest, and remaining balance |
| **Company Risk** | Finance House's financial exposure if a borrower defaults |
| **User Risk** | Borrower's likelihood of defaulting based on credit and behavioural signals |
| **Active Loan Factor** | LTV penalty for existing outstanding loans: `max(0.80, 1 - n × 0.06)` |
| **Gold Valuation** | Market value of pledged gold: `pure_grams × current_price` |
| **Future-Adjusted Estimate** | Projected eligible loan using ML-forecast gold price at tenure end, with 3% buffer |
