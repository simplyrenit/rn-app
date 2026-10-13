import { describe, expect, it } from "@jest/globals";
import {
  LISTING_STATUSES,
  STATUS_COPY,
  blockedDatesOf,
  flagReasonText,
  hasPrice,

  listingPrompts,
  openBookingMessage,
  resolveListingStatus,
  statusDetail,
  waitsText,
  PHOTOS_PROMPT,
  WORTH_PROMPT,
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

describe("listingPrompts", () => {
  it("asks to confirm the price of a moved listing", () => {
    expect(listingPrompts({ rate_needs_confirming: true, needs_worth: false })).toEqual(["Confirm your price"]);
  });

  it("says a listing without a worth needs one", () => {
    expect(listingPrompts({ rate_needs_confirming: false, needs_worth: true })).toEqual([WORTH_PROMPT]);
  });

  it("gives both, price first", () => {
    expect(listingPrompts({ rate_needs_confirming: true, needs_worth: true })).toEqual([
      "Confirm your price",
      WORTH_PROMPT,
    ]);
  });

  it("is quiet for a listing that is in order", () => {
    expect(listingPrompts({ rate_needs_confirming: false, needs_worth: false, worth: "45000.00" })).toEqual([]);
  });

  it("says what a draft still needs when it has no photo, in Today's words (D-27)", () => {
    expect(PHOTOS_PROMPT).toBe("Needs photos");
    expect(listingPrompts({ status: "draft", cover_image: "", images: [], needs_worth: false })).toEqual([PHOTOS_PROMPT]);
    // Photos first, then the price and the worth.
    expect(listingPrompts({ status: "draft", cover_image: "", images: [], rate_needs_confirming: true, needs_worth: true })).toEqual([
      PHOTOS_PROMPT,
      "Confirm your price",
      WORTH_PROMPT,
    ]);
    // A draft with a photo, a listing that is not a draft, and a payload that does not say: nothing.
    expect(listingPrompts({ status: "draft", cover_image: "https://cdn.test/a.jpg", images: ["https://cdn.test/a.jpg"] })).toEqual([]);
    expect(listingPrompts({ status: "draft", images: ["https://cdn.test/a.jpg"] })).toEqual([]);
    expect(listingPrompts({ status: "live", cover_image: "", images: [] })).toEqual([]);
    expect(listingPrompts({ status: "draft" })).toEqual([]);
  });

  it("reads a missing worth when the server sent only that", () => {
    expect(listingPrompts({ worth: null })).toEqual([WORTH_PROMPT]);
    expect(listingPrompts({ worth: "100.00" })).toEqual([]);
    // Neither field in the payload (a server without ENG-155): say nothing.
    expect(listingPrompts({})).toEqual([]);
  });
});

describe("blockedDatesOf", () => {
  it("returns the dates the answer carries, an empty list included", () => {
    const dates = [{ start_date: "2026-10-20", end_date: "2026-10-22" }];
    expect(blockedDatesOf({ blocked_dates: dates })).toBe(dates);
    expect(blockedDatesOf({ blocked_dates: [] })).toEqual([]);
  });

  it("is null when the field is missing, so it is never read as no dates", () => {
    expect(blockedDatesOf({})).toBeNull();
    expect(blockedDatesOf({ blocked_dates: undefined })).toBeNull();
    expect(blockedDatesOf({ blocked_dates: null })).toBeNull();
  });
});

describe("what a listing waits for (T-45)", () => {
  const first = "Renit looks at a shop's first products once, usually by the next day.";
  const fill = "Renit is still filling in the category and details. This can take until tomorrow.";

  it("reads the sentence, and nothing for null, absent, blank or a non-string", () => {
    expect(waitsText(first)).toBe(first);
    expect(waitsText(`  ${fill}  `)).toBe(fill);
    for (const value of [null, undefined, "", "  ", 3, {}]) expect(waitsText(value)).toBeNull();
  });

  it("says it in place of 'usually takes seconds' for a listing that is checking, and for a draft Renit is still filling", () => {
    expect(statusDetail("checking", [], first)).toBe(first);
    expect(statusDetail("draft", [], fill)).toBe(fill);
    // Nothing waits: the status's own words stand.
    expect(statusDetail("checking", [])).toBe("Not visible to renters yet · usually takes seconds");
    expect(statusDetail("checking", [], null)).toBe("Not visible to renters yet · usually takes seconds");
    expect(statusDetail("draft", [], null)).toBe("Not published yet");
    // Not said of a live or paused listing, whatever the server sends.
    expect(statusDetail("live", [], first)).toBe("Visible to renters");
    expect(statusDetail("paused", [], first)).toBe(STATUS_COPY.paused.detail);
  });

  it("a reason comes first: a flagged listing, or a sent-back listing changed and checking again", () => {
    expect(statusDetail("flagged", [{ code: "deposit_zero", text: "The deposit is zero" }], first)).toBe("The deposit is zero");
    expect(
      statusDetail("checking", [{ code: "changed_after_sent_back", text: "Renit is looking at your change", sent_back_for: "Add a photo", changed: ["title"] }], first)
    ).toContain("Renit will look at it again");
  });
});

describe("the prompt for a listing with no worth (test run)", () => {
  it("is an instruction, like 'Confirm your price', not 'Needs worth'", () => {
    expect(WORTH_PROMPT).toBe("Add its worth");
    expect(listingPrompts({ needs_worth: true })).toEqual(["Add its worth"]);
  });
});
