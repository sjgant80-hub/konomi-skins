# Konomi Skins

**Live:** https://sjgant80-hub.github.io/konomi-skins/

Sovereign UX — the same build wears any face. **Konomi** produces the STRUCTURE (a skin-agnostic semantic
schema of what a thing is — its components, hierarchy, data-bindings and flows; no colors, no layout). A
**SKIN** is the user's own portable render-theme (design tokens + layout preference + per-component styling).
The **RENDERER** auto-fits structure × skin into the actual UI — and it's *total*: a skin can restyle any
component, but a skin missing a component-type falls back to the base skin, so function is never removed.

The same structure renders completely differently under each skin — minimal, cyberpunk, brutalist, cozy —
all fully functional. Skins are portable JSON: pick, tweak, export (own it), import (someone else's). Build
the structure once; personalise it infinitely, at near-zero marginal cost.

One self-contained HTML file — no backend, no network, nothing sent anywhere, runs in your browser.

**Honest limit:** this is a working demo of the structure / skin / renderer split across a handful of
component types and skins — not a full design system. Structure concept: **Konomi** (Thomas Frumkin).

Built by **Kar** (karma-didy) on the FallForge estate.
