import { useEffect, useRef } from "react";

/**
 * Calls `read` once, a moment after the instant `iso` has passed: the rent's
 * deadline, the time a closed shop opens, the pick-by time after a refusal.
 * The server decides what happened at that instant; this only makes the screen
 * ask. It is a prompt to read and never a verdict. With `skewMs` the phone's
 * clock is corrected by the server's, so a phone whose clock is off still reads
 * at the right moment; without it, it just reads early or late.
 */
export function useReadAt(iso: string | null | undefined, read: () => void, skewMs = 0) {
  const latest = useRef(read);
  latest.current = read;
  useEffect(() => {
    // `skewMs`: how far the server's clock is ahead of this phone's, when the booking said (P3-17).
    const left = new Date(iso ?? "").getTime() - (Date.now() + skewMs);
    if (!Number.isFinite(left) || left <= 0) return;
    const timer = setTimeout(() => latest.current(), left + 2000);
    return () => clearTimeout(timer);
  }, [iso, skewMs]);
}
