import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createEventQueue, QueuedEvent } from "../../events";

function setup(send: (events: QueuedEvent[]) => Promise<void> = () => Promise.resolve()) {
  const sent: QueuedEvent[][] = [];
  const queue = createEventQueue({
    sessionId: "session-1",
    platform: "ios",
    appVersion: "2.0.0",
    now: () => Date.UTC(2026, 8, 26, 10, 0, 0),
    send: (events) => {
      sent.push(events);
      return send(events);
    },
  });
  return { queue, sent };
}

// Let the promise chain inside flush() settle.
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe("event queue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("holds events until 20 are waiting, then sends them in one batch", async () => {
    const { queue, sent } = setup();
    for (let i = 0; i < 19; i++) queue.track("photo_added", { index: i }, "attempt-1");
    await settle();
    expect(sent).toHaveLength(0);

    queue.track("photo_added", { index: 19 }, "attempt-1");
    await settle();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toHaveLength(20);
    expect(queue.size()).toBe(0);
  });

  it("flushes whatever is waiting after 10 s", async () => {
    const { queue, sent } = setup();
    queue.track("listing_started", { resumed_draft: false }, "attempt-1");
    jest.advanceTimersByTime(9_999);
    await settle();
    expect(sent).toHaveLength(0);
    jest.advanceTimersByTime(1);
    await settle();
    expect(sent).toHaveLength(1);
    expect(sent[0][0]).toEqual({
      name: "listing_started",
      attempt_id: "attempt-1",
      session_id: "session-1",
      platform: "ios",
      app_version: "2.0.0",
      props: { resumed_draft: false },
      client_ts: "2026-09-26T10:00:00.000Z",
    });
  });

  it("flushes on demand (the app going to the background)", async () => {
    const { queue, sent } = setup();
    queue.track("review_opened", { prefilled_count: 4 });
    await queue.flush();
    expect(sent).toHaveLength(1);
    expect(sent[0][0].attempt_id).toBeNull();
  });

  it("never sends more than 50 in one call", async () => {
    const { queue, sent } = setup();
    // Fail the first batch so events pile up past one call's worth.
    let fail = true;
    const q = createEventQueue({
      sessionId: "s",
      platform: "android",
      appVersion: "1",
      send: (events) => {
        sent.push(events);
        return fail ? Promise.reject(new Error("offline")) : Promise.resolve();
      },
    });
    for (let i = 0; i < 70; i++) q.track("field_edited", { field: "title" });
    await settle();
    fail = false;
    await q.flush();
    await settle();
    expect(Math.max(...sent.map((b) => b.length))).toBeLessThanOrEqual(50);
    expect(q.size()).toBe(0);
    queue.dispose();
    q.dispose();
  });

  it("keeps a failed batch and sends it with the next flush", async () => {
    let fail = true;
    const { queue, sent } = setup(() => (fail ? Promise.reject(new Error("500")) : Promise.resolve()));
    queue.track("preview_opened");
    await queue.flush();
    expect(queue.size()).toBe(1);
    fail = false;
    await queue.flush();
    expect(queue.size()).toBe(0);
    expect(sent).toHaveLength(2);
    expect(sent[1][0].name).toBe("preview_opened");
  });

  it("does nothing when there is nothing to send", async () => {
    const { queue, sent } = setup();
    await queue.flush();
    expect(sent).toHaveLength(0);
  });
});
