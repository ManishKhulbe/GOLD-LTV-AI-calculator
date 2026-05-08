# PROJECT_RULES.md — Canonical Rules
# Gold Loan Valuation & Eligibility Dashboard — Finance House Dubai

**Single Source of Truth** for this project's development methodology.
Model-agnostic. All adapters and extensions reference this file.

---

## Core Protocol

**SPEC → PLAN → EXECUTE → VERIFY → COMMIT**

1. **SPEC**: Define requirements in `docs/SPEC.md` until status is `FINALIZED`
2. **PLAN**: Decompose into phases in `docs/PLAN.md`, then detailed task plans per wave
3. **EXECUTE**: Implement with atomic commits per task
4. **VERIFY**: Prove completion with captured empirical evidence before marking done
5. **COMMIT**: Commit only after verification passes; update `STATE.md`

> ⚠️ No code may be written until `docs/SPEC.md` is marked `FINALIZED`.

---

## Proof Requirements

Every change requires captured verification evidence:

| Change Type | Required Proof |
|-------------|----------------|
| API endpoint | `curl` output showing request + full JSON response |
| UI change | Screenshot of the affected screen in browser |
| Build / compile | `npm run build` or `vite build` terminal output |
| Backend start | `uvicorn` startup log showing port 8001 and no import errors |
| Test | Test runner output showing pass/fail counts |
| Config change | Verification command output (e.g., `curl /health`) |
| LTV calculation change | Numeric output for the 5 known test cases in `CALCULATIONS.md` |
| ML model change | Backtesting MAE result vs the < 8% threshold |

**Never accept**: "It looks correct", "This should work", "I've done similar before."  
**Always require**: Captured terminal output, screenshot, or test result.

---

## Search-First Discipline

Before reading any file completely:
1. **Search first** — use `grep` to find relevant snippets (e.g., `grep -n "BASE_LTV" backend/services/loan_calculator.py`)
2. **Evaluate snippets** — determine if a full file read is justified
3. **Targeted reads** — read only the specific line ranges needed

**This project's large files (do not read in full without justification):**

| File | Lines | Search strategy |
|------|-------|-----------------|
| `src/App.jsx` | ~1000+ | Grep for the component or state variable name |
| `src/components/GoldLoanWorkspace.jsx` | ~500+ | Grep for the prop or handler |
| `backend/services/gold_service.py` | ~350 | Grep for function name |
| `backend/data/gold_history.json` | ~7300 | Never read in full; inspect only schema (first 3 rows) |
| `docs/FRD.md` | ~400 | Grep for FR-ID or feature keyword |

**Anti-pattern**: Reading entire files "to understand context" without searching first.

---

## Wave Execution

Plans are grouped into waves based on dependencies:

| Wave | Characteristic | Execution |
|------|----------------|-----------|
| 1 | Foundation — no inter-task dependencies | Run tasks in parallel |
| 2 | Depends on Wave 1 being verified and committed | Wait, then parallel |
| 3 | Depends on Wave 2 being verified and committed | Wait, then parallel |

**This project's natural wave boundaries:**

| Wave | Scope |
|------|-------|
| Wave 1 | Backend scaffolding: FastAPI app, Pydantic models, seed data, `/health` |
| Wave 2 | Gold price engine: live fetch, fallback, karat conversion, history load |
| Wave 3 | ML prediction pipeline: poly + linear fit, blend, anchor, trend classify |
| Wave 4 | LTV + eligibility engine: multiplier chain, decision scoring, breakdowns |
| Wave 5 | Risk scoring: user risk (5 components), company risk (3 components) |
| Wave 6 | Frontend: calculator form, summary screen, live rates ticker, gauges, chart |
| Wave 7 | Hardening: CORS, env vars, regex validation, rate limiting, unit tests |

**Wave Completion Protocol:**
1. All tasks in wave verified with captured proof
2. State snapshot created using the template below
3. Commit all wave work with `feat(wave-N): ...` commit message
4. Update `STATE.md` with current position

---

## State Snapshot Template

At the end of each wave or significant work block:

```
## Wave N Summary

**Objective:** {what this wave aimed to accomplish}

**Changes:**
- {change 1}
- {change 2}

**Files Touched:**
- {file 1}: {what changed}
- {file 2}: {what changed}

**Verification:**
- {command or test}: {result / output snippet}

**Risks / Debt:**
- {any concerns, shortcuts taken, or known issues introduced}

**Next Wave TODO:**
- {item 1}
- {item 2}
```

---

## Context Management

| Context Usage | Quality | Action |
|---------------|---------|--------|
| 0–30% | PEAK | Comprehensive, thorough work |
| 30–50% | GOOD | Solid, confident output |
| 50–70% | DEGRADING | Switch to outline / efficiency mode |
| 70%+ | POOR | State dump → fresh session |

**Rules:**
- Keep plans under 50% context usage
- Fresh context for each wave execution
- After 3 debugging failures on the same issue → state dump → fresh session
- `STATE.md` is the memory bridge across sessions

**This project's context cost hotspots:**

| Operation | Cost | Mitigation |
|-----------|------|-----------|
| Reading full `App.jsx` | High | Grep for component/function first |
| Reading full `FRD.md` | High | Search by FR-ID |
| Reading `gold_history.json` | Very high (7300 rows) | Read first 5 rows for schema only |
| ML pipeline explanation | Medium | Reference `CALCULATIONS.md §5` instead |

---

## Token Efficiency Rules

