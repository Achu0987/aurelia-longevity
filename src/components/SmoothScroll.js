"use client";

import { useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { pointer } from "@/lib/state";

// The page uses the browser's own scrolling, so it stops the instant the visitor stops (no glide after the wheel or finger lets go).
// This component keeps the shared pointer position and a steady animation clock.
export default function SmoothScroll() {
  useEffect(() => {
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    gsap.ticker.lagSmoothing(0);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
