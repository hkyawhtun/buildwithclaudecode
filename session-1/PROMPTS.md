# PROMPTS.md — what the instructor types at each beat

One block per checkpoint. Drive the live build with these; if a run fails, jump
to the next tag (see `resume.sh`) and keep going. Headings match the tag slugs so
`resume.sh` can print the right block.

The day-1 starting point is **`step-00-boilerplate`**: Tasks + Assistant tabs
already wired to a live agent backend (core + server + agent loop + Ollama). Every
beat below grows that same app toward the finished `personal-os/` reference.

All builds run from `personal-os/` with the project `CLAUDE.md` loaded
once it exists (step-02), so Claude builds on-pattern.

---

## step-00-boilerplate
*(No build — this is the starting tag.)* Explore the running app (slide 8):
> Explain this project's architecture in under 10 bullets. What are the tabs, and
> how does the Assistant actually change data? Then trace one agent turn from a
> Chat message to a task being created (agent/loop.ts, agent/tools.ts, core/db.ts).

Then, live: run the app, open the Assistant, "add a task to call the dentist
tomorrow" → watch it appear in Tasks with a toast (agent + SSE working).

## step-01-chat-fab
*(Lesson 1 · slide 11 — Plan mode.)* Shift+Tab into Plan mode first:
> Read docs/feature-specs/floating-assistant.md and CLAUDE.md. Plan how to build the
> Floating Assistant (Chat FAB) exactly as specced — a Messenger-style bubble on
> every tab except the full Assistant view, that runs the same agent and refreshes
> the current view when it makes a change.

Approve the plan, then:
> Build it. Then run the app and confirm the bubble appears on Tasks and can add a
> task. Add a test.

## step-02-claudemd
*(Lesson 2 · slide 18.)*
> Write a `CLAUDE.md` for this project: the stack, the folder layout, the
> **"surface" pattern** (each feature is a view in `src/views/` with typed props),
> our TypeScript conventions (erasable syntax for node, design tokens for web), and
> how to run it. Add a `.claude/rules/` entry for path-specific conventions. Then
> re-run a small task and we'll compare the output.

## step-03-brain
*(Lesson 2 · slide 20 — one PRD at a time.)*
> Read docs/feature-specs/brain/notes.md. Build the **Brain** tab: a searchable note list and
> an editor, wired through `core/` (notes table + CRUD), a server endpoint, and an
> agent tool. Add a test.

Then layer the rest, each from its PRD:
> Now docs/feature-specs/brain/editor.md — markdown rendering + a formatting toolbar.
> Now brain-wikilinks.md — `[[wiki-links]]` that navigate.
> Now brain-backlinks.md — a Connections panel of incoming/outgoing links.
> Now brain-tags.md — add/remove tags with a working "+ tag" control.

Run `npm run test:all` after each — green at every step. Brain is done.

## step-04-skills
*(Lesson 3 · slide 27 — author the skill, don't pre-build it.)*
> Create a skill `.claude/skills/create-pr/SKILL.md` that, for the current branch,
> runs in order: (1) the built-in `/review` and fix anything blocking; (2) write a
> diff summary in our format (what / why / risk / test); (3) use `/chrome` to
> screenshot the changed UI and attach it; (4) `gh` to push the branch and open the
> PR with that summary; (5) save the PR summary as a Brain note (second-brain
> feature). See docs/skills/create-pr.md for the spec.

Then drive it: `/create-pr`.

## step-05-cli
*(Lesson 4 · CLI slide.)*
> Build a CLI, `pos`, in `cli/` over the shared `core/` so Claude Code and cron can
> drive the app: `pos add/ls/done/rm`, `pos note`, `pos agent`, all supporting
> `--json`. No new data layer — import `core/` directly. Add `pos --help` and a test.
> (The `pos brief` command arrives with the Brief feature at `step-07`.)

## step-06-logo
*(Lesson 4 · slide 38 — /chrome validation.)* This tag ships a deliberately
**wrong** logo (`docs/demo-assets/logo-wrong.svg` rendered in the nav). Companion
tag `step-06b-logo-fixed` is the known-good result.
> `/chrome` → Screenshot localhost:5173. The logo in the top nav looks wrong — a
> grey "OS?" circle. Find the SVG it renders and show me the file. Replace
> `src/assets/logo.svg` with our real branded "P" mark (blue→indigo gradient
> rounded square). Screenshot the nav again and confirm the new logo renders.

## step-07-brief
*(Lesson 5 · slide 44b — parallel agent team.)*
> Read docs/feature-specs/ai-brief.md. Spawn an agent team to build the whole **Brief**
> feature in parallel against `core/types.ts` as the contract:
> a core lane (`computeBrief` + `/api/briefs/generate`), an ai lane (`ai/brief.ts`
> with Ollama + a computed fallback), and a web lane (the Brief view + brief agent
> tools). Keep facts computed; the model only writes prose. Each lane ships tests.

## step-08-rss
*(Lesson 5 · slide 47, part 1.)*
> Read docs/feature-specs/rss-feeds.md. Add RSS subscriptions: a feeds table + CRUD,
> `ai/rss.ts`, a `FeedManager` UI, and fold the headlines plus a synthesized
> `headlinesTake` into the brief. Auto-regenerate the brief when feeds change. Add
> tests. Then add the Hacker News feed and regenerate — confirm the brief cites
> real headlines.

## step-09-scheduled-brief
*(Lesson 5 · slide 47, part 2 — final state ≈ the reference app.)*
> Make the brief recurring. In-session: `/loop 30m run \`pos brief\` and tell me the
> top headline`. Unattended: `/schedule every weekday at 7am, run \`pos brief\` and
> DM me the lede`. The same `pos` CLI from Lesson 4 is what makes the brief
> schedulable — tooling compounds.
