# Gold Loan Dashboard — Full Calculation Reference

All formulas, variable values, and data sources used across the dashboard.

---

## 1. Gold Price Conversion (Currency)

**Source:** `gold-api.com/price/XAU` → live XAU/USD spot price  
**Fallback if API down:** `FALLBACK_USD_OZ = 3300.0 USD/oz`

### Constants

| Variable | Value | Meaning |
|---|---|---|
| `AED_PER_USD` | `3.6725` | UAE Dirham fixed peg to USD |
| `SAR_PER_USD` | `3.7500` | Saudi Riyal fixed peg to USD |
| `TROY_OZ_TO_GRAM` | `31.1035` | Grams per troy ounce |

### Formulas

```
AED per gram (24K) = (USD_per_oz / 31.1035) × 3.6725
SAR per gram (24K) = (USD_per_oz / 31.1035) × 3.7500
SAR per gram (XK)  = SAR_per_gram_24K × karat_purity
```

### Karat Purity Map (used for display karat rates)

| Karat | Purity Factor |
|---|---|
| 24K | 1.0000 |
| 22K | 0.9167 |
| 21K | 0.8750 |
| 18K | 0.7500 |
| 14K | 0.5833 |

> **Note:** Chart and gold price panel display in **SAR**. Loan valuation uses **AED**.

---

## 2. Gold Valuation (AED)

**File:** `services/loan_calculator.py`

### Carat Purity Map (for valuation)

| Carat | `CARAT_PURITY` |
|---|---|
| 24K | 1.0000 |
| 22K | 0.9167 |
| 21K | 0.8750 |
| 18K | 0.7500 |
| 14K | 0.5833 |

### Formula

```
pure_grams          = gold_weight_grams × CARAT_PURITY[carat]
gold_valuation_aed  = pure_grams × live_price_aed_per_gram
```

**Example** — 100g of 22K gold, live price = AED 350/g:
```
pure_grams         = 100 × 0.9167 = 91.67g
gold_valuation_aed = 91.67 × 350  = AED 32,083.33
```

---

## 3. LTV Calculation

**File:** `services/loan_calculator.py`

```
BASE_LTV = 0.75  (75% — regulatory ceiling, never exceeded)

final_ltv = BASE_LTV
          × carat_multiplier
          × (cibil_factor × missed_emi_penalty)   ← folded together
          × active_loan_factor
          × profession_factor
          × gold_trend_factor

final_ltv = min(final_ltv, 0.75)   ← hard cap
```

### 3a. Carat Multiplier

| Carat | `CARAT_MULTIPLIERS` | Rationale |
|---|---|---|
| 24K | 1.000 | Pure gold, no markdown |
| 22K | 0.973 | Slight markdown for purity uncertainty |
| 21K | 0.953 | — |
| 18K | 0.900 | — |
| 14K | 0.840 | Significant impurity risk |

### 3b. CIBIL Factor

| CIBIL Score Range | `cibil_factor` |
|---|---|
| ≥ 760 | 1.00 |
| 720 – 759 | 0.95 |
| 680 – 719 | 0.90 |
| 640 – 679 | 0.84 |
| 580 – 639 | 0.76 |
| < 580 | 0.65 |

### 3c. Missed EMI Penalty

Applied on top of CIBIL factor (`cibil_combined = cibil_factor × emi_penalty`).

| Missed EMIs | `missed_emi_penalty` |
|---|---|
| 0 | 1.00 |
| 1 – 2 | 0.95 |
| 3 – 5 | 0.88 |
| > 5 | 0.78 |

### 3d. Active Loan Factor

```
active_loan_factor = max(0.80,  1.0 − active_loans × 0.06)
```

| Active Loans | Factor |
|---|---|
| 0 | 1.00 |
| 1 | 0.94 |
| 2 | 0.88 |
| 3 | 0.82 |
| 4+ | 0.80 (floor) |

### 3e. Profession Factor

| Profession | `PROFESSION_FACTORS` |
|---|---|
| Government Employee | 1.00 |
| Private Employee | 0.96 |
| Business Owner | 0.91 |
| Self Employed | 0.88 |
| Retired | 0.86 |
| Freelancer | 0.83 |

### 3f. Gold Trend Factor

Based on ML-predicted % price change over tenure.

