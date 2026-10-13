import { correctedNow } from "@/lib/server-clock";
import { useEffect, useState } from "react";

/**
 * "Now" by the server's clock (API-CONTRACT P3-17): the booking's `server_time`
 * and when that answer arrived (react-query's `dataUpdatedAt`), moved on by the
 * phone's own seconds. With `everyMs` the screen draws again on that beat, for a
 * countdown; without it the value is worked out at each draw.
 */
export function useServerNow(serverTime: string | null | undefined, receivedAt: number, everyMs?: number): Date {
  const [, beat] = useState(0);
  useEffect(() => {
    if (!everyMs) return;
    const timer = setInterval(() => beat((n) => n + 1), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return correctedNow(serverTime, receivedAt);
}
