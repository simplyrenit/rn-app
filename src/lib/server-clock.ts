/**
 * The time now by the server's clock, from a `server_time` that came in an answer
 * (API-CONTRACT P3-17). The phone's clock is only used for the time since the
 * answer arrived: the difference between the two clocks at that moment is
 * corrected, so a phone whose clock is wrong still says "today", "yesterday" and
 * how long is left correctly. Without a `server_time` the phone's own clock is all
 * there is.
 *
 * `receivedAt` is when the answer arrived (`Date.now()` then; react-query's
 * `dataUpdatedAt`).
 */
export function correctedNow(
  serverTime: string | null | undefined,
  receivedAt: number,
  nowMs: number = Date.now()
): Date {
  const server = Date.parse(serverTime ?? "");
  return new Date(Number.isFinite(server) ? server + Math.max(nowMs - receivedAt, 0) : nowMs);
}

/**
 * How far the server's clock is ahead of this phone's, in milliseconds, from the
 * same pair. For a screen that stamps things later on (a photo's `taken_at`) and
 * only has room to carry one number. 0 when the answer had no `server_time`.
 */
export function clockSkewMs(serverTime: string | null | undefined, receivedAt: number): number {
  const server = Date.parse(serverTime ?? "");
  return Number.isFinite(server) ? server - receivedAt : 0;
}
