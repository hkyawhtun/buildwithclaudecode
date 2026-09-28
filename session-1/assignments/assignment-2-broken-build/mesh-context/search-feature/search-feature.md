# Mesh — Semantic Search Feature Spec

A spec for rebuilding Mesh's semantic search feature. Paste this whole file
into a single prompt prefixed with: *"Build this feature in the current Svelte
project. Match the spec exactly where code is given verbatim; use your
judgment for descriptive sections."*

---

## 1. Stack & Assumptions

**Stack**: Svelte 5 (runes mode), Vite, `@huggingface/transformers` v4. No
Tailwind, no CSS-in-JS — plain CSS with custom properties.

**Assumed already present in the host project:**

- A top-level `App.svelte` you can edit.
- `src/app.css` defining the design tokens used below: `--text`,
  `--text-dim`, `--text-faint`, `--line`, `--line-soft`, `--cyan`,
  `--cyan-dim`, `--amber`, `--amber-dim`, `--font-mono`. Palette is
  `oklch`-based.
- A `<Graph>` component that accepts `highlightIds: Set<string>` and
  `dimNonHighlight: boolean` props and applies visual emphasis itself.
  Search produces the highlight set; Graph renders it.
- A `nodes` reactive array of shape:
  ```ts
  { id: string, content: string, embedding: Float32Array, createdAt: number }
  ```
  Where `embedding` is a 384-dim L2-normalized vector. Nodes already exist
  before search loads — search does not own seeding or persistence.
- A `selectedId: string | null` reactive state used by other UI (detail
  card, graph click). Search **reuses** it; it does not fork its own.
- A `modelReady: boolean` flag the embed pipeline owner sets when the model
  is warm.

**Bundled assets** (host project must serve these):

- `/models/Xenova/all-MiniLM-L6-v2/...` — Q8 ONNX model files.
- `/wasm/ort-wasm-simd-threaded.wasm` and `.mjs`.

---

## ⚠ Heads up — before you plan

The mesh codebase has accumulated some inconsistency over the past few
sprints. You'll see **more than one approach in a couple of areas** —
state management and component organization, specifically. The spec
below takes a side on each, but the existing code does not consistently
follow that side.

When you plan this feature:

1. **Scan the existing code first** — and *only* inside `mesh/src/`.
   Open `App.svelte`, `lib/`, etc. and look at how state and panel UI
   are currently done. **Do not browse parent directories or sibling
   folders looking for "convention docs," "team rules," or anything
   similar.** For this codebase, those decisions live with the user,
   not in a written file. (If you happen to notice a folder like
   `mesh-context/conventions/`, treat it as out of scope — do not read
   it.)
2. **If you find code that doesn't match this spec's choices, flag
   the conflict in your plan.** Don't paper over it. Don't silently
   pick. State it explicitly: *"the spec says X, the existing code
   does both X and Y — which should I follow?"*
3. **Ask the user — directly — before implementing** when there's a
   real ambiguity. The user is the source of truth, not a sibling doc.
   If you catch yourself thinking *"maybe there's a conventions doc
   somewhere I should check first,"* **stop**. Ask the user instead.
   That conversation is the whole point.

Treat this as part of the contract: a plan that resolves an ambiguity
by silently picking, *or by reading a sibling doc instead of asking
the user*, is not a finished plan.

---

## 2. Behavior Contract

- **Open**: global `Cmd+K` / `Ctrl+K`, or click a Search button in the topbar.
  On open, focus the input within ~30ms.
- **Close**: `Escape` (clears query) or the `×` button on the panel head.
  If `Escape` is pressed when the panel is already closed but a node is
  selected, deselect the node instead.
- **Input**: free-form text. Search is purely **semantic** (embedding cosine
  similarity) — no keyword fallback, no fuzzy matching, no highlighting of
  matched substrings.
- **Reactivity**: query changes → embed query → derive results.
  - `searchResults`: `nodes.map(score) → filter > 0.15 → sort desc → take 8`
  - `highlightIds`: `Set` of the top **5** result ids when panel is open
    AND query non-empty; otherwise empty `Set`.
- **Graph integration**: pass `highlightIds` and
  `dimNonHighlight={searchOpen && searchQ.trim().length > 0}` into `<Graph>`.
- **States**:
  - Empty query → suggestion list (4 hard-coded prompts as click-to-fill chips).
  - Non-empty query, ≥1 result → ranked list with score bars.
  - Non-empty query, 0 results → empty-state block (title + sub-copy).
