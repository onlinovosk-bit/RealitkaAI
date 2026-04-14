"use client";

import { useCallback, useEffect, useState } from "react";

import {
  APP_MODE_COOKIE,
  APP_MODE_STORAGE_KEY,
  type AppMode,
} from "@/lib/app-mode-types";

function readStoredMode(): AppMode {
  if (typeof window === "undefined") return "production";
  try {
    const fromLs = window.localStorage.getItem(APP_MODE_STORAGE_KEY) as AppMode | null;
    if (fromLs === "demo" || fromLs === "production") return fromLs;
    const match = document.cookie.match(new RegExp(`(?:^|; )${APP_MODE_COOKIE}=([^;]*)`));
    const fromCookie = match?.[1];
    if (fromCookie === "demo" || fromCookie === "production") return fromCookie;
  } catch {
    /* ignore */
  }
  return "production";
}

function persistMode(mode: AppMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${APP_MODE_COOKIE}=${mode}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function useAppMode() {
  const [mode, setModeState] = useState<AppMode>("production");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setModeState(readStoredMode());
    setHydrated(true);
  }, []);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    persistMode(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "demo" ? "production" : "demo";
      persistMode(next);
      return next;
    });
  }, []);

  return { mode, setMode, toggleMode, hydrated };
}
