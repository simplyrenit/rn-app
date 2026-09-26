import { uuidv4 } from "@/lib/uuid";

/**
 * Funnel analytics for the listing flow (IMPLEMENTATION.md §6).
 *
 * Events are queued in memory and posted in batches: at 20 events, every 10 s,
 * and when the app goes to the background — the last one matters most, since a
 * user who abandons the flow usually does it by leaving the app. Analytics must
 * never get in the way of the flow, so every failure here is swallowed.
 */

export type EventName =
  | "listing_started"
  | "photo_added"
  | "photo_removed"
  | "manual_path_chosen"
  | "extraction_started"
  | "extraction_first_field"
  | "extraction_completed"
  | "extraction_failed"
  | "extraction_rate_limited"
  | "warning_shown"
  | "warning_action"
  | "review_opened"
  | "field_edited"
  | "condition_confirmed"
  | "price_entered"
  | "deposit_changed"
  | "preview_opened"
  | "listing_submitted"
  | "listing_submit_failed"
  | "draft_saved"
  | "draft_resumed"
  | "draft_discarded";

export interface QueuedEvent {
  name: EventName;
  attempt_id: string | null;
  session_id: string;
  platform: string;
  app_version: string;
  props: Record<string, unknown>;
  client_ts: string;
}

export interface EventQueueOptions {
  send: (events: QueuedEvent[]) => Promise<void>;
  sessionId: string;
  platform: string;
  appVersion: string;
  now?: () => number;
  /** Flush as soon as this many are waiting. */
  flushAt?: number;
  /** Flush whatever is waiting this long after the first queued event. */
  intervalMs?: number;
  /** The server accepts up to 50 per call (§6). */
  maxBatch?: number;
  /** Drop the oldest beyond this, so an offline session cannot grow forever. */
  maxQueued?: number;
}

export function createEventQueue({
  send,
  sessionId,
  platform,
  appVersion,
  now = Date.now,
  flushAt = 20,
  intervalMs = 10_000,
  maxBatch = 50,
  maxQueued = 500,
}: EventQueueOptions) {
  let queue: QueuedEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const flush = async (): Promise<void> => {
    clearTimer();
    if (inFlight) {
      await inFlight;
      if (queue.length === 0) return;
    }
    if (queue.length === 0) return;

    const batch = queue.slice(0, maxBatch);
    queue = queue.slice(batch.length);

    inFlight = send(batch)
      .catch(() => {
        // Put the batch back in front for the next flush. Order matters less
        // than not losing the funnel's last steps to a dropped connection.
        queue = [...batch, ...queue].slice(-maxQueued);
      })
      .finally(() => {
        inFlight = null;
      });
    await inFlight;

    // Anything beyond one batch goes straight out rather than waiting 10 s.
    if (queue.length >= flushAt) await flush();
    else if (queue.length > 0 && !timer) timer = setTimeout(() => void flush(), intervalMs);
  };

  const track = (
    name: EventName,
    props: Record<string, unknown> = {},
    attemptId: string | null = null
  ) => {
    queue.push({
      name,
      attempt_id: attemptId,
      session_id: sessionId,
      platform,
      app_version: appVersion,
      props,
      client_ts: new Date(now()).toISOString(),
    });
    if (queue.length > maxQueued) queue = queue.slice(-maxQueued);

    if (queue.length >= flushAt) {
      void flush();
    } else if (!timer) {
      timer = setTimeout(() => void flush(), intervalMs);
    }
  };

  return {
    track,
    flush,
    size: () => queue.length,
    dispose: clearTimer,
  };
}

export type EventQueue = ReturnType<typeof createEventQueue>;

// ---- The app's queue ---------------------------------------------------------

let appQueue: EventQueue | null = null;

/**
 * Built on first use, not at import, so importing `track` costs nothing and
 * pulls no native modules into a unit test.
 */
function getAppQueue(): EventQueue {
  if (appQueue) return appQueue;

  // Required lazily for the same reason: these touch native modules.
  const { AppState, Platform } = require("react-native") as typeof import("react-native");
  const Application = require("expo-application") as typeof import("expo-application");
  const Constants = (require("expo-constants") as typeof import("expo-constants")).default;
  const axiosInstance = (require("@/lib/networkUtils") as typeof import("@/lib/networkUtils"))
    .default;
  const { EVENTS } = require("@/lib/config") as typeof import("@/lib/config");

  const queue = createEventQueue({
    sessionId: uuidv4(),
    platform: Platform.OS,
    appVersion:
      Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "unknown",
    send: async (events) => {
      await axiosInstance.post(EVENTS, { events });
    },
  });

  AppState.addEventListener("change", (state) => {
    if (state === "background" || state === "inactive") void queue.flush();
  });

  appQueue = queue;
  return queue;
}

/** Record one funnel event. Fire-and-forget; never throws. */
export function track(
  name: EventName,
  props: Record<string, unknown> = {},
  attemptId: string | null = null
) {
  try {
    getAppQueue().track(name, props, attemptId);
  } catch {
    // Analytics is a garnish; a failure here must not break the flow.
  }
}
