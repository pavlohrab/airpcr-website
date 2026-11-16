# AirPCR website

One-page marketing site for **AirPCR**, a 16-tube hot-air PCR thermocycler (developed as the PCRFry research
project). Built with [Astro](https://astro.build): static HTML, about 15 kB of JavaScript, no framework runtime.

```bash
npm install
npm run dev          # http://localhost:4321  (add --host to reach it from other devices)
npm run build        # → dist/
npm run sync-data    # refresh numbers from the PCRFry repo (PCRFRY_DIR=~/WORK/PhD/pcrfry by default)
```

Pages: `/` (the one-pager), `/team` (founders; edit `src/data/team.json`, photos in `public/img/team/`),
`/styleguide` (the living style sheet) and `/logos` (logo options; SVGs in `public/logos/`).

Writing rule: short sentences, everyday words, one idea per sentence, and only the numbers that sell the point.

## Credibility rule
Nothing has been measured yet. Every number comes from `src/data/site-data.json`, which `scripts/sync-data.mjs`
generates from the PCRFry results, and is shown with a source tag: `simulated`, `measured`, `published` or `spec`
(`src/components/Tag.astro`). After the bench calibration, rerun `npm run sync-data` and switch tags to `measured`.

## Layout
```
src/styles/tokens.css     design tokens: Lab Dark (default) + Datasheet Light themes
src/styles/global.css     base type, layout, buttons, tags, reveal / draw-on motion, reduced motion
src/lib/sketch.ts         seeded "hand-drawn" stroke generator (build time)
src/components/AirLoop    the hand-drawn air loop (hero, how-it-works, footer)
src/scripts/airloop.ts    particles + one simulated cycle played back at 8x (heater glow, vent flap, readout)
src/sections/*.astro      one file per section, in page order (see src/pages/index.astro)
public/img/               CAD renders from PCRFry figures/
```

## Design decisions
- Theme **Lab Dark**: the black board of the PCRFry sketch. Colour follows meaning: ember = AirPCR / heat,
  blue = cooling, amber = sensors / simulated, grey = competitors.
- Type: **Space Grotesk** (display), **IBM Plex Sans** (body), **IBM Plex Mono** (data), **Caveat** (hand notes only).
  Self-hosted via Fontsource.
- Motion: the airflow loop is the one signature animation. Everything else is short reveals, draw-ons, count-ups
  and bar growth, and `prefers-reduced-motion` shows the end states.
- Scroll pinning uses CSS `position: sticky` + IntersectionObserver instead of GSAP, so there is no dependency.
  GSAP ScrollTrigger can be added later for scrubbed scenes.

## Deploy
`.github/workflows/deploy.yml` publishes to GitHub Pages on push to `main` (Settings → Pages → Source: GitHub Actions).
The waitlist form needs a provider endpoint (Formspree / Buttondown): set the repo variable `PUBLIC_FORM_ENDPOINT`.

## Next
Interactive three.js viewer (GLB export from `cad/`), OG image, analytics (Plausible/Umami), domain, licence.
