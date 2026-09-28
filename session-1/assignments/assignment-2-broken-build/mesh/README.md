# Mesh — Second Brain

A Svelte 5 + d3-force port of the **Mesh** dark-workbench design from the
handoff bundle in [`design/`](./design/), with **real on-device sentence
embeddings** via `@huggingface/transformers` running `all-MiniLM-L6-v2`
entirely in the browser.

The original prototype was a single React HTML page with a hand-rolled verlet
physics loop and a toy hash-based "embedding" of curated synonym groups. This
port keeps the visuals pixel-equivalent and replaces both halves with the
real thing:

- **Physics** → `d3-force` (manyBody, link, X/Y gravity, collide)
- **Embedding** → `Xenova/all-MiniLM-L6-v2` (q8 ONNX, 23 MB, 384-dim, mean-pooled, L2-normalized)
- **Runtime** → onnxruntime-web WASM (or WebGPU when available)

Everything runs locally — no API calls, no CDN dependency at runtime.

## Run

```bash
npm install        # also runs `npm run setup` (downloads model + wasm)
npm run dev
```

Open http://localhost:5173.

First load embeds the 22 seed notes (~1-2 s on a laptop, longer on cold
WebGPU init). After that, adding a note is ~10-30 ms.

## Controls

- **Drag** a node to rearrange · empty space to pan
- **Scroll** to zoom
- **Click** a node to inspect connections
- **⌘K** open semantic search · **Esc** close panels

## Layout

```
src/
├── main.js              # mounts App.svelte
├── App.svelte           # top bar, capture, inspector, search panel, model lifecycle
├── app.css              # global styles (1:1 port of Mesh.html <style>)
└── lib/
    ├── Graph.svelte     # canvas force-directed graph (d3-force)
    ├── embed.js         # transformers.js wrapper · cosine · k-NN edge builder
    └── seed.js          # demo notes

scripts/
├── fetch-model.mjs      # downloads MiniLM + ORT wasm into public/ (postinstall)
└── prune-dist.mjs       # post-build cleanup of stale ORT wasm variants

public/
├── models/Xenova/all-MiniLM-L6-v2/   # gitignored — fetched by setup
└── wasm/                             # gitignored — copied from onnxruntime-web

design/                  # original handoff bundle (do not modify)
├── README.md
├── chats/chat1.md
└── project/             # Mesh.html, app.jsx, embed.jsx, graph.jsx, seed.jsx
```

## How connections form

Every note is encoded into a 384-dim vector by MiniLM. After any change,
`buildEdges(nodes, k=3, threshold=0.4)` recomputes the whole edge set:
each node links to its top-3 cosine-similar neighbors above 0.4.
Edge thickness/opacity scales with that similarity; `d3-force` uses it
for spring distance so semantically-related notes physically cluster.

The threshold (0.4) is calibrated for MiniLM — its cosines run hotter than
the original toy embedding's (which used 0.18). Change `SIM_THRESHOLD` in
[`App.svelte`](./src/App.svelte) to tune cluster tightness.

## Notes on the port

- `d3-force` replaces the original verlet loop:
  - `forceManyBody(-260)` ↔ original n² repulsion (`4500 / d²`)
  - `forceLink` distance/strength scale with similarity weight (matches `rest = 130 - 30·w`)
  - `forceX(0) + forceY(0)` weak gravity replaces `-p · 0.004`
  - `forceCollide(16)` is new — keeps nodes from overlapping during drag
- Rendering stays on `<canvas>`. d3-force only runs the simulation; we draw
  every tick from the simulation's `tick` event.
- Drag uses `fx`/`fy` (d3-force pinning idiom) instead of a custom `pinned` map.
- Birth pulse is wall-clock based (`performance.now()`) instead of tick count.

## Footprint

| | size |
|---|---|
| `public/models/` (MiniLM q8 + tokenizer + configs) | ~23 MB |
| `public/wasm/` (onnxruntime-web simd + jsep) | ~38 MB |
| `dist/assets/index.js` (gzipped) | ~180 KB |
| `dist/assets/index.css` (gzipped) | ~3 KB |
| Total `dist/` (production) | ~62 MB |

`public/models/` and `public/wasm/` are `.gitignore`d — `npm install`
re-fetches them via `scripts/fetch-model.mjs`.
