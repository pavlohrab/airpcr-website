// Brings the hand-drawn loop to life: air particles circulate, and one *simulated* AirPCR cycle
// (src/data/site-data.json → traces.air) plays back at 8× to drive the heater glow, the vent flap,
// the particle colour and the live readout. Respects prefers-reduced-motion and pauses off-screen.
import data from "../data/site-data.json";

const SVGNS = "http://www.w3.org/2000/svg";
const SPEED = 8; // playback speed of the simulated trace
const N = 46; // particles

type Trace = { t: number[]; T: number[]; air: number[]; sp: number[] };
const tr = data.traces.air as Trace;
const period = tr.t[tr.t.length - 1];

function sample(tsec: number) {
  const t = tsec % period;
  let i = 0;
  while (i < tr.t.length - 2 && tr.t[i + 1] < t) i++;
  const f = Math.min(1, Math.max(0, (t - tr.t[i]) / (tr.t[i + 1] - tr.t[i] || 1)));
  const lerp = (a: number[]) => a[i] + (a[i + 1] - a[i]) * f;
  return { T: lerp(tr.T), air: lerp(tr.air), sp: tr.sp[i] };
}

function step(sp: number, T: number) {
  if (sp >= 90) return T < sp - 1 ? "heating to 95 °C" : "holding 95 °C";
  if (sp <= 62) return T > sp + 1 ? "cooling to 58 °C" : "holding 58 °C";
  return T < sp - 1 ? "warming to 72 °C" : "holding 72 °C";
}

function hex(c: string): [number, number, number] {
  const m = c.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return [242, 121, 77];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

function init(svg: SVGSVGElement) {
  const uid = svg.dataset.uid!;
  const path = svg.querySelector<SVGPathElement>(`#${uid}-air`);
  const layer = svg.querySelector<SVGGElement>(".particles");
  if (!path || !layer) return;
  const readout = document.querySelector<HTMLElement>(`[data-readout="${uid}"]`);
  const L = path.getTotalLength();
  const cs = getComputedStyle(document.documentElement);
  const HEAT = hex(cs.getPropertyValue("--heat"));
  const COOL = hex(cs.getPropertyValue("--cool"));
  const INK = hex(cs.getPropertyValue("--ink-2"));

  // particles: position along the loop + a lateral offset inside the channel
  const parts = Array.from({ length: N }, (_, k) => {
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("r", (2 + Math.random() * 2.2).toFixed(1));
    layer.appendChild(c);
    return { el: c, s: (k / N) * L + Math.random() * 12, off: (Math.random() - 0.5) * 44, v: 0.9 + Math.random() * 0.25 };
  });

  // arc length where the air leaves the heater (nearest path point to the heater outlet at 345,175)
  let topStart = 0;
  for (let s = 0, best = Infinity; s < L; s += 4) {
    const q = path.getPointAtLength(s);
    const d = Math.hypot(q.x - 345, q.y - 175);
    if (d < best) (best = d), (topStart = s);
  }
  let mix = 0; // 0 = hot, 1 = cool
  let last = performance.now();
  let tSim = 0;
  let cycle = 1;
  let prevT = 0;
  let running = false;
  let raf = 0;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tSim += dt * SPEED;
    if (tSim >= period) {
      tSim -= period;
      cycle = (cycle % 30) + 1;
    }
    const s = sample(tSim);
    const venting = s.sp <= 62 && s.T > s.sp + 1;
    const heating = s.air > s.T + 3 && !venting;
    svg.classList.toggle("is-venting", venting);
    svg.classList.toggle("is-heating", heating);
    mix += ((venting ? 1 : 0) - mix) * Math.min(1, dt * 4);

    for (const p of parts) {
      p.s = (p.s + dt * 170 * p.v) % L;
      const a = path!.getPointAtLength(p.s);
      const b = path!.getPointAtLength((p.s + 2) % L);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const n = Math.hypot(dx, dy) || 1;
      p.el.setAttribute("cx", (a.x - (dy / n) * p.off).toFixed(1));
      p.el.setAttribute("cy", (a.y + (dx / n) * p.off).toFixed(1));
      // hot right after the heater, cooling along the loop; blue when venting
      const along = ((p.s - topStart + L) % L) / L; // 0 at heater
      const warm = Math.max(0.25, 1 - along * 0.9);
      const base = HEAT.map((h, i) => h * warm + INK[i] * (1 - warm));
      const col = base.map((h, i) => Math.round(h * (1 - mix) + COOL[i] * mix));
      p.el.setAttribute("fill", `rgb(${col[0]} ${col[1]} ${col[2]})`);
      p.el.setAttribute("opacity", (0.35 + 0.6 * (mix > 0.5 ? 1 : warm)).toFixed(2));
    }

    if (readout && Math.abs(s.T - prevT) > 0.04) {
      prevT = s.T;
      readout.querySelector("[data-r=T]")!.textContent = s.T.toFixed(1);
      readout.querySelector("[data-r=air]")!.textContent = s.air.toFixed(0);
      readout.querySelector("[data-r=step]")!.textContent = step(s.sp, s.T);
      readout.dataset.state = venting ? "cool" : "hot";
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduce.matches) return;
    running = true;
    svg.classList.add("is-running");
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    svg.classList.remove("is-running");
    cancelAnimationFrame(raf);
  }

  // place particles once for the static/reduced-motion state
  for (const p of parts) {
    const a = path.getPointAtLength(p.s);
    p.el.setAttribute("cx", a.x.toFixed(1));
    p.el.setAttribute("cy", a.y.toFixed(1));
    p.el.setAttribute("fill", `rgb(${HEAT.join(" ")})`);
    p.el.setAttribute("opacity", "0.5");
  }

  // wait for the draw-on, then run while visible
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) setTimeout(start, svg.dataset.started ? 0 : 1300), (svg.dataset.started = "1");
      else stop();
    },
    { threshold: 0.15 },
  );
  io.observe(svg);
  reduce.addEventListener("change", () => (reduce.matches ? stop() : start()));
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}

document.querySelectorAll<SVGSVGElement>("svg[data-airloop]").forEach(init);
