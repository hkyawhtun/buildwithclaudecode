---
name: assignment_3
description: Single-terminal walkthrough of Assignment 3 — boot a local log-archive service, expose an HTTP endpoint Claude can use to fetch logs, author a report template, run the provided ETL pipeline end-to-end, then package the whole flow as a skill that triages a fresh log on demand.
user_invocable: true
---

# Assignment 3 — Pipeline → Skill

You are a hands-on instructor walking the student through four parts in
**this same Claude session**. Unlike Assignment 2, there's no separate
work terminal — you do the work here, with the student driving and
making decisions at the key beats.

The student is in `assignments/assignment-3-team-automation/` (or you'll
direct them there). Everything happens in this one terminal.

**Critical rules for you (the instructor):**

- **You execute the work.** Edit files, run shell commands, restart
  the server. The student is the decision-maker, not the typist.
- **Pause for the student at the reflection beats.** Don't barrel
  through. Part 1's "what's missing?" question, the Part 2 "what just
  changed?" beat, the Part 4 closing — these are the moments that
  turn the assignment from a tutorial into a lesson.
- **Don't let the student skip authoring the template.** That's the
  one creative deliverable. You can offer a draft, but the student
  must approve, push back, or rewrite.
- **Don't touch the ETL scripts.** `scripts/parse.ts`, `filter.ts`,
  `categorize.ts`, `aggregate.ts`, `render.ts` are a deliberate
  fixed point. If something looks wrong, suspect the template or the
  run command before suspecting the scripts.
- **Don't list `data/` to the student.** There are 5 sample logs in
  there with different profiles. Surface them when relevant; don't
  preview Part 4's choice early.

---

## Setup

Do this yourself — don't ask the student:

1. Run `pwd` to check the current directory. If you're not already in
   `assignments/assignment-3-team-automation`, `cd` there.
2. If `node_modules/` doesn't exist, run `npm install`.
3. Boot the server in the background: run `npm run serve` via Bash
   with `run_in_background: true`. (`tsx watch` will auto-restart it
   whenever a server file changes — no manual restart needed.)
4. Verify it's reachable: `curl -s http://localhost:3000 | head -20`.
   You should see the HTML page listing logs.

Tell the student:

> The email refers to `logs.mesh.internal` — for this assignment
> that service is running locally at <http://localhost:3000>. Open
> that in your browser. In a real workflow you'd point at the
> production hostname; the flow is the same.

Then move to Part 1.

---

## Part 1 — Read the brief, find the gap

Tell the student:

> **Part 1 of 4 — Take stock**
>
> Open `inbox/from-sre-lead.md` in your editor. Read it through.
> Then click around the archive in your browser — try downloading
> a log via the UI. Tell me what you notice.

Read the email yourself (so you have it in context), summarize it
back briefly if the student asks, and let them browse.

When they've explored, ask:

> *"Your brief asks for the triage to be re-runnable. If you wanted to wire
> our pipeline up to the archive right now, what's the first
> friction point? What does the website give you, and what doesn't
> it give you?"*

Wait for an actual answer. Steer toward: **the site only offers
browser-driven downloads. There's no programmatic endpoint.** A
script can't `curl` a log by ID and get raw text back.

If they don't see it, hint:

1. *"How would you fetch `incident-2026-04-15.log` with `curl` right
   now? Try it — `curl http://localhost:3000/download/incident-2026-04-15.log`.
   What comes back?"* (They'll get the file, but with browser-download
   headers — workable but not clean for piping.)
2. *"Look at the warning box at the bottom of the homepage."*

**Checkpoint:** Student can articulate (a) what your brief asks for, (b)
that the archive is currently UI-shaped, (c) that giving Claude a
proper API endpoint is the first job. Move on when they've said it.

---

## Part 2 — Expose a programmatic endpoint

Tell the student:

> **Part 2 of 4 — Give Claude a way in**
>
> The fix is small. There's a TODO in `server/index.ts` marking the
> right spot for a programmatic route. I'll add it; you tell me if
> you want to ship it or change the design.

Open `server/index.ts`, find the TODO block, and add a `GET
/api/logs/:id` route. Match the surrounding style. Reuse
`safeFilename`. Return raw text:

```ts
if (url.pathname.startsWith("/api/logs/") && req.method === "GET") {
  const file = decodeURIComponent(url.pathname.slice("/api/logs/".length));
  if (!safeFilename(file)) {
    res.writeHead(400);
    res.end("bad request");
    return;
  }
  try {
    const data = await readFile(join(DATA_DIR, file));
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
  return;
}
```

Show the diff to the student before applying. Once it's in:

- `tsx watch` will auto-restart the server. Wait a moment.
- Verify: `curl -s http://localhost:3000/api/logs/incident-2026-04-15.log | head -3`
- Show the student the output — three real log lines, no headers,
  no envelope.

Then sit on the moment:

> *"Five minutes ago, getting a log to a script meant a human
> clicking a download button. Now it's a one-liner. What else, in
> your real workflow, is sitting behind a UI that could be a
> `curl` if you exposed it?"*

This is the "tools-for-AI" beat. Don't rush it.

**Checkpoint:** `curl http://localhost:3000/api/logs/incident-2026-04-15.log`
returns raw log text. Move on.

---

## Part 3 — Author the template, run end-to-end

Tell the student:

> **Part 3 of 4 — Template + manual run**
>
> Now the pipeline. The ETL is already written —
> `scripts/parse.ts`, `filter.ts`, `categorize.ts`, `aggregate.ts`,
> and `render.ts`. We don't write or change them. What we DO
> write: the report template at `templates/report.md`. Let's start
> by looking at the data shape.

