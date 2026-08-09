# Graph Report - defranez  (2026-07-13)

## Corpus Check
- 5 files · ~33,581 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 57 nodes · 64 edges · 9 communities (6 shown, 3 thin omitted)
- Extraction: 77% EXTRACTED · 22% INFERRED · 2% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `363cf6df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Skill/Tool Icon Set
- Design System Tokens
- Mobile V2 Arcade Redesign
- Arcade Mini-Games
- Supabase Visit Tracking
- Scroll Animations
- Modal System
- Graphify Workflow
- Hero Intro Animation Example — Design

## God Nodes (most connected - your core abstractions)
1. `Defranez Design System v2` - 10 edges
2. `Shared --fill-0 CSS Variable Theming` - 9 edges
3. `Hero Intro Animation Example — Design` - 7 edges
4. `Career Timeline Page` - 6 edges
5. `Arcade Game State and Unlock Flow` - 6 edges
6. `EDF Arcade Hub (Mobile V2 Prototype)` - 4 edges
7. `Figma Icon` - 4 edges
8. `V2 Mobile Game Session Record` - 3 edges
9. `Arcade Hub (Nav-as-Minigame) Concept` - 3 edges
10. `Swipeable Portfolio Card Deck (mobile)` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Resume PDF 2026 (Downloadable CV)` --conceptually_related_to--> `Career Timeline Page`  [INFERRED]
  img/resume_EdeFco_2026.pdf → career.html
- `EDF Arcade Hub (Mobile V2 Prototype)` --semantically_similar_to--> `Career Timeline Page`  [INFERRED] [semantically similar]
  test.html → career.html
- `Web Tracker Dashboard` --implements--> `Defranez Design System v2`  [INFERRED]
  web_tracker.html → DesignSystem.html
- `Skill Bar Column-Order Animation (v1)` --semantically_similar_to--> `animateSkillBars (arcade tools reveal)`  [INFERRED] [semantically similar]
  v1.html → test.html
- `EDF Arcade Hub (Mobile V2 Prototype)` --implements--> `Defranez Design System v2`  [INFERRED]
  test.html → DesignSystem.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Arcade Mini-Game Unlock Flow** — test_game_state, test_knock_game, test_match_game, test_snake_game, test_beats_game, test_tune_game, memory_project_v2_mobile_game_minigame_difficulty_curve [INFERRED 0.85]
- **Adobe Creative Cloud Tool Icons** — img_icon_ae_after_effects, img_icon_ai_illustrator, img_icon_pr_premiere_pro, img_icon_ps_photoshop [INFERRED 0.85]
- **Portfolio Skills/Tools Icon Set (uniform monochrome Figma-exported SVGs)** — img_icon_ableton_ableton_live, img_icon_ae_after_effects, img_icon_ai_illustrator, img_icon_asana_asana, img_icon_claude_claude, img_icon_figma_figma, img_icon_pr_premiere_pro, img_icon_ps_photoshop, img_icon_sketchup_sketchup [INFERRED 0.95]

## Communities (9 total, 3 thin omitted)

### Community 0 - "Skill/Tool Icon Set"
Cohesion: 0.36
Nodes (10): Ableton Live Icon, Adobe After Effects Icon, Adobe Illustrator Icon, Asana Icon, Claude AI Icon, Figma Icon, Shared --fill-0 CSS Variable Theming, Adobe Premiere Pro Icon (+2 more)

### Community 1 - "Design System Tokens"
Cohesion: 0.16
Nodes (14): Big Time Studios / OpenLoot (Employer), Fade-Up IntersectionObserver (career), FADU/UBA Graphic Design Degree, Career Timeline Page, Color Tokens (Mint on Near-Black), Component Library (Sharp / Hairline / Flat), Defranez Design System v2, Unicode Iconography in Mono (+6 more)

### Community 3 - "Mobile V2 Arcade Redesign"
Cohesion: 0.25
Nodes (9): Arcade Hub (Nav-as-Minigame) Concept, Mini-Game Difficulty Curve, V2 Mobile Game Session Record, animateSkillBars (arcade tools reveal), EDF Arcade Hub (Mobile V2 Prototype), Mode Chooser (Fun / Boring), Swipeable Portfolio Card Deck (mobile), v1 Mobile Scroll-Snap Carousel (88vw cards) (+1 more)

### Community 4 - "Arcade Mini-Games"
Cohesion: 0.33
Nodes (7): Beats Note-Math Game (Career), Arcade Game State and Unlock Flow, Knock Rhythm Game (About), Match Pairs Game (Tools), Snake Game (Portfolio), Tune Missing-Note Game (Contact), Web Audio Beep Helper

### Community 5 - "Supabase Visit Tracking"
Cohesion: 0.33
Nodes (6): Supabase Visit Tracker (v1), Web Tracker Dashboard, loadData (Supabase fetch), Password Gate (checkPass/logout), renderAll (dashboard render), Supabase Tracking Backend (visits, link_clicks)

### Community 11 - "Hero Intro Animation Example — Design"
Cohesion: 0.25
Nodes (7): Animation, Content, File, Hero Intro Animation Example — Design, Out of scope, Purpose, Visuals

## Ambiguous Edges - Review These
- `Arcade Hub (Nav-as-Minigame) Concept` → `Mode Chooser (Fun / Boring)`  [AMBIGUOUS]
  test.html · relation: conceptually_related_to

## Knowledge Gaps
- **22 isolated node(s):** `Purpose`, `File`, `Content`, `Visuals`, `Animation` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Arcade Hub (Nav-as-Minigame) Concept` and `Mode Chooser (Fun / Boring)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Defranez Design System v2` connect `Design System Tokens` to `Mobile V2 Arcade Redesign`, `Supabase Visit Tracking`?**
  _High betweenness centrality (0.236) - this node is a cross-community bridge._
- **Why does `EDF Arcade Hub (Mobile V2 Prototype)` connect `Mobile V2 Arcade Redesign` to `Design System Tokens`?**
  _High betweenness centrality (0.202) - this node is a cross-community bridge._
- **Why does `Arcade Game State and Unlock Flow` connect `Arcade Mini-Games` to `Mobile V2 Arcade Redesign`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Defranez Design System v2` (e.g. with `Career Timeline Page` and `EDF Arcade Hub (Mobile V2 Prototype)`) actually correct?**
  _`Defranez Design System v2` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Career Timeline Page` (e.g. with `Defranez Design System v2` and `Resume PDF 2026 (Downloadable CV)`) actually correct?**
  _`Career Timeline Page` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Purpose`, `File`, `Content` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._