| Predicted Change | `gold_trend_factor` |
|---|---|
| ≥ +5% | 1.05 (rising fast → safer collateral) |
| +2% to +5% | 1.02 |
| −2% to +2% | 1.00 (stable) |
| −5% to −2% | 0.95 |
| ≤ −5% | 0.90 (falling fast → riskier collateral) |

### 3g. LTV Breakdown (delta from base shown in UI)

Each factor's contribution is the delta it adds/removes from the running LTV:

```
carat_adjustment          = (carat_mult − 1) × BASE_LTV × 100
cibil_adjustment          = (cibil_combined − 1) × BASE_LTV × carat_mult × 100
active_loans_adjustment   = (active_f − 1) × BASE_LTV × carat_mult × cibil_combined × 100
profession_adjustment     = (prof_f − 1) × BASE_LTV × carat_mult × cibil_combined × active_f × 100
gold_trend_adjustment     = (trend_f − 1) × BASE_LTV × carat_mult × cibil_combined × active_f × prof_f × 100
```

---

## 4. Eligible Loan Amounts

**File:** `services/loan_calculator.py`

### Current Eligible Loan

```
eligible_loan_amount_aed = gold_valuation_aed × final_ltv
```

### Future-Adjusted Loan Estimate

```
future_gold_valuation_aed       = pure_grams × predicted_end_price_aed_per_gram
future_eligible_loan_amount_aed = future_gold_valuation_aed × final_ltv × 0.97
```

> `0.97` = 3% safety buffer applied to all future estimates.  
> `predicted_end_price_aed_per_gram` = ML model's AED/gram forecast at tenure-end month.  
> Same `final_ltv` is used — only the gold price changes.

**Delta shown in UI:**
```
delta_pct = (future_eligible − current_eligible) / current_eligible × 100
```

---

## 5. Gold Price Prediction (ML Pipeline)

**File:** `services/gold_service.py`

### Data Source
`data/gold_history.json` — 20 years of daily gold prices (AED/oz).

### Two Models Fitted

**Model A — Polynomial (degree-3 Ridge) on all 20 years:**
- Captures macro gold cycles (bull/bear over decades)
- Input x normalised to [0, 1] for stability
- `Ridge alpha = 10.0`

**Model B — Linear regression on last 365 days:**
- Captures current year's momentum
- Only last 365 days of data used (increased from 90 days to avoid short-term dip bias)

### Blend Formula

```
blended = 0.65 × Model_A(long_run)  +  0.35 × Model_B(recent_momentum)
```

> Long-run dominates (65%) to prevent short-term dips from dragging the full forecast.

### Anchor

Day-0 of forecast is anchored exactly to the live price to prevent a visible jump at the seam:
```
anchor_shift = live_usd_per_oz − blended_at_day_0
blended_forecast = blended + anchor_shift
```

### Noise Model

```
noise = Normal(0,  price × 0.006 × sqrt(month_index))
```
Adds realistic compounding volatility (~0.6% per month, growing with horizon).

### Trend Classification

```
pct_change = (predicted_price_at_tenure_end − live_price) / live_price × 100

RISING  : pct_change > +2%
STABLE  : −2% ≤ pct_change ≤ +2%
FALLING : pct_change < −2%
```

### Historical Display

Last 3 months of data, averaged by calendar month → 3 data points on the chart.  
Converted: `USD/oz → SAR/gram` for display.

---

## 6. System Decision

**File:** `services/loan_calculator.py` → `_make_decision()`

Point scoring system:

| Signal | Points |
|---|---|
| CIBIL ≥ 750 | +3 |
| CIBIL 700–749 | +2 |
| CIBIL 640–699 | +1 |
| CIBIL < 640 | −2 |
| Missed EMIs = 0 | +2 |
| Missed EMIs 1–2 | 0 |
| Missed EMIs > 2 | −2 |
| Active loans = 0 | +1 |
| Active loans ≥ 3 | −1 |
| Gold trend RISING | +1 |
| Gold trend FALLING | −1 |

| Total Score | Decision | Remarks |
|---|---|---|
| ≥ 5 | Pre-Approved | Strong history, high quality collateral |
| 2 – 4 | Pre-Approved | Meets criteria, verify income docs |
| 0 – 1 | Manual Review | Moderate risk, senior officer review |
| < 0 | Manual Review | High risk signals, recommend reduction |

### CIBIL Label

