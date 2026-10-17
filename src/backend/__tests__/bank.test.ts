import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { saveBankAccount, verifyBankAccount } from "../bank";

jest.mock("@/context/global-context", () => ({ useGlobalContext: jest.fn() }));
jest.mock("@/lib/config", () => ({
  BANK_ACCOUNT_ENDPOINT: "https://api.test/shop/bank-account/",
  BANK_ACCOUNT_VERIFY_ENDPOINT: "https://api.test/shop/bank-account/verify/",
}));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const api = axiosInstance as unknown as { get: Call; post: Call };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("saveBankAccount", () => {
  it("sends the contract's four fields, with the name trimmed", async () => {
    api.post.mockResolvedValue({ data: { status: "pending" } });
    await saveBankAccount({
      holderName: "  SoundBox Rentals ",
      accountNumber: "50100123456789",
      ifsc: "HDFC0001234",
      submitId: "0b9f6c1e-7a52-4c7e-9c58-0d3f1a2b4c5d",
    });
    expect(api.post).toHaveBeenCalledWith("https://api.test/shop/bank-account/", {
      account_number: "50100123456789",
      ifsc: "HDFC0001234",
      holder_name: "SoundBox Rentals",
      submit_id: "0b9f6c1e-7a52-4c7e-9c58-0d3f1a2b4c5d",
    });
  });

  it("returns the account the server answered with", async () => {
    api.post.mockResolvedValue({ data: { status: "pending", account_last4: "6789" } });
    await expect(
      saveBankAccount({ holderName: "Asha", accountNumber: "50100123456789", ifsc: "HDFC0001234", submitId: "x" })
    ).resolves.toMatchObject({ status: "pending", account_last4: "6789" });
  });
});

describe("verifyBankAccount", () => {
  it("posts an empty body to the verify path", async () => {
    api.post.mockResolvedValue({ data: { status: "pending" } });
    await verifyBankAccount();
    expect(api.post).toHaveBeenCalledWith("https://api.test/shop/bank-account/verify/", {});
  });
});
