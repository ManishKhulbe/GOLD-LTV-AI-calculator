# BRD.md — Business Requirements Document

**Project:** Gold Loan Valuation & Eligibility Dashboard  
**Client:** Finance House Dubai  
**Prepared for:** Credit Risk & Operations Team  
**Version:** 1.0  
**Date:** 2026-05-08

---

## 1. Executive Summary

Finance House Dubai requires an automated digital tool to replace the manual, spreadsheet-driven process of evaluating gold-backed loan applications. The Gold Loan Valuation & Eligibility Dashboard provides credit officers with an instant, data-driven assessment of a customer's gold collateral value, loan eligibility (LTV), credit risk, and market timing — all from a single web-based interface. The system integrates live gold market data, 20-year ML-powered price prediction, CIBIL-based credit scoring, and UAE PASS national identity enrichment to produce an auditable, consistent loan decision within seconds.

---

## 2. Business Problem / Opportunity

### Problem
Gold loan appraisals at Finance House Dubai are currently performed manually by credit officers using spreadsheets. This process suffers from:

- **Inconsistency:** Different officers apply different LTV assumptions and carat corrections.
- **Latency:** Manual lookups (gold price, customer history, risk scoring) take 15–30 minutes per application.
- **Stale data:** Spreadsheets use end-of-day gold prices rather than live market rates.
- **No predictive insight:** Officers have no view of how gold prices may change over the loan tenure, creating unquantified collateral risk.
- **Manual risk subjectivity:** Credit risk is assessed qualitatively, not scored consistently.

### Opportunity
Automating the gold loan valuation pipeline eliminates inconsistency, reduces processing time from 30 minutes to under 30 seconds, and gives officers a quantified, ML-backed view of collateral risk over the loan tenure.

---

## 3. Project Objectives (SMART Goals)

| # | Objective | Specific | Measurable | Achievable | Relevant | Time-bound |
|---|-----------|----------|-----------|-----------|---------|-----------|
| 1 | Automate gold valuation | Compute AED gold value from live XAU/USD spot in real time | Valuation accurate to ±0.1% of manual calculation | Yes — gold-api.com integration | Reduces officer time | Phase 3 |
| 2 | Standardize LTV calculation | Apply 6-factor LTV multiplier chain consistently for all officers | 100% of calculations use the same formula | Yes — code-enforced | Eliminates inconsistency | Phase 2 |
| 3 | Predict gold price trajectory | ML model forecasts gold price change over 6–48 month tenure | Prediction anchored to live price; within ±5% of 3-month actuals | Yes — 20yr dataset + polynomial blend | Informs collateral risk | Phase 3 |
| 4 | Score credit risk quantitatively | Produce 0–100 user and company risk scores | Scores derived from CIBIL, EMI history, active loans, profession | Yes — implemented | Replaces subjective assessment | Phase 4 |
| 5 | Reduce processing time | End-to-end loan assessment from officer input to decision | Decision rendered in under 5 seconds (excluding external API latency) | Yes — async FastAPI | Directly reduces cost | Phase 6 |

---

## 4. Stakeholders & Roles

| Stakeholder | Role | Interests |
|-------------|------|-----------|
| Finance House Dubai — Credit Officers | Primary users | Fast, accurate eligibility decisions; clear risk signals |
| Finance House Dubai — Credit Risk Manager | Decision approver | Consistent, auditable LTV calculations; risk band compliance |
| Finance House Dubai — IT / Operations | System owners | Reliable uptime; easy maintenance; clear documentation |
| Loan Applicants (Customers) | Indirect beneficiaries | Faster decisions; fair, consistent assessment |
| UAE PASS Authority | Integration partner | Accurate identity enrichment (currently stubbed) |
| External Gold Data Provider (gold-api.com) | Data supplier | API reliability and accuracy |

---

## 5. Functional Requirements (User Stories)

### 5.1 Gold Valuation

**US-001:** As a credit officer, I want to enter the gold weight (grams), carat, and gold type so that the system calculates the current AED market value of the collateral.

