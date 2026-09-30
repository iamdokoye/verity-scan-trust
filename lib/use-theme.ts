"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

export const THEME_KEY = "votta-theme";

/**
 * Inline script (rendered in <head>) that applies the saved or system theme
 * before first paint, so there is no light/dark flash on load.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`;

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";
const getServerSnapshot = (): Theme => "light";

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((l) => l());
  }, []);

  return { theme, toggle };
}
