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

## What is tested, and how (v1.1)

- **Every skin is fitted onto the base before it is drawn.** Each token must look like its kind and must not be able
  to load anything from outside the page (`url(…)`, `@import`, an escape); anything else comes from the base, and the
  page says how many tokens did. **Version 1 trusted imported tokens as they were:** a skin with missing token groups
  stopped the page rendering (and stayed in the library), and a colour set to `url(https://…)` became the page's
  computed background, so the page would fetch from that address. Both are fixed and pinned by tests.
- **The kernel.** The base skin, the variants and the fitting rules are the KERNEL block of `index.html`; `node build.mjs`
  copies it byte for byte into `kernel.mjs`, and CI fails if they differ. witness v0.6 changed the kernel 87 times,
  one operator at a time, and the tests caught all 87 (`receipts/witness.json`, kernel SHA-256 `648635cf2ed71393…`).
  Every exported function is fuzzed and never throws. The structure walk visits each component once, so a loop or a
  100,000-deep structure is safe.
- **The cost case** (`skincase.mjs`) has its own tests and gate; the only sourced figure is the UK median wage (ONS).
- **No network call.** The gate line and the wage are embedded in the page at build time.

Built by **Kar** (karma-didy) on the FallForge estate.
