# PROJECT_RULES.md — Canonical Engineering Rules
**Project:** Gold LTV AI Calculator — Finance House Dubai
**Version:** 1.0
**Date:** 2026-05-01

Single source of truth for how work is done on this project.

---

## Core Protocol

**SPEC → PLAN → EXECUTE → VERIFY → COMMIT**

1. **SPEC** — Define or confirm requirements in `docs/SPEC.md`. Status must be FINALIZED before implementation starts.
2. **PLAN** — Identify affected files and services. For multi-file changes, list them before touching code.
3. **EXECUTE** — Implement atomically. One task at a time.
4. **VERIFY** — Prove the change works with empirical evidence (see Proof Requirements below).
5. **COMMIT** — One logical change per commit. Follow commit format below.

**Planning Lock:** No implementation code may be written while SPEC.md status is DRAFT.

---

## Proof Requirements

Every change requires captured verification evidence before it is considered done.

| Change Type | Required Proof |
|---|---|
| New API endpoint | `curl` or HTTP response showing correct JSON shape |
| Changed formula (LTV, EMI, risk score) | Computed output with known inputs verified against CALCULATIONS.md |
| Frontend UI change | Observed correct render in browser (describe what was checked) |
| Currency change (SAR rename) | Grep confirms no `_aed` suffix remains in changed files |
| ML model change | Printed forecast output showing trend direction is RISING/STABLE/FALLING |
| Input validation | HTTP 422 response shown for invalid Emirates ID input |
| Gold API fallback | Response with fallback rate when API is unreachable |
| Build | `npm run build` exits 0 |
| Backend startup | `uvicorn` starts without error; `GET /health` returns `{"status": "ok"}` |

**Never accept:** "It looks correct", "This should work", "I've done similar before".

**Always capture:** Command output, observed browser state, or test result.

---

## Search-First Discipline

Before reading any file:

1. **Search first** — Use `grep` to find the relevant symbol, field, or function.
2. **Evaluate the snippet** — Does it confirm what you need to know? If yes, read only that section.
3. **Targeted reads** — Specify line range when reading large files (`App.jsx` is ~900 lines; read the relevant component section, not the whole file).

**Anti-pattern:** Reading `App.jsx` from line 1 "to understand the context". Search for `HorizontalRiskBar`, `PredictedLtvGoldTrendChart`, `emiResult`, or the relevant symbol instead.

**Files that are almost always too large to read whole:**
- `src/App.jsx` (~900 lines)
- `backend/data/gold_history.json` (7,300 records — never read whole)
- `backend/data/dummy_customers.json` / `dummy_loans.json`

---

## Wave Execution for Multi-File Changes

When a task touches more than one file (e.g., currency rename across backend + frontend), group changes into waves by dependency:

| Wave | Characteristic | Example in This Project |
|---|---|---|
| 1 | Foundation — no dependents | Update `models.py` field names |
| 2 | Depends on Wave 1 | Update service files that use the model |
| 3 | Depends on Wave 2 | Update `main.py` route handlers |
| 4 | Depends on Wave 3 | Update `App.jsx` field references |

Complete and verify each wave before starting the next.

**Wave Completion Checklist:**
- [ ] All files in this wave changed
- [ ] Backend starts without import errors
- [ ] Grep confirms no stale field names remain in changed files
- [ ] If frontend changed: UI renders correctly

---

## Commit Conventions

```
type(scope): description
```

**Types:**

| Type | Usage |
|---|---|
| `feat` | New feature (new multiplier, new endpoint, new UI section) |
| `fix` | Bug fix (wrong formula, broken render, incorrect field) |
| `docs` | Documentation only (SPEC, BRD, FRD, RULEBOOK, etc.) |
| `refactor` | Code restructure with no behaviour change |
| `chore` | Maintenance (dependency update, file rename, seed data refresh) |

**Rules:**
- One logical change per commit — do not bundle unrelated edits
- Commit message describes the *why*, not just the *what*
- Always verify before committing (no "fix broken build" commits)

**Examples for this project:**
```
feat(ltv): add profession factor for Freelancer carat adjustment
fix(currency): rename gold_valuation_aed → gold_valuation_sar across all services
docs(frd): update FR-007 risk score component weights table
refactor(gold-service): extract monthly average computation into helper
chore(seed): regenerate dummy_customers.json with 5 new Emirates IDs
```

---

## Context Management

| Context Usage | Quality | Action |
|---|---|---|
| 0–30% | Peak | Full, comprehensive work |
| 30–50% | Good | Solid output; search before loading new files |
| 50–70% | Degrading | Stop loading new files; work only with what's loaded |
| 70%+ | Poor | State dump → fresh session |

**Context hygiene rules for this project:**
- Do not load `App.jsx` and all 5 backend services at once without reason
- After understanding a service file, reference your notes — don't reload
- `gold_history.json` and data files: never load; grep or inspect headers only
- If approaching 50% context while debugging: write current hypothesis to `docs/STATE.md` and continue in a fresh session

---

## State Persistence

When switching sessions or handing off mid-task, save a snapshot to `docs/STATE.md`:

```markdown
## Session Snapshot — {date}

**Current task:** {what was being worked on}

**Progress:**
- {done item 1}
- {done item 2}

**Files touched:**
- {file1}: {what changed}

**Next steps:**
- {item 1}
- {item 2}

**Risks / open questions:**
- {concern}
```

Load `CLAUDE.md` + `docs/STATE.md` at the start of every resumed session.

---

## Token Efficiency Rules

| Action | Rule |
|---|---|
| Before reading any file | `grep` first |
| `App.jsx` | Search for component name; read only that section |
| `gold_history.json` | Never read — inspect format only with `head` |
| File already read this session | Reference your notes; don't reload |
| >4 files needed simultaneously | Reconsider approach; can the task be split? |

**Per-task budget:**
- Load only files the current task touches
- After completing a task: summarize what changed; don't keep file content active for future tasks
- Each wave starts with minimal context; load just-in-time

---

## Quick Reference

| Before... | Check... |
|---|---|
| Writing any code | `docs/SPEC.md` status is FINALIZED |
| Reading any file | Search with `grep` first |
| Changing a formula | `CALCULATIONS.md` for current values; update after |
| Adding an API field | Use `_sar` suffix; add to `models.py` + update `ARCHITECTURE.md` |
| Changing currency display | Grep for `_aed` after; must return 0 results |
| Committing | Verify with empirical proof; one logical change per commit |
| Saying "done" | Captured proof of correct output |

---

## Document Authority

| Document | Authority |
|---|---|
| `docs/SPEC.md` | What the system must do (FINALIZED = locked) |
| `docs/RULEBOOK.md` | How it must be built (formulas, constants, naming) |
| `docs/FRD.md` | Detailed functional spec per requirement |
| `CALCULATIONS.md` | Exact formula values — the single source for all math |
| `CLAUDE.md` | Commands, paths, port, architecture orientation |
| `docs/PROJECT_RULES.md` | This file — process and engineering discipline |

When documents conflict: `CALCULATIONS.md` wins for math; `RULEBOOK.md` wins for engineering standards; `SPEC.md` wins for scope.

---

*Last updated: 2026-05-01*
