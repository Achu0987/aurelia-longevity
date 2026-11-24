// Scroll-to-frame timing. The supplied video drops a frame roughly every 24 frames, which shows as a small jump (a hitch) while the
// man walks in. Each transition between two frames gets a weight: 1 for a normal step, and more for a step that jumps further than its
// neighbours (measured from the frames themselves), so the scroll spends proportionally longer on it and the cross-fade hides the gap.
export const WEIGHTS = [1,1,1,1,1,1,1,1,1,1,1,1.72,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1.73,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1.76,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1.51,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1.37,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];

const CUM = [0];
for (const x of WEIGHTS) CUM.push(CUM[CUM.length - 1] + x);
const TOTAL = CUM[CUM.length - 1];

// progress (0..1 of the scroll) -> fractional frame index (0..count-1)
export function frameAt(progress) {
  const q = Math.min(1, Math.max(0, progress)) * TOTAL;
  let lo = 0;
  let hi = CUM.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (CUM[mid] <= q) lo = mid;
    else hi = mid;
  }
  return lo + (q - CUM[lo]) / (CUM[hi] - CUM[lo]);
}
