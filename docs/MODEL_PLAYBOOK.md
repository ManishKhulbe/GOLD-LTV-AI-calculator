# MODEL_PLAYBOOK.md — Model Selection Playbook
# Gold Loan Valuation & Eligibility Dashboard — Finance House Dubai

Guidance for choosing AI models by phase and task type.

**No specific model is required.** These are capability-based recommendations, not hard requirements.

---

## Selection by Phase

### Phase: Planning & Architecture

**Recommended capabilities:**
- Extended reasoning / thinking mode
- Large context window (to hold BRD + PRD + FRD + ARCHITECTURE simultaneously)
- Strong ability to identify contradictions across requirement documents

**Why:** Architectural decisions in this project carry financial and regulatory weight. The LTV formula, risk scoring weights, ML blend ratios, and currency constants are all business rules encoded as code — getting them wrong is a compliance failure, not a bug. A reasoning model working from `docs/SPEC.md`, `docs/FRD.md`, and `CALCULATIONS.md` will produce more defensible designs than a fast model guessing at structure.

**Tasks suited to this phase:**
- Designing the `POST /loan/calculate` pipeline sequence
- Deciding where to cache the ML model objects vs re-fit per request
- Planning the v2 database migration path from JSON files
- Reviewing the LTV multiplier chain for correctness against CALCULATIONS.md

---

### Phase: Code Implementation

**Recommended capabilities:**
- Fast iteration speed
- Strong code completion in Python and React/JSX
- Tool / function calling (to run verification commands: `curl`, `pytest`, `npm run lint`)

**Why:** Implementation involves many small, targeted changes — adding a Pydantic field, adjusting a multiplier, wiring a new prop — with frequent verification cycles between each. Speed and accurate tool use matter more than deep reasoning here.

**Tasks suited to this phase:**
- Adding a new field to `models.py` and propagating it through the response
- Implementing a new LTV multiplier in `loan_calculator.py`
- Writing a new FastAPI route handler
- Adding a new prop to `GoldLoanWorkspace.jsx`
- Running `uvicorn` and `curl /health` to verify startup

---

### Phase: Refactoring

**Recommended capabilities:**
- Large context window (to see before-and-after together across multiple files)
- Pattern recognition across interconnected files
- Consistent style application without introducing regressions

**Why:** Refactoring in this codebase is high-risk because the services are tightly coupled through shared Pydantic models. A rename in `models.py` must propagate to `main.py`, all five services, and the frontend response-parsing code. A model that can hold the full call chain in context simultaneously will catch propagation gaps that a narrow model misses.

**High-risk refactoring targets in this project:**

| Refactor | Files affected |
|----------|---------------|
| Rename a field in `LoanCalculationResponse` | `models.py` + `main.py` + `App.jsx` (all response field reads) |
| Move `CARAT_PURITY` to a shared constants file | `gold_service.py` + `loan_calculator.py` (both define it currently) |
| Split `App.jsx` into component files | `App.jsx` + new component files + `main.jsx` imports |
| Replace JSON data files with PostgreSQL | `customer_service.py` interface + `seed_data.py` + `main.py` startup |
| Move `BACKEND_BASE_URL` to `VITE_API_BASE` env var | `App.jsx` + `.env.example` + `vite.config.js` |

---

### Phase: Debugging

**Recommended capabilities:**
- Extended reasoning (for systematic hypothesis generation)
- Stack trace analysis
- Error pattern matching across Python async call chains

**Why:** Debugging in this project commonly involves async Python exceptions that are silently swallowed (UAE PASS, httpx timeouts, JSON parse errors) or floating-point rounding inconsistencies in the LTV chain. Fast models tend to guess the first plausible cause. Reasoning models systematically eliminate hypotheses, which is necessary when the bug is a silent fallback or an off-by-one in a multiplier threshold.

**Debugging protocol for this project:**
1. Reproduce with a minimal `curl` command to `/loan/calculate` with known inputs
2. Compare output against the expected value in `CALCULATIONS.md`
3. Identify which service the divergence originates in (gold_service → loan_calculator → risk_analyzer)
4. Add a temporary `print()` in the suspect service; restart `uvicorn --reload`
5. Capture the output; compare against formula
6. Fix; remove print; re-verify with the original `curl` command

**After 3 failed hypotheses:** Create a state snapshot. Start a fresh session with the reproduction `curl` command, the expected value, the actual value, and the suspect function identified.

---

### Phase: Code Review

**Recommended capabilities:**
- Large context window (to review full diffs with surrounding file context)
- Security pattern knowledge (OWASP Top 10, input validation, secret exposure)
- Financial calculation verification (off-by-one in thresholds, rounding errors)

