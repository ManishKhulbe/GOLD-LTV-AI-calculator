# MODEL_PLAYBOOK.md — Model Selection Guidance
**Project:** Gold LTV AI Calculator — Finance House Dubai
**Version:** 1.0
**Date:** 2026-05-01

Guidance for choosing models by phase and task type.

**No model is required.** These are recommendations, not requirements.

---

## Selection by Phase

### Planning & Architecture

**Recommended capabilities:**
- Extended reasoning / thinking mode
- Large context window (analyze multiple service files simultaneously)
- Strong at structured output (specs, plans, API contracts)

**Why:** Architecture decisions here affect the calculation pipeline, ML blend weights, LTV multiplier chain, and API response shape — all of which ripple across backend services and the frontend. Requires reading `main.py`, all 5 services, `models.py`, and `App.jsx` in parallel.

**Tasks in this project:**
- Designing new LTV multiplier or risk score component
- Planning API schema changes (new fields in `LoanCalculationResponse`)
- Architectural decisions affecting ML pipeline or currency flow
- Writing or revising SPEC.md, BRD.md, PRD.md, FRD.md

---

### Code Implementation

**Recommended capabilities:**
- Fast iteration speed
- Good at code completion and Pydantic model generation
- Tool/function calling (run backend, check lint output)

**Why:** Most implementation tasks in this project are small and localized — add a multiplier value, rename a field, adjust a formula, update a React component. Fast feedback loops matter more than deep reasoning.

**Tasks in this project:**
- Adding a new karat purity value to `loan_calculator.py`
- Updating `formatSar()` or adding a new metric chip to `App.jsx`
- Adjusting ML noise constant or blend weight in `gold_service.py`
- Adding a new Pydantic field to `models.py`

---

### Debugging

**Recommended capabilities:**
- Extended reasoning (hypothesis generation from stack traces)
- Good at reading FastAPI / Pydantic error output
- Context for tracing values across service chain

**Why:** Bugs in this system often span multiple files: a wrong gold valuation SAR value may originate in `gold_service.py`, pass through `loan_calculator.py`, and surface incorrectly in `App.jsx`. Requires tracing the full pipeline.

**Tasks in this project:**
- LTV value not matching expected calculation
- Frontend displaying wrong currency (AED showing instead of SAR)
- ML forecast producing downward-only predictions
- Amortization schedule final balance not approaching 0
- Gold API fallback not activating correctly

---

### Refactoring

**Recommended capabilities:**
- Large context window (see full `App.jsx` ~900 lines + all backend services)
- Pattern recognition for consistent naming conventions
- Apply `_sar` suffix renaming across multiple files

**Why:** Refactoring in this project typically touches both backend (`models.py`, service files) and frontend (`App.jsx`) simultaneously. Currency unification, field renaming, and component extraction all require cross-file consistency.

**Tasks in this project:**
- Extracting `App.jsx` into component files
- Migrating JSON file store to PostgreSQL
- Applying consistent field naming across all Pydantic models
- Extracting EMI calculator into its own backend endpoint

---

### Code Review

**Recommended capabilities:**
- Large context (review `App.jsx` + all backend services together)
- Financial calculation verification
- Security pattern knowledge (input sanitisation, CORS, secrets)

**Why:** Every PR must be verified against RULEBOOK.md — LTV ceiling preserved, no AED in responses, formulas unchanged, no secrets committed.

**Tasks in this project:**
- Verifying LTV multiplier chain is correct and ceiling enforced
- Confirming no AED values introduced in API response or UI
- Checking new Pydantic fields use `_sar` suffix
- Reviewing ML pipeline changes for blend weight correctness
- Auditing new endpoints for input validation and error shape

---

## Capability Tiers

| Tier | Characteristics | Best For in This Project |
|---|---|---|
| **Fast** | Quick responses, low cost | Small formula tweaks, field renames, React component edits |
| **Standard** | Balanced speed/quality | Full feature implementation, service modifications |
| **Reasoning** | Extended thinking, slower | Architecture decisions, debugging multi-file pipeline bugs, planning ML changes |
| **Long-context** | >100k tokens | Reviewing full `App.jsx` + all backend services simultaneously |

---

## Anti-Patterns

❌ **Using reasoning models for a single field rename** — Overkill; costs time and tokens

❌ **Using fast models for ML pipeline architecture** — Insufficient depth; blend weights and model anchoring have subtle interactions

❌ **Reading all 5 service files before knowing which one has the bug** — Search first with grep; only read the relevant service

❌ **Mixing AED and SAR calculations across a session** — Currency confusion is the most common source of value errors in this codebase; always confirm the field suffix

❌ **Treating `App.jsx` as one file** — It has distinct logical sections (CalculatorScreen, SummaryScreen, EMI calculator, chart, risk bars); search for the relevant section before reading the whole file

---

## Model Switching Mid-Session

**When to switch:**
- Context approaching 50% with large files loaded
- Moving from planning (new feature spec) to implementation
- Debugging is taking more than 3 attempts without progress

**How to switch:**
1. Note the current task and which files are relevant
2. Save progress in `docs/STATE.md` if mid-task
3. Start fresh session with appropriate model
4. Reference `docs/STATE.md` and `CLAUDE.md` to resume

---

## Project-Specific Context Load Order

When starting a session on this project, load in this order (search first, load only what you need):

1. `CLAUDE.md` — always; gives port, path, and architecture orientation
2. `docs/RULEBOOK.md` — if touching calculations, currency, or formulas
3. `docs/SPEC.md` — if planning or reviewing scope
4. `backend/models.py` — if changing API shape
5. Specific service file — only the one relevant to the task
6. `src/App.jsx` — search for relevant component section, not full file

---

See `docs/PROJECT_RULES.md` for canonical project rules.
See `docs/RULEBOOK.md` for calculation and engineering standards.
See `CLAUDE.md` for commands and architecture orientation.
