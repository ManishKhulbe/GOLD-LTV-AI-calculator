# RULEBOOK.md — Engineering Rules & Standards
# Gold Loan Valuation & Eligibility Dashboard — Finance House Dubai

**Version:** 1.0  
**Date:** 2026-05-08  
**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · FastAPI 0.110+ · Python 3.11+ · Pydantic v2 · Uvicorn · httpx · scikit-learn

---

> Do not delete or break any existing feature or flow. When adding new features, existing features must not be broken or removed without prior user approval.

---

## Core Principle

This codebase is a financial decision-support tool used by loan officers to process real loan applications for real customers. Correctness, stability, and predictability are the primary engineering constraints — not feature velocity. Every change must leave every existing calculation, API contract, and data flow intact. A silent regression in LTV computation or risk scoring is a compliance failure, not just a bug.

---

## Feature Integrity Rules

- Never remove or modify an existing API endpoint's response shape without explicit approval and a documented migration plan.
- Every new feature must be purely additive — no silent deletions of fields, routes, or UI sections.
- If a feature is deprecated, document it in this RULEBOOK and in the relevant endpoint's docstring before removing it.
- The LTV calculation chain in `services/loan_calculator.py` is the regulatory core of this system. Any change to a multiplier value, threshold, or formula requires explicit sign-off from the Risk / Compliance stakeholder and must be reflected in `CALCULATIONS.md` before the code change is merged.
- The `BASE_LTV = 0.75` constant and the `min(final_ltv, 0.75)` hard cap must never be removed or made configurable via a request parameter.
- Any change to the eligibility decision scoring thresholds in `_make_decision()` is a business rule change, not a code refactor — treat it as a requirements change.

---

## Security Requirements

### API Boundary

- Restrict `allow_origins` in `CORSMiddleware` to the known frontend origin before any deployment outside localhost. `allow_origins=["*"]` is only acceptable in local development.
- Add rate limiting on all endpoints before production deployment. Use `slowapi` or an equivalent FastAPI-compatible middleware. Minimum: 60 requests/minute per IP on `/loan/calculate`.
- Never expose raw Python exception messages, stack traces, or internal service errors in API responses. Catch at the route level and return structured error shapes only.
- All API error responses must use FastAPI's `HTTPException` with a `detail` string. Do not raise bare `Exception` to the client.

### Input Validation (FastAPI + Pydantic v2)

- All request bodies must be validated via Pydantic v2 models. No route handler may bypass model validation by accepting `dict` or `Any` directly.
- Emirates ID must be validated against the regex pattern `^784-\d{4}-\d{7}-\d$` before any data lookup is performed. Return HTTP 422 on mismatch.
- `gold_weight_grams` must be validated `> 0` at the Pydantic layer (Field constraint). The service layer must not re-validate what Pydantic already guarantees.
- Enum fields (`carat`, `gold_type`, `tenure_months`, `job_profession`) must use Pydantic enums. If an out-of-range value is submitted, Pydantic returns HTTP 422 automatically — do not add redundant manual checks.
- Do not silently coerce invalid input (e.g., rounding a negative weight to zero). Return an explicit 422 error.

### Secrets & Credentials

- `UAEPASS_CLIENT_ID` and `UAEPASS_CLIENT_SECRET` must be stored in `backend/.env` only. Never hardcode them in any source file.
- `backend/.env` must be listed in `.gitignore`. Verify this is enforced before every new environment setup.
- The fallback gold price constant (`FALLBACK_USD_OZ = 3300.0`) is not a secret — it may remain in source code. However, if it is made configurable via environment variable, apply the same `.env` treatment.
- No API keys, tokens, or credentials may appear in frontend source files, `vite.config.js`, or any committed configuration file.

### External API Calls (httpx)

- All `httpx.AsyncClient` calls to external services (`gold-api.com`, UAE PASS) must use explicit `timeout` values. The current 8-second timeout on gold-api.com is the minimum acceptable — do not increase it without justification.
- Always call `.raise_for_status()` on external responses before reading `.json()`. Handle the resulting `httpx.HTTPStatusError` explicitly.
- Never forward raw external API responses directly to the client without first parsing and validating the expected fields (`price`, `updatedAtReadable`).
- If a new external API integration is added, a fallback behaviour must be defined before the integration is merged.

---

## API Rules

