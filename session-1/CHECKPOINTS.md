# CHECKPOINTS.md — cutting the demo tags

The reference app (`personal-os/`) is the **finished** state. The checkpoints are
earlier, staged states of that same build — one immutable tag per demo beat — so
the instructor can land on a known-good state at any point and so each
`git diff step-N step-N+1` is a clean teaching diff of exactly one feature.

The day-1 starting point is **`step-00-boilerplate`**: Tasks + Assistant tabs with
a live agent backend. Everything else is added forward from there.

## Tag list

| Lesson | Tag | State after the beat | Slide |
|--------|-----|----------------------|-------|
| —      | `step-00-boilerplate`     | Tasks + Assistant tabs + agent backend (core + server + agent loop + Ollama + SSE/toasts) | 8 |
| **L1** | `step-01-chat-fab`        | + `views/FloatingAssistant.tsx` (Messenger FAB on every tab) + App wiring | 11 |
| **L2** | `step-02-claudemd`        | + `CLAUDE.md` + `.claude/rules/` | 18 |
| **L2** | `step-03-brain`           | + Brain tab: notes list+search, markdown editor + toolbar, `[[wiki-links]]`, backlinks, tags; `lib/markdown.tsx`; notes table/fns/endpoints/tools | 20 |
| **L3** | `step-04-skills`          | + `.claude/skills/` incl. `create-pr`; Brain polish → Brain done | 27 |
| **L4** | `step-05-cli`             | + `cli/` (`pos` add/ls/done/rm, note, agent) over shared `core/` — `pos brief` arrives with the Brief at `step-07` | CLI slide |
| **L4** | `step-06-logo`            | + an intentionally **wrong** `logo.svg` (the demo fixes it via `/chrome`) | 38 |
| **L4** | `step-06b-logo-fixed`     | companion: the correct branded logo (known-good result) | 38 |
| **L5** | `step-07-brief`           | + AI Brief: `computeBrief` + `ai/brief.ts` (Ollama + fallback), Brief view, `/api/briefs/generate`, brief tools | 44b |
| **L5** | `step-08-rss`             | + RSS: feeds table+CRUD, `ai/rss.ts`, brief headlines + `headlinesTake`, `FeedManager.tsx`, feed tools | 47 |
| **L5** | `step-09-scheduled-brief` | + `/loop` / `/schedule` config for a recurring morning brief (≈ the reference app) | 47 |

Note: SSE live-updates + toasts ship in the **boilerplate** (they make the agentic
loop visible from day one). `FeedManager` arrives with RSS.

## What's usable at each checkpoint (feature matrix)

This is the answer to "if I `git checkout step-NN`, what parts of the app exist?"
Verified against the actual tags. A feature is usable from its build tag onward.

| Feature / surface | Built at | Usable from |
|---|---|---|
| Tasks tab, Assistant (Chat tab), agent loop + **task tools**, SSE + toasts, Express server | `step-00` | step-00 → |
| Floating Assistant (Chat **FAB**) | `step-01` | step-01 → |
| `CLAUDE.md` + `.claude/rules/` | `step-02` | step-02 → |
| **Brain** tab (notes, `[[wiki-links]]`, backlinks, tags) + note tools/endpoints | `step-03` | step-03 → |
| **`/create-pr` skill** (`.claude/skills/`) | `step-04` | step-04 → |
| **`pos` CLI** — `add/ls/done/rm`, `note`, `agent` | `step-05` | step-05 → |
| Off-brand **wrong logo** (for the `/chrome` fix demo) | `step-06` | step-06 **only** |
| Correct branded logo | `step-06b` | step-06b → |
| **AI Brief** — `computeBrief`, `ai/brief.ts`, Brief view, brief tool, **`pos brief`** | `step-07` | step-07 → |
| **RSS feeds** — `FeedManager`, `ai/rss.ts`, brief `headlinesTake` | `step-08` | step-08 → |
| `.claude/loop.md` (scheduled morning brief) | `step-09` | step-09 |

