"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, MutableRefObject } from "react";

export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function useLiveTyping(texts: string[], charDelay = 40, pauseMs = 2000): string {
  const [textIndex, setTextIndex] = useState(0);
  const [output, setOutput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!texts.length) return;
    const full = texts[textIndex] ?? "";
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && output.length < full.length) {
      timeout = setTimeout(() => setOutput(full.slice(0, output.length + 1)), charDelay);
    } else if (!deleting && output.length === full.length) {
      timeout = setTimeout(() => setDeleting(true), pauseMs);
    } else if (deleting && output.length > 0) {
      timeout = setTimeout(() => setOutput(output.slice(0, -1)), Math.max(20, charDelay / 2));
    } else {
      timeout = setTimeout(() => {
        setDeleting(false);
        setTextIndex((prev) => (prev + 1) % texts.length);
      }, 120);
    }
    return () => clearTimeout(timeout);
  }, [texts, textIndex, output, deleting, charDelay, pauseMs]);

  return output;
}

type Ripple = { id: string; x: number; y: number };

export function useRipple(): [
  MutableRefObject<HTMLElement | null>,
  Ripple[],
  (ev: ReactMouseEvent<HTMLElement>) => void,
] {
  const ref = useRef<HTMLElement | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const createRipple = useCallback((ev: ReactMouseEvent<HTMLElement>) => {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const ripple = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
  }, []);

  return [ref, ripples, createRipple];
}

export function useGlowOnHover(color = "#6366f1"): [
  MutableRefObject<HTMLElement | null>,
  CSSProperties,
] {
  const ref = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  const style = useMemo<CSSProperties>(
    () => ({
      boxShadow: hovered ? `0 0 24px ${color}40` : "none",
      transition: "box-shadow 0.3s ease",
    }),
    [hovered, color]
  );

  return [ref, style];
}

export function useMagneticButton(): [
  MutableRefObject<HTMLElement | null>,
  CSSProperties,
] {
  const ref = useRef<HTMLElement | null>(null);
  const [current, setCurrent] = useState({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const move = (ev: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const rx = ev.clientX - (rect.left + rect.width / 2);
      const ry = ev.clientY - (rect.top + rect.height / 2);
      target.current = {
        x: Math.max(-6, Math.min(6, rx / 8)),
        y: Math.max(-6, Math.min(6, ry / 8)),
      };
    };

    const leave = () => {
      target.current = { x: 0, y: 0 };
    };

    const animate = () => {
      setCurrent((prev) => ({
        x: prev.x + (target.current.x - prev.x) * 0.18,
        y: prev.y + (target.current.y - prev.y) * 0.18,
      }));
      raf = requestAnimationFrame(animate);
    };

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(animate);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return [
    ref,
    {
      transform: `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`,
    },
  ];
}