**Why:** Code review in this project is not just style — it is a regulatory check. A reviewer must verify that the LTV cap is applied correctly, that all Pydantic fields are validated, that no secrets appear in source files, and that the UAE PASS fallback path cannot break the main pipeline. This requires seeing the full function context around every change, not just the diff lines.

**Review checklist for this project:**
- [ ] `min(final_ltv, 0.75)` hard cap present and applied last in LTV chain
- [ ] All new API fields declared in `models.py` before use in `main.py`
- [ ] No new hardcoded URLs, ports, or API keys in any source file
- [ ] All new `httpx` calls have explicit `timeout` and `.raise_for_status()`
- [ ] UAE PASS enrichment path has try/except; failure returns `None`
- [ ] All new monetary values rounded to 2 decimal places before return
- [ ] No new Pydantic `Any` or `dict` type annotations on request models
- [ ] `backend/.env` not in the diff

---

## Capability Tiers

| Tier | Characteristics | Best For in This Project |
|------|-----------------|--------------------------|
| **Fast** | Quick responses, lower cost, high throughput | Targeted fixes, adding fields, wiring props, running verifications |
| **Standard** | Balanced speed and quality | Most implementation tasks, wave execution, routine debugging |
| **Reasoning** | Extended thinking, slower, higher cost | Planning waves, architecture decisions, LTV formula verification, hard bugs |
| **Long-context** | 100k+ token window | Full refactors, cross-file consistency review, reading FRD + source simultaneously |

---

## Task-to-Tier Quick Reference

| Task | Recommended Tier |
|------|-----------------|
| Add a new Pydantic field | Fast |
| Fix a threshold value in `_cibil_factor()` | Fast + verify with CALCULATIONS.md |
| Add a new FastAPI route | Standard |
| Debug a silent LTV mismatch | Reasoning |
| Plan the v2 PostgreSQL migration | Reasoning |
| Review a PR touching `loan_calculator.py` | Long-context |
| Refactor `App.jsx` into components | Long-context |
| Write wave execution plan from SPEC.md | Reasoning |
| Update `CALCULATIONS.md` after a formula change | Standard |
| Diagnose a httpx timeout not triggering fallback | Reasoning |

---

## Anti-Patterns

❌ **Using a reasoning model to add a new dropdown option** — Overkill; slow; wastes budget on a 3-line change  
❌ **Using a fast model to design the ML caching strategy** — Insufficient depth; likely to miss cache invalidation edge cases  
❌ **Loading all 7 docs into context before a simple bug fix** — Context exhaustion before the fix is written  
❌ **Forcing a specific model name in any config or script** — Breaks model-agnosticism; see `PROJECT_RULES.md`  
❌ **Using a reasoning model in a loop for repetitive verification** — Use standard tier for mechanical verify-fix cycles  
❌ **Reviewing a LTV change with a fast model** — Regulatory risk; financial threshold errors require careful review  

---

## Model Switching Mid-Session

**When to switch:**
- Context is degrading (approaching 50% — see `PROJECT_RULES.md` context thresholds)
- Task type changes significantly (e.g., planning wave complete → entering implementation)
- Current model is producing incorrect calculation outputs after 2+ attempts
- Debugging has failed 3 times with the same hypothesis

**How to switch:**
1. Write a state snapshot using the template in `PROJECT_RULES.md`
2. Capture: current wave, last verified state, the exact failing input/output pair
3. Start a fresh session with the appropriate capability tier
4. Begin with: "Load STATE.md context — continuing wave N. Last verified: [X]. Current issue: [Y]."

**This project's most common switch points:**

| Transition | From | To |
|-----------|------|-----|
| Architecture → Implementation | Reasoning | Standard / Fast |
| Implementation → Hard bug | Standard | Reasoning |
| Implementation → Refactor | Standard | Long-context |
| Any → Context > 70% | Any | Fresh session (same tier) |

---

## GSD Model-Agnostic Principle

This methodology works with any capable LLM. It compensates for model differences through:

1. **Structured plans** — Wave breakdown in `docs/PLAN.md` reduces ambiguity regardless of which model executes the wave
2. **Explicit verification** — Captured `curl` output and test results catch errors regardless of which model wrote the code
3. **State persistence** — `STATE.md` enables seamless model switching; no session memory required
4. **Formula reference** — `CALCULATIONS.md` is the ground truth; any model can verify a number against it without needing to reason from first principles
5. **Fresh context** — Prevents context accumulation issues that degrade all models equally

Choose models based on task needs, not methodology requirements.

---

_Last updated: 2026-05-08_

See `docs/PROJECT_RULES.md` for canonical methodology rules.  
See `docs/RULEBOOK.md` for project-specific enforcement rules.  
See `CALCULATIONS.md` for the ground-truth formula reference.
