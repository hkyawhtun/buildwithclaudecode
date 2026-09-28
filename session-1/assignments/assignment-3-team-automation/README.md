# Assignment 3 — Skill from a real workflow

The instructor walks you through this in a single terminal:

```bash
cd assignments/assignment-3-team-automation
claude
```

Then `/assignment_3` in that session. The skill boots a local log
archive in the background and walks you through four parts.

## What you'll build

A working triage pipeline made up of: a small log-archive web server,
a programmatic API endpoint you'll add to it, a markdown report
template you'll author, a set of pre-built ETL scripts, and finally a
`/triage-logs` skill that orchestrates the whole flow on any log in
the archive.

## What's here

- `server/` — the log archive web service (Node `http`, ~80 lines)
- `data/` — five sample incident logs across different profiles
- `scripts/` — pre-built ETL: `parse → filter → categorize →
  aggregate → render`. Don't modify these.
- `templates/PLACEHOLDERS.md` — reference for the `{{...}}` markers
  `render.ts` supports
- `templates/` — empty; you'll create `report.md`
- `inbox/from-sre-lead.md` — the stakeholder brief
- `reports/` — output target

The assignment is paced — let the skill direct what to look at when.
