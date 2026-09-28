# Assignment 3 — log triage pipeline

Production log triage workflow. A small log-archive web service in
`server/`, a set of pre-built ETL scripts in `scripts/`, and an empty
`templates/` dir where the report template will live.

## Stack

- TypeScript via `tsx` (no build step)
- Node ≥ 20
- No dependencies beyond `tsx` and `@types/node`

## Layout

- `server/` — the log archive site. `npm run serve` starts it on
  port 3000.
- `data/` — raw log dumps the server lists and serves.
- `scripts/` — ETL stages: `parse → filter → categorize → aggregate
  → render`. Each is a small pure transformation that reads stdin
  and writes stdout (except `render`, which also takes a template
  path). Don't modify these unless you find a real bug.
- `templates/` — where the report template goes. See
  `templates/PLACEHOLDERS.md` for the substitutions `render.ts`
  supports.
- `inbox/` — context artifacts (the stakeholder brief).
- `reports/` — output target for rendered triage reports.

## Conventions

- The data path is **deterministic**. No LLM calls inside any script
  in `scripts/` — same input must produce byte-identical output.
- Scripts compose via shell pipes. The end-to-end run is one chained
  command.

## Running the server

```bash
npm install
npm run serve
# → http://localhost:3000
```