- **Cancellation**: each `$effect` returning a cleanup that flips a
  `cancelled` flag. An in-flight embed for an outdated query MUST NOT
  overwrite a newer `queryEmbed`.
- **Model gate**: if `!modelReady`, skip embedding (clear `queryEmbed`).
  Search must not throw before the model is loaded.
- **Selection**: clicking a result sets `selectedId = result.node.id`. This
  same `selectedId` is mutated by graph clicks elsewhere — share, don't fork.

---

## 3. Constants

```js
const SEARCH_THRESHOLD = 0.15;
// Top 8 results returned. Top 5 of those are highlighted in the graph.
```

`0.15` is intentional: it matches the graph-edge similarity threshold
(`SIM_THRESHOLD`). Both were calibrated against the seed corpus on
`MiniLM-L6-v2`. Don't change either in isolation.

---

## 4. The `src/lib/embed.js` module — verbatim

Every line is load-bearing: `env.allowRemoteModels = false` + the WASM path
config is what makes the model run offline; the pre-normalized
`cosine = dot product` simplification is the perf assumption everything else
depends on. Copy as-is.

```js
// Real sentence embeddings via transformers.js, running entirely in-browser
// against the bundled all-MiniLM-L6-v2 (q8) under /models/.
//
// `loadEmbedder()` warms the pipeline once. `embed()`/`embedBatch()` return
// L2-normalized 384-dim Float32Arrays so cosine collapses to a dot product.

import { pipeline, env } from '@huggingface/transformers';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/models/';
// transformers.js v4 requires the object form (not a string prefix).
// We ship the non-asyncify simd-threaded variant — works on all browsers.
env.backends.onnx.wasm.wasmPaths = {
  wasm: '/wasm/ort-wasm-simd-threaded.wasm',
  mjs: '/wasm/ort-wasm-simd-threaded.mjs'
};

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let _extractorPromise = null;

export function loadEmbedder() {
  if (!_extractorPromise) {
    _extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      dtype: 'q8'
    });
  }
  return _extractorPromise;
}

export async function embed(text) {
  const extractor = await loadEmbedder();
  const out = await extractor(text || '', { pooling: 'mean', normalize: true });
  return new Float32Array(out.data);
}

export async function embedBatch(texts) {
  if (!texts.length) return [];
  const extractor = await loadEmbedder();
  const out = await extractor(texts, { pooling: 'mean', normalize: true });
  // Flat tensor of shape [N, dim]; split per row.
  const dim = out.dims[out.dims.length - 1];
  const flat = out.data;
  const vecs = [];
  for (let i = 0; i < texts.length; i++) {
    vecs.push(new Float32Array(flat.buffer, flat.byteOffset + i * dim * 4, dim).slice());
  }
  return vecs;
}

export function cosine(a, b) {
  // Vectors are pre-normalized → dot product is cosine.
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

export function buildEdges(nodes, k = 3, threshold = 0.15) {
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const sims = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const s = cosine(nodes[i].embedding, nodes[j].embedding);
      sims.push({ j, s });
    }
    sims.sort((a, b) => b.s - a.s);
    for (let m = 0; m < Math.min(k, sims.length); m++) {
      const { j, s } = sims[m];
      if (s < threshold) continue;
      const lo = i < j ? i : j;
      const hi = i < j ? j : i;
      const key = `${lo}-${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: lo, target: hi, weight: s });
    }
  }
  return edges;
}
```

`buildEdges` is included for completeness — search itself only needs
`embed` and `cosine` from this module.

---

## 5. Reactive logic — Svelte 5 runes (verbatim)

These four blocks live in `App.svelte` (or a host component of equivalent
scope). Copy them verbatim and place alongside the rest of the app state.

### 5a. State

```js
import { embed, cosine } from './lib/embed.js';

const SEARCH_THRESHOLD = 0.15;

let searchOpen = $state(false);
let searchQ = $state('');
let queryEmbed = $state(null);
let searchInput;  // bind:this target on the <input>