| Action | Rule |
|--------|------|
| Before reading a file | `grep -n <term> <file>` first |
| File > 200 lines | Use targeted line range read, not full file |
| File already read this session | Reference the prior summary; do not reload |
| > 5 files needed simultaneously | Stop and reconsider the approach |
| Understanding a formula | Read `CALCULATIONS.md` — it summarises all formulas from source files |

**Budget thresholds:**
- 0–50%: Proceed normally
- 50–70%: Outline mode; compress context; avoid loading new files
- 70%+: State dump required; recommend fresh session before continuing

**Anti-patterns:**
- Loading `gold_history.json` to "check the data format" (check the schema once, never again)
- Re-reading `App.jsx` in full when only the `handleCalculate` function is needed
- Loading all 7 docs simultaneously at session start

---

## Commit Conventions

**Format:** `type(scope): description`

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure with no behaviour change |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies, config |

**Rules:**
- One task = one commit
- Always verify before committing (captured proof required)
- Scope = wave number for wave work (e.g., `feat(wave-4): add LTV multiplier chain`)
- Scope = service name for targeted fixes (e.g., `fix(loan-calculator): cap LTV at 0.75`)
- Never commit `backend/.env` — it is in `.gitignore` and contains UAE PASS credentials
- Never commit `backend/data/dummy_customers.json` with real customer PII

**This project's commit scope vocabulary:**

| Scope | Maps to |
|-------|---------|
| `wave-N` | Full wave delivery |
| `gold-service` | `services/gold_service.py` |
| `loan-calculator` | `services/loan_calculator.py` |
| `risk-analyzer` | `services/risk_analyzer.py` |
| `customer-service` | `services/customer_service.py` |
| `uaepass` | `services/uaepass_service.py` |
| `models` | `backend/models.py` |
| `frontend` | `src/` changes |
| `config` | `vite.config.js`, `.env`, `requirements.txt`, `package.json` |
| `docs` | Any file in `docs/` |

---

## Critical Business Rules (Never Violate)

These rules are derived from regulatory and financial requirements. Violating them is a compliance failure, not a code smell:

| Rule | Location | Consequence of Violation |
|------|----------|--------------------------|
| `final_ltv` must never exceed `0.75` | `loan_calculator.py: min(final_ltv, 0.75)` | CBUAE regulatory breach |
| `BASE_LTV = 0.75` is not configurable via request | `loan_calculator.py` | Same |
| LTV multiplier chain must execute in documented order | `loan_calculator.py` | Wrong loan amounts issued |
| `AED_PER_USD = 3.6725` is a fixed constant | `gold_service.py` | Wrong currency conversion |
| All monetary outputs rounded to 2 decimal places | All service return values | Financial reporting errors |
| UAE PASS failure must never block calculation | `main.py: uaepass_service call` | Application unavailability |
| Gold API failure must activate fallback, not 500 error | `gold_service.py` | Application unavailability |
| `gold_history.json` absence must fail fast at startup | `gold_service.py: _load_history()` | Silent wrong predictions |

---

## Model Independence

**Absolute Rule**: No rule or workflow may require a specific model provider.

**Allowed:**
- Capability-based recommendations (e.g., "use a reasoning model for planning waves")
- Optional adapters with provider-specific enhancements

**Forbidden:**
- Hard dependencies on any provider's features
- Breaking behaviour when a specific model is unavailable
- Storing model names in configuration files that affect runtime behaviour

---

## Repository Structure

```
docs/
├── SPEC.md              ← Requirements (must be FINALIZED before coding)
├── PLAN.md              ← Phases, waves, and progress
├── BRD.md               ← Business requirements
├── PRD.md               ← Product requirements
├── FRD.md               ← Functional requirements (developer spec)
├── ARCHITECTURE.md      ← System design
├── RULEBOOK.md          ← Project-specific enforcement rules
├── PROJECT_RULES.md     ← This file (canonical methodology)
└── MODEL_PLAYBOOK.md    ← Model selection guidance

backend/
├── main.py              ← FastAPI app + all routes
├── models.py            ← Pydantic models (source of truth for all types)
├── seed_data.py         ← Run once to generate data/
├── requirements.txt
├── .env                 ← Secrets (not committed)
├── data/
│   ├── gold_history.json       ← 20-year gold prices (required at startup)
│   ├── dummy_customers.json    ← Seeded customer data
│   └── dummy_loans.json        ← Seeded loan data
└── services/
    ├── gold_service.py         ← Live price + ML prediction
    ├── loan_calculator.py      ← LTV engine (regulatory core)
    ├── risk_analyzer.py        ← User + company risk scoring
    ├── customer_service.py     ← Profile + loan history lookup
    └── uaepass_service.py      ← Identity enrichment (stub in v1)

src/
├── App.jsx                     ← Root: state, API calls, screen toggle
├── main.jsx
├── index.css
└── components/
    └── GoldLoanWorkspace.jsx   ← Calculator form + reverse calculator

CALCULATIONS.md          ← Canonical formula reference (read this before touching any service)
```

---

## Quick Reference Checklist

```
Before coding         → docs/SPEC.md must be FINALIZED
Before any file read  → grep first, then targeted line range
Before LTV change     → Read CALCULATIONS.md §3 first
Before ML change      → Read CALCULATIONS.md §5 first
After each task       → Commit + captured proof
After each wave       → State snapshot + update STATE.md (if present)
After 3 failures      → State dump + fresh session
Before "Done"         → Empirical proof captured for every changed endpoint
Before deploy         → CORS tightened, backend URL in env var, .env not committed
```

---

_Last updated: 2026-05-08_  
_GSD Methodology — Model-Agnostic Edition_
