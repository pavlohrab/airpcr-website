// Copy the numbers the website shows from the PCRFry research repo into src/data/site-data.json.
// The JSON is committed, so the site builds without the research repo.
// Run:  npm run sync-data   (or PCRFRY_DIR=/path/to/pcrfry npm run sync-data)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SRC = process.env.PCRFRY_DIR ?? join(homedir(), "WORK/PhD/pcrfry");
const read = (p) => JSON.parse(readFileSync(join(SRC, p), "utf8"));

const report = read("results/report_data.json");
const market = read("market/market_results.json");
const best = report.picks.fastest;

// The site shows a rounded, conservative parts price instead of the model's bill of materials,
// to leave room for real supplier prices, shipping and spares.
const PARTS_USD = 250;

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

// One cycle, resampled to 0.5 s so the page stays light.
function resample(trace, step = 0.5) {
  const out = { t: [], T: [], air: [], sp: [] };
  let next = 0;
  trace.t.forEach((t, i) => {
    if (t + 1e-9 < next) return;
    out.t.push(r2(t));
    out.T.push(r2(trace.T[i]));
    out.air.push(r2(trace.air[i]));
    out.sp.push(r2(trace.sp[i]));
    next += step;
  });
  return out;
}
const trace = (label) => resample(report.traces.find((t) => t.label.startsWith(label)));

const firstUrl = (src) => (src || "").split(/\s*;\s*/)[0];
const host = (src) => {
  try {
    return new URL(firstUrl(src)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const ours = market.find((m) => m.group === "pcrfry" && !m.name.includes("loose"));
const machines = market.filter((m) => m.group !== "pcrfry" && m.price_usd && m.fast_min);

const data = {
  generated: new Date().toISOString().slice(0, 10),
  // every claim is tagged (design | simulated | measured | published) and the page labels it
  claims: {
    tubes: { value: 16, source: "design" },
    fast_min: { value: r1(best.fast_s / 60), source: "simulated" },
    spread_c: { value: r2(best.spread), limit: report.limits.spread, source: "simulated" },
    parts_usd: { value: PARTS_USD, source: "simulated" },
  },
  market: [
    {
      name: "AirPCR", maker: "AirPCR", group: "airpcr", type: "hot air",
      price_usd: PARTS_USD, fast_min: r1(ours.fast_min), wells: 16,
      price_source: "our parts estimate", price_url: "", speed_source: "our physics model",
    },
    ...machines.map((m) => ({
      name: m.name, maker: m.maker, group: m.group, type: m.type,
      price_usd: m.price_usd, fast_min: r1(m.fast_min), wells: m.wells,
      price_source: host(m.price_source), price_url: firstUrl(m.price_source),
      speed_source: "our model, from the maker's datasheet",
    })),
  ],
  traces: {
    air: trace("Air build: fastest"),
    t100: trace("Bio-Rad T100"),
  },
};

writeFileSync(new URL("../src/data/site-data.json", import.meta.url), JSON.stringify(data, null, 1));
console.log(`site-data.json: ${data.market.length} machines, ${data.traces.air.t.length} trace points`);
