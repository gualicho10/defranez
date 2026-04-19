# Handoff — "top nav bar update"

## State
`web/index.html` updated locally (NOT committed): nav restructured per Figma (2356:3303) — `nav` + `.disclaimer-bar` are now two independent `position:fixed` elements (top:0 / top:70px), both with `backdrop-filter:blur(20px)`; logo now shows `EDF · Portfolio | V2` with separator span and V2 in white `rgba(255,255,255,0.8)`; full CSS restored from commit `c2bdedd` (69 missing classes recovered — lost in `d6e4714`). `web/career.html` updated: `.section-title` has explicit `font-family:'Syne'` + `font-style:normal`.

## Next
- User must verify both files visually in browser (hard refresh).
- Commit when approved: `web/index.html` + `web/career.html`.

## One-phrase synthesis
Restored all missing CSS (lost in d6e4714) from c2bdedd, fixed nav to two independent fixed elements per Figma, updated logo V2 to white/uppercase with separator, fixed career title italic — nothing committed yet.
