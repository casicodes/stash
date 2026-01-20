"use client";

import { useState, useEffect, useCallback } from "react";

export function useExtensionInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  const checkMarker = useCallback(() => {
    if (typeof window === "undefined") return false;
    const marker = (window as any).__SHELF_EXTENSION_INSTALLED;
    return !!marker;
  }, []);

  const updateIfInstalled = useCallback(() => {
    if (checkMarker()) {
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [checkMarker]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Check immediately
    if (updateIfInstalled()) {
      return;
    }

    let interval: NodeJS.Timeout | null = null;
    let checkCount = 0;
    const maxChecks = 150; // Check for 30 seconds (150 * 200ms)

    // Listen for custom event from extension
    const handleExtensionInstalled = () => {
      setIsInstalled(true);
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    window.addEventListener("shelfExtensionInstalled", handleExtensionInstalled);

    // Check very frequently at first, then slow down
    interval = setInterval(() => {
      checkCount++;
      
      if (updateIfInstalled() && interval) {
        clearInterval(interval);
        interval = null;
        return;
      }

      // Stop checking after max attempts to avoid infinite polling
      if (checkCount >= maxChecks && interval) {
        clearInterval(interval);
        interval = null;
      }
    }, 200);

    // Also check when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateIfInstalled();
        // Reset check count when tab becomes visible to keep checking
        checkCount = 0;
        if (!interval && !isInstalled) {
          interval = setInterval(() => {
            checkCount++;
            if (updateIfInstalled() && interval) {
              clearInterval(interval);
              interval = null;
              return;
            }
            if (checkCount >= maxChecks && interval) {
              clearInterval(interval);
              interval = null;
            }
          }, 200);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also check on focus
    const handleFocus = () => {
      updateIfInstalled();
      checkCount = 0;
      if (!interval && !isInstalled) {
        interval = setInterval(() => {
          checkCount++;
          if (updateIfInstalled() && interval) {
            clearInterval(interval);
            interval = null;
            return;
          }
          if (checkCount >= maxChecks && interval) {
            clearInterval(interval);
            interval = null;
          }
        }, 200);
      }
    };

    window.addEventListener("focus", handleFocus);

    // Check on page load completion
    const handleLoad = () => {
      updateIfInstalled();
    };
    
    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
    }

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
      window.removeEventListener("load", handleLoad);
    };
  }, [updateIfInstalled, isInstalled]);

  return { isInstalled };
}
