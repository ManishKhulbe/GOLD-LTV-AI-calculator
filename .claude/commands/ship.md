# Ship — Commit & Create PR

Analyze all uncommitted changes in the repo, commit them with a well-structured message, then create a GitHub Pull Request with a proper title and description.

## Steps

### 1. Inspect current state

Run these in parallel:
- `git status` — find staged, unstaged, and untracked files
- `git diff` — see unstaged changes
- `git diff --staged` — see staged changes
- `git log --oneline -10` — understand the recent commit style and branch history
- `git branch --show-current` — confirm current branch name
- `git log --oneline main..HEAD 2>/dev/null || git log --oneline origin/main..HEAD 2>/dev/null` — see all commits ahead of main

### 2. Analyze what changed

Read the diff carefully. Identify:
- What type of change is this? (feat / fix / docs / refactor / chore / test)
- Which scope / area of the codebase? (e.g., backend, frontend, docs, services/loan_calculator)
- What is the intent — what problem does this solve or what capability does it add?
- Are there any sensitive files (`.env`, credentials, large binaries) that must NOT be committed?

### 3. Stage and commit

Stage only relevant files (never `git add -A` blindly — exclude `.env`, `*.json` data files unless intentional).

Write the commit message in this format:
```
type(scope): short imperative summary (≤ 72 chars)

- Bullet describing what changed and why (not just what)
- Second bullet if needed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Use a HEREDOC for the commit message to preserve formatting:
```bash
git commit -m "$(cat <<'EOF'
type(scope): summary

- detail

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 4. Push the branch

```bash
git push -u origin HEAD
```

If the push fails due to upstream divergence, report it to the user — do NOT force push.

### 5. Create the Pull Request

Use `gh pr create` with a HEREDOC body. Structure the PR description as:

```
## Summary
- What this PR does (2–4 bullets)
- Key decisions or trade-offs made

## Changes
- File/area: what changed

## Test Plan
- [ ] How to verify the happy path
- [ ] Edge cases to check
- [ ] Any manual steps needed

## Notes
Any caveats, follow-ups, or context the reviewer needs.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Target branch: `main` (or `develop` if it exists).

### 6. Report back

Return the PR URL so the user can open it directly.

## Rules

- Never commit `.env`, `.env.*`, or any file containing secrets
- Never commit `backend/data/dummy_customers.json` or `backend/data/dummy_loans.json` unless explicitly asked — these are seeded data files
- Never force push (`--force`) without explicit user instruction
- If on `main` branch directly, warn the user and ask which branch to use
- If nothing is uncommitted and no commits are ahead of main, report that clearly — do not create an empty PR
- The PR title must match the commit message summary exactly (without the type prefix)
