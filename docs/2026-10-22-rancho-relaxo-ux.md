# Rancho Relaxo · scroll story UX

Spec for turning `casa.html` into a scrollytelling piece: still render keyframes (image + copy) alternate with the live 3D.
Prototype of the rhythm, layout and copy: `casa-ux.html` (no three.js; 3D segments are placeholders). Open `casa-ux.html?dev` to see scene id and progress.

## Decisions

- Public name **Rancho Relaxo**, year **2026**, location Epuyén, Chubut, Patagonia, Argentina. "Pacho" never appears in public copy.
- Copy in English, taken from the Figma frame "Portfolio Modelado + Render" (file `CrtBFn6cPjOcBAVQ5qPdm2`, node `1:71`; Results `3000:1315`). Interior captions are drafts to iterate (the user may redo them in Figma).
- Type: **Jost** (200/300/400/600), the same fallback the portfolio uses for Figma's ITC Avant Garde. Labels `_ 02 Modeling` are Jost 600 uppercase in the accent green; titles Jost 300; outlined section numerals (01–03) above the label, as in Figma.
- Everything is driven by scroll position, nothing by time: scrolling back un-builds a scene exactly as it was built.

## Sequence

| # | Scene | Kind | Scroll (vh) | Copy |
|---|---|---|---|---|
| 1 | Plan on the desk | render `01-plano` | 420 | 3 beats: title + meta → Introduction → **01 Project**. During beat 3 the image zooms into the floor plan (top-left drawing of the sheet) |
| 2 | Stage 1, assembly | 3D | 300 | **02 Modeling**, then short captions of the build steps |
| 3 | Exterior | render `02-exterior` | 300 | **03 Renders** |
| 4 | Into the house | 3D | 110 | `_ Ground floor` · Inside |
| 5 | Kitchen & living | render `03-cocina-living` | 260 | draft |
| 6 | Window to the range | render `04-ventanal` | 260 | draft |
| 7 | To bedroom and bath | 3D | 110 | caption |
| 8 | Bedroom | render `05-cuarto` | 240 | draft |
| 9 | Bathroom | render `06-bano` | 240 | draft |
| 10 | Up the stair | 3D | 140 | caption |
| 11 | Mezzanine 1 | render `07-entrepiso1` | 240 | draft |
| 12 | Mezzanine 2 | render `08-entrepiso2` | 240 | draft |
| 13 | Laptop | 3D | 150 | `_ Workspace` |
| — | **04 Results** | page flow | — | Figma text + construction photo grid (`assets/casa/obra/`, 13 photos) |

Figma has a duplicate Results block numbered 05; the story uses one Results section.

## Anatomy of a render keyframe

Local progress `u` = 0…1 over the scene's scroll length.

1. **Cross-fade in** over 38 vh centred on the boundary with the previous scene. In the real piece the previous scene is the 3D, already sitting on the calibrated camera (`assets/casa/cameras.json`), so the dissolve reads as the 3D turning into the render.
2. **Settle**: the render starts at 105 % and settles to 100 % over `u` 0…0.16.
3. **Copy**: enters at `u` ≈ 0.14 (label, title, body, chips staggered by ~1.2 % of `u` each), rises 28 px while fading in; leaves at `u` ≈ 0.9.
4. **Hold**: slow drift (scale +2.5 %, vertical parallax ±1.1 %) so the still feels alive.
5. **Cross-fade out** into the next scene.

Copy side per render (to keep the subject clear): left for plan, exterior, kitchen, bathroom, mezzanine 1; right for window, bedroom, mezzanine 2. A gradient darkens only that side plus the bottom.

Mobile (≤ 760 px): copy always bottom-left over a bottom gradient; numerals shrink to 76 px; each render has a focal point (`fx`/`fy` → `object-position`) so the portrait crop keeps the subject; renders load the `-m` (1280 px) files.

## Plan → 3D transition (scene 1 → 2)

1. Plan on the desk (render).
2. Zoom into the floor plan drawing (done in the prototype as an image zoom).
3. Swap to the vector plan: the floor-plan drawing laid on the ground plane at real scale in the 3D scene, camera straight above; desk dissolves into terrain and grass.
4. The wall lines extrude upward and hand over to the approved assembly order (slab, columns, mezzanine…).

Floor plan: `assets/casa/planta.svg` (from the single-drawing `Plano Planta.pdf`, script `tools/3d/plan-to-svg.py`), layers `walls`, `columns`, `posts`, `cladding`, `furniture`/`detail`, `dims`, `marks`, `fills`. Dimension lines are kept out of `walls` (the ones drawn with the wall pen are detected by the number sitting on them).

- Plan → model mapping in `assets/casa/planta.json` → `toModel`: `x = x.offset + x.perPt·py`, `z = z.offset + z.perPt·px`. Fitted on the columns that plan and model share; residuals 0.5–1.6 cm.
- Build order of the extrusion: columns first, then walls. The plan stays on the ground as the flat drawing; what rises are the model's own column and wall pieces, landing exactly on their lines.
- Model fixes from the plan check (tools/3d/build5.mjs): the kitchen bar and stair versions 2/3 are dropped (discarded in the design); the column by the living-room window, missing in SketchUp, is added as a copy of its back-wall twin. The bar and its stools are also removed from the plan SVG.
- The model is newer than the plan and wins: the plan's column on the kitchen's outer wall is removed from the SVG, and the model's column next to the stair is drawn into it (`ADD_COLUMNS` in the script). Every column now has its square. Kitchen-block columns stay 7–16 cm off the drawing (left as built). Review editor → **Planta** lays the plan over the 3D.

## Integration notes for casa.html

