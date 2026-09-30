import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AxiosError, AxiosResponse } from "axios";
import axiosInstance from "@/lib/networkUtils";
import { fetchSpecs } from "../specs";

jest.mock("@/lib/config", () => ({
  LISTING_EXTRACTION_SPECS: "https://api.test/listing-extractions/specs/",
}));

jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const post = axiosInstance.post as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const request = { attempt_id: "attempt-1", category_id: 7, title: "Daikin split AC" };

function httpError(status: number, data?: unknown, code?: string) {
  const error = new AxiosError("failed", code);
  if (status) error.response = { status, data } as AxiosResponse;
  return error;
}

describe("fetchSpecs", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("posts the request and returns the specs", async () => {
    const specs = [{ key: "ac_type", label: "Type", type: "enum", facet: "default", options: ["Split"], value: "Split", status: "filled" }];
    post.mockResolvedValueOnce({ data: { category_id: 7, specs } });
    await expect(fetchSpecs(request)).resolves.toEqual({ ok: true, categoryId: 7, specs });
    expect(post).toHaveBeenCalledWith("https://api.test/listing-extractions/specs/", request, expect.objectContaining({ timeout: 50_000 }));
  });

  it("treats a missing list as no specs", async () => {
    post.mockResolvedValueOnce({ data: { category_id: 7 } });
    await expect(fetchSpecs(request)).resolves.toEqual({ ok: true, categoryId: 7, specs: [] });
  });

  it.each([
    [400, "invalid_request"],
    [403, "merchant_not_approved"],
    [404, "unknown_attempt"],
    [409, "spec_limit"],
    [503, "extraction_unavailable"],
  ])("returns %i %s as unavailable instead of throwing", async (status, code) => {
    post.mockRejectedValueOnce(httpError(status, { code }));
    await expect(fetchSpecs(request)).resolves.toEqual({ ok: false, code });
  });

  it("names a timeout, a dropped connection and a bare server error", async () => {
    post.mockRejectedValueOnce(httpError(0, undefined, "ECONNABORTED"));
    await expect(fetchSpecs(request)).resolves.toEqual({ ok: false, code: "timeout" });
    post.mockRejectedValueOnce(httpError(0));
    await expect(fetchSpecs(request)).resolves.toEqual({ ok: false, code: "network" });
    post.mockRejectedValueOnce(httpError(500, "<html>"));
    await expect(fetchSpecs(request)).resolves.toEqual({ ok: false, code: "server_error" });
  });

  it("never throws, even on a non-HTTP error", async () => {
    post.mockRejectedValueOnce(new TypeError("boom"));
    await expect(fetchSpecs(request)).resolves.toEqual({ ok: false, code: "server_error" });
  });
});
