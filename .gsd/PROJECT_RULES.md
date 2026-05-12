# PROJECT_RULES.md — Canonical Rules

**Single Source of Truth** for this project's development methodology.
Model-agnostic. All adapters and extensions reference this file.

---

## Core Protocol

**SPEC → PLAN → EXECUTE → VERIFY → COMMIT**

1. **SPEC**: Define requirements in `docs/SPEC.md` until status is `FINALIZED`
2. **PLAN**: Decompose into phases in `docs/PLAN.md`, then detailed task plans
3. **EXECUTE**: Implement with atomic commits per task
4. **VERIFY**: Prove completion with empirical evidence (no "should work" accepted)
5. **COMMIT**: One task = one commit. Format: `type(scope): description`

⚠️ **Planning Lock**: No implementation code until `docs/SPEC.md` is marked `FINALIZED`.

---

## Proof Requirements

Every change requires captured verification evidence:

| Change Type | Required Proof |
|-------------|----------------|
| API endpoint | curl / HTTP response output |
| UI change | Screenshot |
| LTV formula change | Manual calculation result vs. API output |
| ML model change | Predicted % change before vs. after |
| Build / compile | Command output |
| Test | Test runner output |
| Config change | Verification command output |

**Never accept**: "It looks correct", "This should work", "I've done similar before."  
**Always require**: Captured output, screenshot, or test result.

---

## Search-First Discipline

Before reading any file completely:
1. Search first — use grep or ripgrep to find relevant snippets
2. Evaluate snippets — determine if a full file read is justified
3. Targeted reads — only read specific line ranges when needed

**Anti-pattern**: Reading entire files "to understand context" without searching first.

---

## Wave Execution

Plans are grouped into waves based on dependencies:

| Wave | Characteristic | Execution |
|------|----------------|-----------|
| 1 | Foundation — no dependencies | Run tasks in parallel |
| 2 | Depends on Wave 1 | Wait, then parallel |
| 3 | Depends on Wave 2 | Wait, then parallel |

**Wave Completion Protocol:**
1. All tasks in wave verified with proof
2. State snapshot created (see template below)
3. Commit all wave work
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
- {file 1}
- {file 2}

**Verification:**
- {command}: {result}

**Risks / Debt:**
- {any concerns or shortcuts taken}

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
| 50–70% | DEGRADING | Switch to outline/efficiency mode |
| 70%+ | POOR | State dump → fresh session |

**Rules:**
- Keep plans under 50% context usage
- Fresh context for each plan execution
- After 3 debugging failures → state dump → fresh session
- `STATE.md` = memory across sessions

---

## Token Efficiency Rules

| Action | Rule |
|--------|------|
| Before reading a file | Search first (grep / ripgrep) |
| File > 200 lines | Use outline, not full file |
| File already understood | Reference summary, don't reload |
| > 5 files needed | Stop and reconsider approach |

**Budget thresholds:**
- 0–50%: Proceed normally
- 50–70%: Outline mode, compress context
- 70%+: State dump required, recommend fresh session

**Anti-patterns:**
- Loading files "just in case"
- Re-reading files already understood
- Full file reads when snippets suffice

---

## Commit Conventions

**Format:** `type(scope): description`

| Type | Usage |
|------|-------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation only |
| refactor | Code restructure (no behavior change) |
| test | Adding or updating tests |
| chore | Maintenance, dependencies |

**Rules:**
- One task = one commit
- Always verify before committing
- Scope = phase number for phase work (e.g., `feat(phase-1): ...`)
- For formula changes: reference the section of `CALCULATIONS.md` in commit body

---

## Gold Loan Domain Rules

These are project-specific additions to the canonical methodology:

- **Formula changes require dual verification**: any change to LTV multipliers, risk scoring, or ML blend weights must be verified against manually computed expected outputs before commit
- **Live API vs. fallback**: always test with the fallback active (disconnect internet or mock the endpoint) as well as the live path
- **Data file integrity**: `gold_history.json` is authoritative — never modify it during a feature build; create a copy for experiments
- **CIBIL and risk scores are policy, not implementation details**: treat changes to thresholds as BRD-level changes requiring stakeholder approval, not just code changes

---

## Model Independence

**Absolute Rule**: No rule or workflow may require a specific model provider.

**Allowed:**
- Capability-based recommendations (e.g., "use a reasoning model for planning")
- Optional adapters with provider-specific enhancements

**Forbidden:**
- Hard dependencies on any provider's features
- Breaking behavior when a specific model is unavailable

---

## Repository Structure

```
PROJECT_RULES.md (this file) → .gsd/PROJECT_RULES.md

.gsd/
├── PROJECT_RULES.md    ← This file (canonical rules)
└── STATE.md            ← Session memory across contexts (create when needed)

docs/
├── SPEC.md             ← Requirements (must be FINALIZED before coding)
├── PLAN.md             ← Phases, milestones, task breakdown
├── BRD.md              ← Business requirements
├── PRD.md              ← Product requirements
├── FRD.md              ← Functional requirements
├── ARCHITECTURE.md     ← System design
├── RULEBOOK.md         ← Project-specific enforcement rules
├── MODEL_PLAYBOOK.md   ← Model selection guidance

backend/
├── main.py             ← FastAPI routes
├── models.py           ← Pydantic models
├── services/           ← All business logic
└── data/               ← JSON data files (read-only at runtime)

src/
├── App.jsx             ← Frontend root, state, API calls
└── components/         ← UI components

CALCULATIONS.md         ← Formula reference (must stay in sync with code)
```

---

## Quick Reference Checklist

```
Before coding      → SPEC.md must be FINALIZED
Before file read   → Search first, then targeted read
After each task    → Commit + update STATE.md if needed
After each wave    → Create state snapshot
After 3 failures   → State dump + fresh session
Before "Done"      → Empirical proof captured
Formula change     → CALCULATIONS.md updated in same commit
```

---

_Last updated: 2026-05-08_
_GSD Methodology — Model-Agnostic Edition_
