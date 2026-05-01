# RULEBOOK.md — Project Rules & Engineering Standards
**Project:** Gold LTV AI Calculator — Finance House Dubai
**Version:** 1.0
**Date:** 2026-05-01

---

## Core Principle

Do not delete or break any feature or flow. Every existing feature must remain functional when new features are added. No flow, endpoint, or calculation may be removed or altered without explicit user approval.

---

## Calculation Integrity Rules

These rules protect the correctness of financial outputs. Violations can produce wrong loan amounts or incorrect risk scores.

**LTV ceiling**
- Final LTV must never exceed 75.00% regardless of input values.
- The cap `min(computed_ltv, 0.75)` must always be present in `loan_calculator.py`.
- Do not remove, bypass, or conditionally skip this cap.

**LTV multiplier chain**
- Exactly 6 multipliers must be applied in this order: carat → SIMAH → missed EMIs → active loans → profession → gold trend.
- Do not add, remove, or reorder multipliers without updating BRD, FRD, SPEC, and CALCULATIONS.md.

**Carat purity constants**
- Values are fixed: 24K=1.0, 22K=0.9167, 21K=0.875, 18K=0.75, 14K=0.5833.
- Do not change these without a business rule change approved in writing.

**Currency constants**
- SAR peg: `SAR_PER_USD = 3.7500` — fixed.
- Troy oz conversion: `TROY_OZ_TO_GRAM = 31.1035` — fixed.
- Do not use approximations (e.g., 3.75, 31.1) in place of the full constants.

**EMI formulas**
- Monthly reducing balance: `P × r(1+r)^n / ((1+r)^n - 1)` where `r = annual_rate / 100 / 12`.
- Zero-rate case must be handled: `if r == 0: EMI = P / n`.
- Bullet payment: `P × (1 + rate/100 × months/12)`.
- Do not substitute alternative EMI formulae without updating FRD and CALCULATIONS.md.

**Future-adjusted loan buffer**
- The 3% safety buffer is fixed: `future_eligible = future_valuation × ltv × 0.97`.
- Do not change the buffer constant without explicit approval.

**ML blend weights**
- Long-term model weight: `W_LONG = 0.65` (polynomial, 20-year).
- Recent model weight: `W_RECENT = 0.35` (linear, 365-day).
- Changing these weights alters forecast behaviour significantly. Require review before changing.

**Risk score components**
- User risk: SIMAH(40) + missed EMIs(20) + active loans(15) + profession(15) + balance ratio(10) = 100 max.
- Company risk: `user_risk × 0.40 + ltv_risk(35) + market_risk(25)` = 100 max.
- Do not add, remove, or reweight components without updating FRD, BRD, and risk_analyzer.py.

---

## Currency Rules

- All monetary values must be in **SAR** everywhere: API request/response fields, UI display, internal variables.
- Field names must use `_sar` suffix (e.g., `gold_valuation_sar`, `eligible_loan_amount_sar`).
- No AED amounts may appear in API responses or UI components.
- The `formatSar()` frontend function must be used for all monetary display — do not inline currency formatting.
- If a new monetary field is added to the API, it must use `_sar` suffix and be converted from USD/oz using the SAR peg constant.

---

## API & Backend Rules

**No breaking changes**
- All API changes must be backward compatible unless explicitly approved.
- Removing or renaming a response field requires updating all consuming frontend code in the same PR.
- Deprecations must be documented in this RULEBOOK.md.

**Input validation**
- All request bodies must be validated with Pydantic v2 models in `backend/models.py`.
- Emirates ID must be validated with regex: `784-\d{4}-\d{7}-\d`.
- Numeric inputs (`gold_weight_grams`) must enforce `> 0`.
- Enum inputs (`carat`, `tenure_months`, `job_profession`) must be validated as Pydantic enums.
- Return HTTP 422 with field-level error detail on validation failure — never 500 for bad input.

