# Project Rulebook

> Do not delete or break any existing feature or flow. When adding new features, existing features must not be broken or removed without prior user approval.

---

## Core Principle

This project prioritizes stability, correctness, and regulatory compliance above all else. Gold loan decisions affect real financial outcomes — incorrect LTV calculations, stale prices, or broken risk scores have direct business and compliance consequences. Every change must be additive, tested against known inputs, and verified against the formulas in `CALCULATIONS.md` before being committed. The codebase is the single source of truth for all calculations; documentation and code must remain in sync at all times.

---

## Feature Integrity Rules

- Never remove or break an existing feature without explicit approval from the project owner
- Every new feature must be additive — no silent deletions of existing logic, endpoints, or UI sections
- Any deprecated feature must be marked as `# DEPRECATED` in code and noted in this RULEBOOK before removal
- The LTV formula chain in `loan_calculator.py` must never be modified without updating `CALCULATIONS.md` in the same commit
- All 6 LTV multiplier factors (carat, gold type, tenure, CIBIL, missed EMI, profession, trend) must always be applied — none may be silently skipped or commented out
- The `BASE_LTV = 0.75` ceiling must always be enforced via `min(final_ltv, BASE_LTV)` — the LTV must never exceed 75%

---

## Security Requirements

### Auth & Access
- No authentication exists in v1 — access must be controlled at the network/VPN level until auth is implemented
- When JWT auth is added: tokens must be short-lived (≤ 1 hour), signed with a secret from environment variables only, and never stored in localStorage
- Never return customer names, Emirates IDs, or CIBIL scores in server-side logs

### Input Validation
- All incoming request bodies are validated via Pydantic v2 — do not bypass this validation
- Return 422 with Pydantic's structured error detail on validation failure — never return a raw Python exception
- Never silently coerce invalid data (e.g., converting a string gold weight to 0.0 without raising)
- `gold_weight_grams` must be validated as `> 0` — a zero-gram gold loan must never produce a positive valuation

### Secrets & Credentials
- Never store UAE PASS credentials (`UAEPASS_CLIENT_ID`, `UAEPASS_CLIENT_SECRET`) in source code — use `.env` (git-ignored)
- Never commit `.env` files — `.gitignore` must include `.env` and `.env.*`
- No direct client-side access to backend data files — all data flows through FastAPI endpoints

---

## API Rules

- All API changes must be backward compatible unless explicitly approved — do not rename fields in `LoanCalculationResponse`
- All endpoints must return errors in this shape: `{"detail": "<string>"}` (FastAPI default) or `{"error": "<string>", "details": <any>}` for custom errors
- Do not throw raw Python exceptions to clients — use `HTTPException` or Pydantic validation
- The `/loan/calculate` endpoint is the primary integration surface — any change to its request or response schema requires explicit sign-off
- Add rate limiting on `/loan/calculate` before production deployment (suggested: 10 requests/minute per IP)
- The `CORS allow_origins=["*"]` setting must be replaced with a specific origin list before production
- Deprecate endpoints by keeping them functional but adding a `Deprecated: true` flag to their OpenAPI metadata — do not remove without a migration period

---

## Data Integrity Rules

- `gold_history.json` must never be modified by application code at runtime — it is a read-only reference file
- Never write to `dummy_customers.json` or `dummy_loans.json` from application code — these are seeded once by `seed_data.py`
- When replacing JSON data files with a real database: preserve all field names exactly as they appear in the Pydantic models
- The 3% safety buffer (`× 0.97`) on future eligible loan amounts is a risk policy rule — it must not be removed without credit risk manager approval
- Log all future changes to LTV parameters (multipliers, factors, thresholds) as dated entries in `CALCULATIONS.md`

---

## Error Handling Standards

- Every API endpoint must handle `FileNotFoundError` for `gold_history.json` gracefully — return 500 with a clear message identifying the missing file
- Never expose Python stack traces to API clients — FastAPI's exception handlers must catch and sanitize
- All async calls to external APIs (`gold-api.com`, UAE PASS) must have explicit timeouts — currently `httpx.AsyncClient(timeout=8.0)` — do not increase beyond 15 seconds
- The gold price fallback (`FALLBACK_USD_OZ = 3300.0`) must always be reachable — never remove the `try/except` block in `fetch_live_gold_price_aed_karats()`
- Frontend must handle all three states for every section: loading, error, and data-present — never render a blank section silently

---

## Testing Requirements

- Any new API endpoint must have at least one happy-path test verifying the response schema
- Any change to LTV multipliers must be validated against the worked examples in `CALCULATIONS.md` before merging
- Any bug fix in risk scoring must include a test case using a known Emirates ID and expected score
- Critical flows to cover: Emirates ID lookup (found + not found), gold API fallback, LTV calculation for all 5 karats, system decision for Pre-Approved and Manual Review
- Do not mock `gold_history.json` in integration tests — use the real file to catch data format issues

---

## Frontend Rules

- State transitions use React `useState` only — do not introduce Redux, Zustand, or other state libraries without explicit approval
- Every screen must handle three states: loading (spinner or skeleton), error (message + retry option), and data-present
- No hardcoded API URLs outside of `App.jsx` — the `BACKEND_BASE_URL` constant in `App.jsx` is the single point of configuration
- Do not add `console.log` statements to production builds — use dev-only tooling
- All monetary values must be formatted using `formatAed()` — never render raw floats for AED amounts
- The `SummaryScreen` → `CalculatorScreen` back navigation must always clear `valuationResult` state

---

## Performance Rules

- Do not add polling for live gold rates — fetch once on page load; the officer can refresh manually
- ML model fitting runs on every `/loan/calculate` request (reads and fits from JSON) — before production, move model fitting to application startup and cache in module-level variables
- Do not load `gold_history.json` on every request in production — read once at startup
- Do not add synchronous blocking calls inside FastAPI async route handlers
- Frontend chart rendering uses hand-rolled SVG — do not introduce a charting library without performance profiling first

---

## Configuration & Environment Rules

- All configurable values (ports, API URLs, fallback prices, LTV base) must be documented in a future `ENV.md` file
- Defaults must be safe: the fallback gold price (`3300.0`) is conservative — it will undervalue gold, not overvalue it
- Never commit secrets to version control — use `.env` for all credentials
- The `AED_PER_USD = 3.6725` and `SAR_PER_USD = 3.7500` pegs are regulatory constants — do not make them configurable without compliance review
- Port 8001 is the canonical backend port — if changed, update both `App.jsx` (frontend) and all documentation simultaneously

---

## Observability & Logging

- Log gold API fallback activations with timestamp and fallback value used — this is a business signal, not just a debug message
- Do not log Emirates IDs in server stdout — use a masked version (e.g., first 3 + last 1 characters) if logging is needed
- Do not log CIBIL scores or customer names
- Log `FileNotFoundError` for `gold_history.json` with full path and a remediation hint
- Before production: implement structured JSON logging (replace `print()` calls) with `request_id`, `endpoint`, `duration_ms`, `status_code`

---

_Last updated: 2026-05-08_
