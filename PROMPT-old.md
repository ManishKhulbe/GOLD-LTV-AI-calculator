## Context Documents (read all three before writing any code)                                                           
   
  You have access to three specification documents for this project:                                                      
                  
  1. **`docs/BRD.md`** — Business requirements, stakeholder roles, functional requirements (FR-01 to FR-12),              
  non-functional requirements, acceptance criteria, constraints, and glossary.
  2. **`docs/FRD.md`** — Technical specification: system architecture diagram, all 17 functional requirements (FR-001 to  
  FR-017) with inputs/outputs, use cases (UC-001 to UC-005), business rules (BR-001 to BR-015), API schemas, LTV          
  multiplier tables, risk score formulas, error handling table, and traceability matrix.
  3. **`CALCULATIONS.md`** — Every formula, constant, and lookup table used in the system: gold price conversion, gold    
  valuation (AED), LTV multiplier chain (6 factors), eligible loan amounts, ML prediction pipeline (blend weights, anchor,
   noise model, trend classification), system decision scoring, user risk score (5 components), and company risk score (3
  components).                                                                                                            
                  
  Read all three documents fully before writing a single line of code. Every formula, threshold, purity value, multiplier,
   and label must match the specification exactly — do not invent values.
                                                                                                                          
  ---             

  ## Design System                                                                                                        
   
  **Source:** Google Stitch project `https://stitch.withgoogle.com/projects/1487274537353140834`                          
                  
  Implement screens in this order:                                                                                        
  1. **Gold Loan Valuation Calculator — Final-Input screen** (Calculator / entry screen)
  2. **Gold Loan Eligibility Summary — Final screen** (Results / dashboard screen)                                        
                  
  Apply the **Premium Finance Identity** design language throughout:                                                      
  - Colors, gradients, and surface tones from the Premium Finance Identity palette (dark navy/charcoal backgrounds, gold
  accent `#C9A84C` or equivalent, white text on dark surfaces)                                                            
  - Typography: use the fonts specified in the Premium Finance Identity (typically a geometric sans-serif for headings,
  clean sans for body)                                                                                                    
  - Icons: use the icon set shown in the Premium Finance Identity (outlined style, consistent stroke weight)
  - Spacing, border-radius, card elevation, and shadow tokens must match the Stitch screens exactly                       
  - No placeholder colors — every color must come from the design system                                                  
                                                                                                                          
  ---                                                                                                                     
                                                                                                                          
  ## Tech Stack   

  ### Backend
  - **Python 3.11+** with **FastAPI**
  - **Uvicorn** as ASGI server on port **8001**                                                                           
  - **scikit-learn** for Ridge regression and linear regression (ML pipeline)                                             
  - **httpx** for async external HTTP calls (gold-api.com, UAE PASS)                                                      
  - **Pydantic v2** for all request/response models and input validation                                                  
  - Data stored as JSON files (no database)                                                                               
                                                                                                                          
  ### Frontend                                                                                                            
  - **React 18** with functional components and hooks only (no class components)                                          
  - **Vite** as build tool
  - **Tailwind CSS** for utility styling (configured to match the Premium Finance Identity tokens)                        
  - **Recharts** for the gold price forecast chart                                                                        
  - Single file entry: `src/App.jsx` — two screens managed via `activeScreen` state (`calculator` | `summary`)            
  - No page reloads after initial load (SPA)                                                                              
                                                                                                                          
  ---                                                                                                                     
                                                                                                                          
  ## File Structure to Generate                                                                                           
   
  ```                                                                                                                     
  backend/        
    main.py                        # FastAPI app, CORS, route handlers
    models.py                      # All Pydantic schemas (request + response)                                            
    services/                                                                                                             
      gold_service.py              # Live price fetch + ML forecast pipeline                                              
      loan_calculator.py           # LTV multiplier chain + eligible amounts                                              
      risk_analyzer.py             # User risk + company risk scoring                                                     
      customer_service.py          # JSON-based customer + loan lookup                                                    
      uaepass_service.py           # UAE PASS stub (silent fallback)                                                      
    data/                                                                                                                 
      dummy_customers.json         # 3 seeded customers (see CALCULATIONS.md §9)                                          
      dummy_loans.json             # Loan history keyed by emirates_id                                                    
      gold_history.json            # 20-year daily AED/oz prices                                                          
                                                                                                                          
  src/                                                                                                                    
    App.jsx                        # Full SPA — CalculatorScreen + SummaryScreen                                          
    index.css                      # Tailwind base + Premium Finance Identity tokens                                      
    main.jsx                       # React entry point                                                                    
                                                                                                                          
  index.html                                                                                                              
  vite.config.js  
  tailwind.config.js
  package.json                                                                                                            
  requirements.txt
  .env.example                                                                                                            
  .gitignore      
  ```

  ---

  ## Backend Requirements (implement exactly as specified in FRD + CALCULATIONS.md)                                       
   
  ### API Endpoints (FRD §8.1)                                                                                            
  | Method | Path | Response |
  |--------|------|----------|                                                                                            
  | `GET` | `/health` | `{"status": "ok"}` |
  | `GET` | `/api/gold-rate/live` | `{karats: {24K, 22K, 21K, 18K, 14K}}` in SAR/gram |                                   
  | `GET` | `/gold/price` | `LiveGoldPriceResponse` |                                                                     
  | `GET` | `/gold/insights?tenure_months=int` | `GoldInsights` |                                                         
  | `GET` | `/customer/{emirates_id}` | `CustomerProfile` |                                                               
  | `GET` | `/customer/{emirates_id}/loans` | `LoanHistoryOverview` |                                                     
  | `POST` | `/loan/calculate` | `LoanCalculationResponse` |                                                              
                                                                                                                          
  ### gold_service.py                                                                                                     
  - Fetch live price from `https://api.gold-api.com/price/XAU`; fallback to `FALLBACK_USD_OZ = 3300.0`
  - Constants: `SAR_PER_USD = 3.7500`, `AED_PER_USD = 3.6725`, `TROY_OZ_TO_GRAM = 31.1035`                                
  - ML pipeline: Model A = degree-3 Ridge (alpha=10, all 20yr data, x normalised [0,1]); Model B = LinearRegression (last 
  365 days)                                                                                                               
  - Blend: `0.65 × Model_A + 0.35 × Model_B`                                                                              
  - Anchor forecast to live price; add compounding noise `Normal(0, price × 0.006 × sqrt(month_index))`                   
  - Trend: RISING if >+2%, FALLING if <-2%, else STABLE                                                                   
  - History: last 3 complete calendar months, averaged, converted to SAR/gram                                             
                                                                                                                          
  ### loan_calculator.py                                                                                                  
  - All 6 LTV multipliers from CALCULATIONS.md §3 (carat, CIBIL, missed EMI, active loans, profession, gold trend)        
  - Hard cap: `final_ltv = min(computed, 0.75)`                                                                           
  - LTV breakdown: delta per factor as shown in CALCULATIONS.md §3g                                                       
  - Eligible loan: `gold_valuation_aed × final_ltv`                                                                       
  - Future eligible: `future_gold_valuation_aed × final_ltv × 0.97`                                                       
  - System decision: point-scoring from CALCULATIONS.md §6 (not the simple threshold from FRD §FR-017 — use the point     
  system)                                                                                                                 
                                                                                                                          
  ### risk_analyzer.py                                                                                                    
  - User risk: 5 components from CALCULATIONS.md §7 (CIBIL 40pts, missed EMIs 20pts, active loans 15pts, profession 15pts,
   balance ratio 10pts) — use the exact breakpoints in CALCULATIONS.md                                                    
  - Company risk: 3 components from CALCULATIONS.md §8 (user contrib 40%, LTV risk 35pts using bracket table, market risk 
  25pts using trend+pct table; tenure ≤6 + FALLING adds 5pts capped at 25)                                                
                  
  ### models.py                                                                                                           
  - Pydantic v2 validators: Emirates ID regex `784-\d{4}-\d{7}-\d`; carat enum `{14K,18K,21K,22K,24K}`; tenure enum 
  `{6,12,18,24,36}`                                                                                                       
  - Full `LoanCalculationResponse` with all nested models from FRD §6.2–6.6
                                                                                                                          
  ### Error handling (FRD §9)
  - 404 on unknown Emirates ID                                                                                            
  - 422 on invalid inputs (Pydantic)
  - 500 if `gold_history.json` missing                                                                                    
  - All other errors return `{"detail": "..."}` format
  - UAE PASS failures: silent catch, use local DB                                                                         
                                                                                                                          
  ---                                                                                                                     
                                                                                                                          
  ## Frontend Requirements

  ### CalculatorScreen (Screen 1 — matches "Gold Loan Valuation Calculator — Final-Input" from Stitch)                    
  - Live karat rates panel: 5 karats (24K–14K), SAR/gram, fetched on mount via `GET /api/gold-rate/live`
  - Form fields: Emirates ID, carat selector, gold weight (grams), tenure (months: 6/12/18/24/36), profession             
  - Emirates ID format hint: `784-YYYY-XXXXXXX-C`                                                                         
  - Client-side validation before submit; show field-level errors                                                         
  - Submit triggers `POST /loan/calculate`; show loading state                                                            
  - On success: transition to SummaryScreen with response data (no page reload)                                           
                                                                                                                          
  ### SummaryScreen (Screen 2 — matches "Gold Loan Eligibility Summary — Final" from Stitch)
  All sections visible without toggling:                                                                                  
  1. **Hero card**: system decision badge, eligible loan amount SAR, gold valuation SAR, LTV %, CIBIL score + label       
  2. **Future estimate card**: future eligible loan SAR, delta % vs current, labelled "Model Estimate — Not a Guarantee"  
  3. **Gold forecast chart** (Recharts `LineChart`): 3 history points (grey line) + current live price (green dot) +      
  predicted points (dashed gold line); trend badge RISING/STABLE/FALLING; predicted change %                              
  4. **LTV breakdown table**: each of the 6 factors, their multiplier, and delta adjustment                               
  5. **Risk bars**: user risk score + label (horizontal fill, green ≤25 / amber 26–50 / red 51+); company risk score +    
  exposure label                                                                                                          
  6. **Customer profile card**: all fields from `CustomerProfile`                                                         
  7. **Loan history**: overview stats + per-loan cards with status badges (ACTIVE=green, CLOSED=grey, DEFAULTED=red)      
  8. **EMI Calculator**:                                                                                                  
     - Toggle: Monthly EMI / Bullet Payment                                                                               
     - Tenure dropdown (3/6/12/18/24/36), annual rate % input                                                             
     - Real-time calculation (no API call)                                                                                
     - Monthly EMI: `P × r(1+r)^n / ((1+r)^n - 1)`; zero-rate case: `P / n`                                               
     - Bullet: `P × (1 + rate × months/12)`                                                                               
     - Amortization schedule (Monthly mode only, rate > 0): scrollable table, sticky header, 220px max height, principal  
  green, interest red                                                                                                     
                                                                                                                          
  ### Shared UI rules                                                                                                     
  - `formatSar(value)` helper: always format monetary values as `SAR X,XXX.XX`
  - All amounts in SAR (no AED in UI)                                                                                     
  - Risk bar colour: green ≤25, amber 26–50, red >50                                                                      
  - Responsive minimum: 1280px width                                                                                      
  - Error state: show actionable message for 404 (customer not found) and 422 (field errors)                              
                                                                                                                          
  ---                                                                                                                     
                                                                                                                          
  ## Seed Data Requirements                                                                                               
                           
  `dummy_customers.json` must include at minimum:
  - `784-1985-1234567-1` — Ahmed Al-Mansoori, CIBIL 780, risk category A+, government employee                            
  - `784-1990-2345678-2` — second customer with moderate CIBIL (~680), salaried, 1 active loan, 1 missed EMI
  - `784-1978-3456789-3` — third customer with lower CIBIL (~600), self-employed, 2 active loans, 3 missed EMIs           
                                                                                                                          
  `dummy_loans.json` must include at least 2 loans per customer with mixed statuses (ACTIVE, CLOSED, one DEFAULTED).      
                                                                                                                          
  `gold_history.json` must contain ≥ 365 daily records in format `[{"day": "YYYY-MM-DD", "max_price": float}]` with prices
   in AED/troy oz.                                                                                                        
                  
  ---                                                                                                                     
                  
  ## Constraints & Non-Negotiables
                                  
  - LTV must **never** exceed 75% — enforce with `min(..., 0.75)` hard cap
  - All SAR peg: `1 USD = 3.7500 SAR` (fixed, never configurable at runtime)                                              
  - All AED peg: `1 USD = 3.6725 AED` (fixed)                               
  - No secrets in code — use `.env` / environment variables for `UAEPASS_CLIENT_ID`, `UAEPASS_CLIENT_SECRET`              
  - CORS: allow all origins in development; restrict to Finance House domain in production via `ALLOWED_ORIGINS` env var
  - UAE PASS is stubbed — hardcode profile enrichment for the 3 seeded Emirates IDs; all others fall back to local DB     
  silently                                                                                                                
  - No component library (no MUI, Ant Design, Chakra) — Tailwind CSS only                                                 
  - No class components — React functional components and hooks only                                                      
  - `src/App.jsx` is the single source of truth for all frontend logic and screens                                        
                                                                                                                          
  ---                                                                                                                     
                                                                                                                          
  ## Deliverable Checklist                                                                                                
                          
  Before declaring the task complete, verify:
  - [ ] All 17 FRD functional requirements implemented                                                                    
  - [ ] All 15 business rules (BR-001 to BR-015) enforced in code
  - [ ] All formulas match CALCULATIONS.md exactly (no invented values)                                                   
  - [ ] All 7 API endpoints respond correctly                                                                             
  - [ ] Emirates ID validation regex enforced                                                                             
  - [ ] Gold API fallback works when API is unreachable                                                                   
  - [ ] UAE PASS stub silently falls back for unknown IDs                                                                 
  - [ ] LTV hard cap at 75% present in `loan_calculator.py`                                                               
  - [ ] EMI zero-rate edge case handled                                                                                   
  - [ ] Amortization final balance rounds to zero                                                                         
  - [ ] Both screens match the Stitch design (Premium Finance Identity: colors, fonts, icons)                             
  - [ ] `requirements.txt` and `package.json` complete with all dependencies                 
  - [ ] `.env.example` documents all environment variables                                                                
  - [ ] Seed data covers all 3 Emirates IDs with mixed loan statuses                                                      
                                                                                                                          
  ---                                                                                                          