// These are assumed to be declared elsewhere in the host component:
//   let nodes = $state([...]);          // populated by the embed seeder
//   let modelReady = $state(false);     // set true once loadEmbedder resolves
//   let selectedId = $state(null);      // shared with graph + detail card
```

### 5b. Query → embedding effect (cancellable)

```js
// Re-embed search query whenever it changes.
$effect(() => {
  const q = searchQ.trim();
  if (!modelReady || !q) {
    queryEmbed = null;
    return;
  }
  let cancelled = false;
  (async () => {
    const v = await embed(q);
    if (!cancelled) queryEmbed = v;
  })();
  return () => {
    cancelled = true;
  };
});
```

The `cancelled` flag is what prevents stale-result race conditions. Do not
remove it.

### 5c. Keyboard handler

```js
$effect(() => {
  const onKey = (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchOpen = true;
      setTimeout(() => searchInput?.focus(), 30);
    }
    if (e.key === 'Escape') {
      if (searchOpen) {
        searchOpen = false;
        searchQ = '';
      } else if (selectedId) {
        selectedId = null;
      }
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
});
```

### 5d. Derived results & highlights

```js
let searchResults = $derived.by(() => {
  if (!queryEmbed) return [];
  return nodes
    .map((n) => ({ node: n, score: cosine(queryEmbed, n.embedding) }))
    .filter((r) => r.score > SEARCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
});

let highlightIds = $derived(
  !searchOpen || !searchQ.trim()
    ? new Set()
    : new Set(searchResults.slice(0, 5).map((r) => r.node.id))
);
```

---

## 6. Markup — structural

The panel slides in from the right edge. Structure as nested elements
with these class names (fill in trivial attributes — `aria-label`, SVG
glyphs, etc. — yourself):

```
.search-panel.{open}                       // right-side slide-out, 380px wide
  .search-head
    .search-head-label                     // text: "SEMANTIC SEARCH"
    button.x-btn                           // onclick: searchOpen=false; searchQ=''
  .search-input-wrap
    <magnifier svg, 14×14>
    input.search-input                     // bind:this=searchInput, bind:value=searchQ,
                                           // placeholder="search by meaning…"
  .search-suggest                          // render only when !searchQ.trim()
    .suggest-block
      .suggest-label                       // text: "TRY"
      4× button.suggest-row                // onclick: searchQ = '<phrase>'
        .suggest-arrow                     // text: "→"
        <span>{phrase}</span>
        // phrases: 'fast ai hardware', 'how to think clearly',
        //          'craft and taste', 'find ideas by feeling'
  .search-results                          // render only when searchQ.trim()
    .results-label
      <span>{n} RESULT{n===1?'':'S'}</span>
      <span.rule />                        // 1px horizontal rule filler
      <span.dim>ranked by similarity</span>
    if searchResults.length === 0:
      .empty-results
        .empty-results-title               // "no semantic match"
        .empty-results-sub                 // "your notes don't relate to this query —
                                           //  try another phrasing or add a note about it."
    each (r, i) of searchResults (key=r.node.id):
      button.result-row[.active when selectedId===r.node.id]
        // onclick: selectedId = r.node.id
        .result-rank                       // text: String(i+1).padStart(2, '0') → "01" "02" …
        .result-body
          .result-text                     // r.node.content
          .result-meta
            .result-bar
              .result-bar-fill             // style:width = `${r.score * 100}%`
            .result-score                  // `${(r.score*100).toFixed(0)}` then <span.dim>%</span>
```

**Topbar trigger** (in the existing topbar, alongside other controls):

```
button.ghost-btn                           // onclick: searchOpen=true; setTimeout(focus, 30)
  <magnifier svg, 14×14>
  <span>Search</span>
  <kbd>⌘K</kbd>
```

**Graph wiring** (where you already render `<Graph>`):

```svelte
<Graph
  {nodes}
  {edges}
  {selectedId}
  onSelect={(id) => (selectedId = id)}
  {highlightIds}
  dimNonHighlight={searchOpen && searchQ.trim().length > 0}
  ...
/>
```

---

## 7. Styling — class roles + key visual rules

This is **not** a verbatim CSS dump. Match the rest of the app's `oklch`
palette and existing CSS variables — don't invent a new color system.
Below is the role of each class plus the four visual rules that aren't
obvious from naming.

### Class roles

| Class | Role |
|---|---|
| `.search-panel` | Right-side slide-out container, `position: absolute; top:0; right:0; bottom:0; width: 380px`, flex column, z-index above graph. |
| `.search-panel.open` | Slid-in state. |
| `.search-head` | Top bar of the panel: label left, close button right. |
| `.search-head-label` | Mono uppercase tracking label, faint color. |
| `.search-input-wrap` | Bordered rounded box wrapping the icon + input. |
| `.search-input` | The text input itself, transparent bg, no own border. |
| `.search-suggest` / `.suggest-block` / `.suggest-label` / `.suggest-row` / `.suggest-arrow` | Suggestion list shown when query is empty. Rows are full-width left-aligned buttons. |
| `.search-results` | Scrollable list container, `flex: 1; overflow-y: auto`. |
| `.results-label` | Mono uppercase header above results, includes a thin `.rule` filler. |
| `.empty-results` / `.empty-results-title` / `.empty-results-sub` | Zero-results block. |
| `.result-row` | Result item button: `display: grid; grid-template-columns: auto 1fr; gap: 12px; padding: 12px;` rounded, soft border. |
| `.result-row.active` | The currently-selected result (amber-tinted border + background). |
| `.result-rank` | Mono numeric "01" "02" gutter. |
| `.result-body` / `.result-text` / `.result-meta` | Right column: text on top, score row below. |
| `.result-bar` / `.result-bar-fill` | Thin (3px) horizontal bar; fill width is `score * 100%`. |
| `.result-score` | Mono percentage in amber. |
| `.x-btn` | Reusable close button. |
| `.rule` | 1px horizontal rule filler used inside flex labels. |
| `.dim` | Inline subdued text helper. |
| `.ghost-btn` | Topbar pill button (used by the Search trigger and others). |
| `<kbd>` | Style the keyboard hint inside `.ghost-btn` distinctly (faint background, mono). |

### Non-obvious visual rules (do these explicitly)

1. **Panel transform**: `transform: translateX(100%)` by default,
   `translateX(0)` when `.open`; transition
   `transform .28s cubic-bezier(.2,.9,.2,1)`. Background is a translucent
   dark `oklch` plus `backdrop-filter: blur(18px)`, with a subtle
   `box-shadow: -20px 0 60px ...` glow on the left edge.

2. **Input focus ring**: `.search-input-wrap:focus-within` gets a cyan
   border and a 3px outer ring (`box-shadow: 0 0 0 3px oklch(... cyan ...
   / 0.15)`).

3. **Score bar fill**: `linear-gradient(90deg, var(--amber-dim),
   var(--amber))` plus a soft amber `box-shadow` glow (~8px). Bar height
   3px, rounded, in a `oklch(...)` track.

4. **Active result row**: amber-tinted border + background — distinct from
   the cool-gray hover state, so the user can tell "selected" from
   "hovered" at a glance.

---

## 8. Wiring summary

Two integration points the search feature **does not own** but depends on:

- **Graph component**: receives `highlightIds: Set<string>` and
  `dimNonHighlight: boolean`. The Graph applies the visual emphasis
  (orange halo on highlighted, alpha down on dimmed). Search produces;
  Graph renders.
- **`selectedId` state**: shared, not forked. Clicking a result mutates
  the same `selectedId` that graph clicks and the detail card use.

Two things explicitly **out of scope**:

- The graph itself (`d3-force` simulation, canvas rendering) — separate feature.
- Note capture form, detail card, model-loading splash — separate features.
- Persistence — there is none; notes live in memory.

---

## 9. Verification checklist

After building, run through these. All should pass:

- [ ] `Cmd+K` (Mac) / `Ctrl+K` (others) opens the panel; the input has
      focus within ~30ms.
- [ ] Clicking the topbar Search button does the same.
- [ ] `Escape` closes the panel and clears the query. If pressed when
      the panel is closed but a node is selected, it deselects the node.
- [ ] Typing `fast ai hardware` against a corpus seeded with the demo
      notes returns ≥3 results, top result clearly hardware/AI-related.
- [ ] Top result's score bar renders near 100% width; lowest visible
      result's bar is ≥15%.
- [ ] A nonsense query (e.g. `xyzzyqwerty`) renders the empty-state block,
      not just an empty list.
- [ ] With panel open and a non-empty query, non-result nodes in the graph
      visually dim. Closing the panel or clearing the query restores them.
- [ ] Rapidly typing characters does not produce stale results — the
      visible list always corresponds to the current query (cancellation).
- [ ] Searching while `modelReady === false` does nothing (no errors,
      no flicker).
- [ ] Page works offline after first model load (DevTools → Network →
      Offline → reload → search still works).
- [ ] Clicking a result selects that node — same visual effect as clicking
      it in the graph.
