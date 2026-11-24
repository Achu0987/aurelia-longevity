// Shared, mutable values read inside render loops (never React state).
export const seq = { p: 0, extra: 0, covered: false, lowPower: false, tone: "light", trackTop: 0, trackHeight: 1, lenis: null };
export const pointer = { x: 0, y: 0 };

// Scroll to a point in the cinematic sequence (0 to 1), or to an element id below it.
export function goToProgress(p) {
  const y = seq.trackTop + p * (seq.trackHeight - window.innerHeight);
  scrollToY(y);
}

export function goToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  scrollToY(el.getBoundingClientRect().top + window.scrollY);
}

function scrollToY(y) {
  if (seq.lenis) seq.lenis.scrollTo(y, { duration: 2.2 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}
