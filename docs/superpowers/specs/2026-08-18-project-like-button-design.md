# Project like button — design

**Date:** 2026-08-18
**Status:** Approved, not yet implemented

A floating like button inside each project modal, backed by a global per-project
counter. Visitors tap a heart; the count is shared across everyone.

## Interaction

The button is fixed to the bottom-right of the viewport while a project modal is
open, mirroring the existing close button at the top-right: same 44px box, same
`rgba(14,17,20,0.9)` background, same `rgba(255,255,255,0.1)` border, same accent
green on hover. It should read as part of the modal chrome rather than a widget
bolted on top.

| State | Appearance |
| --- | --- |
| Idle | Outlined heart in `#8a94a6`, 44px circle, **no number** |
| Hover | Heart scales to 1.14, border and glyph turn `#00f5a0` |
| Liked, total < floor | Heart filled green, pop animation, **still no number** |
| Liked, total >= floor | Heart filled green, pill expands left, number slides in |
| Re-click | Returns to idle; the pill collapses back to a circle |

The floor is **10**. Below it no number is ever shown, liked or not — a fresh
project never displays a weak count. The number shown **includes the viewer's own
like**, so liking the 9th time reveals "10".

Liking is a toggle: clicking again removes the like.

`prefers-reduced-motion: reduce` drops the pop, the ring and the width
transition; the state still changes, just without the motion.

## Frontend

**One button, not six.** A single element lives outside the modals and follows
whichever modal is open, keyed off the `data-modal` slug already on each gallery
card: `openloot`, `dipper`, `roche`, `games`, `branding`, `sketchup`. Six copies
of the markup would mean six copies of the state.

**Counts load once.** A single `get_project_likes()` call on page load fills an
in-memory map of all six totals. Opening a modal triggers no network request.

**The click is optimistic.** The UI updates immediately, then reconciles with
whatever the server returns. A visitor never waits on the network to see their
own tap register.

**Visitor identity** is a random UUID in `localStorage` under a single key. No
cookies, no fingerprinting, nothing that identifies a person. Clearing storage
lets someone like again — accepted.

## Backend

Supabase project `aqtfbzrdwbdymaoskxpt`, the same one behind the visit tracker.

### Tables

```
project_likes(id, project_slug text, visitor_id uuid, created_at timestamptz)
  unique (project_slug, visitor_id)

like_rate(ip_hash text, window_start timestamptz, n int)
  primary key (ip_hash, window_start)
```

Neither table gets a public RLS policy of any kind — no select, no insert, no
delete. This matches the lockdown applied to `visits` and `link_clicks` in August
2026 and must not be relaxed. Everything reaches the data through functions.

### Functions

Both `SECURITY DEFINER`, both callable by the anon role.

`get_project_likes()` returns `(project_slug text, total int)` for all projects
with at least one like. Public, unauthenticated, no password gate — unlike the
tracker's reporting RPCs, these totals are meant to be seen.

`toggle_project_like(p_slug text, p_visitor uuid)` returns `(total int, liked
bool)`. It inserts or deletes the visitor's row, then returns the new total and
resulting state. Callers rely on the returned total rather than computing it.

### Rate limiting

`toggle_project_like` reads the caller's IP from the request headers PostgREST
forwards, hashes it with a server-side salt, and counts calls in the current
hour window via `like_rate`. Past the cap the function returns the current total
unchanged instead of raising — the client cannot distinguish a rate-limited call
from a no-op, which gives an abuser no signal to tune against.

The IP is **only ever stored hashed**. Counting repeats needs equality, not
identity.

This stops a casual script looping the RPC with random UUIDs. It does not stop a
determined attacker with many IPs, and it is not meant to.

## Failure handling

Nothing here may break the modal.

- `toggle_project_like` fails or times out: revert the heart to its previous
  state. No error message.
- `get_project_likes()` fails on load: the button still renders and still works
  optimistically. Only the number is missing.
- `localStorage` unavailable: generate an in-memory id for the session. The like
  works but will not persist across reloads.

## Deployment note

No Supabase MCP is available, so the migration SQL must be run by hand in the
Supabase dashboard SQL editor before the frontend ships. Shipping the frontend
first would leave every call failing, which the error handling absorbs silently —
so the order matters and is easy to get wrong.

## Out of scope

- Showing like counts in the gallery, outside the modals
- Any "most liked" ordering or badge
- Surfacing likes in `web_tracker.html`
- Mobile layout for the button — the case study itself has no mobile design yet
