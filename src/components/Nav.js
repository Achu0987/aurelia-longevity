"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS } from "@/lib/chapters";
import { seq, goToProgress, goToId } from "@/lib/state";

const LINKS = [
  ...CHAPTERS.filter((c) => c.nav).map((c) => ({ label: c.nav, go: () => goToProgress(c.from + 0.012) })),
  { label: "Why Aurelia", go: () => goToId("why") },
  { label: "FAQ", go: () => goToId("faq") },
];

export default function Nav() {
  const [tone, setTone] = useState("dark"); // the opening photo is dark, so the bar starts light-on-dark
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const below = useRef(null); // tone of the section under the bar once we leave the cinematic stage

  // The bar takes the tone of whatever is under it. No hit-testing: an observer watches the sections below the stage,
  // and the stage reports its own tone.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("[data-flow]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) below.current = e.target.dataset.tone;
      },
      { rootMargin: "0px 0px -94% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    const stage = document.querySelector(".seq");
    const io2 = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.boundingClientRect.top <= 0 && e.boundingClientRect.bottom > 80) below.current = null;
      },
      { threshold: [0, 0.02, 0.5, 1] },
    );
    if (stage) io2.observe(stage);
    const t = setInterval(() => {
      const next = below.current || seq.tone;
      setTone((cur) => (cur === next ? cur : next));
      const s = seq.p > 0.03 || seq.extra > 0 || below.current !== null;
      setSolid((cur) => (cur === s ? cur : s));
    }, 100);
    return () => {
      clearInterval(t);
      io.disconnect();
      io2.disconnect();
    };
  }, []);

  const run = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <header className="nav" data-nav-tone={tone} data-solid={solid ? "true" : "false"}>
      <div className="nav__bar">
        <a className="nav__brand" href="#top" onClick={run(() => goToProgress(0))} aria-label="Aurelia Longevity, back to the start">
          <svg className="nav__mark" viewBox="0 0 28 28" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M7 3c11 5 11 17 0 22M21 3C10 8 10 20 21 25" />
            <path d="M9 8h10M8 14h12M9 20h10" strokeWidth="1.1" />
          </svg>
          <span>Aurelia</span>
        </a>
        <nav className={open ? "nav__links is-open" : "nav__links"} aria-label="Primary">
          {LINKS.map((l) => (
            <button key={l.label} type="button" onClick={run(l.go)}>
              {l.label}
            </button>
          ))}
        </nav>
        <button className="btn btn--gold btn--nav" type="button" onClick={() => goToId("begin")}>
          Private enquiry
        </button>
        <button className="nav__toggle" type="button" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
