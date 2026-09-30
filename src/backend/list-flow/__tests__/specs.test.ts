import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AxiosError, AxiosResponse } from "axios";
import axiosInstance from "@/lib/networkUtils";
import { createDraft, draftReducer, DraftAction } from "@/lib/list-flow/draft";
import { currentSpecs } from "@/lib/list-flow/specs";
import { ListingDraft } from "@/lib/list-flow/types";
import { ensureSpecs, fetchSpecs } from "../specs";

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

describe("ensureSpecs", () => {
  const categories = [
    {
      title: "Appliances",
      subcategories: [
        { id: 7, title: "Air conditioner" },
        { id: 8, title: "Refrigerator" },
      ],
    },
  ];
  const AC = { parent: "Appliances", title: "Air conditioner" };
  const FRIDGE = { id: 8, parent: "Appliances", title: "Refrigerator" };
  const spec = (value: string | null) => ({
    key: "ac_type",
    label: "Type",
    type: "enum",
    facet: "default",
    options: ["Split", "Window"],
    value,
    status: value ? "filled" : "blank",
  });

  // The context's draft ref and dispatch, without React.
  let draft: ListingDraft | null;
  const dispatch = jest.fn((action: DraftAction) => {
    draft = draftReducer(draft, action);
  });
  const getDraft = () => draft;
  const run = () => ensureSpecs(getDraft, dispatch, categories);

  /** A post whose answer the test settles by hand, in any order. */
  function deferred() {
    let settle: (outcome: { ok: boolean; value: unknown }) => void = () => {};
    post.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          settle = ({ ok, value }) => (ok ? resolve(value) : reject(value));
        })
    );
    return (outcome: { ok: boolean; value: unknown }) => settle(outcome);
  }

  beforeEach(() => {
    post.mockReset();
    dispatch.mockClear();
    draft = createDraft("attempt-1", 0);
    draft = draftReducer(draft, {
      type: "mergeAi",
      event: { field: "category", status: "filled", value: AC },
    });
  });

  it("attaches the resolved id to the model's category and asks with it", async () => {
    post.mockResolvedValueOnce({ data: { category_id: 7, specs: [spec("Split")] } });
    await run();
    expect(draft?.fields.category).toMatchObject({ value: { id: 7, ...AC }, source: "ai" });
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ attempt_id: "attempt-1", category_id: 7 }),
      expect.anything()
    );
    expect(currentSpecs(draft as ListingDraft)[0]).toMatchObject({ value: "Split", status: "filled" });
  });

  it("makes no call for a category missing from the taxonomy", async () => {
    draft = draftReducer(draft, { type: "editField", field: "category", value: { parent: "X", title: "Y" } });
    await run();
    expect(post).not.toHaveBeenCalled();
  });

  it("asks once while a request is in flight, and not again once answered", async () => {
    const settle = deferred();
    const first = run();
    await run();
    expect(post).toHaveBeenCalledTimes(1);
    settle({ ok: true, value: { data: { category_id: 7, specs: [spec("Split")] } } });
    await first;
    await run();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("drops an answer for a listing that was discarded meanwhile", async () => {
    const settle = deferred();
    const pending = run();
    draft = createDraft("attempt-2", 0);
    settle({ ok: true, value: { data: { category_id: 7, specs: [spec("Split")] } } });
    await pending;
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "specsLoaded" }));
    expect(draft.specs.status).toBe("idle");
  });

  it("keeps the second B's answer when the first B fails late (B, A, B)", async () => {
    const settleB1 = deferred();
    const b1 = run();
    draft = draftReducer(draft, { type: "editField", field: "category", value: FRIDGE });
    const settleA = deferred();
    const a = run();
    draft = draftReducer(draft, { type: "editField", field: "category", value: { ...AC, id: 7 } });
    const settleB2 = deferred();
    const b2 = run();
    expect(post).toHaveBeenCalledTimes(3);

    settleB1({ ok: false, value: httpError(0, undefined, "ECONNABORTED") });
    await b1;
    expect(draft?.specs.status).toBe("loading");
    settleA({ ok: true, value: { data: { category_id: 8, specs: [] } } });
    await a;
    settleB2({ ok: true, value: { data: { category_id: 7, specs: [spec("Window")] } } });
    await b2;
    expect(draft?.specs.status).toBe("ready");
    expect(currentSpecs(draft as ListingDraft)[0]).toMatchObject({ value: "Window" });
  });

  it("asks again for the same category after a changed-photos run", async () => {
    post.mockResolvedValueOnce({ data: { category_id: 7, specs: [spec("Split")] } });
    await run();
    draft = draftReducer(draft, { type: "serverRunCounted", clearStaleAi: true, sentPhotoIds: [] });
    // The new run names the same category.
    draft = draftReducer(draft, {
      type: "mergeAi",
      event: { field: "category", status: "filled", value: AC },
    });
    post.mockResolvedValueOnce({ data: { category_id: 7, specs: [spec("Window")] } });
    await run();
    expect(post).toHaveBeenCalledTimes(2);
    expect(currentSpecs(draft as ListingDraft)[0]).toMatchObject({ value: "Window" });
  });

  it("keeps the owner's value when the re-ask after new photos hits spec_limit", async () => {
    post.mockResolvedValueOnce({ data: { category_id: 7, specs: [spec("Split")] } });
    await run();
    draft = draftReducer(draft, { type: "setSpec", key: "ac_type", value: "Window" });
    draft = draftReducer(draft, { type: "serverRunCounted", clearStaleAi: true, sentPhotoIds: [] });
    draft = draftReducer(draft, {
      type: "mergeAi",
      event: { field: "category", status: "filled", value: AC },
    });
    post.mockRejectedValueOnce(httpError(409, { code: "spec_limit" }));
    await run();
    expect(draft?.specs.status).toBe("unavailable");
    expect(currentSpecs(draft as ListingDraft)).toEqual([
      expect.objectContaining({ key: "ac_type", value: "Window", status: "user" }),
    ]);
  });

  it("marks the specs unavailable when the call fails", async () => {
    post.mockRejectedValueOnce(httpError(409, { code: "spec_limit" }));
    await run();
    expect(draft?.specs.status).toBe("unavailable");
  });
});