- All new endpoints must follow the existing FastAPI pattern: Pydantic response model declared in `response_model=`, route registered with `tags=` and `summary=`, and docstring explaining the pipeline steps.
- All API changes must be backward compatible. If a response field is renamed or removed, add it as an alias or keep the old field (deprecated) until all consumers are updated.
- Every endpoint must return errors in this exact shape via FastAPI's `HTTPException`: `{ "detail": string }`. For validation errors (HTTP 422), Pydantic's default array format is acceptable.
- Do not throw bare Python exceptions from route handlers. Always convert to `HTTPException` with a meaningful `detail` string and the correct status code.
- New endpoints that call external APIs or run the ML pipeline must be `async def`. Do not add synchronous blocking calls in async routes.
- The Vite proxy in `vite.config.js` targets port 8000, but the backend runs on port 8001. The proxy is unused — `App.jsx` calls `http://127.0.0.1:8001` directly. Do not add logic that depends on the proxy. Fix the proxy target to 8001 if you re-enable it.
- Document any deprecated endpoint in this RULEBOOK with the deprecation date and the replacement endpoint before removal.

---

## Calculation Integrity Rules

- The LTV multiplier chain must always execute in the documented order: `BASE_LTV × carat × gold_type × tenure × CIBIL × emi_penalty × active_loans × profession × gold_trend`. Reordering factors changes results.
- The `min(final_ltv, BASE_LTV)` hard cap must be the last operation applied. It must never be applied mid-chain.
- All monetary values passed between services must be in AED. SAR values are display-only and must not be used in any calculation.
- The currency conversion constants `AED_PER_USD = 3.6725` and `TROY_OZ_TO_GRAM = 31.1035` are fixed by the product spec. Do not make them runtime-configurable without an explicit business requirement.
- The ML blend weights `W_LONG = 0.65` / `W_RECENT = 0.35` must not be changed without a corresponding update to `CALCULATIONS.md §5` and validation against backtest results.
- The prediction anchor (`anchor_shift = live_usd_per_oz - blend_day0`) must always be applied. Removing it causes a visible seam between the historical chart and the predicted chart — this is a UX defect and a data integrity issue.
- `numpy.random.seed(99)` is set in `_predict()` to make forecast noise reproducible. Do not remove or change this seed without updating tests that depend on deterministic output.

---

## Data Integrity Rules

- `gold_history.json` is required at startup. If it is absent or unreadable, the service must raise `FileNotFoundError` immediately — do not substitute a default empty array or silently return flat predictions.
- `dummy_customers.json` and `dummy_loans.json` are read-only in v1. No route may perform write operations on these files.
- When replacing JSON files with a relational database (v2), the `customer_service.py` interface (`get_customer_profile`, `get_loan_history`) must not change its signatures. Service consumers must not require updates.
- Never mutate a Pydantic model in-place. Use `model_copy(update={...})` as currently done in the UAE PASS enrichment path.
- All financial output values must be rounded to 2 decimal places using Python's `round(value, 2)` before being returned in any response.

---

## Error Handling Standards

- Every `async def` route that calls an external service or reads from a file must have explicit `try/except`. No unhandled `Exception` may propagate to FastAPI's default 500 handler.
- UAE PASS enrichment failures must be caught silently and return `None`. The calculation pipeline must not be interrupted by identity enrichment failures under any circumstances.
- Gold API failures must be caught and the fallback constant applied. The fallback must be visibly tagged in the `updated_at` field so the UI can display a warning.
- All frontend `fetch` calls must have `.catch()` handlers or `try/catch` in the `async` wrapper. `setStatusMessage(error.message)` is the current pattern — maintain it.
- Do not display raw error objects or HTTP status codes directly to the user. Convert to a human-readable message before calling `setStatusMessage`.
- `gold_history.json` parse errors on individual rows (malformed date, zero price) must be skipped silently with the row excluded from the dataset. Log the skipped row count if observability is added.

---

## Frontend Rules (React 19 + Vite + Tailwind CSS v4)

