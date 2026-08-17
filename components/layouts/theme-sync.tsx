"use client";

import React from "react";
import { useTheme } from "next-themes";

/**
 * Renders nothing — on mount, pulls the user's server-persisted theme
 * preference and applies it once so login on a fresh browser (no
 * localStorage) still lands on the theme the user picked last time.
 */
export function ThemeSync() {
  const { setTheme, theme } = useTheme();
  const synced = React.useRef(false);

  React.useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    (async () => {
      try {
        const res = await fetch("/api/settings/theme", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const serverTheme = json?.data?.theme;
        if (serverTheme && serverTheme !== theme) {
          setTheme(serverTheme);
        }
      } catch {
        // silent — theme sync is a nicety, not worth surfacing a network error for
      }
    })();
  }, [setTheme, theme]);

  return null;
}
