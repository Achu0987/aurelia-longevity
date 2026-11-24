"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { seq, pointer } from "@/lib/state";

// Smooth scrolling (off for reduced motion and automated browsers) plus the shared pointer position.
export default function SmoothScroll() {
  useEffect(() => {
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis = null;
    let tick = null;
    if (!reduce && !navigator.webdriver) {
      lenis = new Lenis({ lerp: 0.13, smoothWheel: true, wheelMultiplier: 1 });
      seq.lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      tick = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      seq.lenis = null;
    };
  }, []);
  return null;
}
