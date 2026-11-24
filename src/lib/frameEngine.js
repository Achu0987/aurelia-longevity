import { asset } from "@/lib/asset";
import { frameAt } from "@/lib/frameTiming";
// Canvas image-sequence engine, built to stay perfectly steady while scrolling.
//
// How it avoids lag and shake:
// - Every frame is cropped and resized to the exact pixel size of the canvas while it is DECODED (off the main thread), so each tick is a
//   plain 1:1 copy to the canvas. No resampling on the scroll path.
// - The push-in zoom is a CSS transform on the canvas element, which the GPU compositor does for free.
// - Decoding goes through a small queue, nearest frames first, in the direction of travel; the decoded window is fixed around the playhead
//   (it does not change when the scroll direction flips), so nothing is evicted and re-decoded when the visitor stops.
// - A frame that is not ready yet is waited for. The picture is never swapped for a neighbour, so nothing flickers back and forth.
// - It is driven by the same ticker as the smooth scroll (call step() once per tick).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class FrameEngine {
  constructor({ canvas, count, folder = "", reduced = false, onTick, onFirstDraw, onLowPower }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.count = count;
    this.folder = folder;
    this.reduced = reduced;
    this.onTick = onTick;
    this.onFirstDraw = onFirstDraw;
    this.onLowPower = onLowPower;

    // size of the frames in the folder we load
    this.srcW = folder === "sm/" ? 1024 : folder === "md/" ? 1440 : 1920;
    this.srcH = Math.round((this.srcW * 9) / 16);

    this.blobs = new Array(count).fill(null);
    this.bitmaps = new Map(); // decoded at exactly the canvas size
    this.coarse = new Map(); // half-size copies of every 10th frame, kept so a big jump still shows the right scene at once
    this.fetching = new Set();
    this.inflight = new Set();
    this.coarseBusy = new Set();
    this.pending = [];
    this.gen = 0; // changes whenever the canvas size changes, so stale decodes are dropped
    this.target = 0;
    this.display = 0;
    this.drawn = -1;
    this.zoom = 1;
    this.zoomApplied = 1;
    this.focusX = 0.5;
    this.dirty = true;
    this.dead = false;
    this.visible = true;
    this.hasDrawn = false;
    this.last = 0;
    this.cursor = 0;
    this.dir = 1;
    this.rate = 26;
    this.scale = 1; // drops to 0.72 if this device cannot keep up
    this.slow = 0;
    this.lowPower = false;
    this.ahead = 18;
    this.behind = 6;
    this.drawnPos = -1; // the fractional position last painted (two frames cross-faded)

    // Load order: opening frames, a coarse pass every 6th frame, then everything else in sequence.
    const first = Array.from({ length: Math.min(12, count) }, (_, i) => i);
    const coarse = [];
    for (let i = 12; i < count; i += 6) coarse.push(i);
    const rest = [];
    for (let i = 12; i < count; i++) if ((i - 12) % 6 !== 0) rest.push(i);
    this.order = [...first, ...coarse, ...rest];
  }

  url(i) {
    return asset(`/frames/${this.folder}f${String(i + 1).padStart(3, "0")}.webp`);
  }

  start() {
    this.resize();
    for (let w = 0; w < 5; w++) this.worker();
  }

  nextToFetch() {
    const pos = clamp(this.display, 0, this.count - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(this.count - 1, lo + 1);
    const frac = pos - lo;
    const cur = frac < 0.5 ? lo : hi;
    if (cur !== this.drawn || this.dirty || this.pending.length || this.inflight.size === 0) this.plan(cur);
    if (this.coarse.size < Math.ceil(this.count / 10)) {
      for (let i = 0; i < this.count; i += 10) this.decodeCoarse(i);
    }

    if (this.dirty || Math.abs(pos - this.drawnPos) > 0.004) {
      const base = this.nearest(lo);
      if (base >= 0 && (this.hasDrawn || base === lo) && Math.abs(base - lo) <= 4) {
        // two neighbouring frames blended by the fractional position: motion stays continuous between the 240 stills
        this.ctx.globalAlpha = 1;
        this.ctx.drawImage(this.bitmaps.get(base), 0, 0);
        const top = this.bitmaps.get(hi);
        if (base === lo && hi !== lo && frac > 0.01 && top) {
          this.ctx.globalAlpha = frac;
          this.ctx.drawImage(top, 0, 0);
          this.ctx.globalAlpha = 1;
        }
        this.drawn = base === lo ? cur : base;
        this.drawnPos = base === lo && (top || frac <= 0.01) ? pos : -1;
        this.dirty = base !== lo;
        this.first();
      } else if (!this.hasDrawn || Math.abs(cur - this.drawn) > 30) {
        // a big jump (or the very first picture): show the right scene roughly, then sharpen as the real frames arrive
        const c = this.coarseNearest(cur);
        if (c) {
          this.ctx.drawImage(c, 0, 0, this.canvas.width, this.canvas.height);
          this.drawn = cur;
          this.drawnPos = -1;
          this.dirty = true;
          this.first();
        }
      }
    }

    // the slow push-in is a compositor transform, so it costs nothing per frame
    if (this.zoom !== this.zoomApplied) {
      this.canvas.style.transform = `scale(${this.zoom.toFixed(4)})`;
      this.zoomApplied = this.zoom;
    }
    this.onTick?.(this.display / (this.count - 1));
  }

  first() {
    if (!this.hasDrawn) {
      this.hasDrawn = true;
      this.onFirstDraw?.();
    }
  }

  destroy() {
    this.dead = true;
    for (const bmp of this.bitmaps.values()) bmp.close();
    this.bitmaps.clear();
    for (const bmp of this.coarse.values()) bmp.close();
    this.coarse.clear();
    this.blobs.fill(null);
  }
}
