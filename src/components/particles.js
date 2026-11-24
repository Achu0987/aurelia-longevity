import * as THREE from "three";
import { seq, pointer } from "@/lib/state";

const VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uProgress;
  uniform float uPx;
  uniform vec2 uPointer;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.15 + aSeed * 6.2831) * 0.35;
    p.y += cos(uTime * 0.12 + aSeed * 12.566) * 0.3 + uTime * 0.03 * (0.3 + aSeed);
    p.y = mod(p.y + 6.0, 12.0) - 6.0;
    p.z = mod(p.z + uProgress * 22.0 + 8.0, 16.0) - 12.0;
    p.xy += uPointer * (p.z + 12.0) * 0.035;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = aSize * uPx * (34.0 / depth);
    vAlpha = smoothstep(19.0, 5.0, depth) * smoothstep(0.6, 2.8, depth);
    vColor = color;
  }
`;

const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha * uOpacity);
  }
`;

// Gold dust floating in front of the frames. It travels with the scroll and drifts with the pointer.
export function createParticles(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 40);
  camera.position.z = 8;

  const small = window.innerWidth < 800;
  const N = small ? 650 : 1500;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const size = new Float32Array(N);
  const gold = new THREE.Color("#d9bd82");
  const ivory = new THREE.Color("#fbf6ea");
  const mist = new THREE.Color("#cfe4f2");
  const tmp = new THREE.Color();
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = Math.random() * 16 - 12;
    const r = Math.random();
    tmp.copy(r < 0.55 ? gold : r < 0.85 ? ivory : mist);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
    seed[i] = Math.random();
    size[i] = 0.5 + Math.pow(Math.random(), 3) * 2.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPx: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
      uOpacity: { value: 0.3 },
    },
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const fit = () => {
    const dpr = 1; // soft dust does not need more pixels, and a full-screen layer at 1x keeps scrolling light
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(Math.round(w * 0.5), Math.round(h * 0.5), false); // dust is soft, half resolution is plenty and much cheaper
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    mat.uniforms.uPx.value = dpr * Math.min(1, h / 900 + 0.35);
  };
  fit();

  let visible = true;
  let raf = 0;
  let last = performance.now();
  let t = 0;
  let px = 0;
  let py = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (seq.lowPower) {
      if (canvas.style.display !== "none") canvas.style.display = "none";
      return;
    }
    if (!visible || seq.covered) return;
    // 30 frames a second is enough for drifting dust
    if (now - last < 30) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += reduced ? 0 : dt;
    px += (pointer.x - px) * 0.04;
    py += (pointer.y - py) * 0.04;
    const p = seq.p;
    // a quiet mist in the bright clinic, a rich field once the camera is inside the body
    const target = 0.16 + 0.8 * THREE.MathUtils.smoothstep(p, 0.46, 0.62);
    mat.uniforms.uOpacity.value += (target - mat.uniforms.uOpacity.value) * 0.06;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uProgress.value = p + seq.extra * 0.5;
    mat.uniforms.uPointer.value.set(px, py);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  });
  io.observe(canvas);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