**US-002:** As a credit officer, I want to see the live gold price per gram for each karat (24K–14K) on the calculator screen so that I can verify the rates before submitting.

**US-003:** As a credit officer, I want the system to show a "today's loan score" (1–10) on the calculator screen so that I can advise the customer on whether this is a good time to take a loan based on gold market conditions.

### 5.2 Loan Eligibility (LTV)

**US-004:** As a credit officer, I want the system to compute the LTV percentage using all regulatory and risk factors (carat, gold type, tenure, CIBIL, profession, gold trend) so that I get a consistent eligibility decision every time.

**US-005:** As a credit officer, I want to see a breakdown of each LTV adjustment factor (and the delta it adds/removes) so that I can explain the decision to the customer.

**US-006:** As a credit officer, I want to see the eligible loan amount in AED based on the computed LTV and gold valuation so that I can communicate the maximum loan offer.

**US-007:** As a credit officer, I want to see a future-adjusted loan amount (based on ML predicted gold price at tenure end) so that I can assess whether the collateral will still cover the loan at maturity.

### 5.3 Customer Profile & Loan History

**US-008:** As a credit officer, I want to enter the customer's Emirates ID and have the system auto-populate their CIBIL score, risk category, nationality, and loan history so that I don't need to manually look up records.

**US-009:** As a credit officer, I want to see the customer's full loan history (active, closed, defaulted loans; missed EMIs; outstanding balance) so that I can assess repayment behavior.

**US-010:** As a credit officer, I want UAE PASS to enrich the customer profile with verified identity data (name, gender, nationality, contact) so that KYC is faster and more reliable.

### 5.4 Risk Assessment

**US-011:** As a credit officer, I want to see a user risk score (0–100) with a label (LOW / MEDIUM / HIGH / VERY HIGH) so that I can quickly categorize the borrower's repayment risk.

**US-012:** As a credit officer, I want to see a company risk score (0–100) that accounts for both borrower risk and gold market conditions so that I understand Finance House's exposure if the borrower defaults.

**US-013:** As a credit risk manager, I want the system to issue a clear system decision (Pre-Approved / Manual Review) with auditable remarks so that I can track and override decisions with full context.

### 5.5 Gold Price Intelligence

**US-014:** As a credit officer, I want to see a chart of historical gold prices (last 3 months, AED/gram) alongside ML-predicted prices for the loan tenure so that I can visualize collateral risk over time.

**US-015:** As a credit officer, I want to see the gold trend classification (RISING / STABLE / FALLING) and the predicted percentage change so that I can factor gold market risk into my recommendation.

### 5.6 Reverse Calculator

**US-016:** As a customer, I want to enter a desired loan amount and see how many grams of gold (by karat) I need to pledge so that I know how much gold to bring.

---

## 6. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| Performance | Loan calculation response time | < 5 seconds end-to-end (including gold API call) |
| Performance | Dashboard render on submission | < 1 second after API response received |
| Availability | Backend uptime | ≥ 99.5% during business hours |
| Reliability | Gold API fallback | System must remain operational if gold-api.com is unreachable |
| Security | Input validation | All request fields validated; invalid inputs return 422 with details |
| Security | No PII in logs | Customer names, Emirates IDs never written to server logs |
| Security | CORS | In production, restrict to known frontend origins only |
| Usability | Screen resolution | Dashboard usable at 1280×800 desktop resolution and above |
| Usability | Error states | Calculator shows clear error message on API failure |
| Maintainability | Formula documentation | All LTV factors documented in CALCULATIONS.md |
| Scalability | Concurrent users | System handles at least 50 simultaneous officer sessions |
| Data freshness | Gold price | Live price fetched per request; not cached stale |

---

## 7. Acceptance Criteria per Requirement

