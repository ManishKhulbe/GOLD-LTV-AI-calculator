# Model Selection Playbook

Guidance for choosing models by phase and task type.

**No specific model is required.** These are capability-based recommendations, not hard requirements.

---

## Selection by Phase

### Planning & Architecture
**Recommended capabilities:**
- Extended reasoning / thinking mode
- Large context window (to analyze SPEC.md, BRD.md, PRD.md, FRD.md, ARCHITECTURE.md together)
- Strong structured output (for specs, plans, roadmaps, decision tables)

**Why:** Planning for this project requires understanding the full LTV formula chain, ML pipeline, risk scoring logic, and UAE regulatory context simultaneously. Shallow analysis leads to incomplete specs that break during implementation.

**This project specifically:** When planning changes to the LTV formula or ML blend weights, load `CALCULATIONS.md` + the relevant service file together — the interaction between factors is non-obvious.

---

### Code Implementation
**Recommended capabilities:**
- Fast iteration speed
- Strong code completion (Python FastAPI + React JSX)
- Tool / function calling (for running verification commands against the API)

**Why:** Implementation involves many small changes — adding a new LTV factor, adjusting a multiplier, updating the Pydantic model — with frequent verification cycles using `curl` or Swagger UI.

**This project specifically:** After implementing any change to `loan_calculator.py`, immediately verify with `curl -X POST http://127.0.0.1:8001/loan/calculate` using a seeded Emirates ID and compare against the CALCULATIONS.md formula manually.

---

### Refactoring
**Recommended capabilities:**
- Large context window (to see `main.py`, `loan_calculator.py`, `models.py`, and the frontend together)
- Pattern recognition across files
- Consistent style application

**Why:** The LTV pipeline spans `main.py` → `loan_calculator.py` → `models.py` → frontend `App.jsx`. A refactor that changes a field name in `LTVBreakdown` must propagate through all four files consistently.

**This project specifically:** Before any refactor touching `LoanCalculationResponse`, search for every field name usage in `App.jsx` — the frontend destructures the full payload without type safety.

---

### Debugging
**Recommended capabilities:**
- Extended reasoning (for hypothesis generation in multi-factor scoring bugs)
- Stack trace analysis
- Error pattern matching

**Why:** Bugs in this system are often silent — a wrong multiplier produces a plausible but incorrect LTV rather than an error. Debugging requires hypothesis testing against known expected outputs from `CALCULATIONS.md`, not just reading stack traces.

**This project specifically:** For LTV calculation bugs, always compute the expected value manually from `CALCULATIONS.md` first, then compare to the API response field by field through the `ltv_breakdown` object.

---

### Code Review
**Recommended capabilities:**
- Large context window (to review diffs alongside `CALCULATIONS.md` and `RULEBOOK.md` simultaneously)
- Security pattern knowledge (input validation, CORS, secrets handling)
- Formula correctness checking

**Why:** In this project, a code review must verify both correctness (does the code match CALCULATIONS.md?) and completeness (does the PR update CALCULATIONS.md if the formula changed?). Formula correctness cannot be inferred from code alone without the reference doc.

---

## Capability Tiers

| Tier | Characteristics | Best For |
|------|-----------------|----------|
| **Fast** | Quick responses, lower cost | Implementation, iteration, simple edits |
| **Standard** | Balanced speed and quality | Most everyday tasks, bug fixes |
| **Reasoning** | Extended thinking, slower | Planning, debugging multi-factor scoring bugs, architecture |
| **Long-context** | 100k+ token window | Review, refactoring across all service files + frontend |

---

## Anti-Patterns

❌ **Using reasoning models for simple edits** — Adding a new profession factor value does not need deep reasoning; use a fast model and verify the math manually.

❌ **Using fast models for architecture** — Decisions about replacing JSON data files with PostgreSQL, or restructuring the ML pipeline, require understanding the full system — insufficient context leads to incomplete plans.

❌ **Ignoring context limits when reviewing formula changes** — Loading `CALCULATIONS.md` + all 5 service files + `App.jsx` in one context is expensive but necessary for formula change reviews. Don't truncate.

❌ **Forcing a specific model** — Breaks model-agnosticism. Capability matters; provider name doesn't.

❌ **Skipping empirical verification** — In this project especially, "the code looks right" is never sufficient for LTV, risk scoring, or ML prediction changes. Always capture a `curl` response or Swagger screenshot.

---

## Model Switching Mid-Session

**When to switch:**
- Context is getting polluted (approaching 50%) — especially likely when debugging ML prediction issues while also holding all service files in context
- Task type changes significantly (e.g., planning a new risk factor → implementing it)
- Current model is consistently producing incorrect LTV calculations in generated code (switch to reasoning mode)

**How to switch:**
1. Create a state snapshot using the template in `.gsd/PROJECT_RULES.md`
2. Update `.gsd/STATE.md` with current position, files touched, and the specific formula or endpoint being worked on
3. Start a fresh session with the appropriate model
4. Load `.gsd/STATE.md` first, then only the files needed for the next step

---

## Project-Specific Model Notes

| Task | Notes |
|------|-------|
| LTV formula validation | Load `CALCULATIONS.md` §3 + `loan_calculator.py` together; verify with manual arithmetic |
| ML prediction debugging | Load `gold_service.py` + `CALCULATIONS.md` §5; test with known historical data points |
| Risk score review | Load `risk_analyzer.py` + `CALCULATIONS.md` §7–8; use all 3 seeded Emirates IDs as test cases |
| Frontend chart debugging | Need `App.jsx` (large file) + `GoldInsights` model; request a reasoning model for SVG math |
| UAE PASS integration (future) | Load `uaepass_service.py` + the UAE PASS API docs together; reasoning model for OAuth flow |

---

## GSD Model-Agnostic Principle

This methodology works with any capable LLM. It compensates for model differences through:

1. **Structured plans** — Reduce ambiguity regardless of model; the LTV formula is explicit in `CALCULATIONS.md`
2. **Explicit verification** — Catch errors no matter which model runs the task; `curl` output is the arbiter
3. **State persistence** — Enable seamless model switching via `.gsd/STATE.md`
4. **Fresh context** — Prevent context accumulation issues; the gold service pipeline is complex enough to degrade silently with accumulated context

Choose models based on task needs, not methodology requirements.

---

_Last updated: 2026-05-08_

See `.gsd/PROJECT_RULES.md` for canonical rules.  
See `docs/RULEBOOK.md` for project-specific enforcement rules.
