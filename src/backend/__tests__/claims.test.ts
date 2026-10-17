import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { fetchClaim } from "../claims";

jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/lib/config", () => ({ BOOKINGS_ENDPOINT: "https://api.test/bookings/", CLAIMS_ENDPOINT: "https://api.test/claims/" }));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const get = (axiosInstance as unknown as { get: Call }).get;

const wire = { id: 12, kind: "fault", my_side: "against", return_by: "2026-10-10T05:10:00Z" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the clock of a claim (P5-4)", () => {
  it("is the claim's own server_time; the Date header is not looked at when the claim has one", async () => {
    get.mockResolvedValue({ data: { claim: { ...wire, server_time: "2026-10-09T05:12:00Z" } }, headers: { date: "Fri, 09 Oct 2026 09:00:00 GMT" } });
    expect((await fetchClaim(12)).serverTime).toBe("2026-10-09T05:12:00Z");
  });

  it("falls back to the Date header only for an answer without server_time", async () => {
    get.mockResolvedValue({ data: { claim: wire }, headers: { date: "Fri, 09 Oct 2026 09:00:00 GMT" } });
    expect((await fetchClaim(12)).serverTime).toBe("2026-10-09T09:00:00.000Z");
    get.mockResolvedValue({ data: { claim: wire }, headers: {} });
    expect((await fetchClaim(12)).serverTime).toBeNull();
  });
});
