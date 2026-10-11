import { useEffect, useRef } from "react";

/**
 * Calls `read` once, a moment after the instant `iso` has passed: the rent's
 * deadline, the time a closed shop opens, the pick-by time after a refusal.
 * The server decides what happened at that instant; this only makes the screen
 * ask. It runs on the phone's clock, so it is a prompt to read and never a
 * verdict, and a phone whose clock is off just reads early or late.
 */
export function useReadAt(iso: string | null | undefined, read: () => void) {
  const latest = useRef(read);
  latest.current = read;
  useEffect(() => {
    const left = new Date(iso ?? "").getTime() - Date.now();
    if (!Number.isFinite(left) || left <= 0) return;
    const timer = setTimeout(() => latest.current(), left + 2000);
    return () => clearTimeout(timer);
  }, [iso]);
}
