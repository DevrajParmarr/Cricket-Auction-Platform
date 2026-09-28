"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./format";

/**
 * Tweens a number towards `value`. A new value interrupts the running tween and
 * continues from wherever it currently is. Changing `resetKey` (e.g. a new player)
 * snaps straight to the value instead of counting from the previous one.
 */
export function useAnimatedNumber(value: number, resetKey?: string | number, duration = 650): number {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const keyRef = useRef(resetKey);

  useEffect(() => {
    const snap = keyRef.current !== resetKey || prefersReducedMotion();
    keyRef.current = resetKey;
    const from = displayRef.current;

    if (snap || from === value) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, resetKey, duration]);

  return display;
}
