# mesh-context

Context bundle the instructor wizard surfaces during Assignment 2 — one
artifact per part, each in its own folder so the working Claude only
reads the one it's specifically pointed at.

| Folder | Used in | What it is |
|--------|---------|------------|
| `conventions/` | Part 2 | Canonical-patterns doc the student integrates into `CLAUDE.md` to resolve the planted competing patterns. |
| `search-feature/` | Part 3 | Senior-engineer spec for the semantic search feature, used to drive a plan-mode build on top of clean conventions. |
| `inbox/` | Part 4 | Fake forwarded designer email asking for a violet/lime accent refresh — the tribal-knowledge artifact. |

These files aren't auto-loaded. The student (or the wizard) points
Claude at the relevant one when its part runs. The whole point of
keeping them outside `../mesh/` is so the working Claude session in
Part 1 starts naive, and each artifact only enters context when its
lesson is due.
