# AirPCR website

The website for **AirPCR**, a 16-tube PCR machine that heats and cools with moving air. Live at **https://airpcr.bio**.

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
| Numbers | `src/data/site-data.json`, refreshed with `npm run sync-data` from the PCRFry repo |

Every number is tagged `simulated`, `measured` or `published`. Nothing is measured yet.
