# Email: accent refresh from design

> Forwarded from Maya (design lead). Paste below into Claude after the
> search feature is implemented to drive a global accent-color update —
> Claude should update `conventions.md` first, then let the change
> propagate through `app.css` and any component overrides.

---

**From:** Maya Chen &lt;maya@studio.example&gt;
**To:** John Kim &lt;john@mesh.dev&gt;
**Cc:** design-team@studio.example
**Subject:** mesh v0.2 — pulling cyan/amber, going violet + lime
**Date:** Mon, Apr 27, 2026 4:18 PM

Hey John,

Quick one — finally landing the accent refresh we talked about after the
brand sync last Wed. The cyan/amber pairing has been flagged twice now
(once by accessibility, once by Sam saying it "reads like a finance
dashboard"). Replacing both for v0.2.

**New accents:**

- **Primary accent** (was cyan — used on focus rings, brand glyph, stat
  numerals, the search input border on focus, and the connection bars in
  the node card)
  → **violet**: `oklch(0.62 0.18 295)`, dim variant `oklch(0.42 0.10 295)`

- **Secondary accent** (was amber — used on score bars, the active search
  result row, and any "score / weight" numerals)
  → **lime**: `oklch(0.78 0.16 130)`, dim variant `oklch(0.55 0.10 130)`

The neutral palette (greys, `--text`, `--line`, panel backgrounds) stays.
Just the two accents.

A few notes so nothing gets missed:

1. The score-bar gradient in the search results — keep the gradient idea,
   just remap to `linear-gradient(90deg, lime-dim, lime)`. The amber glow
   `box-shadow` underneath should also retread to the lime hue.
2. Active result row — same story, swap the amber tint for the lime tint
   on both border and background.
3. The cyan focus ring on `.search-input-wrap:focus-within` — keep the
   3px outer ring shape, just hue-shift to violet.
4. The brand glyph stays the new violet (matches the wordmark in Figma).
5. Anywhere the `.dim` helper is currently picking up the old cyan/amber
   should follow the new accent automatically — but please eyeball it,
   the dim variants I gave you above might need a half-step adjustment
   against the `oklch(0.18 ...)` panel.

Easiest path is probably just to update the design tokens at the top of
`app.css` (`--cyan`, `--cyan-dim`, `--amber`, `--amber-dim`) and let the
rest flow from there. If we end up keeping any class names referencing
the old hue ("cyan-something"), rename them to a neutral name like
`--accent` / `--accent-2` so we don't have to do this dance again next
quarter.

Not touching the graph node fill colors yet — Sam wants to spike those
separately once we've lived with the new accents for a week.

Figma: figma.com/file/REDACTED/mesh-v02-accents (latest is on the
**"v0.2 candidate B"** page — NOT candidate A, A is dead, ignore it)

Thanks!
— Maya

*p.s. if anything looks weird against the dark `oklch(0.18 …)` panel
backgrounds, ping me — I sampled against a slightly lighter chip.*

---

## How to use this file

After the search feature ships, paste this email to Claude with a prompt like:

> "Apply Maya's accent refresh (attached). First update `CLAUDE.md` so
> future code uses the new palette, then propagate the change through
> `src/app.css` and any component styles. Rename `--cyan*`/`--amber*`
> tokens to `--accent*`/`--accent-2*` as Maya suggested."

The teaching point: tribal knowledge that lives in someone's inbox is
brittle. The fix is the same loop as `conventions.md` — capture the
decision once, write it into the rules file, then mechanical changes
become one prompt instead of a hunt-and-peck across the codebase.