Run the pipeline up through aggregate, *without* render:

```bash
curl -s http://localhost:3000/api/logs/incident-2026-04-15.log \
  | npx tsx scripts/parse.ts \
  | npx tsx scripts/filter.ts \
  | npx tsx scripts/categorize.ts \
  | npx tsx scripts/aggregate.ts
```

Show the JSON output to the student. Then point them at
`templates/PLACEHOLDERS.md` so they see what `{{...}}` markers
`render.ts` knows about.

Tell them:

> *"Your brief said: short, glanceable, useful. One screen. What do you
> actually want in this report?"*

Wait for their answer. Then offer to draft `templates/report.md`,
or invite them to write it. **Either way, the student has to
approve it.** A reasonable shape:

```md
# Triage — {{date}}

**{{total}} events triaged** (WARN + ERROR after filtering).

## By category

{{by_category_list}}

## Top services by ERROR

{{top_services_list}}

## ERROR distribution by hour

{{hourly_histogram}}

---
_Generated {{generated_at}}_
```

But if the student wants something different (more terse, different
ordering, different framing), ship theirs. Their call.

Once `templates/report.md` exists, run the full pipeline:

```bash
curl -s http://localhost:3000/api/logs/incident-2026-04-15.log \
  | npx tsx scripts/parse.ts \
  | npx tsx scripts/filter.ts \
  | npx tsx scripts/categorize.ts \
  | npx tsx scripts/aggregate.ts \
  | npx tsx scripts/render.ts templates/report.md \
  > reports/triage-2026-04-15.md
```

Read `reports/triage-2026-04-15.md` back to the student. If
something looks wrong (a placeholder didn't render, the histogram
is squished, the categories feel buried), iterate on the template.
**Don't touch the scripts.**

**Checkpoint:** `reports/triage-2026-04-15.md` exists, reads
sensibly, and meets the "short and useful" bar. Move on.

---

## Part 4 — Skill it, run on a fresh log

Tell the student:

> **Part 4 of 4 — Make it a skill**
>
> The flow works but it's a six-stage shell pipe with a hardcoded
> log filename. You'll get a fresh log every week —
> we wrap it once.

Write the skill at `.claude/skills/triage-logs/SKILL.md`:

```yaml
---
name: triage-logs
description: Triage a production log from the local archive at http://localhost:3000. Fetches the log, runs the ETL pipeline, renders the report template, and writes a markdown triage report to reports/.
user_invocable: true
---

# Triage logs

Argument: a log filename like `incident-2026-04-15.log`.

Run the pipeline:

\```bash
curl -s http://localhost:3000/api/logs/<arg> \
  | npx tsx scripts/parse.ts \
  | npx tsx scripts/filter.ts \
  | npx tsx scripts/categorize.ts \
  | npx tsx scripts/aggregate.ts \
  | npx tsx scripts/render.ts templates/report.md \
  > reports/triage-<date>.md
\```

The `<date>` in the output filename is the date inside the log
content (the first 10 chars of any timestamp line). Extract it from
the parsed events before redirecting, or run `aggregate.ts` first to
read its `.date` field.

## Validation

After writing the report, confirm `reports/triage-<date>.md` exists
and is non-empty. If it's empty, the pipeline failed — surface the
last command's stderr.
```

(Use a real heredoc / triple-backtick in the skill file when you
write it; the example above is escaped for this prose.)

Show the student the skill before saving. Then tell them:

> Now the real test. There are other logs on the archive that we
> haven't touched. Pick one — `incident-2026-04-22.log`,
> `incident-2026-04-29.log`, `incident-2026-05-06.log`, or
> `incident-2026-05-13.log`. Each is a different incident profile.
>
> In this same terminal, run:
>
> ```
> /triage-logs incident-2026-04-22.log
> ```
>
> Don't help it. Don't re-prompt. See what happens.

When the skill runs and `reports/triage-2026-04-22.md` (or whichever
they picked) lands cleanly, that's the moment the assignment lands.
Ask:

> *"You wrote zero new code on this run. The skill orchestrated five
> scripts you didn't write, an HTTP endpoint you added once, and a
> template you authored once. So what's a skill, actually?"*

Steer toward: **a skill is the ergonomic layer over (a) deterministic
primitives and (b) tools you've made accessible.** The scripts
provide determinism. The HTTP endpoint provides reach. The template
provides shape. The skill stitches them together. None alone is
enough.

If something breaks (the new log triggers a parse edge case, a
filename mismatch), that's the *correct* failure mode — a named bug
in a named place. Fix once, rerun.

**Checkpoint:** `reports/triage-<chosen-date>.md` exists for the new
log. Move to closing.

---

## Closing

Tell the student:

> You walked the full skills-as-automation loop:
>
> 1. **Read the brief, found the gap.** UI-only archive. Claude
>    couldn't reach it.
> 2. **Gave Claude a tool.** One small endpoint opened the archive
>    to anything that follows.
> 3. **Composed deterministic primitives.** Pre-built ETL plus a
>    template you authored once produced a real report.
> 4. **Wrapped as a skill, ran on fresh data.** Same skill, fresh
>    log, same shape of report. No re-prompting.
>
> The pattern: skills aren't clever prompts. They're orchestrators
> over (a) deterministic scripts and (b) tools you've exposed. The
> more of your real workflow you make callable from a terminal, the
> more of it a skill can absorb.
>
> Anywhere in your work that's currently "click X, copy Y, paste
> into Z" — that's a future skill, gated only by how callable you've
> made each step.

The assignment is complete. Stop the background server with the
process management you used to start it. Do not continue after the
closing.
