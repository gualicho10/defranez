# Graph Report - defranez  (2026-07-13)

## Corpus Check
- 5 files · ~31,647 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 72 nodes · 91 edges · 12 communities (9 shown, 3 thin omitted)
- Extraction: 75% EXTRACTED · 24% INFERRED · 1% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da79dbee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Skill/Tool Icon Set
- Design System Tokens
- Portfolio Case Studies
- Mobile V2 Arcade Redesign
- Arcade Mini-Games
- Supabase Visit Tracking
- Career & OpenLoot Timeline
- Scroll Animations
- Hero Dot-Field
- Modal System
- Graphify Workflow
- Hero Intro Animation Example — Design

## God Nodes (most connected - your core abstractions)
1. `Portfolio v2 (Main Page)` - 17 edges
2. `Defranez Design System v2` - 11 edges
3. `Shared --fill-0 CSS Variable Theming` - 9 edges
4. `Hero Intro Animation Example — Design` - 7 edges
5. `Career Timeline Page` - 7 edges
6. `Arcade Game State and Unlock Flow` - 6 edges
7. `EDF Arcade Hub (Mobile V2 Prototype)` - 4 edges
8. `Portfolio v1 (Legacy Page)` - 4 edges
9. `Resume PDF 2026 (Downloadable CV)` - 4 edges
10. `Figma Icon` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Resume PDF 2026 (Downloadable CV)` --conceptually_related_to--> `Career Timeline Page`  [INFERRED]
  img/resume_EdeFco_2026.pdf → career.html
- `EDF Arcade Hub (Mobile V2 Prototype)` --semantically_similar_to--> `Career Timeline Page`  [INFERRED] [semantically similar]
  test.html → career.html
- `Web Tracker Dashboard` --implements--> `Defranez Design System v2`  [INFERRED]
  web_tracker.html → DesignSystem.html
- `Fade-Up IntersectionObserver (career)` --semantically_similar_to--> `Scroll-Triggered Animations (counters, gauges, chart)`  [INFERRED] [semantically similar]
  career.html → index.html
- `Supabase Visit Tracker (v2)` --semantically_similar_to--> `Supabase Visit Tracker (v1)`  [INFERRED] [semantically similar]
  index.html → v1.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Arcade Mini-Game Unlock Flow** — test_game_state, test_knock_game, test_match_game, test_snake_game, test_beats_game, test_tune_game, memory_project_v2_mobile_game_minigame_difficulty_curve [INFERRED 0.85]
- **Shared Mint-on-Dark Design Language** — designsystem_design_system_v2, index_portfolio_v2, v1_portfolio_v1, career_work_experience_timeline, web_tracker_dashboard, test_arcade_hub [INFERRED 0.95]
- **Supabase Visit Tracking Pipeline** — index_visit_tracker, v1_visit_tracker, web_tracker_supabase_backend, web_tracker_load_data, web_tracker_dashboard [EXTRACTED 1.00]
- **Adobe Creative Cloud Tool Icons** — img_icon_ae_after_effects, img_icon_ai_illustrator, img_icon_pr_premiere_pro, img_icon_ps_photoshop [INFERRED 0.85]
- **Portfolio Skills/Tools Icon Set (uniform monochrome Figma-exported SVGs)** — img_icon_ableton_ableton_live, img_icon_ae_after_effects, img_icon_ai_illustrator, img_icon_asana_asana, img_icon_claude_claude, img_icon_figma_figma, img_icon_pr_premiere_pro, img_icon_ps_photoshop, img_icon_sketchup_sketchup [INFERRED 0.95]

## Communities (12 total, 3 thin omitted)

### Community 0 - "Skill/Tool Icon Set"
Cohesion: 0.36
Nodes (10): Ableton Live Icon, Adobe After Effects Icon, Adobe Illustrator Icon, Asana Icon, Claude AI Icon, Figma Icon, Shared --fill-0 CSS Variable Theming, Adobe Premiere Pro Icon (+2 more)

### Community 1 - "Design System Tokens"
Cohesion: 0.25
Nodes (9): Color Tokens (Mint on Near-Black), Component Library (Sharp / Hairline / Flat), Defranez Design System v2, Unicode Iconography in Mono, Motion Tokens (Gentle, Never Bouncy), Space-Rail Builder Script, Spacing Scale and Breakpoints, Two-Face Type System (Syne + DM Mono) (+1 more)

### Community 2 - "Portfolio Case Studies"
Cohesion: 0.25
Nodes (9): Resume PDF 2026 (Downloadable CV), Branding + Social Case Study, Ezequiel De Francisco (Person), Mobile Games Case Study (Disney/Globant), Our Dipper Case Study, Portfolio Sticky-Sync Scroll Nav, Portfolio v2 (Main Page), Roche Congress Case Study (+1 more)

### Community 3 - "Mobile V2 Arcade Redesign"
Cohesion: 0.22
Nodes (10): Arcade Hub (Nav-as-Minigame) Concept, Mini-Game Difficulty Curve, V2 Mobile Game Session Record, animateSkillBars (arcade tools reveal), EDF Arcade Hub (Mobile V2 Prototype), Mode Chooser (Fun / Boring), Swipeable Portfolio Card Deck (mobile), Snake Game (Portfolio) (+2 more)

### Community 4 - "Arcade Mini-Games"
Cohesion: 0.38
Nodes (7): Jazz Guitarist Identity, Beats Note-Math Game (Career), Arcade Game State and Unlock Flow, Knock Rhythm Game (About), Match Pairs Game (Tools), Tune Missing-Note Game (Contact), Web Audio Beep Helper

### Community 5 - "Supabase Visit Tracking"
Cohesion: 0.33
Nodes (7): Supabase Visit Tracker (v2), Supabase Visit Tracker (v1), Web Tracker Dashboard, loadData (Supabase fetch), Password Gate (checkPass/logout), renderAll (dashboard render), Supabase Tracking Backend (visits, link_clicks)

### Community 6 - "Career & OpenLoot Timeline"
Cohesion: 0.50
Nodes (4): Big Time Studios / OpenLoot (Employer), FADU/UBA Graphic Design Degree, Career Timeline Page, OpenLoot Case Study

### Community 7 - "Scroll Animations"
Cohesion: 0.67
Nodes (3): Fade-Up IntersectionObserver (career), Scroll-Triggered Animations (counters, gauges, chart), Portfolio Card Staggered Reveal (v1)

### Community 11 - "Hero Intro Animation Example — Design"
Cohesion: 0.25
Nodes (7): Animation, Content, File, Hero Intro Animation Example — Design, Out of scope, Purpose, Visuals

## Ambiguous Edges - Review These
- `Arcade Hub (Nav-as-Minigame) Concept` → `Mode Chooser (Fun / Boring)`  [AMBIGUOUS]
  test.html · relation: conceptually_related_to

## Knowledge Gaps
- **25 isolated node(s):** `Purpose`, `File`, `Content`, `Visuals`, `Animation` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Arcade Hub (Nav-as-Minigame) Concept` and `Mode Chooser (Fun / Boring)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Portfolio v2 (Main Page)` connect `Portfolio Case Studies` to `Design System Tokens`, `Arcade Mini-Games`, `Supabase Visit Tracking`, `Career & OpenLoot Timeline`, `Scroll Animations`, `Hero Dot-Field`, `Modal System`?**
  _High betweenness centrality (0.341) - this node is a cross-community bridge._
- **Why does `Defranez Design System v2` connect `Design System Tokens` to `Portfolio Case Studies`, `Mobile V2 Arcade Redesign`, `Supabase Visit Tracking`, `Career & OpenLoot Timeline`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Why does `Jazz Guitarist Identity` connect `Arcade Mini-Games` to `Portfolio Case Studies`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Defranez Design System v2` (e.g. with `Career Timeline Page` and `EDF Arcade Hub (Mobile V2 Prototype)`) actually correct?**
  _`Defranez Design System v2` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Career Timeline Page` (e.g. with `Defranez Design System v2` and `Resume PDF 2026 (Downloadable CV)`) actually correct?**
  _`Career Timeline Page` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Purpose`, `File`, `Content` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._