| Requirement | Acceptance Criteria |
|-------------|-------------------|
| Gold valuation (US-001) | [ ] AED value = pure_grams × live_aed_per_gram, correct to 2 decimal places |
| Live rates display (US-002) | [ ] Karat table updates on page load; shows AED/gram for all 5 karats |
| Today's score (US-003) | [ ] Score 1–10 with label and guidance text displayed on load |
| LTV calculation (US-004) | [ ] Final LTV matches formula in CALCULATIONS.md for all test cases |
| LTV breakdown (US-005) | [ ] Each factor delta displayed; sum of deltas ≈ final LTV − base 75% |
| Eligible amount (US-006) | [ ] Amount = gold_valuation × final_ltv, displayed in AED format |
| Future loan amount (US-007) | [ ] Future amount uses ML-predicted end price with 3% safety buffer |
| Emirates ID lookup (US-008) | [ ] Profile auto-populates for 3 seeded IDs; 404 for unknown IDs |
| Loan history (US-009) | [ ] Active, closed, defaulted counts and missed EMIs displayed correctly |
| UAE PASS enrichment (US-010) | [ ] For 3 known IDs, profile shows `uaepass_verified: true` with enriched fields |
| User risk score (US-011) | [ ] Score 0–100 correct per risk_analyzer.py formula; label matches band |
| Company risk score (US-012) | [ ] Company risk lower than user risk when gold trend is RISING |
| System decision (US-013) | [ ] Pre-Approved for score ≥ 2; Manual Review for score < 2 |
| Gold chart (US-014) | [ ] Historical (3 months) and predicted (tenure months) plotted on chart |
| Gold trend (US-015) | [ ] RISING / STABLE / FALLING label shown; pct_change displayed |
| Reverse calculator (US-016) | [ ] Grams = desired_loan / live_rate_per_gram for each karat |

---

## 8. Constraints & Assumptions

### Constraints
- Frontend hardcodes backend URL as `http://127.0.0.1:8001` — both must run on the same machine during development.
- Customer data is dummy/seeded; no live CRM integration exists.
- UAE PASS is stubbed; only 3 Emirates IDs return enriched profiles.
- Gold history data is a static file — no automated refresh mechanism.
- CORS is open (`*`) during development; must be restricted for production.
- No authentication or authorization in current build.

### Assumptions
- Credit officers operate from desktop browsers (Chrome / Safari / Firefox).
- The gold-api.com API remains free and available during business hours.
- The `gold_history.json` file covers at least 5 years of data for meaningful ML predictions.
- A UAE PASS production client ID and secret will be provisioned before go-live.
- Input values (gold weight, Emirates ID) are entered by trained officers — no public-facing form.

---

## 9. Out of Scope

- Loan application origination and submission to a loan management system
- Document upload (income proof, KYC documents, valuation certificates)
- EMI schedule generation and payment collection
- Notifications (SMS, email, WhatsApp) to customers
- Multi-branch or multi-tenant configuration
- Mobile application (iOS / Android)
- Real-time audit logging to a database
- Report generation / PDF export of loan assessment
- Integration with Finance House's core banking system
- Regulatory reporting

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| LTV | Loan-to-Value ratio — the percentage of the gold's value that can be lent |
| CIBIL | Credit Information Bureau India Limited score — creditworthiness indicator (300–900) |
| Emirates ID | UAE national identity number in format `784-YYYY-XXXXXXX-X` |
| AED | UAE Dirham — primary currency for gold valuations in this system |
| XAU | International symbol for gold (1 XAU = 1 troy ounce) |
| Troy ounce | Unit of mass for precious metals = 31.1035 grams |
| UAE PASS | UAE government digital identity platform for citizen verification |
| Gold trend | RISING / STABLE / FALLING classification from ML model's predicted % change |
| Pre-Approved | System decision: applicant meets all criteria; proceed with documentation |
| Manual Review | System decision: credit officer escalation required before approval |
| Base LTV | Regulatory ceiling of 75% — maximum LTV before any adjustments |
| Karat | Measure of gold purity: 24K = pure gold (1.000), 18K = 75% gold |
