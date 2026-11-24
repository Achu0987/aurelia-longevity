"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { goToId } from "@/lib/state";
import { asset } from "@/lib/asset";

/* ------------------------------------------------------------------ */
/* 1. Statement: one clear sentence; the words light up as you scroll   */
/* ------------------------------------------------------------------ */
const STATEMENT = [
  "Aurelia helps you",
  { img: asset("/photos/chip1.webp") },
  "understand how your body is ageing,",
  { img: asset("/photos/chip2.webp") },
  "then builds a personal plan to support your long-term health.",
  { img: asset("/photos/chip3.webp") },
];

export function Statement() {
  const ref = useRef(null);
  const text = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 78%",
      end: "bottom 62%",
      onUpdate: (s) => text.current?.style.setProperty("--p", s.progress.toFixed(3)),
    });
    return () => st.kill();
  }, []);

  let i = 0;
  const tokens = STATEMENT.flatMap((part) => (typeof part === "string" ? part.split(" ").map((w) => ({ w })) : [part]));
  const n = tokens.length;

  return (
    <section ref={ref} className="cover stmt" data-flow data-cover data-tone="light" aria-labelledby="h-stmt">
      <div className="wrap">
        <h2 id="h-stmt" className="stmt__text" ref={text} style={{ "--n": n }}>
          {tokens.map((t, k) => {
            const idx = i++;
            return t.img ? (
              <span key={k} className="stmt__w stmt__chip" style={{ "--i": idx }} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt="" loading="lazy" decoding="async" />
              </span>
            ) : (
              <span key={k} className="stmt__w" style={{ "--i": idx }}>
                {t.w}{" "}
              </span>
            );
          })}
        </h2>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Why Aurelia: three plain steps, with the picture that goes with   */
/* ------------------------------------------------------------------ */
const WHY = [
  {
    title: "Measure what matters",
    text: "We begin with a complete picture, not a single number.",
    points: ["Full-body imaging of organs, vessels and bone", "Biomarker and epigenetic age panels", "A baseline to compare against in the years ahead"],
    img: asset("/photos/why1.webp"),
    alt: "A physician talks with a smiling patient in a bright clinic.",
    pos: "28% 40%",
  },
  {
    title: "Understand it clearly",
    text: "Results mean little until someone explains them to you.",
    points: ["A physician reviews every result with you", "Plain language, not jargon", "Time to ask, with nothing rushed"],
    img: asset("/photos/why2.webp"),
    alt: "A physician sits at a desk and goes through results with a patient.",
    pos: "55% 40%",
  },
  {
    title: "Support it for the long term",
    text: "Care continues after the first visit, and changes as you do.",
    points: ["A personal plan for nutrition, movement and recovery", "Regenerative options only where a physician indicates them", "Regular reviews that keep the plan current"],
    img: asset("/photos/why3.webp"),
    alt: "A group of older adults exercising together in a green park.",
    pos: "50% 70%",
  },
];

export function Why() {
  const [active, setActive] = useState(0);
  const steps = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.i));
        });
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    steps.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <section className="cover cover--alt why" id="why" data-flow data-cover data-tone="light" aria-labelledby="h-why">
      <div className="wrap">
        <header className="why__head">
          <h2 id="h-why" className="display" data-reveal>
            Why choose Aurelia?
          </h2>
          <p className="lead" data-reveal style={{ "--i": 1 }}>
            Three things we do at every stage, so you always know what is happening and why.
          </p>
        </header>
        <div className="why__grid">
          <div className="why__media" aria-hidden="true">
            {WHY.map((s, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.img} src={s.img} alt="" className={k === active ? "is-on" : ""} style={{ objectPosition: s.pos }} loading="lazy" decoding="async" />
            ))}
            <ol className="why__rail">
              {WHY.map((s, k) => (
                <li key={s.title} className={k === active ? "is-on" : ""} />
              ))}
            </ol>
          </div>
          <div className="why__steps">
            {WHY.map((s, k) => (
              <article key={s.title} ref={(el) => (steps.current[k] = el)} data-i={k} className={k === active ? "why__step is-on" : "why__step"}>
                {/* the picture for this step, shown here on small screens */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="why__still" src={s.img} alt={s.alt} loading="lazy" decoding="async" style={{ objectPosition: s.pos }} />
                <h3>{s.title}</h3>
                <p className="lead">{s.text}</p>
                <ul>
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Ways to begin: three clear options, no prices                     */
/* ------------------------------------------------------------------ */
const WAYS = [
  {
    name: "Assessment",
    line: "A full picture of where you stand today.",
    points: ["Consultation with a physician", "Whole-body imaging and biomarker panels", "A review where every result is explained"],
  },
  {
    name: "Programme",
    line: "The assessment, plus a plan built around you.",
    points: ["Everything in the Assessment", "A personal plan for nutrition, movement and recovery", "Regular reviews with the same physician"],
    featured: true,
  },
  {
    name: "Ongoing care",
    line: "Continued support as your life and health change.",
    points: ["Scheduled reassessment", "Plan updates after each review", "Regenerative options where indicated"],
  },
];

export function Ways() {
  return (
    <section className="cover ways" id="ways" data-flow data-cover data-tone="light" aria-labelledby="h-ways">
      <div className="wrap">
        <header className="why__head">
          <h2 id="h-ways" className="display" data-reveal>
            Three ways to begin.
          </h2>
          <p className="lead" data-reveal style={{ "--i": 1 }}>
            Start with an assessment, or with the full programme. Pricing is shared at your consultation.
          </p>
        </header>
        <div className="ways__grid">
          {WAYS.map((w, k) => (
            <article key={w.name} className={w.featured ? "way way--feat" : "way"} data-reveal style={{ "--i": k + 1 }}>
              <h3>{w.name}</h3>
              <p className="way__line">{w.line}</p>
              <ul>
                {w.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <button className={w.featured ? "btn btn--gold" : "btn"} type="button" onClick={() => goToId("begin")}>
                Request a consultation
              </button>
            </article>
          ))}
        </div>
        <p className="ways__note" data-reveal>
          Programme names and contents are illustrative for this concept.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Questions, answered plainly (and honestly)                        */
/* ------------------------------------------------------------------ */
const FAQ = [
  ["What is a longevity clinic?", "A medical practice that focuses on how your body is ageing and how to support your health over the long term, through testing, prevention and personal care."],
  ["What happens at the first visit?", "A conversation with a physician, then diagnostics such as imaging and biomarker tests, then a review where your physician explains what the results mean and what could come next."],
  ["Do you promise to reverse ageing?", "No. We do not claim to reverse ageing or to guarantee any result. Outcomes are individual, and every option begins with a physician's assessment."],
  ["What is regenerative medicine?", "The study of how the body repairs and renews tissue, and how that natural process might be supported. It is an evolving field, so we explain clearly what is known and what is not."],
  ["Do I need to be unwell to come?", "No. Many people come to understand their health better and to plan ahead. A physician will tell you which tests are suitable for you."],
  ["Is my information private?", "Your health information is kept confidential and shared only with your permission and with the clinicians involved in your care."],
];

export function Faq() {
  return (
    <section className="cover cover--alt faq" id="faq" data-flow data-cover data-tone="light" aria-labelledby="h-faq">
      <div className="wrap faq__grid">
        <div className="faq__intro">
          <h2 id="h-faq" className="display" data-reveal>
            Got questions? We have answers.
          </h2>
          <p className="lead" data-reveal style={{ "--i": 1 }}>
            Plain answers to what people ask most. If yours is not here, we will gladly talk it through.
          </p>
          <button className="btn" type="button" data-reveal style={{ "--i": 2 }} onClick={() => goToId("begin")}>
            Ask us directly
          </button>
        </div>
        <div className="faq__list" data-reveal style={{ "--i": 1 }}>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
