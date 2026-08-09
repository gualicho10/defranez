# Hero Intro Animation Example — Design

## Purpose
Add a standalone reference page demonstrating a GSAP word-mask + staggered
fade-in entrance animation, adapted from `hero-intro-demo.html`, on-brand
with defranez.com's real hero content. Not wired into the live site.

## File
`defranez/examples/hero-intro.html` — single self-contained HTML file
(own `<style>`/`<script>`), no build step, opened directly in a browser.

## Content
Reuses copy and structure from the live hero in `index.html`:
- Eyebrow: "Product Designer · UX/UI · Web3"
- Name: "Ezequiel" / "de Francisco" (word-mask reveal, gradient on second line)
- Title: the existing 22-years description line (word-mask reveal)
- Trusted-by row: OpenLoot, Roche, Globant, Disney, DreamWorks (fade-up)
- CTAs: "View my work" (primary) / "Download CV" (secondary) — `href="#"`
  placeholders since this page isn't wired to the real site anchors
- Replay button (kept, since this is a technique reference, not production UI)

## Visuals
- Background: `../img/hero-bg.jpg` + the interactive dot-field `<canvas>`,
  ported verbatim from `index.html`'s existing script (mouse wake / scroll
  vanish behavior), including the `hero-bg::after` gradient overlay.
- Fonts: Syne (name/title), DM Mono (eyebrow/CTAs) — same Google Fonts
  import defranez.com already uses.
- Colors: `#080a0c` base, `#00f5a0`→`#00c7ff` gradient, `#8a94a6` muted text
  — pulled from `index.html`'s existing hero CSS values, not re-derived.
- Word-mask technique: `.word` (overflow hidden) wrapping `.word-inner`
  (`translateY(115%)` at rest), same as the demo.

## Animation
GSAP 3 (CDN, matching the demo's version) timeline, `power4.out` easing:
1. Eyebrow fades + slides up
2. Name word-masks reveal, staggered
3. Title word-masks reveal, staggered (overlaps tail of name reveal)
4. Trusted-by row fades + slides up
5. CTAs fade + slide up

`prefers-reduced-motion: reduce` skips the timeline and sets all elements
to their end state immediately (matches demo behavior); replay button is
hidden in that case too.

## Out of scope
- No changes to `index.html` or the live hero.
- No new dependency added to the main site — GSAP is loaded only within
  this standalone example file.
