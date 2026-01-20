"use client";

import { useState, useEffect } from "react";

export function useExtensionInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Check if extension marker exists (set by content script)
    const checkMarker = () => {
      const marker = (window as any).__SHELF_EXTENSION_INSTALLED;
      return !!marker;
    };

    // Update state if marker is found
    const updateIfInstalled = () => {
      if (checkMarker()) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    // Check immediately
    updateIfInstalled();

    let interval: NodeJS.Timeout | null = null;

    // Listen for custom event from extension
    const handleExtensionInstalled = () => {
      setIsInstalled(true);
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    window.addEventListener("shelfExtensionInstalled", handleExtensionInstalled);

    // Check periodically in case extension loads after page load
    // Use shorter interval for faster detection
    interval = setInterval(() => {
      if (updateIfInstalled() && interval) {
        clearInterval(interval);
        interval = null;
      }
    }, 200);

    // Also check when tab becomes visible (user might have installed extension in another tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateIfInstalled();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also check on focus
    const handleFocus = () => {
      updateIfInstalled();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      window.removeEventListener(
        "shelfExtensionInstalled",
        handleExtensionInstalled
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { isInstalled };
}