| Score | Label |
|---|---|
| ≥ 760 | Excellent |
| 720 – 759 | Very Good |
| 680 – 719 | Good |
| 640 – 679 | Fair |
| 580 – 639 | Poor |
| < 580 | Very Poor |

---

## 7. User Risk Score (0–100, lower = safer)

**File:** `services/risk_analyzer.py`

```
user_risk = CIBIL_pts + missed_EMI_pts + active_loan_pts + profession_pts + balance_pts
user_risk = min(user_risk, 100)
```

### Component Breakdown

#### CIBIL (max 40 pts)

| CIBIL | Points |
|---|---|
| ≥ 760 | 5 |
| 720 – 759 | 15 |
| 680 – 719 | 25 |
| 640 – 679 | 32 |
| 580 – 639 | 38 |
| < 580 | 40 |

#### Missed EMIs (max 20 pts)

| Missed | Points |
|---|---|
| 0 | 0 |
| 1 – 2 | 8 |
| 3 – 5 | 15 |
| > 5 | 20 |

#### Active Loans (max 15 pts)

| Active | Points |
|---|---|
| 0 | 0 |
| 1 | 3 |
| 2 | 8 |
| 3 | 12 |
| 4+ | 15 |

#### Profession Stability (max 15 pts)

| Profession | Points |
|---|---|
| Government Employee | 0 |
| Private Employee | 3 |
| Retired | 5 |
| Business Owner | 7 |
| Self Employed | 9 |
| Freelancer | 12 |

#### Outstanding Balance vs Eligible Loan (max 10 pts)

| Condition | Points |
|---|---|
| outstanding > 50% of eligible_loan | 10 |
| outstanding > 25% of eligible_loan | 5 |
| otherwise | 0 |

### User Risk Labels

| Score | Label | Bar Color |
|---|---|---|
| 0 – 25 | LOW RISK | Green |
| 26 – 50 | MEDIUM RISK | Amber |
| 51 – 75 | HIGH RISK | Red |
| 76 – 100 | VERY HIGH RISK | Red |

---

## 8. Company Risk Score (0–100, lower = safer)

**File:** `services/risk_analyzer.py`

```
company_risk = (user_risk × 0.40) + ltv_risk + market_risk
company_risk = min(company_risk, 100)
```

Three components — weights: 40% borrower / 35% collateral / 25% market.

### Component A: User Risk Contribution (40%)

```
user_contrib = user_risk_score × 0.40
```

Max possible from this component: 40 pts.

### Component B: LTV / Collateral Risk (max 35 pts)

| final_ltv_pct | `ltv_risk` |
|---|---|
| ≤ 60% | 5 |
| 61 – 70% | 12 |
| 71 – 75% | 20 |
| 76 – 80% | 28 |
| > 80% | 35 |

### Component C: Market / Gold Price Risk (max 25 pts)

| Trend | Condition | `mkt_risk` |
|---|---|---|
| RISING | pct_change ≥ +5% | 2 (very safe — lender can liquidate at premium) |
| RISING | pct_change < +5% | 8 |
| STABLE | — | 14 |
| FALLING | pct_change > −5% | 18 |
| FALLING | pct_change ≤ −5% | 25 |

**Extra:** if tenure ≤ 6 months AND trend = FALLING → `mkt_risk += 5` (capped at 25).

### Company Risk Labels

| Score | Label | Exposure |
|---|---|---|
| 0 – 25 | LOW RISK | LOW |
| 26 – 50 | MEDIUM RISK | MEDIUM |
| 51 – 75 | HIGH RISK | HIGH |
| 76 – 100 | VERY HIGH RISK | VERY HIGH |

---

## 9. Data Sources Summary

| Data | Source | Refreshed |
|---|---|---|
| Live XAU/USD | `api.gold-api.com/price/XAU` | Per request |
| Gold history (20yr) | `data/gold_history.json` | Static file |
| Customer profile | `data/dummy_customers.json` | Static (seeded) |
| Loan history | `data/dummy_loans.json` | Static (seeded) |
| UAE PASS identity | Stub only (hardcoded for 3 IDs) | N/A |

**Seeded Emirates IDs:**
- `784-1985-1234567-1` — Ahmed Al-Mansoori, CIBIL 780, A+
- `784-1990-2345678-2`
- `784-1978-3456789-3`
