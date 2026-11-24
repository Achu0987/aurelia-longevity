"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { pointer } from "@/lib/state";

// A slow double helix for the final call to action. It turns with time, leans toward the pointer, and only renders while on screen.
export default function Helix({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      canvas.style.display = "none";
      return;
    }
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 15);

    const group = new THREE.Group();
    scene.add(group);
    const N = 44;
    const H = 9;
    const R = 1.25;
    const turns = 2.6;
    const ink = new THREE.Color("#1d1a16");
    const gold = new THREE.Color("#a8802f");
    const a = [];
    const b = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const ang = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * H;
      a.push(new THREE.Vector3(Math.cos(ang) * R, y, Math.sin(ang) * R));
      b.push(new THREE.Vector3(Math.cos(ang + Math.PI) * R, y, Math.sin(ang + Math.PI) * R));
    }
    const dotGeo = new THREE.SphereGeometry(0.11, 14, 14);
    const dotA = new THREE.MeshBasicMaterial({ color: ink });
    const dotB = new THREE.MeshBasicMaterial({ color: gold });
    for (let i = 0; i < N; i++) {
      const m1 = new THREE.Mesh(dotGeo, dotA);
      m1.position.copy(a[i]);
      const m2 = new THREE.Mesh(dotGeo, dotB);
      m2.position.copy(b[i]);
      group.add(m1, m2);
    }
    const rungPts = [];
    for (let i = 1; i < N - 1; i += 2) rungPts.push(a[i], b[i]);
    const rungs = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rungPts), new THREE.LineBasicMaterial({ color: gold, transparent: true, opacity: 0.55 }));
    group.add(rungs);
    group.rotation.z = 0.32;

    const fit = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(() => {
      fit();
      renderer.render(scene, camera);
    });
    ro.observe(canvas);

    let visible = false;
    let raf = 0;
    let t = 0;
    let last = performance.now();
    let lean = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += reduced ? 0 : dt;
      lean += (pointer.x * 0.35 - lean) * 0.05;
      group.rotation.y = t * 0.45 + lean;
      renderer.render(scene, camera);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = performance.now();
      if (visible && reduced) renderer.render(scene, camera);
    });
    io.observe(canvas);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      dotGeo.dispose();
      dotA.dispose();
      dotB.dispose();
      rungs.geometry.dispose();
      rungs.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
