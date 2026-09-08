# Graph Report - defranez  (2026-08-28)

## Corpus Check
- 7 files · ~52,476 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 32 nodes · 32 edges · 7 communities (4 shown, 3 thin omitted)
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83e26a6b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Skill/Tool Icon Set
- Design System Tokens
- V2 Mobile Game Session Record
- Mobile V2 Arcade Redesign
- Supabase Visit Tracking
- Graphify Workflow
- Hero Intro Animation Example — Design

## God Nodes (most connected - your core abstractions)
1. `Shared --fill-0 CSS Variable Theming` - 9 edges
2. `Hero Intro Animation Example — Design` - 7 edges
3. `Career Timeline Page` - 4 edges
4. `Figma Icon` - 4 edges
5. `loadData (Supabase fetch)` - 3 edges
6. `Adobe Illustrator Icon` - 3 edges
7. `Adobe Premiere Pro Icon` - 3 edges
8. `Adobe Photoshop Icon` - 3 edges
9. `Password Gate (checkPass/logout)` - 2 edges
10. `Ableton Live Icon` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Resume PDF 2026 (Downloadable CV)` --conceptually_related_to--> `Career Timeline Page`  [INFERRED]
  img/resume_EdeFco_2026.pdf → career.html
- `Figma Icon` --semantically_similar_to--> `Adobe Illustrator Icon`  [INFERRED] [semantically similar]
  img/icon-figma.svg → img/icon-ai.svg
- `Figma Icon` --semantically_similar_to--> `Adobe Photoshop Icon`  [INFERRED] [semantically similar]
  img/icon-figma.svg → img/icon-ps.svg
- `Ableton Live Icon` --implements--> `Shared --fill-0 CSS Variable Theming`  [EXTRACTED]
  img/icon-ableton.svg → img/icon-figma.svg
- `Ableton Live Icon` --conceptually_related_to--> `Adobe Premiere Pro Icon`  [INFERRED]
  img/icon-ableton.svg → img/icon-pr.svg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Adobe Creative Cloud Tool Icons** — img_icon_ae_after_effects, img_icon_ai_illustrator, img_icon_pr_premiere_pro, img_icon_ps_photoshop [INFERRED 0.85]
- **Portfolio Skills/Tools Icon Set (uniform monochrome Figma-exported SVGs)** — img_icon_ableton_ableton_live, img_icon_ae_after_effects, img_icon_ai_illustrator, img_icon_asana_asana, img_icon_claude_claude, img_icon_figma_figma, img_icon_pr_premiere_pro, img_icon_ps_photoshop, img_icon_sketchup_sketchup [INFERRED 0.95]

## Communities (7 total, 3 thin omitted)

### Community 0 - "Skill/Tool Icon Set"
Cohesion: 0.36
Nodes (10): Ableton Live Icon, Adobe After Effects Icon, Adobe Illustrator Icon, Asana Icon, Claude AI Icon, Figma Icon, Shared --fill-0 CSS Variable Theming, Adobe Premiere Pro Icon (+2 more)

### Community 1 - "Design System Tokens"
Cohesion: 0.40
Nodes (5): Big Time Studios / OpenLoot (Employer), Fade-Up IntersectionObserver (career), FADU/UBA Graphic Design Degree, Career Timeline Page, Resume PDF 2026 (Downloadable CV)

### Community 5 - "Supabase Visit Tracking"
Cohesion: 0.40
Nodes (5): Web Tracker Dashboard, loadData (Supabase fetch), Password Gate (checkPass/logout), renderAll (dashboard render), Supabase Tracking Backend (visits, link_clicks)

### Community 11 - "Hero Intro Animation Example — Design"
Cohesion: 0.25
Nodes (7): Animation, Content, File, Hero Intro Animation Example — Design, Out of scope, Purpose, Visuals

## Knowledge Gaps
- **15 isolated node(s):** `Purpose`, `File`, `Content`, `Visuals`, `Animation` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 3 inferred relationships involving `Figma Icon` (e.g. with `Adobe Illustrator Icon` and `Adobe Photoshop Icon`) actually correct?**
  _`Figma Icon` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Purpose`, `File`, `Content` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._