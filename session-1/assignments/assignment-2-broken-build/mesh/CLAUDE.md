# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # installs deps AND runs setup (downloads model + copies wasm)
npm run setup      # re-run setup alone if public/models or public/wasm is missing
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # production build + prune-dist cleanup
npm run check      # svelte-check (type/diagnostic pass)
npm run check:seed # audit seed corpus connectivity in Node (no browser needed)
npm run check:seed -- --sweep  # print threshold sweep table to tune SIM_THRESHOLD
```

`public/models/` and `public/wasm/` are gitignored. If those directories are missing, the app will fail to load the embedder — run `npm run setup`.

## Architecture

**Svelte 5 + d3-force + in-browser ONNX embeddings.** No backend, no API calls at runtime.

### Data flow

1. On mount, `App.svelte` calls `loadEmbedder()` → warms the `@huggingface/transformers` pipeline (MiniLM-L6-v2 q8, served from `public/models/`).
2. `embedBatch(SEED_NOTES)` produces L2-normalized 384-dim `Float32Array`s for the 22 demo notes.
3. `edges` is `$derived` via `buildEdges(nodes, k=3, SIM_THRESHOLD)` — pure function, recomputes after every node change. Each node gets up to 3 edges to its nearest neighbors above the cosine threshold.
4. `Graph.svelte` receives `nodes` and `edges` as props and owns the d3-force simulation. It keeps a `simNodes: Map<id, simNode>` so positions survive Svelte re-renders.

### Key files

| File | Role |
|---|---|
| `src/App.svelte` | Model lifecycle, seed loading, note capture form, inspector |
| `src/lib/Graph.svelte` | Canvas rendering + d3-force simulation + pointer/wheel interactions |
| `src/lib/embed.js` | `loadEmbedder`, `embed`, `embedBatch`, `cosine`, `buildEdges`, `SIM_THRESHOLD` |
| `src/lib/seed.js` | `SEED_NOTES` string array |
| `src/lib/NodeCard.svelte` | Side-panel shown when a node is selected |
| `scripts/fetch-model.mjs` | Downloads model files from HuggingFace + copies ORT wasm from node_modules |
| `scripts/check-seed.mjs` | Node.js-only script to validate seed connectivity offline |

### Conventions

**Runes only.** All reactive state uses Svelte 5 runes: `$state`, `$derived`, `$derived.by`, `$effect`, `$props`. Do not introduce Svelte 4 patterns (`$:` reactive statements, `export let` props, `writable` stores, `createEventDispatcher`).

**No Svelte stores.** Component-local and app-level state lives as `$state` in the component that owns it. There is no `src/lib/stores.js`. The only cross-component communication pattern is props down / callback props up.

**Algorithm constants belong with their algorithm.** `SIM_THRESHOLD` lives in `embed.js` alongside `buildEdges`, not in the UI layer. If you add a tuning constant, put it in the module that uses it and export it.

**Components own no business logic.** `Graph.svelte` does visualization + interaction only. `NodeCard.svelte` does display only. Keep embedding, edge-building, and similarity computation in `embed.js`.

**Accent palette (v0.2).** Two accent colors are defined as tokens in `src/app.css` `:root` and must be used via `var()` — never hardcode the hue values in new CSS:
- `--accent` / `--accent-dim` — violet `oklch(0.62 0.18 295)` / `oklch(0.42 0.10 295)`. Focus rings, brand glyph, stat numerals, node-card connection bars.
- `--accent-2` / `--accent-2-dim` — lime `oklch(0.78 0.16 130)` / `oklch(0.55 0.10 130)`. Score bars, active search-result rows, score numerals.

The old `--cyan` and `--amber` token names are retired. Do not reintroduce them. Graph node canvas colors (`rgba(...)` in `Graph.svelte`) are intentionally not updated yet — that change is tracked separately.

### Graph simulation details

- d3-force mutates `simNode` objects in place (`x`, `y`, `vx`, `vy`). The `simNodes` Map in `Graph.svelte` is the authoritative position store — not Svelte state.
- Dragging a node sets `fx`/`fy` (d3-force pin idiom); releasing clears them.
- `untrack()` wraps `ensureSimulation()` and `draw()` inside `$effect` blocks to avoid circular reactive dependencies.
- `@huggingface/transformers` is excluded from Vite dep pre-bundling (`optimizeDeps.exclude`) to prevent Vite from pulling in the asyncify WASM variant instead of the runtime-loaded simd-threaded one.

### Similarity threshold

`SIM_THRESHOLD = 0.15` in `embed.js` is calibrated for MiniLM-L6-v2 cosines on the seed corpus. Run `npm run check:seed -- --sweep` to see how different thresholds affect edge count, orphans, and connected components before changing it.
