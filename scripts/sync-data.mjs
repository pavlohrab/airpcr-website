// Copy the numbers the website shows from the PCRFry research repo into src/data/site-data.json.
// Every claim carries a source tag (simulated | measured | published) so the page can label it.
// Run:  PCRFRY_DIR=~/WORK/PhD/pcrfry npm run sync-data   (default path below)
// The generated JSON is committed, so the site builds without the research repo.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SRC = process.env.PCRFRY_DIR ?? join(homedir(), "WORK/PhD/pcrfry");
const read = (p) => JSON.parse(readFileSync(join(SRC, p), "utf8"));

const report = read("results/report_data.json");
const cycle = read("results/cycle_stats.json");
const market = read("market/market_results.json");

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const best = report.picks.fastest;
const SIM = "simulated";
const PARTS_USD_SITE = 250;

// One cycle per machine, resampled to 0.5 s so the page stays light.
function resample(tr, step = 0.5) {
  const out = { t: [], T: [], air: [], sp: [] };
  let next = 0;
  for (let i = 0; i < tr.t.length; i++) {
    if (tr.t[i] + 1e-9 >= next) {
      out.t.push(r2(tr.t[i]));
      out.T.push(r2(tr.T[i]));
      out.air.push(r2(tr.air[i]));
      out.sp.push(r2(tr.sp[i]));
      next += step;
    }
  }
  return out;
}
const firstUrl = (src) => (src || "").split(/\s*;\s*/)[0] || "";
const host = (src) => {
  try {
    return new URL(firstUrl(src)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
// tubes per run for the four reference machines in the runtime bars
const WELLS = { "Eppendorf X50s silver": 96, "Bio-Rad T100": 96, "Bento Lab": 32, "Eppendorf nexus gradient": 96 };
const traceBy = (label) => report.traces.find((t) => t.label.startsWith(label));

const commercial = Object.values(report.commercial).map((c) => ({
  label: c.label.replace(/\s*\(.*\)$/, ""),
  wells: WELLS[c.label.replace(/\s*\(.*\)$/, "")] ?? null,
  fast_min: r1(c.fast_s / 60),
  std_min: r1(c.std_s / 60),
}));

const data = {
  generated: new Date().toISOString().slice(0, 10),
  source_repo: "PCRFry (simulation, uncalibrated model; nothing measured yet)",
  claims: {
    fast_min: { value: r1(best.fast_s / 60), unit: "min", source: SIM, note: "30-cycle fast protocol, nominal" },
    fast_worst_min: { value: r1(best.fast_worst_s / 60), unit: "min", source: SIM, note: "worst of 4 robustness scenarios" },
    std_min: { value: r1(best.std_s / 60), unit: "min", source: SIM },
    // The site shows a rounded, conservative parts price (team decision, 16 Nov 2026) rather than the model's
    // bill of materials, to leave room for real supplier prices, shipping and spares.
    parts_usd: { value: PARTS_USD_SITE, unit: "USD", source: SIM, note: `rounded estimate; simulated BOM is $${best.cost}` },
    bom_usd: { value: best.cost, unit: "USD", source: SIM, note: "bill of materials of the simulated build" },
    tubes: { value: 16, unit: "tubes", source: "design" },
    volume_ul: { value: 20, unit: "µL", source: "design" },
    overshoot_c: { value: r2(best.overshoot), unit: "°C", limit: report.limits.overshoot, source: SIM },
    spread_c: { value: r2(best.spread), unit: "°C", limit: report.limits.spread, source: SIM, note: "hottest − coldest of 16 tubes, worst scenario" },
    ripple_c: { value: r2(best.ripple), unit: "°C", limit: report.limits.ripple, source: SIM },
    offset_c: { value: r2(best.offset), unit: "°C", limit: report.limits.offset, source: SIM },
    peak_w: { value: Math.round(best.peak_W), unit: "W", source: SIM },
    mean_w: { value: Math.round(best.mean_W_fast), unit: "W", source: SIM, note: "mean during a fast run" },
    cycle_s: { value: r1(cycle.scenarios.fast.nominal.cycle_s.mean), unit: "s", source: SIM },
    designs_searched: { value: report.runs.any.n + report.runs.lowvolt.n, unit: "designs", source: SIM },
    scenarios: { value: report.scenarios, source: SIM },
    capillary_min: { value: 18.7, unit: "min", source: SIM, note: "glass capillaries, v1 (looser) limits; not yet PCR-grade" },
    lowvolt_min: { value: r1(report.fronts.lowvolt[0].fast_s / 60), unit: "min", source: SIM, note: "24 V-only build" },
  },
  bom: best.bom.map(([name, usd]) => ({ name, usd })),
  runtime: [
    ...commercial.map((c) => ({ ...c, kind: "ref" })),
    { label: "AirPCR · fastest", wells: 16, fast_min: r1(best.fast_s / 60), std_min: r1(best.std_s / 60), kind: "us" },
    { label: "AirPCR · 24 V only", wells: 16, fast_min: r1(report.fronts.lowvolt[0].fast_s / 60), std_min: r1(report.fronts.lowvolt[0].std_s / 60), kind: "us" },
  ].sort((a, b) => a.fast_min - b.fast_min),
  market: market
    .filter((m) => m.price_usd && m.fast_min)
    .map((m) => ({
      name: m.name, maker: m.maker, group: m.group, type: m.type,
      price_usd: m.group === "pcrfry" ? PARTS_USD_SITE : m.price_usd,
      fast_min: r1(m.fast_min), wells: m.wells,
      price_source: m.group === "pcrfry" ? "our parts estimate" : host(m.price_source),
      price_url: m.group === "pcrfry" ? "" : firstUrl(m.price_source),
      speed_source: m.group === "pcrfry" ? "our physics model" : "our model, from the maker's datasheet",
    })),
  traces: {
    air: { label: "AirPCR (fastest build)", ...resample(traceBy("Air build: fastest")) },
    t100: { label: "Bio-Rad T100 (block)", ...resample(traceBy("Bio-Rad T100")) },
  },
};

writeFileSync(new URL("../src/data/site-data.json", import.meta.url), JSON.stringify(data));
console.log(`site-data.json: ${data.runtime.length} runtimes, ${data.market.length} market points, traces ${data.traces.air.t.length} pts`);
