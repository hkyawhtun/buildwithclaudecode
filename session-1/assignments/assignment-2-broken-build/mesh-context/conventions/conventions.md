# Mesh — Coding Conventions

This codebase has more than one way to do common things. When Claude is asked
to add a feature, it has to pick between competing patterns — and unless you
tell it which one, it will either guess or pause to ask.

This file picks. Paste it into Claude's context (alongside the search spec
when implementing search, or by copying it into a top-level `CLAUDE.md`) and
Claude will follow the canonical pattern instead of asking.

---

## State

**One pattern: `$state` runes.** Declare state local to the component that
owns it; pass down as props; communicate up via callback props. Examples in
`App.svelte`: `let nodes = $state([])`, `let selectedId = $state(null)`,
`let captureValue = $state('')`.

`src/lib/stores.js` previously held two `writable` stores (`captureValue`,
`captureFocused`) used only by `App.svelte`. The dual-API surface wasn't
justified — both were inlined as `$state` and `stores.js` was deleted. Don't
reintroduce `svelte/store` writables for component-local state.

Search state (`searchQ`, `searchOpen`, `queryEmbed`) belongs as `$state`
runes in the host component, matching `nodes` and `selectedId`.

If state genuinely needs to be shared across more than one component, prefer
`$state` declared in a shared module with an explicit setter export, over
reaching for a store.

---

## Component organization

Two patterns currently exist:

| Pattern | Where you'll see it | Example |
|---|---|---|
| Inline in `App.svelte` | Topbar, capture form, empty states | `<form class="capture">…</form>` |
| Extracted `.svelte` file under `src/lib/` | Graph, NodeCard | `src/lib/NodeCard.svelte` |

**Default to inline in `App.svelte`. Extract only when one of these is true:**

- The component owns non-trivial JS logic of its own (NodeCard owns `formatTime`).
- The component renders to a `<canvas>` or manages an external library
  lifecycle (Graph owns d3-force).
- The component is reused in more than one place.

The search panel stays inline in `App.svelte`. Its only logic is reactive
glue against existing app state, and it isn't reused.

---

## Styling

One pattern: global classes in `src/app.css` keyed off `oklch(...)` design
tokens (`--text`, `--accent`, `--accent-2`, etc.). Don't introduce scoped
`<style>` blocks inside Svelte components, and don't invent a new color
system — extend the existing tokens.

### Accent tokens

Two named accents drive every interactive/affordance hue. The token names
are deliberately neutral so a future palette swap doesn't require renaming
class references.

| Token | Value | Used for |
|---|---|---|
| `--accent` | `oklch(0.62 0.18 295)` (violet) | Focus rings, brand glyph, hint dot, capture-go marker, node-id pill, search input border on focus, connection bars in the node card |
| `--accent-dim` | `oklch(0.42 0.10 295)` | Dimmed variant of the primary accent |
| `--accent-2` | `oklch(0.78 0.16 130)` (lime) | Score bars, active search-result row, score numerals |
| `--accent-2-dim` | `oklch(0.55 0.10 130)` | Dimmed variant of the secondary accent |

`--cyan*` and `--amber*` were the v0.1 names and have been removed. Don't
reintroduce hue-named tokens — extend `--accent*` if a new role needs the
same hue, or propose a new neutral name (`--accent-3`, `--success`, etc.)
in this file before adding it.

When you need an accent at a non-token alpha (e.g. `0.18` background tint,
`0.55` glow), use the literal `oklch(L C H / a)` with the **canonical hue**:
- Primary accent: hue `295`
- Secondary accent: hue `130`

Keep the hue stable; only vary lightness/chroma/alpha. Don't introduce new
hue numbers without updating this table.

### Out of scope

Graph node fill colors (the canvas-rendered halos and core dots in
`Graph.svelte`) were intentionally left on the v0.1 cool-blue/amber
palette pending a separate spike. Don't refactor them to use these
tokens until that decision lands.

---

## How to use this for future code

A consistent codebase is one Claude can extend without asking. Every "which
pattern should I follow?" Claude raises is a missing line in a file like
this one.

The loop:

1. Claude (or a teammate) asks: *"I see two patterns — which?"*
2. You decide once.
3. Write the decision into this file (or `CLAUDE.md`).
4. Next time, nobody asks — Claude reads, picks, and ships.

If you catch yourself answering the same Claude question twice, that's a
missing convention. Add it here.
