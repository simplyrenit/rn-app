import { describe, expect, it, jest } from "@jest/globals";
import type { Terms } from "@/backend/terms";
import { openCustomerTerms } from "../terms-link";

const terms = (customerUrl: string): Terms => ({
  owner: { version: "2026-10", url: "https://x.test/owner", accepted: null },
  customer: { version: "2026-10", url: customerUrl, accepted: null },
});

describe("openCustomerTerms", () => {
  it("opens the server's customer terms url", async () => {
    const open = jest.fn(async (_url: string) => true);
    await expect(openCustomerTerms(async () => terms("https://x.test/terms"), open)).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith("https://x.test/terms");
  });

  it("returns false when the server cannot be read", async () => {
    const open = jest.fn(async (_url: string) => true);
    await expect(openCustomerTerms(() => Promise.reject(new Error("offline")), open)).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it("returns false for a blank url or a link that will not open", async () => {
    const open = jest.fn(async (_url: string) => true);
    await expect(openCustomerTerms(async () => terms(""), open)).resolves.toBe(false);
    expect(open).not.toHaveBeenCalled();
    await expect(
      openCustomerTerms(async () => terms("/api/terms/page/"), () => Promise.reject(new Error("bad url")))
    ).resolves.toBe(false);
  });
});
