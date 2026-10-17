import { describe, expect, it } from "@jest/globals";
import { softBreaks } from "../format";

describe("softBreaks", () => {
  it("lets a long unbroken name break after an underscore, hyphen or slash, not inside a group of letters", () => {
    expect(softBreaks("AGENT_QA_T1012 shop A1")).toBe("AGENT_​QA_​T1012 shop A1");
    expect(softBreaks("PS5-01/blue")).toBe("PS5-​01/​blue");
    // The text is the same to a person and to a search: only invisible spaces were added.
    expect(softBreaks("AGENT_QA_T1012").replace(/​/g, "")).toBe("AGENT_QA_T1012");
  });

  it("leaves names with spaces and no joiners alone, and ends and doubled joiners without a break", () => {
    expect(softBreaks("Sharma Camera Rentals")).toBe("Sharma Camera Rentals");
    expect(softBreaks("Tripod_")).toBe("Tripod_");
    expect(softBreaks("a__b")).toBe("a__​b");
    expect(softBreaks("-lead")).toBe("-​lead");
    expect(softBreaks("")).toBe("");
    expect(softBreaks(null)).toBe("");
  });
});