- Do not directly mutate React state. All state updates must go through `useState` setters or their derived setters (`setForm`, `setValuationResult`, etc.).
- Every screen that performs an async fetch must handle three states: loading (`isRateLoading`, `isSubmitting`), success (data rendered), and error (`statusMessage` displayed). Adding a new data fetch without handling all three states is a bug.
- The backend base URL must not be hardcoded in any new code. Move `BACKEND_BASE_URL` in `App.jsx` to a `VITE_API_BASE` environment variable (`import.meta.env.VITE_API_BASE`) before any multi-environment deployment.
- Do not add new direct API calls outside of `App.jsx` unless a dedicated data-fetching layer is introduced. `GoldLoanWorkspace.jsx` and other components must remain props-only (no internal fetch calls).
- All monetary values displayed in the UI must pass through the `formatAed(value)` formatter. Never render raw float values directly.
- New SVG components (gauges, charts) must accept their data exclusively via props. No SVG component may contain internal API calls or hardcoded data.
- Tailwind CSS v4 utility classes only. Do not introduce a separate CSS file for component-level styles or add `style={{...}}` inline styles for anything that can be expressed as a Tailwind class.
- The Vite proxy in `vite.config.js` currently targets port 8000, which is wrong (backend is on 8001). Do not add code that relies on this proxy until the port mismatch is corrected.

---

## Performance Rules

- The ML pipeline (`_load_history`, `_fit_models`, `_predict`) currently runs on every `/loan/calculate` and `/api/gold-loan-score/today` request. Before traffic exceeds ~20 requests/minute, cache the fitted model objects at module import level and re-fit on a schedule or on `gold_history.json` update.
- The live gold price fetch runs per request. Add an in-process or Redis cache with a 60-second TTL before production to avoid hammering `gold-api.com`.
- Do not add polling intervals shorter than 30 seconds in the frontend for any data refresh. The current page-load-only fetch pattern is correct.
- Do not render lists of loan history items exceeding 50 rows without virtualisation or pagination. The current dataset is small; enforce this limit before migrating to a real database.
- `gold_history.json` (~7,300 rows) must be loaded once at module level and kept in memory, not re-read on every prediction request.

---

## Configuration & Environment Rules

- All environment-specific values must be in environment variables: `UAEPASS_CLIENT_ID`, `UAEPASS_CLIENT_SECRET` on the backend; `VITE_API_BASE` on the frontend.
- Backend environment variables are loaded from `backend/.env` via `python-dotenv`. Do not load `.env` from any other path.
- `backend/.env` must be in `.gitignore`. Any `.env.example` committed to the repo must contain only placeholder values — never real credentials.
- The Vite dev server config in `vite.config.js` must have the proxy targets corrected to port 8001 to match the actual backend. The current dead-code proxy to port 8000 must not be left in place for v1 production builds.
- `uvicorn main:app --reload --port 8001` is the canonical startup command. The `__name__ == "__main__"` block in `main.py` defaults to port 8000 — this is a known inconsistency. Do not rely on the `__main__` block for anything other than local development convenience.
- Defaults must be fail-safe: if `UAEPASS_CLIENT_ID` is not set, the stub path runs. If `gold-api.com` is unreachable, the fallback price is used. Neither missing env var nor missing external service may cause an unhandled exception.

---

## Testing Requirements

- Any new API endpoint must have at least one happy-path integration test that asserts the response shape and HTTP status.
- Any change to `loan_calculator.py` must include a test asserting the specific numeric output for a known input set (regression test against `CALCULATIONS.md` examples).
- Any change to `risk_analyzer.py` must include a test asserting that the CIBIL 760 + 0 EMI baseline produces `user_risk_score = 5`.
- Any bug fix must include a test that reproduces the bug before the fix and passes after.
- The LTV hard cap must be covered by a test that provides inputs which would produce LTV > 75% without the cap and asserts `recommended_ltv_pct <= 75.00`.
- Frontend component tests (if introduced) must cover: loading state, successful data render, and error state for every component that fetches data.
- Do not delete or skip existing tests to make a new feature pass. Fix the underlying conflict.

---

## Observability & Logging

- Log all external API failures (gold-api.com, UAE PASS) with: service name, error type, fallback applied (yes/no), timestamp. Do not log the raw exception traceback to stdout in production.
- Log the ML pipeline execution time on every prediction request (`_fit_models` + `_predict` combined). This is the primary performance regression signal.
- Do not log `gold_weight_grams`, `cibil_score`, `emirates_id`, or any field that could identify a specific customer. These are PII or PII-adjacent in a financial context.
- If application-level audit logging is introduced in v2, every log entry must contain: `emirates_id` (hashed), `system_decision`, `recommended_ltv_pct`, `timestamp`. Raw input values must not appear in audit logs.
- Do not log UAE PASS profile data (names, email, mobile) at any log level.

---

_Last updated: 2026-05-08_
