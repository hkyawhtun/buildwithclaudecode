From: alex.r@mesh.io
To: you@mesh.io
Subject: Weekly triage — wire up the log archive
Date: 2026-04-16, 09:14

Hey

Putting you on something we're going to do every week now. The log
archive lives at https://logs.mesh.internal — recent incident dumps,
downloadable from the UI.

This week's target: `incident-2026-04-15.log`.

What I need: a clean **markdown triage report** I can drop into the
incident channel and forward to eng leadership. Short, glanceable,
*useful* — not a wall of JSON. The shape: date, total events triaged,
counts by category, hourly distribution of errors, and the top
services contributing errors. One screen of text, max.

Constraints:

1. **Categorization is regex-only.** No LLM in the data path — same
   input must produce byte-identical output. Buckets I care about:
   `db`, `auth`, `network`, `deploy`, `other`.
2. **Filter out INFO.** Keep WARN and ERROR.
3. **Drop corrupted lines** — there's some noise mixed in (lines
   starting with `--`).

I've already done the boring part — the ETL scripts are sitting in
`scripts/` (parse, filter, categorize, aggregate, render). They're
deterministic and they work. **You don't need to write or modify
those.** What you DO need to do:

- **Make the archive accessible from the command line.** Right now the
  website only lets a human download via the browser. That's awkward
  if you want to pipe a log into a script. Expose a programmatic
  endpoint (something like `GET /api/logs/<id>` returning raw text)
  so I can `curl` straight from the pipeline.
- **Author the report template** at `templates/report.md`. See
  `templates/PLACEHOLDERS.md` for the substitutions render.ts
  supports. Keep it short and useful — what would I actually want to
  see if I had 20 seconds to glance at this in Slack?

Once the manual flow works end-to-end on `incident-2026-04-15`, wrap
it as a Claude skill so the next time I ask for a triage on a
different log ID, it's one command.

Thanks,
Alex
SRE Lead
