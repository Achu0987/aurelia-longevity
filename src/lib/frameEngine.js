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
    const cur = clamp(Math.round(this.display), 0, this.count - 1);
    for (const i of [cur, cur + 1, cur - 1, cur + 2, cur + 3, cur + 4]) {
      if (i >= 0 && i < this.count && !this.blobs[i] && !this.fetching.has(i)) return i;
    }
    while (this.cursor < this.order.length) {
      const i = this.order[this.cursor++];
      if (!this.blobs[i] && !this.fetching.has(i)) return i;
    }
    return -1;
  }

  async worker() {
    while (!this.dead) {
      const i = this.nextToFetch();
      if (i < 0) return;
      this.fetching.add(i);
      try {
        const res = await fetch(this.url(i));
        if (!res.ok) throw new Error(String(res.status));
        this.blobs[i] = await res.blob();
        if (Math.abs(i - this.display) < 4) this.dirty = true;
      } catch {
        this.order.push(i); // one quiet retry later in the order
      } finally {
        this.fetching.delete(i);
      }
    }
  }

  // ---- decoding: crop to the canvas aspect and resize to the canvas size in one step, off the main thread
  decodeFor(blob, factor) {
    const cw = Math.round(this.canvas.width * factor);
    const ch = Math.round(this.canvas.height * factor);
    const s = Math.max(cw / this.srcW, ch / this.srcH);
    const sw = Math.min(this.srcW, Math.round(cw / s));
    const sh = Math.min(this.srcH, Math.round(ch / s));
    const sx = Math.round((this.srcW - sw) * this.focusX);
    const sy = Math.round((this.srcH - sh) / 2);
    return createImageBitmap(blob, sx, sy, sw, sh, { resizeWidth: cw, resizeHeight: ch, resizeQuality: "high" });
  }

  plan(cur) {
    const d = this.dir >= 0 ? 1 : -1;
    const want = [cur];
    for (let k = 1; k <= Math.max(this.ahead, this.behind); k++) {
      if (k <= this.ahead) want.push(cur + d * k);
      if (k <= this.behind) want.push(cur - d * k);
    }
    this.pending = want.filter((i) => i >= 0 && i < this.count && !this.bitmaps.has(i) && !this.inflight.has(i));
    this.pump();
    // The kept window is fixed around the playhead and a little wider than what is planned, whichever way we are travelling.
    const lo = cur - this.behind - this.ahead;
    const hi = cur + this.ahead + this.behind;
    for (const [i, bmp] of this.bitmaps) {
      if (i < lo || i > hi) {
        bmp.close();
        this.bitmaps.delete(i);
      }
    }
  }

  pump() {
    while (this.inflight.size < 3 && this.pending.length) {
      const i = this.pending.shift();
      if (!this.blobs[i] || this.bitmaps.has(i) || this.inflight.has(i)) continue;
      const gen = this.gen;
      this.inflight.add(i);
      this.decodeFor(this.blobs[i], 1)
        .then((bmp) => {
          if (this.dead || gen !== this.gen) return bmp.close();
          this.bitmaps.set(i, bmp);
          if (Math.abs(i - this.display) < 3) this.dirty = true;
        })
        .catch((e) => console.warn("frame decode failed", i, e && e.message))
        .finally(() => {
          this.inflight.delete(i);
          this.pump();
        });
    }
  }

  async decodeCoarse(i) {
    const key = i;
    if (this.coarse.has(i) || !this.blobs[i] || this.coarseBusy.has(key) || this.coarseBusy.size >= 2) return;
    const gen = this.gen;
    this.coarseBusy.add(key);
    try {
      const bmp = await this.decodeFor(this.blobs[i], 0.5);
      if (this.dead || gen !== this.gen) bmp.close();
      else this.coarse.set(i, bmp);
    } catch (e) {
      console.warn("coarse decode failed", i, e && e.message);
    } finally {
      this.coarseBusy.delete(key);
    }
  }

  coarseNearest(cur) {
    let best = null;
    let bd = Infinity;
    for (const [i, bmp] of this.coarse) {
      const d = Math.abs(i - cur);
      if (d < bd) {
        bd = d;
        best = bmp;
      }
    }
    return best;
  }

  resize() {
    // Never paint more pixels than the source frames contain.
    const cssW = this.canvas.clientWidth || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5, this.srcW / cssW);
    const w = Math.max(2, Math.round(cssW * dpr * this.scale));
    const h = Math.max(2, Math.round(this.canvas.clientHeight * dpr * this.scale));
    if (w === this.canvas.width && h === this.canvas.height) return;
    // keep what is on screen while the new size warms up, so a resize never flashes black
    let snap = null;
    if (this.hasDrawn) {
      snap = document.createElement("canvas");
      snap.width = this.canvas.width;
      snap.height = this.canvas.height;
      snap.getContext("2d").drawImage(this.canvas, 0, 0);
    }
    this.canvas.width = w;
    this.canvas.height = h;
    if (snap) this.ctx.drawImage(snap, 0, 0, w, h);
    // the decoded frames no longer match this size: drop them and decode again at the new size
    this.gen++;
    for (const b of this.bitmaps.values()) b.close();
    for (const b of this.coarse.values()) b.close();
    this.bitmaps.clear();
    this.coarse.clear();
    this.pending = [];
    this.dirty = true;
    this.drawn = -1;
    this.drawnPos = -1;
  }

  // scroll progress goes through the timing table, which gives the video's dropped-frame jumps a little more scroll
  setTarget(progress) {
    this.target = frameAt(progress);
  }

  jump(progress) {
    this.target = this.display = frameAt(progress);
    this.dirty = true;
  }

  // the decoded frame nearest to i (within a few frames), so the picture never freezes while a decode catches up
  nearest(i, reach = 4) {
    if (this.bitmaps.has(i)) return i;
    for (let k = 1; k <= reach; k++) {
      const a = i - k * this.dir;
      const b = i + k * this.dir;
      if (this.bitmaps.has(a)) return a;
      if (this.bitmaps.has(b)) return b;
    }
    return -1;
  }

  // Call once per animation tick (time in milliseconds).
  step(t) {
    if (this.dead || !this.visible) return;
    const raw = (t - this.last) / 1000 || 0.016;
    const dt = Math.min(0.05, raw);
    this.last = t;
    // if frames keep taking too long while the page is moving, lower the canvas resolution once and stop the extras
    if (!this.lowPower && Math.abs(this.target - this.display) > 0.02) {
      this.slow = raw > 0.034 ? this.slow + 1 : Math.max(0, this.slow - 2);
      if (this.slow > 50) {
        this.lowPower = true;
        this.scale = 0.72;
        this.resize();
        this.onLowPower?.();
      }
    }

    const diff = this.target - this.display;
    if (Math.abs(diff) > 0.003) {
      this.dir = diff > 0 ? 1 : -1;
      this.display += this.reduced ? diff : diff * (1 - Math.exp(-dt * this.rate));
    } else if (diff !== 0) {
      this.display = this.target;
    }

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
