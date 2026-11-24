"use client";

import { useEffect } from "react";

// Adds .is-in to every [data-reveal] as it enters the viewport. Content stays visible without script.
export default function Reveal() {
  useEffect(() => {
    // Design review only: ?solo=optimization (or begin, foot) shows that part of the page on its own.
    const solo = new URLSearchParams(window.location.search).get("solo");
    if (solo) {
      document.querySelectorAll(".film__stage, .seq").forEach((e) => (e.style.display = "none"));
      document.querySelectorAll("[data-flow]").forEach((s) => {
        if (s.id !== solo && !s.classList.contains(solo)) s.style.display = "none";
      });
    }
    const els = Array.from(document.querySelectorAll("[data-reveal],[data-letters]"));
    if (!("IntersectionObserver" in window) || new URLSearchParams(window.location.search).has("static")) {
      els.forEach((e) => e.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}