- Keyframe cameras: `assets/casa/cameras.json` holds `p`, `q` (look-at), vertical `fov` and the render `aspect` they were matched at. With `object-fit: cover`, if the viewport is wider than the render the image is cropped top/bottom, so the 3D needs `fov' = 2·atan(tan(fov/2) · renderAspect / viewAspect)`; if narrower, keep `fov`.
- The keyframe camera must be reached and held still before the dissolve starts (the camera eases toward `cameraIdeal`, so give it a short dwell at the pose).
- Pause rendering of the 3D while a render covers the screen fully (battery on iPhone).
- Replace the old `CAPTIONS` / `#cap` styles with this copy system; keep the progress bar and counter.
- Results replaces the current case-study content after the laptop.

## Open

- Final interior copy (drafts in the prototype).
- Construction photos are 742–1494 px exports from Figma; re-export at 2× for sharper large tiles. The dense grid reorders photos; if chronology matters, give them an explicit order.
- Align the plan SVG to the model (see above).
- iPhone test of the whole piece.

## Keyframe transition: projection test (`casa.html?kf`, `casa-kf.js`)

Replaces the cross-fade (rejected). The render is projected onto the model from its calibrated camera, as a last post-processing pass:

- At the pose the screen is the render, untouched (no grade or vignette on top).
- Moving away, the image stays on walls and furniture with real parallax: the hold drifts the camera a little, so the still is never flat. Depth comes from the model itself, no AI depth maps.
- Occlusion: a depth map from the projector; what the render never saw shows the 3D.
- Everything outside the house (terrain, deck, landscape…) and glass is left out of the depth, so the render's view through a window counts as far away.
- Hand-over: a front sweeping through depth (near first, the room, then the view outside), with a slight grain on its edge. No double image.
- Known limits: where the render and the model differ (AI-added furniture, a different landscape outside) the sweep shows the swap; closer to a window than the render was, its view runs out and the 3D panorama shows at the edge for a moment.
- `?kf=<id>` loads another keyframe; only `04-ventanal` has a tuned path so far.
- Next: 5-second loops as the projected source (a video texture instead of the still, same framing, static camera).

## AI video from the 3D (22/10 evening)

Approach changed: instead of matching the still renders, the 3D walkthrough itself goes through an AI video-to-video pass (Wan 2.2 v2v on fal, strength to be chosen on a 5 s test), like the SketchUp → AI stills. Three parts: (1) plan → assembly stays live 3D; (2) finished exterior, aerial down to the glazing; (3) interior, door → mezzanine desk.

- Review videos (3D, day, every lamp on): `review/guide/ext4/ext4-3d.mp4` (6 s), `review/guide/int4/int4-3d.mp4` (46 s). Rendered with `casa-guide.js` → `renderPath()` on `casa.html?review&lamps=all`.
- HDRI: Poly Haven's Alps Field (the user's own 360 was tried with `tools/3d/make-site-hdri.py` and rejected). `tools/3d/make-hdri-from-hdr.py` turns it so its sun (42° up) sits on the scene's sun and writes `assets/casa/site-pano-4k.jpg`, `-2k.jpg`, `site-env.hdr`; the sun light in casa.html is at 42° to match. The sky appears with the landscape at the end of the assembly (maquette → real site) and the fog lifts with it.
- Model and page fixes from the review notes: Enscape helper lights dropped, bedside/floor lamps and the bath globe as soft warm omni lights inside their shades, mezzanine sconce light inside its cone; window glass rough (the camera fill light left a hot spot), exterior lamp bulbs hidden from inside; roof sheets (`chapas`) enter with the roof; cabinet roofs come down last; mezzanine floor boards moved from `base` to `entrepiso`; bedroom tile block dropped; one gravel for every path; daylight interiors brighter and warmer.

- Second light pass: every Enscape helper with no lamp around it dropped (interior 27 → 16 lights); ambient (omni) lamps have no visible bulb; the stair sconce's light sits at its cone rim like its siblings.

## Exterior decision (22/10, night)

- The exterior stays a **maquette** (no AI pass): the v2v test (`review/guide/ext4/v2v/comparacion.mp4`, strengths 0.45/0.6/0.75) invented things at every strength (solar panels → skylight, sphere tree → box, deck furniture, new cladding). Cartoon trees stay.
- HDRI backdrops (own 360 and Alps Field) dropped; back to the page background + fog outside and the site photo only through the windows. Their outputs were deleted; the scripts stay in tools/3d for reference.
- Ground: one grass and one gravel in world-space UVs (no seams or tone changes between terrain, lawn and far paths) and a 1.4 km grass field under the terrain so its edge never shows; the fog fades it into the page.
- Interior decision: stays 3D (no AI video either), with the render keyframes as pauses.

## Render keyframes in casa.html (22/10, night)

- The timeline (`KEYS`) now passes through the seven calibrated cameras (`KF` table in casa.html, copied from assets/casa/cameras.json): `KFK(id, dt)` adds the pose plus a hold of 5 units. The assembly orbit ends on the exterior render's camera; P2–P7 / M1–M2 / E1 stops were replaced; extra steps keep the camera clear of the dining pendant and take it through the bathroom door at door height (`__checkPath()` → 0 crossings).
- Each keyframe: the render is wiped in left → right with a thin accent line as the camera settles, the copy rises in, then both go back out; all tied to the timeline, so scrolling back undoes it. fov is corrected for "cover" on wider screens.
- Whole walkthrough is daylight now (`T_NIGHT` past the end), like the renders; captions only on the 3D stretches between renders.
- Backup of the page before this change: models/_bak-1022/casa.pre-keyframes.html.
