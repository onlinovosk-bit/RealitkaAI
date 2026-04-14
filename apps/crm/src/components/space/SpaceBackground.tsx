"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function SpaceBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const mouseTarget = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = prefersReducedMotion();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const count = 4000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 900;
      positions[i3 + 1] = (Math.random() - 0.5) * 700;
      positions[i3 + 2] = (Math.random() - 0.5) * 800;

      const r = Math.random();
      if (r < 0.8) color.set("#ffffff");
      else if (r < 0.95) color.set("#93c5fd");
      else color.set("#c4b5fd");
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 1.35, vertexColors: true, transparent: true, opacity: 0.9 });
    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    const onMove = (ev: MouseEvent) => {
      mouseTarget.current.x = (ev.clientX / window.innerWidth - 0.5) * 30;
      mouseTarget.current.y = (ev.clientY / window.innerHeight - 0.5) * 30;
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(document.body);

    let raf = 0;
    const animate = () => {
      stars.rotation.y += 0.00008;
      stars.position.x += (mouseTarget.current.x - stars.position.x) * 0.02;
      stars.position.y += (-mouseTarget.current.y - stars.position.y) * 0.02;
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />
      <div
        className="absolute -left-32 -top-20 h-[600px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)", opacity: 0.06 }}
      />
      <div
        className="absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", opacity: 0.05 }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-[nebulaPulse_8s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", opacity: 0.04 }}
      />
      <div
        className="absolute inset-0 animate-[spaceGrid_12s_linear_infinite]"
        style={{
          transform: "perspective(800px) rotateX(60deg)",
          transformOrigin: "center top",
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

