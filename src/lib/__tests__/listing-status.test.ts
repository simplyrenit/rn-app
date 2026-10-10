import { describe, expect, it } from "@jest/globals";
import {
  LISTING_STATUSES,
  STATUS_COPY,
  flagReasonText,
  hasPrice,
  openBookingMessage,
  resolveListingStatus,
  statusDetail,
} from "../listing-status";

describe("resolveListingStatus", () => {
  it("accepts each of the six statuses", () => {
    for (const status of LISTING_STATUSES) expect(resolveListingStatus(status)).toBe(status);
    expect(LISTING_STATUSES).toHaveLength(6);
  });

  it("gives no status for a missing or unknown value", () => {
    expect(resolveListingStatus(undefined)).toBeNull();
    expect(resolveListingStatus(null)).toBeNull();
    expect(resolveListingStatus("")).toBeNull();
    // The old guess ("pending", "rejected") is gone.
    expect(resolveListingStatus("pending")).toBeNull();
    expect(resolveListingStatus("rejected")).toBeNull();
    expect(resolveListingStatus("Live")).toBeNull();
  });

  it("has words for every status", () => {
    expect(Object.values(STATUS_COPY).map((c) => c.label)).toEqual([
      "Draft",
      "Checking",
      "Live",
      "Paused",
      "Flagged",
      "Archived",
    ]);
  });
});

describe("flag reasons", () => {
  const reasons = [
    { code: "deposit_zero", text: "The deposit is zero" },
    { code: "rate_too_high", text: "The price looks too high" },
  ];

  it("joins the reasons in the check's words", () => {
    expect(flagReasonText(reasons)).toBe("The deposit is zero · The price looks too high");
  });

  it("is null when there are none", () => {
    expect(flagReasonText([])).toBeNull();
    expect(flagReasonText(undefined)).toBeNull();
    expect(flagReasonText([{ code: "x", text: "  " }])).toBeNull();
  });

  it("shows the reason for a flagged listing and the plain line for the rest", () => {
    expect(statusDetail("flagged", reasons)).toBe("The deposit is zero · The price looks too high");
    expect(statusDetail("flagged", [])).toBe("Hidden until this is resolved");
    // Reasons on a listing that is no longer flagged are ignored.
    expect(statusDetail("live", reasons)).toBe("Visible to renters");
  });
});

describe("openBookingMessage", () => {
  it("names one booking", () => {
    expect(openBookingMessage(["RN-24831"])).toBe(
      "Booking RN-24831 is still open. Archive this product once it is over."
    );
  });

  it("names several", () => {
    expect(openBookingMessage(["RN-24831", "RN-24840"])).toBe(
      "Bookings RN-24831, RN-24840 are still open. Archive this product once they are over."
    );
  });

  it("still says something when the list is missing", () => {
    expect(openBookingMessage(undefined)).toContain("open booking");
  });
});

describe("hasPrice", () => {
  it("is false for a draft with no price, never reading it as zero", () => {
    expect(hasPrice(null)).toBe(false);
    expect(hasPrice(undefined)).toBe(false);
    expect(hasPrice("")).toBe(false);
    expect(hasPrice("  ")).toBe(false);
  });

  it("is true for a price, even one that reads as a small number", () => {
    expect(hasPrice("610.00")).toBe(true);
    expect(hasPrice(610)).toBe(true);
    expect(hasPrice("0.00")).toBe(true);
  });
});
