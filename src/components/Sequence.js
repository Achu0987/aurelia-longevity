"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { FrameEngine } from "@/lib/frameEngine";
import { seq, pointer, goToProgress } from "@/lib/state";
import { CHAPTERS, NOTES, DARK_FROM, STEPS, SCAN, notePoint } from "@/lib/chapters";
import { createParticles } from "@/components/particles";
import { asset } from "@/lib/asset";

const FRAME_COUNT = 240;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
// 0 to 1 window with soft edges
const windowAt = (p, from, to, soft = 0.014) => clamp01((p - from) / soft) * clamp01((to - p) / soft);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// A headline whose words rise out of a mask, driven by the chapter's --o (0 to 1).
function Words({ text }) {
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">
        {text.split(" ").map((w, i) => (
          <span key={i}>
            <span className="wd">
              <i style={{ "--k": i }}>{w}</i>
            </span>{" "}
          </span>
        ))}
      </span>
    </>
  );
}

// One film from the clinic door to the last section: the stage stays pinned behind everything, so the picture never cuts away.
export default function Sequence({ children }) {
  const track = useRef(null);
  const stage = useRef(null);
  const canvas = useRef(null);
  const fx = useRef(null);
  const scrimLight = useRef(null);
  const scrimDark = useRef(null);
  const veil = useRef(null);
  const bar = useRef(null);
  const barWrap = useRef(null);
  const scanLabel = useRef(null);
  const scanLine = useRef(null);
  const heroPhoto = useRef(null);
  const heroBg = useRef(null);
  const heroShade = useRef(null);
  const cue = useRef(null);

  useEffect(() => {
    const el = track.current;
    const st = stage.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // the static layout in CSS takes over: stacked chapters, one still frame each
    const params = new URLSearchParams(window.location.search);
    const debug = params.get("p");
    const folder = window.innerWidth <= 900 ? "sm/" : window.innerWidth <= 1500 ? "md/" : "";

    const chapterEls = Array.from(st.querySelectorAll("[data-from]"));
    const stepEls = Array.from(st.querySelectorAll("[data-step]"));
    const stepsNav = st.querySelector(".steps");
    const noteEls = Array.from(st.querySelectorAll(".note"));
    const size = { w: st.clientWidth, h: st.clientHeight };
    const sizeRO = new ResizeObserver(() => {
      size.w = st.clientWidth;
      size.h = st.clientHeight;
    });
    sizeRO.observe(st);
    let activeStep = -1;
    let particles = null;
    let lastP = -1;
    let lastExtra = -1;
    const introStart = performance.now();
    let intro = 0;

    const applyChapters = (p) => {
      for (const c of chapterEls) {
        const o = windowAt(p, parseFloat(c.dataset.from), parseFloat(c.dataset.to), c.dataset.soft ? parseFloat(c.dataset.soft) : 0.016);
        // the opening scene arrives slowly: words rise only once the picture has settled
        const shown = c.dataset.intro ? Math.min(o, clamp01((intro - 0.25) / 0.75)) : o;
        // only touch the DOM for chapters whose state actually changed
        const w = c.dataset.prog ? clamp01((p - parseFloat(c.dataset.from)) / (parseFloat(c.dataset.to) - parseFloat(c.dataset.from))) : 0;
        const key = shown.toFixed(3) + (o < 0.01 ? "h" : "v") + (c.dataset.prog ? w.toFixed(3) : "");
        if (c._k === key) continue;
        c._k = key;
        if (c.dataset.prog) c.style.setProperty("--w", w.toFixed(3));
        c.style.setProperty("--o", shown.toFixed(3));
        c.style.opacity = Math.min(1, shown * 3).toFixed(3);
        c.style.visibility = o < 0.01 ? "hidden" : "visible";
        c.style.pointerEvents = o > 0.6 ? "auto" : "none";
      }
      // the opening banner photo hands over to the film in the first few percent of the scroll
      const hp = clamp01(1 - (p - 0.025) / 0.04);
      if (heroPhoto.current) {
        heroPhoto.current.style.opacity = hp.toFixed(3);
        heroPhoto.current.style.visibility = hp < 0.01 ? "hidden" : "visible";
      }
      if (heroBg.current) {
        heroBg.current.style.opacity = hp.toFixed(3);
        heroBg.current.style.visibility = hp < 0.01 ? "hidden" : "visible";
      }
      if (heroShade.current) {
        heroShade.current.style.opacity = hp.toFixed(3);
        heroShade.current.style.visibility = hp < 0.01 ? "hidden" : "visible";
      }
      const dark = p > DARK_FROM || hp > 0.02;
      seq.tone = dark ? "dark" : "light";
      if (st.dataset.tone !== seq.tone) st.dataset.tone = seq.tone;
      if (scrimLight.current) scrimLight.current.style.opacity = dark ? "0" : "1";
      if (scrimDark.current) scrimDark.current.style.opacity = dark ? "1" : "0";
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (barWrap.current) barWrap.current.style.opacity = (clamp01((p - 0.02) * 30) * clamp01(1 - seq.extra * 8)).toFixed(2);
      if (cue.current) cue.current.style.opacity = clamp01(1 - p * 28).toFixed(2);
      if (stepsNav) {
        const v = clamp01((p - 0.04) * 30) * clamp01(1 - seq.extra * 8);
        stepsNav.style.opacity = v.toFixed(2);
        stepsNav.style.pointerEvents = v > 0.5 ? "auto" : "none";
      }

      // the body-scan sweep
      const s = (p - SCAN.from) / (SCAN.to - SCAN.from);
      const on = s > 0 && s < 1;
      if (scanLine.current) {
        scanLine.current.style.opacity = on ? Math.min(1, s * 12, (1 - s) * 12).toFixed(2) : "0";
        scanLine.current.style.transform = `translate3d(0, ${(clamp01(s) * 100).toFixed(2)}svh, 0)`;
      }
      if (on && scanLabel.current) scanLabel.current.textContent = `Scanning ${Math.round(s * 100)}%`;

      // callouts ride on the objects they explain, using the same cover-and-zoom maths as the canvas
      const fr = p * (FRAME_COUNT - 1) + 1;
      const sc = Math.max(size.w / 1920, size.h / 1080) * engine.zoom;
      const ox = (size.w - 1920 * sc) / 2;
      const oy = (size.h - 1080 * sc) / 2;
      noteEls.forEach((el, i) => {
        const n = NOTES[i];
        if (fr < n.f[0] - 3 || fr > n.f[1] + 3) return;
        const [fx, fy] = notePoint(n, fr);
        const x = ox + (fx / 100) * 1920 * sc;
        const y = oy + (fy / 100) * 1080 * sc;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.setProperty("--len", (n.side === "top" ? 70 : 70) + "px");
        // near the right edge the label flips to the left of its ring, so it never runs under the chapter stepper
        if (n.side === "right") {
          const wasFlipped = el.classList.contains("note--flip");
          const flip = x > size.w * (wasFlipped ? 0.6 : 0.66);
          if (flip !== wasFlipped) el.classList.toggle("note--flip", flip);
        }
      });

      // which chapter of the journey we are in
      let idx = 0;
      STEPS.forEach((step, i) => {
        if (p >= step.at) idx = i;
      });
      if (idx !== activeStep) {
        activeStep = idx;
        stepEls.forEach((b, i) => b.classList.toggle("is-on", i === idx));
      }
    };

    const engine = new FrameEngine({
      canvas: canvas.current,
      count: FRAME_COUNT,
      folder,
      reduced,
      onLowPower: () => {
        seq.lowPower = true;
      },
      onFirstDraw: () => {
        canvas.current.classList.add("is-live");
        const poster = st.querySelector(".seq__poster");
        setTimeout(() => poster && (poster.style.visibility = "hidden"), 700);
      },
      onTick: (p) => {
        seq.p = p;
        // Lenis already smooths the scroll, so the picture follows it tightly; touch scrolling gets a little easing.
        engine.rate = seq.lenis ? 60 : 18;
        if (heroPhoto.current && p < 0.07) {
          heroPhoto.current.style.translate = `${(-pointer.x * 14).toFixed(1)}px ${(pointer.y * 8).toFixed(1)}px`;
        }
        const introActive = intro < 1;
        if (introActive) intro = easeOut(clamp01((performance.now() - introStart) / 2400));
        if (Math.abs(p - lastP) > 0.00002 || introActive || seq.extra !== lastExtra) {
          lastP = p;
          lastExtra = seq.extra;
          // a slow push-in with the scroll, a slow settle at the start, and a gentle drift once the story reaches its last sections
          engine.zoom = (1 + p * 0.07 + seq.extra * 0.05) * (1 + (1 - intro) * 0.09);
          applyChapters(p);
        }
      },
    });
    engine.start();
    // One ticker drives smooth scroll, ScrollTrigger and the picture, so they always agree on the same frame.
    const tick = (time) => engine.step(time * 1000);
    gsap.ticker.add(tick);

    const measure = () => {
      const r = el.getBoundingClientRect();
      seq.trackTop = r.top + window.scrollY;
      seq.trackHeight = r.height;
    };
    measure();

    const triggers = [];
    if (debug !== null) {
      engine.jump(parseFloat(debug));
    } else {
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (s) => engine.setTarget(s.progress),
          onRefresh: (s) => {
            measure();
            engine.setTarget(s.progress);
          },
        }),
      );
    }
    // After the sequence ends, the last frame stays pinned and slowly darkens behind the final sections.
    triggers.push(
      ScrollTrigger.create({
        trigger: el,
        start: "bottom bottom",
        end: "bottom top",
        onUpdate: (s) => {
          seq.extra = s.progress;
          if (veil.current) veil.current.style.opacity = (s.progress * 0.86).toFixed(3);
        },
      }),
    );
    // While the light sections cover the stage, stop drawing it: nothing is visible, so nothing should cost anything.
    const covers = new Set();
    const coverIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.isIntersecting ? covers.add(e.target) : covers.delete(e.target));
        seq.covered = covers.size > 0;
        engine.visible = !seq.covered;
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    document.querySelectorAll("[data-cover]").forEach((c) => coverIO.observe(c));
    const go = params.get("go");
    if (go) setTimeout(() => document.getElementById(go)?.scrollIntoView(), 700);

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas.current);

    // Particles load after the first frame so they never delay the opening image.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    const idleId = idle(() => {
      try {
        particles = createParticles(fx.current, { reduced });
      } catch {
        fx.current.style.display = "none";
      }
    });

    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      (window.cancelIdleCallback || clearTimeout)(idleId);
      ro.disconnect();
      gsap.ticker.remove(tick);
      sizeRO.disconnect();
      coverIO.disconnect();
      seq.covered = false;
      triggers.forEach((t) => t.kill());
      particles?.destroy();
      engine.destroy();
    };
  }, []);

  return (
    <div className="film" id="top">
      <div ref={stage} className="film__stage" data-tone="light">
        {/* first frame, visible instantly while the canvas warms up */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="seq__poster" src={asset("/frames/f001.webp")} alt="A man walks into a calm, glass-walled longevity clinic." fetchPriority="high" />
        <canvas ref={canvas} className="seq__canvas" aria-hidden="true" />
        <div ref={heroBg} className="hero__bg" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={heroPhoto} className="hero__photo" src={asset("/photos/hero.webp")} alt="A happy family walks hand in hand through a sunlit garden." fetchPriority="high" />
        <div ref={heroShade} className="hero__shade" aria-hidden="true" />
        <div ref={scrimLight} className="seq__scrim seq__scrim--light" aria-hidden="true" />
        <div ref={scrimDark} className="seq__scrim seq__scrim--dark" aria-hidden="true" />
        <canvas ref={fx} className="seq__fx" aria-hidden="true" />
        <div ref={veil} className="film__veil" aria-hidden="true" />

        <div ref={scanLine} className="scan" aria-hidden="true">
          <span ref={scanLabel} className="scan__label">
            Scanning 0%
          </span>
        </div>

        <div className="seq__chapters">
          <section className="chap chap--hero" data-from={CHAPTERS[0].from} data-to={CHAPTERS[0].to} data-intro="1" data-tone="dark" aria-labelledby="h-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chap__still" src={asset("/photos/hero.webp")} alt="" loading="eager" decoding="async" />
            <h1 id="h-hero" className="display">
              <Words text="Inside the future of human longevity" />
            </h1>
            <p className="plain">Aurelia is a private longevity and regenerative medicine clinic.</p>
            <p className="lead">Advanced science. Personalized medicine. A better understanding of your future health.</p>
            <button className="btn btn--pill" type="button" onClick={() => goToProgress(0.16)}>
              <span>Explore the science</span>
              <i aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </i>
            </button>
          </section>

          {/* what we do, in three plain lines, shown with the opening scene */}
          <aside className="visit" data-from={CHAPTERS[0].from} data-to={CHAPTERS[0].to} data-intro="1" aria-label="What Aurelia does">
            <p className="visit__title">What we do</p>
            <ul>
              <li>
                <strong>Measure</strong>
                <span>Advanced diagnostics and biomarker testing.</span>
              </li>
              <li>
                <strong>Understand</strong>
                <span>Physicians explain what your results mean.</span>
              </li>
              <li>
                <strong>Support</strong>
                <span>A personal plan for your long-term health.</span>
              </li>
            </ul>
          </aside>

          <section className="chap chap--left" data-from={CHAPTERS[1].from} data-to={CHAPTERS[1].to} aria-labelledby="h-journey">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chap__still" src={asset("/frames/f060.webp")} alt="" loading="lazy" decoding="async" />
            <h2 id="h-journey" className="display">
              <Words text="Your health. Understood at a deeper level." />
            </h2>
            <p className="plain">First, a conversation, not a form.</p>
            <p className="lead">
              Every visit begins with a conversation. A physician listens first, then builds a picture of your health from your history, your goals and
              your own data.
            </p>
            <p className="aside">The consultation room, the scan suite and the lab share one floor, so nothing about your care is rushed or scattered.</p>
          </section>

          <section className="chap chap--left" data-from={CHAPTERS[2].from} data-to={CHAPTERS[2].to} aria-labelledby="h-diag">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chap__still" src={asset("/frames/f101.webp")} alt="" loading="lazy" decoding="async" />
            <h2 id="h-diag" className="display">
              <Words text="See beyond the surface." />
            </h2>
            <p className="plain">Then, a scan and a panel of tests.</p>
            <p className="lead">
              A full-body scan and a panel of biomarkers give your physicians a deeper view of how your body is working today, and a baseline to compare
              against tomorrow.
            </p>
          </section>

          <section className="chap chap--left" data-from={CHAPTERS[3].from} data-to={CHAPTERS[3].to} data-tone="dark" aria-labelledby="h-inside">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chap__still" src={asset("/frames/f130.webp")} alt="" loading="lazy" decoding="async" />
            <h2 id="h-inside" className="display">
              <Words text="A world of science, within you." />
            </h2>
            <p className="plain">Next, we look closely at what is happening inside you.</p>
            <p className="lead">
              Beneath the skin, billions of cells work in a living landscape of blood, tissue and signals. Understanding it is the first step toward caring
              for it well.
            </p>
          </section>

          <section className="chap chap--left" data-from={CHAPTERS[4].from} data-to={CHAPTERS[4].to} data-tone="dark" aria-labelledby="h-cells">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chap__still" src={asset("/frames/f185.webp")} alt="" loading="lazy" decoding="async" />
            <h2 id="h-cells" className="display">
              <Words text="Longevity begins at the cellular level." />
            </h2>
            <p className="plain">We read the signs of how your cells are ageing.</p>
            <p className="lead">
              Cells age as they divide, and their mitochondria make the energy that keeps them working. Looking at these processes helps explain how
              your own biological ageing is unfolding.
            </p>
          </section>

          <section className="chap chap--left chap--wide" data-from={CHAPTERS[5].from} data-to={CHAPTERS[5].to} data-tone="dark" aria-labelledby="h-regen">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chap__still" src={asset("/frames/f232.webp")} alt="" loading="lazy" decoding="async" />
            <h2 id="h-regen" className="display">
              <Words text="The science of regeneration." />
            </h2>
            <p className="plain">We explain what regenerative medicine can and cannot do.</p>
            <p className="lead">
              Regenerative medicine studies how the body repairs and renews tissue, and how that natural process might be supported. It is an evolving field.
            </p>
            <p className="aside">
              Approaches differ, evidence varies and outcomes are individual. Aurelia does not claim to reverse ageing or to guarantee any result; every
              option begins with a physician&rsquo;s assessment.
            </p>
          </section>

          <section className="chap chap--left chap--wide" data-from={CHAPTERS[6].from} data-to={CHAPTERS[6].to} data-tone="dark" aria-labelledby="h-outcome">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chap__still" src={asset("/frames/f240.webp")} alt="" loading="lazy" decoding="async" />
            <h2 id="h-outcome" className="display">
              <Words text="Then, you get on with your life." />
            </h2>
            <p className="plain">Your care continues quietly in the background.</p>
            <p className="lead">
              You leave with a clear plan, a physician who knows you, and a better understanding of your own health. Regular reviews keep that plan
              current as your life changes.
            </p>
          </section>
        </div>

        {NOTES.map((n) => (
          <div
            key={n.id}
            className={`note note--${n.side}`}
            data-from={((n.f[0] - 1) / (FRAME_COUNT - 1)).toFixed(4)}
            data-to={((n.f[1] - 1) / (FRAME_COUNT - 1)).toFixed(4)}
            data-soft="0.012"
            data-tone={n.f[0] > 120 ? "dark" : "light"}
          >
            <span className="note__ring" aria-hidden="true" />
            <span className="note__body">
              <strong>{n.label}</strong>
              <span>{n.text}</span>
            </span>
          </div>
        ))}

        <aside className="hud" data-prog="1" data-from="0.372" data-to="0.478" data-soft="0.012" data-tone="dark" aria-label="Illustrative scan readout">
          <p className="hud__title">Illustrative scan readout</p>
          <ul>
            {[
              ["Cardiovascular", "Mapped"],
              ["Metabolic", "Mapped"],
              ["Inflammation", "Mapped"],
              ["Hormonal", "Mapped"],
              ["Body composition", "Mapped"],
            ].map(([k, v], i) => (
              <li key={k} style={{ "--t": (i * 0.17).toFixed(2) }}>
                <span>{k}</span>
                <em>{v}</em>
                <i aria-hidden="true" />
              </li>
            ))}
          </ul>
          <p className="hud__fine">Sample layout. Not real patient data.</p>
        </aside>

        <aside className="hud hud--stages" data-prog="1" data-from="0.85" data-to="0.925" data-soft="0.012" data-tone="dark" aria-label="How care is approached">
          <p className="hud__title">How care is approached</p>
          <ol>
            {[
              ["Assess", "A physician reviews your baseline."],
              ["Support", "Options are chosen with the evidence in mind."],
              ["Review", "Progress is checked over time."],
            ].map(([k, v], i) => (
              <li key={k} style={{ "--t": (i * 0.3).toFixed(2) }}>
                <b aria-hidden="true">{i + 1}</b>
                <span>
                  <strong>{k}</strong>
                  {v}
                </span>
              </li>
            ))}
          </ol>
        </aside>

        <nav className="steps" aria-label="Chapters of the journey">
          {STEPS.map((s) => (
            <button key={s.id} type="button" data-step={s.id} className="steps__btn" onClick={() => goToProgress(s.at + 0.012)}>
              <span>{s.label}</span>
              <i aria-hidden="true" />
            </button>
          ))}
        </nav>

        <div ref={cue} className="seq__cue" aria-hidden="true">
          <span>Scroll</span>
          <i />
        </div>
        <div ref={barWrap} className="seq__bar" aria-hidden="true">
          <i ref={bar} />
        </div>
      </div>

      {/* the scroll distance of the cinematic part */}
      <section ref={track} className="seq" aria-hidden="true" />

      {children}
    </div>
  );
}
