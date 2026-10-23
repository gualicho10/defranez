# tools/3d — SketchUp exports → `models/casa.stages.glb`

See `docs/2026-10-22-3d-to-web.md` for the full story.

- `build5.mjs` — the build (tag-driven grouping, fixes, optimisation). Reads the SimLab exports from `PORTFOLIO/WEB_EZE/3D/` and `~/Desktop/casa-tags.json`.
- `conv.mjs` — spec/gloss → metal/rough without darkening; `fixNormals()` for inverted normals.
- `stages.js` → `stage_map.json` (which stage export each piece first appears in); `diff.js` → `missing_in_07.json` (pieces only in the full export).
- `origs.mjs` — writes the "original" comparison files for the review tool (`review/_orig/`).

`npm install && node build5.mjs`
