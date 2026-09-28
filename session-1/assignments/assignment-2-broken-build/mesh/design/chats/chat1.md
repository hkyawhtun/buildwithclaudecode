# Mind Map Workbench

_Started 2026-05-04 18:49 UTC_

---

## User



## Assistant

I'll build a hi-fi interactive prototype of "Second Brain" — a mind-map app for capturing thoughts, visualizing semantic connections, and searching by meaning. Let me ask a few quick questions to focus the direction.

_[tool: questions_v2]_

## User

Questions answered:
- aesthetic: Dark workbench (deep ink, glowing nodes)
- primary_screen: Mind map first (graph fills viewport, capture is a small bar)
- node_label: First few words only
- graph_style: 3
- search_ux: i like the resule side panel and higlighting matching nodes
- seed_data: Decide for me
- interactions: Adding a note + watching it animate into the graph, Clicking a node to see content + connections, Searching semantically, All three equally
- extras: Subtle physics simulation on graph
- fidelity: One polished prototype

## Assistant

_[tool: update_todos]_

Design system:

- **Aesthetic**: Dark workbench. Deep ink background `oklch(0.18 0.015 250)`, panel `oklch(0.22 0.018 250)`, hairlines `oklch(0.32 0.02 250)`, text `oklch(0.92 0.01 250)`, dim text `oklch(0.62 0.015 250)`.
- **Glow accent**: cyan `oklch(0.82 0.13 200)` for active nodes / focus; warm amber `oklch(0.78 0.13 75)` for search matches.
- **Type**: Inter for UI, JetBrains Mono for metadata/IDs. (Avoiding Inter? — system says avoid overused fonts. Switching to **Söhne-style fallback**: I'll use **Geist** + **Geist Mono** from Google Fonts.)
- **Graph**: ringed circles (option 3) — outer hairline ring + small filled core; edges are thin lines whose opacity scales with similarity.
- **Layout**: graph fills viewport. Capture bar floats bottom-center. Search trigger top-right; opens a right-side panel that dims/desaturates non-matching nodes and highlights matches with a warm glow.
- **Physics**: live force simulation (verlet-ish) — repulsion between nodes, spring along edges, mild center gravity, drag to pin.

Let me build it.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Built **Mesh** — a dark-workbench second brain.

- **Graph-first canvas** with live force simulation (repulsion + similarity-weighted springs + center gravity). Drag nodes, scroll to zoom, pan empty space.
- **Capture bar** floats bottom-center; new notes pulse into the graph and auto-connect to their top-3 semantic neighbors.
- **Semantic search panel** (⌘K) slides in from the right, dims the rest of the graph, and glows matching nodes in amber while showing a ranked list with similarity bars.
- **Inspector card** (bottom-left) when you click a node — shows content + connections sorted by strength.
- Seeded with the PRD demo trio plus ~20 more notes across AI, hardware, design, and craft so the graph reads as a real second brain on load.

Try the demo: search **"fast ai hardware"** — TPUs, matmul, and NN-speed light up together.

