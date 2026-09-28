# Session 1 — Foundations + Context Engineering (V2)

~3 hours. The agentic loop, Plan mode, CLAUDE.md, the Second Brain, and skills —
built live on **Personal OS**. Three lessons + three assignments.

## How to start

```bash
open slides.html
```

Follow along. When a slide says to drive Personal OS, the repo is right here:

```bash
cd personal-os
gh repo create personal-os-session-1 --private --source=. --remote=origin --push  # one-time: your private repo (for PRs)
git checkout step-00-boilerplate   # the day-1 starting state
npm install && npm run dev         # web :5173
cd server && npm install && npm run dev   # api :4000
```

`./resume.sh <NN>` checks out a checkpoint and prints its prompt (`./resume.sh list`).

## Personal OS checkpoints in this session

This repo carries Lessons 1–3 (`main` sits at `step-04-skills`):

| Tag | Built |
|---|---|
| `step-00-boilerplate` | Tasks + Assistant tabs + agent backend |
| `step-01-chat-fab` | Floating Assistant (Chat FAB) |
| `step-02-claudemd` | `CLAUDE.md` + `.claude/rules/` |
| `step-03-brain` | Brain tab (notes, wiki-links, backlinks, tags) |
| `step-04-skills` | `/create-pr` skill |

See `CHECKPOINTS.md` for the full feature matrix and `PROMPTS.md` for each beat's prompt.

## What's in here

```
slides.html            # the Session 1 deck
personal-os/           # the spine app as a git repo with step-00…step-04 tags
PROMPTS.md             # the prompt for each checkpoint
CHECKPOINTS.md         # what's usable at each checkpoint + slide→checkout map
resume.sh              # checkout a checkpoint + print its prompt
assignments/           # the three Session 1 assignment projects
blocks/  shared/  logo.svg   # slide assets
```

## Assignments

| # | Assignment | Path |
|---|---|---|
| 1 | Guided Onboarding Wizard | [`assignments/assignment-1-explore-codebase/`](./assignments/assignment-1-explore-codebase/) |
| 2 | CLAUDE.md walkthrough on a Svelte app | [`assignments/assignment-2-broken-build/`](./assignments/assignment-2-broken-build/) |
| 3 | Skill from a real workflow (log triage) | [`assignments/assignment-3-team-automation/`](./assignments/assignment-3-team-automation/) |
