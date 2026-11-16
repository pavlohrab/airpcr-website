# AirPCR website

It started with a kitchen air fryer. We put PCR tubes in it, switched it on and off from a laptop, and the gel showed
the right DNA band. Hot air can run PCR.

So we designed a machine built for it: a fan, a light heater and sixteen tubes in one loop of moving air. It runs a
full PCR in about 38 minutes, from about $250 of parts. **AirPCR** is the company that builds it, and this repo is its
website, live at **https://airpcr.bio**.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

Every push to `main` deploys to GitHub Pages.

## Edit it

| What | Where |
|---|---|
| Home page sections | `src/sections/` (one file each, ordered in `src/pages/index.astro`) |
| Team | `src/data/team.json`, photos in `public/img/team/` |
| Colours and fonts | `src/styles/tokens.css` |
| Numbers | `src/data/site-data.json`, refreshed from the PCRFry repo with `npm run sync-data` |
