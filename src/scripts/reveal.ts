// Scroll reveals, hand-drawn draw-ons, count-ups, nav state and the theme toggle.
// Everything is progressive: without JS the page is fully visible (see .js rules in global.css).
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      if (e.target instanceof HTMLElement && e.target.dataset.count !== undefined) countUp(e.target);
      io.unobserve(e.target);
    }
  },
  { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
);
document.querySelectorAll(".reveal, .draw, [data-count], .grow").forEach((el) => io.observe(el));

function countUp(el: HTMLElement) {
  const target = parseFloat(el.dataset.count || el.textContent || "0");
  const dec = (el.dataset.count || "").split(".")[1]?.length ?? 0;
  if (reduce || !isFinite(target)) return;
  const t0 = performance.now();
  const dur = 900;
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = (target * e).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// nav: solid surface after scrolling a little
const nav = document.querySelector<HTMLElement>("[data-nav]");
const onScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// theme toggle (per-viewer convenience; storage may be unavailable)
document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((b) =>
  b.addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("airpcr-theme", next);
    } catch {}
  }),
);