**Always present (from `step-00`):** the `docs/` specs the demos read from —
`docs/feature-specs/*` (floating-assistant, brain-*), `docs/feature-specs/*` (ai-brief, rss-feeds),
`docs/skills/create-pr.md`, `docs/pillars-map.md`. These are reference material, not
built features, so any demo can read its spec regardless of checkpoint.

## Slide demos → checkout point

Rule of thumb: a **build** demo checks out the **previous** checkpoint and builds
toward the one it's named for; the **explore** and **fix** demos check out the tag
they operate on. (A demo with no checkout runs on whatever state you're already in.)

| Slide demo | Checkout | Produces |
|---|---|---|
| Explore Personal OS | `step-00-boilerplate` | — (read-only) |
| Plan-mode Chat FAB | *(stay on `step-00`)* | `step-01-chat-fab` |
| Build the Brain | `step-02-claudemd` | `step-03-brain` |
| `/create-pr` skill | `step-03-brain` | `step-04-skills` |
| Build the CLI | `step-04-skills` | `step-05-cli` |
| `/chrome` add-a-task | *(current running app)* | — |
| Logo fix via `/chrome` | `step-06-logo` | `step-06b-logo-fixed` |
| Team builds the Brief | `step-06b-logo-fixed` | `step-07-brief` |
| Build RSS feeds | `step-07-brief` | `step-08-rss` |
| Schedule the brief | `step-08-rss` | `step-09-scheduled-brief` |

## How to cut them

This is a **forward** build (not reverse-staging the final app), so each tag is
real and self-consistent. Use a dedicated build branch in this repo.

```bash
git switch -c spine-build
# 1. cut step-00 by stripping the reference app to Tasks + Assistant + agent backend
#    (remove Brain/Brief/FAB/CLI/ai/rss/feeds — see "Boilerplate" below), then:
git add -A && git commit -m "step-00: boilerplate — Tasks + Assistant + agent backend"
git tag -a step-00-boilerplate -m "checkpoint: boilerplate"
# 2. beat by beat, drive Claude Code with the matching block in PROMPTS.md,
#    squash the beat into one commit, and tag it:
git add -A && git commit -m "step-03: Brain tab"
git tag -a step-03-brain -m "checkpoint: Brain"
# ...repeat through step-09
git push origin spine-build --tags
```

### The boilerplate (`step-00`) — what to keep / remove

**Keep:**
- **web** (`src/`): App shell (top nav = Tasks · Assistant, theme toggle, nav
  persistence), `views/Tasks.tsx`, `views/Chat.tsx`, `views/Toasts.tsx`,
  `components/{ui,icons}.tsx`, `lib/dates.ts`, `api.ts`, `types.ts`, `data.ts`
  (seed tasks only).
- **core** (`core/`): `db.ts` with tasks + chats/messages + the change-event bus
  (`onChange`/`emit`/`withSource`), `types.ts`.
- **server** (`server/`): tasks CRUD, `/api/agent`, `/api/chats*`, `/api/events`
  (SSE), pino logger.
- **agent** (`agent/`): `loop.ts` + `tools.ts` with **task tools only**
  (list/add/complete/reopen/delete) + Ollama.
- **tests**: Tasks, dates, agent loop/tools (task subset).

**Remove (added back later):** `views/{Brain,Brief,FloatingAssistant,FeedManager}.tsx`,
`lib/markdown.tsx`, `ai/`, `cli/`, notes/briefs/feeds tables + functions + endpoints
+ their agent tools, RSS, brief generation.

## Guidelines

- **One squashed commit per tag** so `git diff step-N step-N+1` is a clean diff.
- Tag slugs must match the `## step-..` headings in `PROMPTS.md` (so `resume.sh` works).
- `step-09-scheduled-brief` should match `personal-os/` as it stands today.
- **Verify each tag runs:** `git checkout step-NN` → `npm install` (web) +
  `cd server && npm install` → `npm run dev` + API; the app works at that lesson's
  level. `npm run test:all` green at every tag that includes tests.
- Keep `node_modules`, `.data/`, `dist/` out (already gitignored).

## Mapping to slides

Every Live Demo slide in `slides.html` names its `step-NN` tag so
the room can follow along or recover. See the table above for the slide ↔ tag map.
