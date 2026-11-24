"use client";

import { goToProgress, goToId } from "@/lib/state";
import Helix from "@/components/Helix";
import { asset } from "@/lib/asset";

export default function Finale() {
  return (
    <>
      <section className="cover begin" id="begin" data-flow data-cover data-tone="light" aria-labelledby="h-begin">
        <figure className="begin__photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/photos/end.webp")} alt="A family walks through a park with their arms around each other, smiling." loading="lazy" decoding="async" />
          <figcaption className="display">
            More of the moments
            <br />
            that matter.
          </figcaption>
        </figure>
        <div className="begin__panel">
          <Helix className="begin__helix" />
          <h2 id="h-begin" className="display" data-reveal>
            Your next chapter starts with understanding.
          </h2>
          <p className="lead" data-reveal style={{ "--i": 1 }}>
            Discover a more personalized approach to longevity and health optimization.
          </p>
          <a
            className="btn btn--dark"
            data-reveal
            style={{ "--i": 2 }}
            href="mailto:concierge@aurelia.example?subject=Private%20enquiry&body=Hello%2C%20I%27d%20like%20to%20begin%20my%20journey."
          >
            <span>Begin your journey</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <p className="note-line" data-reveal style={{ "--i": 3 }}>
            Placeholder contact. A private enquiry opens an email to the concierge desk.
          </p>
        </div>
      </section>

      <footer className="foot" data-flow data-tone="dark">
        <div className="wrap">
          <p className="foot__mark display" aria-hidden="true" data-letters>
            {"Aurelia".split("").map((ch, i) => (
              <span className="l" key={i} style={{ "--k": i }}>
                {ch}
              </span>
            ))}
          </p>
          <div className="foot__row">
            <nav className="foot__nav" aria-label="Footer">
              <button type="button" onClick={() => goToProgress(0.16)}>
                The journey
              </button>
              <button type="button" onClick={() => goToProgress(0.355)}>
                Diagnostics
              </button>
              <button type="button" onClick={() => goToProgress(0.69)}>
                Cellular health
              </button>
              <button type="button" onClick={() => goToProgress(0.85)}>
                Regeneration
              </button>
              <button type="button" onClick={() => goToId("faq")}>
                FAQ
              </button>
              <button type="button" onClick={() => goToId("begin")}>
                Private enquiry
              </button>
            </nav>
            <p className="foot__fine">
              Aurelia Longevity is a concept brand. Everything on this page is illustrative and is not medical advice, a diagnosis or a promise of any
              result. The opening journey is a generated video sequence supplied for this concept. Photography from Unsplash: Land O&rsquo;Lakes, Inc.,
              Jennifer Kalenberg, National Cancer Institute, Vitaly Gariev, Khanh Do and Brooke Balentine.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
