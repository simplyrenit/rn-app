import { describe, expect, it } from "@jest/globals";
import { clockSkewMs, correctedNow } from "../server-clock";

describe("correctedNow", () => {
  it("is the server's time at the moment the answer arrived", () => {
    const arrived = Date.parse("2026-10-20T10:00:00Z"); // a phone a week ahead
    expect(correctedNow("2026-10-13T04:30:00Z", arrived, arrived).toISOString()).toBe("2026-10-13T04:30:00.000Z");
  });

  it("then moves on with the phone's own seconds", () => {
    const arrived = Date.parse("2026-10-20T10:00:00Z");
    expect(correctedNow("2026-10-13T04:30:00Z", arrived, arrived + 90_000).toISOString()).toBe("2026-10-13T04:31:30.000Z");
  });

  it("a phone that runs behind is put forward", () => {
    const arrived = Date.parse("2026-10-12T04:00:00Z");
    expect(correctedNow("2026-10-13T04:30:00Z", arrived, arrived).getTime()).toBeGreaterThan(arrived);
  });

  it("never runs backwards if the phone's clock was set back after the answer", () => {
    const arrived = Date.parse("2026-10-20T10:00:00Z");
    expect(correctedNow("2026-10-13T04:30:00Z", arrived, arrived - 60_000).toISOString()).toBe("2026-10-13T04:30:00.000Z");
  });

  it("falls back to the phone's clock when the answer had no server_time", () => {
    const now = Date.parse("2026-10-13T04:30:00Z");
    expect(correctedNow(undefined, now - 5, now).getTime()).toBe(now);
    expect(correctedNow("nonsense", now - 5, now).getTime()).toBe(now);
    expect(correctedNow(null, now - 5, now).getTime()).toBe(now);
  });
});

describe("clockSkewMs", () => {
  it("is how far the server is ahead of the phone", () => {
    const arrived = Date.parse("2026-10-13T04:00:00Z");
    expect(clockSkewMs("2026-10-13T04:30:00Z", arrived)).toBe(30 * 60_000);
    expect(clockSkewMs("2026-10-13T03:59:00Z", arrived)).toBe(-60_000);
  });

  it("is nothing when the answer had no server_time", () => {
    expect(clockSkewMs(undefined, 5)).toBe(0);
    expect(clockSkewMs("nonsense", 5)).toBe(0);
  });
});
