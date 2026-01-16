import { useState, useEffect, useRef } from "react";

const TARGET_ACTIVE_TIME = 5000; // 5 seconds

/**
 * Simplified timer that tracks active tab time using requestAnimationFrame.
 * Dismisses the new tag after 5 seconds of active tab time.
 */
export function useNewTagTimer(
  isNew: boolean,
  onDismiss: () => void
): [boolean, () => void] {
  const [showNewTag, setShowNewTag] = useState(isNew);
  const activeMsRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  // Initialize from isNew prop
  useEffect(() => {
    if (isNew && !dismissedRef.current) {
      setShowNewTag(true);
      activeMsRef.current = 0;
      lastFrameTimeRef.current = null;
    } else if (!isNew) {
      setShowNewTag(false);
    }
  }, [isNew]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        lastFrameTimeRef.current = null; // Reset to restart timing
      } else {
        // Pause when hidden
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        lastFrameTimeRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Animation frame loop
  useEffect(() => {
    if (!showNewTag || !isNew || dismissedRef.current) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const updateTimer = (currentTime: number) => {
      if (document.visibilityState !== "visible") {
        lastFrameTimeRef.current = null;
        rafIdRef.current = requestAnimationFrame(updateTimer);
        return;
      }

      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = currentTime;
        rafIdRef.current = requestAnimationFrame(updateTimer);
        return;
      }

      const elapsed = currentTime - lastFrameTimeRef.current;
      activeMsRef.current += elapsed;
      lastFrameTimeRef.current = currentTime;

      if (activeMsRef.current >= TARGET_ACTIVE_TIME) {
        setShowNewTag(false);
        dismissedRef.current = true;
        onDismiss();
        return;
      }

      rafIdRef.current = requestAnimationFrame(updateTimer);
    };

    rafIdRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [showNewTag, isNew, onDismiss]);

  const dismiss = () => {
    setShowNewTag(false);
    dismissedRef.current = true;
    onDismiss();
  };

  return [showNewTag, dismiss];
}
