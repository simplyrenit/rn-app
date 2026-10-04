import { describe, expect, it, jest } from "@jest/globals";
import { summarizeValue } from "@/lib/networkUtils";

jest.mock("@/lib/config", () => ({ GET_CATEGORIES: "", GET_REFRESH_TOKEN: "" }));
jest.mock("@/lib/auth-fns", () => ({}));

// Synthetic identities only: the PAN's digits are the 0000 block.
const body = { pan: "ABCPE0000F", gstin: "27ABCPE0000F1Z5" };

describe("the network log", () => {
  it("describes a request body by its keys", () => {
    expect(summarizeValue(body)).toEqual({ type: "object", keys: ["pan", "gstin"], totalKeys: 2 });
  });

  it("never prints a body that is already a string", () => {
    // A request retried after a token refresh carries its body as serialised JSON.
    const logged = JSON.stringify(summarizeValue(JSON.stringify(body)));
    expect(logged).not.toContain(body.pan);
    expect(logged).not.toContain(body.gstin);
  });
});
