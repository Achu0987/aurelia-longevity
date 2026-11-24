// The story, mapped to scroll progress through the frame sequence.
// Frame numbers refer to the 240 unique frames (original frames 1 to 600, duplicates removed).
//   f001-f080  the patient walks through the clinic          (p 0.00 - 0.33)
//   f080-f120  consultation, then the full-body scan          (p 0.33 - 0.50)
//   f120-f160  the camera enters the body: heart, vessels     (p 0.50 - 0.67)
//   f160-f200  cells, DNA, mitochondria                       (p 0.67 - 0.83)
//   f200-f240  a glowing cell, regeneration                   (p 0.83 - 1.00)

export const CHAPTERS = [
  { id: "hero", nav: null, from: -1, to: 0.055, tone: "dark" },
  { id: "journey", nav: "The journey", from: 0.15, to: 0.315, tone: "light" },
  { id: "diagnostics", nav: "Diagnostics", from: 0.345, to: 0.475, tone: "light" },
  { id: "inside", nav: null, from: 0.525, to: 0.645, tone: "dark" },
  { id: "cells", nav: "Cellular health", from: 0.68, to: 0.805, tone: "dark" },
  { id: "regeneration", nav: "Regeneration", from: 0.84, to: 0.925, tone: "dark" },
  { id: "outcome", nav: null, from: 0.94, to: 0.985, tone: "dark" },
];

// Where the frames turn dark and microscopic.
export const DARK_FROM = 0.49;

// Callouts that stay on the thing they explain. Frame numbers are 1-based (the 240 unique frames); x and y are percentages of the
// 1920x1080 frame, read off the frames themselves. Between keyframes the position is interpolated, so a callout rides with its object
// as the camera moves. "f" is the range of frames where the callout is shown.
export const NOTES = [
  { id: "beam", label: "Whole-body imaging", text: "Organs, vessels and bone, mapped in one visit.", side: "right", f: [88, 101],
    k: [[88, 52, 52], [94, 52, 64], [100, 52, 80], [104, 52, 94]] },
  { id: "neck", label: "Biomarker profile", text: "Markers of metabolism, hormones and inflammation.", side: "right", f: [94, 117],
    k: [[88, 50, 38], [100, 50, 38], [106, 50, 36], [112, 50, 43], [118, 50, 52]] },
  { id: "chest", label: "Cardiovascular baseline", text: "A reference point to follow across the years.", side: "right", f: [102, 119],
    k: [[88, 55, 56], [94, 55, 60], [100, 55, 64], [106, 56, 66], [112, 56, 72], [118, 58, 80]] },
  { id: "mito", label: "Mitochondria", text: "The structures that turn fuel into cellular energy.", side: "right", f: [166, 194],
    k: [[165, 40, 75], [170, 39, 71], [175, 38, 76], [180, 36, 81], [185, 34, 83], [190, 28, 86], [194, 30, 90], [198, 35, 88]] },
  { id: "dna", label: "DNA", text: "The instructions every cell carries.", side: "right", f: [172, 198],
    k: [[165, 55, 40], [170, 52, 48], [175, 66, 50], [180, 62, 50], [185, 68, 58], [190, 76, 56], [194, 78, 48], [198, 78, 52], [202, 88, 54]] },
  { id: "cell", label: "The cell", text: "Where ageing is measured, and where care begins.", side: "top", f: [178, 199],
    k: [[165, 50, 50], [175, 50, 53], [185, 50, 50], [194, 50, 47], [202, 48, 44]] },
];

// where a callout sits at a (fractional) frame number
export function notePoint(note, frame) {
  const k = note.k;
  if (frame <= k[0][0]) return [k[0][1], k[0][2]];
  for (let i = 0; i < k.length - 1; i++) {
    const [f0, x0, y0] = k[i];
    const [f1, x1, y1] = k[i + 1];
    if (frame <= f1) {
      const t = (frame - f0) / (f1 - f0);
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
  }
  const last = k[k.length - 1];
  return [last[1], last[2]];
}

// The stepper on the right edge: where the visitor is in the journey.
export const STEPS = [
  { id: "arrive", label: "Arrive", at: 0 },
  { id: "consult", label: "Consult", at: 0.14 },
  { id: "scan", label: "Scan", at: 0.33 },
  { id: "inside", label: "Inside", at: 0.5 },
  { id: "cells", label: "Cells", at: 0.66 },
  { id: "regenerate", label: "Regenerate", at: 0.82 },
  { id: "live", label: "Live", at: 0.935 },
];

// The gold scan line sweeps the screen while the patient is scanned.
export const SCAN = { from: 0.375, to: 0.49 };
