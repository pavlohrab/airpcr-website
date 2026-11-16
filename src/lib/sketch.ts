// Hand-drawn stroke generator, used at build time to render SVG paths in the style of the
// PCRFry chalk sketch (cad/sketch.py). Deterministic: a seed gives the same wobble on every build.

export type Pt = [number, number];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Resample a polyline to roughly `step` px between points. */
function densify(pts: Pt[], step = 6): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Offset every point perpendicular to the line by low-frequency noise: the "hand" wobble. */
export function wobble(pts: Pt[], seed = 1, amp = 1.6, step = 6): Pt[] {
  const r = rng(seed);
  const d = densify(pts, step);
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const fr = [0.011 + r() * 0.01, 0.031 + r() * 0.02, 0.09 + r() * 0.04];
  let acc = 0;
  return d.map((p, i) => {
    const a = d[Math.max(0, i - 1)];
    const b = d[Math.min(d.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    if (i > 0) acc += Math.hypot(p[0] - d[i - 1][0], p[1] - d[i - 1][1]);
    const n =
      amp * (0.6 * Math.sin(acc * fr[0] + ph[0]) + 0.3 * Math.sin(acc * fr[1] + ph[1]) + 0.1 * Math.sin(acc * fr[2] + ph[2]));
    return [p[0] + (-dy / L) * n, p[1] + (dx / L) * n];
  });
}

export function toPath(pts: Pt[], close = false): string {
  const f = (v: number) => Math.round(v * 10) / 10;
  return "M" + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L") + (close ? "Z" : "");
}

export function length(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return Math.ceil(L);
}

/** Points of a rounded rectangle, clockwise from the top-left straight. */
export function roundRect(x: number, y: number, w: number, h: number, r: number, seg = 10): Pt[] {
  const pts: Pt[] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= seg; k++) {
      const a = a0 + (Math.PI / 2) * (k / seg);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arc(x + w - r, y + r, -Math.PI / 2);
  arc(x + w - r, y + h - r, 0);
  arc(x + r, y + h - r, Math.PI / 2);
  arc(x + r, y + r, Math.PI);
  pts.push(pts[0]);
  return pts;
}

export function circle(cx: number, cy: number, r: number, seg = 28, overlap = 0.12): Pt[] {
  const pts: Pt[] = [];
  const n = Math.round(seg * (1 + overlap));
  for (let k = 0; k <= n; k++) {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / seg;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function zigzag(x: number, y: number, w: number, h: number, n: number): Pt[] {
  const pts: Pt[] = [[x, y + h / 2]];
  for (let i = 0; i < n; i++) {
    const xx = x + ((i + 0.5) * w) / n;
    pts.push([xx, i % 2 ? y + h : y]);
  }
  pts.push([x + w, y + h / 2]);
  return pts;
}

/** A sketched stroke: wobbled path string + its length (for the draw-on animation). */
export function stroke(pts: Pt[], seed: number, amp = 1.6, close = false) {
  const w = wobble(pts, seed, amp);
  return { d: toPath(w, close), len: length(w) };
}
