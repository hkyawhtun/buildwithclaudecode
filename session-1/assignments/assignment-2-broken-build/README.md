# Assignment 2 — CLAUDE.md

A four-part walkthrough on a real Svelte app (`mesh/`). Students
seed an empty `CLAUDE.md`, build a feature from a written spec, hit
competing patterns and resolve them by writing rules, then apply a
designer's color refresh from an email artifact.

## Structure

| Folder | What's inside |
|--------|---------------|
| `mesh/` | The student's working project — a Svelte 5 semantic-graph app. Empty `CLAUDE.md` and a `/assignment_2` skill. |
| `mesh-context/search-feature/` | Senior-engineer spec for the search feature (revealed in part 2). |
| `mesh-context/conventions/` | Canonical patterns that resolve the planted competing patterns (revealed in part 3). |
| `mesh-context/inbox/` | Fake designer email asking for an accent-color refresh (revealed in part 4). |

Each artifact lives in its own folder on purpose — the working Claude
session must not see them all at once, or it pre-empts the lesson.

## How to run it

This assignment uses **two Claude Code terminals on purpose** — one runs
the instructor, one does the actual work. The working session has no idea
what the lesson plan is, which is what lets it authentically struggle
on the parts the lesson hinges on.

**Terminal A — instructor:**

```bash
cd assignments/assignment-2-broken-build
claude
```

Then: `/assignment_2`

**Terminal B — working session** (open when the instructor tells you):

```bash
cd assignments/assignment-2-broken-build/mesh
claude
```

The instructor runs in Terminal A and tells you what to do in Terminal B.
Each part has a question to answer, a hint if you're stuck, and a
checkpoint before moving on.

## What the four parts cover

1. **Seed the context** — empty `CLAUDE.md` → `/init` → debrief what
   `/init` captures (the *what*) vs what it misses (the *how*).
2. **Audit + resolve competing patterns** — codebase has both `$state`
   runes and stores. Have Claude audit, read
   `mesh-context/conventions/conventions.md`, decide, write rules into
   `CLAUDE.md`, and migrate `src/lib/stores.js` so the code actually
   follows the rule.
3. **Build search from spec** — open
   `mesh-context/search-feature/search-feature.md`, switch to plan mode,
   build on top of the now-clean conventions.
4. **Apply tribal knowledge** — a fake designer email asks for a new
   accent palette. Update `CLAUDE.md` first, then propagate to
   `src/app.css`.

The recurring lesson: every "asked twice" question is a missing line in
`CLAUDE.md`.
