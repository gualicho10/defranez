---
name: V2 Mobile Game Session
description: Session where v2 mobile was redesigned as an arcade-hub game experience (nav-as-minigame). Prototype lives in web/test.html
type: project
---
V2 Mobile Game session — 2026-04-18. Session name: "v2 Mobile game".

**Problem:** V2 mobile had too many responsive errors. User wanted a fresh approach.

**Solution:** Mobile (≤560px only) becomes an arcade hub. Landing = retro menu with 5 section tiles. Tap tile → themed mini-game overlay → complete → scrolls to that section. Portfolio gets new swipeable card deck (not the v2 desktop grid).

**Decisions locked:**
- Breakpoint: ≤560px only. Tablet stays desktop-like/responsive.
- Game role: Hub on landing, mini-game gates each section's reveal.
- Different mini-game per section, increasing difficulty: About (easiest) → Portfolio (hardest).
- Mandatory — no "skip game" escape hatch on mobile.
- Staging file: `web/test.html` (renamed from `Test-animations.html`).

**Mini-games (difficulty curve):**
- About → "Knock" (tap 3x rhythm)
- Tools → "Match" (flip 4 cards, 2 pairs)
- Portfolio → "Snake" (Nokia-style, eat 6 project pellets)
- Career → "Timeline Hop" (drag pin across checkpoints)
- Contact → "Dial" (tap digit sequence)

**Portfolio mobile render once unlocked:** swipeable full-bleed card deck, 6 cards, story/tinder hybrid. Replaces the grid at ≤560px.

**How to apply:** If v1's mobile carousel is being referenced as "better than v2", user means the scroll-snap 88vw cards in v1. Consider that pattern as fallback/inspiration for the portfolio deck.

**Why:** User's ask was creative + token-optimized: "I allow you to work on this" + "don't babysit." Autonomous design/build authorized for this session.