**Error response shape**
- All API errors must return `{"detail": "..."}` (FastAPI default format).
- Do not expose raw exception tracebacks in responses.
- HTTP status codes: 404 for unknown Emirates ID, 422 for invalid input, 500 for server-side failures.

**Gold API fallback**
- `GET /api/gold-rate/live` and `POST /loan/calculate` must both handle gold-api.com failure gracefully.
- On any HTTP error or timeout from gold-api.com: use `FALLBACK_USD_OZ = 3300.0`.
- Do not remove the fallback or let gold API failures propagate as 500 errors to the frontend.

**UAE PASS failure handling**
- Any exception from `uaepass_service.py` must be caught silently.
- On failure: use local DB customer record without error.
- Never expose UAE PASS errors to the frontend or in the API response.

**Port**
- Backend must run on port 8001.
- Do not change this without updating `App.jsx`'s `BACKEND_BASE_URL` and documenting the change.

**CORS**
- Development: `allow_origins=["*"]` is acceptable.
- Production: Must be restricted to Finance House domain via `ALLOWED_ORIGINS` environment variable.
- Do not deploy with open CORS to production.

---

## Frontend Rules

**No direct state mutation**
- All React state updates must go through `useState` setters.
- Do not mutate state objects directly.

**Screen and feature stability**
- Both `CalculatorScreen` and `SummaryScreen` must remain functional after every change.
- Every section of the `SummaryScreen` dashboard (LTV hero, gold chart, risk bars, customer profile, EMI calculator) must render without errors when valid API data is present.

**Loading and error states**
- The submit button must show a loading state during `POST /loan/calculate`.
- API errors (non-200 responses) must display a user-facing error message — not a blank screen or console-only log.

**Currency display**
- Use `formatSar()` for all monetary values. Do not use `toLocaleString` or inline currency formatting elsewhere.
- All amounts display as `SAR X,XXX.XX`.

**Karat list**
- Only these karats are supported: `['24K', '22K', '21K', '18K', '14K']`.
- Do not add karats to the UI without adding their purity constant to the backend.

**EMI calculator**
- Both "Monthly EMI" and "Bullet Payment" modes must remain functional.
- Amortization schedule must only render in Monthly EMI mode when a rate is entered.
- Rate input of 0% must produce `EMI = principal / months` — never a divide-by-zero error.

---

## Data File Rules

- `backend/data/gold_history.json` is required at startup. If missing, the server raises `FileNotFoundError` — do not suppress this.
- `backend/data/dummy_customers.json` and `backend/data/dummy_loans.json` are generated by `seed_data.py`. Re-run this script if files are missing or corrupted — do not hand-edit them.
- Do not commit changes to the data files unless re-seeding intentionally.
- Gold history file format must remain: `[{"day": "YYYY-MM-DD", "max_price": float}]`.

---

## Security Rules

- No secrets, API keys, or credentials in source code or committed files.
- `UAEPASS_CLIENT_ID` and `UAEPASS_CLIENT_SECRET` must be stored in `backend/.env` only; `.env` is git-ignored.
- Do not add `.env` to version control.
- All environment variables used by the app must be documented in `ARCHITECTURE.md` Section 8.4.

---

## Documentation Sync Rules

When changing any calculation, formula, constant, or API field:

| Change Type | Documents to Update |
|---|---|
| Formula change (LTV, EMI, risk score) | `CALCULATIONS.md`, `FRD.md`, `SPEC.md` |
| New API field | `ARCHITECTURE.md` (API endpoints), `FRD.md` (data requirements), `models.py` |
| New feature | `BRD.md` (FR), `PRD.md` (feature list + user story), `FRD.md` (FR table + use case), `PLAN.md` (phase task) |
| Constant change (peg, purity, ceiling) | `CALCULATIONS.md`, `SPEC.md` (constraints), `FRD.md` (business rules) |
| Out-of-scope boundary change | `SPEC.md`, `PRD.md`, `BRD.md` |

---

## Deprecations

*None at v1.0.*

*(Add entries here as features are deprecated, with date and reason.)*

---

*Last updated: 2026-05-01*
