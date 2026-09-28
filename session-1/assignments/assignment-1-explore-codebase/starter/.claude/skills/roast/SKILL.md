---
name: roast
description: Reads every source file and produces a brutally honest code quality report in ROAST.md
user_invocable: true
---

# Code Roast

Read every file in `src/`. Then write `ROAST.md` to the project root.

The roast must be specific to *this* codebase — no generic advice. Every finding needs a file name and line reference.

## Report structure

**Severity tiers** — use exactly these three:
- 🔴 **Fix now** — bugs, data loss risk, accessibility failures
- 🟡 **Fix soon** — code smells, poor patterns, missing error handling  
- 🟢 **Nice to have** — style, performance, polish

**For each finding:**
- One-line description
- File + approximate line number
- One-line fix recommendation

**Top 3 highest-leverage fixes** — at the end, pick the three findings with the best effort-to-impact ratio and explain why they matter.

## What to look for

- Unhandled error paths (localStorage could fail, contentEditable is fragile)
- Accessibility gaps (keyboard navigation, ARIA roles, focus management)
- Magic values that should be constants
- State that could get out of sync
- Any place where an empty string, null, or undefined would cause a silent failure
- Missing TypeScript strictness (non-null assertions, `any` usage)

Be direct. If the code has a real problem, say so plainly.
