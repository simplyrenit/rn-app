import { LISTING_EXTRACTION_SPECS } from "@/lib/config";
import { DraftAction } from "@/lib/list-flow/draft";
import { resolveCategoryId } from "@/lib/list-flow/specs";
import { ListingDraft, SpecsRequest, SpecsResponse, WireSpec } from "@/lib/list-flow/types";
import axiosInstance from "@/lib/networkUtils";
import { uuidv4 } from "@/lib/uuid";
import axios from "axios";

/** Past the server's 45 s request limit, like the extraction calls. */
export const SPECS_TIMEOUT_MS = 50_000;

export type SpecsResult =
  | { ok: true; categoryId: number; specs: WireSpec[] }
  /** `code` is the server's (`spec_limit`, `unknown_attempt`, …) or the failure's kind. */
  | { ok: false; code: string };

/**
 * The sub-category's specs for this attempt (ENG-34 contract). Every failure
 * comes back as a result, never a throw: specs are optional, so whatever goes
 * wrong here the owner just gets no Specs card and can still publish.
 */
export async function fetchSpecs(request: SpecsRequest): Promise<SpecsResult> {
  try {
    const { data } = await axiosInstance.post<SpecsResponse>(LISTING_EXTRACTION_SPECS, request, {
      timeout: SPECS_TIMEOUT_MS,
    });
    return {
      ok: true,
      categoryId: typeof data?.category_id === "number" ? data.category_id : request.category_id,
      specs: Array.isArray(data?.specs) ? data.specs : [],
    };
  } catch (error) {
    if (!axios.isAxiosError(error)) return { ok: false, code: "server_error" };
    if (error.code === "ECONNABORTED") return { ok: false, code: "timeout" };
    const status = error.response?.status ?? 0;
    const body = error.response?.data as { code?: unknown } | undefined;
    if (typeof body?.code === "string" && body.code) return { ok: false, code: body.code };
    return { ok: false, code: status === 0 ? "network" : "server_error" };
  }
}

/**
 * Ask for the draft's sub-category specs unless they are already here or on
 * the way; safe to call whenever the category may have changed. Outside React
 * so the rules are unit-tested: the list-draft context passes its draft ref,
 * its dispatch and the loaded taxonomy. Resolves once the answer is applied.
 */
export async function ensureSpecs(
  getDraft: () => ListingDraft | null,
  dispatch: (action: DraftAction) => void,
  categories: Parameters<typeof resolveCategoryId>[0]
): Promise<void> {
  const current = getDraft();
  const category = current?.fields.category.value ?? null;
  if (!current || !category) return;
  const categoryId = resolveCategoryId(categories, category);
  // Not in the loaded taxonomy (or not loaded yet): no card rather than a
  // guess. Review asks again once the categories arrive.
  if (categoryId === null) return;
  // The model names categories by title; the endpoint takes an id, and
  // keeping it on the draft is what ties the specs to their category. Same
  // titles, so the reducer treats it as a confirmation, not an edit.
  if (category.id == null) {
    dispatch({ type: "editField", field: "category", value: { ...category, id: categoryId } });
  }
  const { specs } = current;
  if (specs.categoryId === categoryId && specs.status !== "idle") return;

  const requestId = uuidv4();
  dispatch({ type: "specsRequested", categoryId, requestId });
  const f = current.fields;
  const text = (v: string | null) => v?.trim() || undefined;
  const result = await fetchSpecs({
    attempt_id: current.attemptId,
    category_id: categoryId,
    title: text(f.title.value),
    brand_name: text(f.brand_name.value),
    model_name: text(f.model_name.value),
    description: text(f.description.value),
  });
  // Discarded or replaced by another listing while the call ran.
  if (getDraft()?.attemptId !== current.attemptId) return;
  // An answer about another category than the one asked for is no answer:
  // the card goes rather than sitting on its skeleton.
  if (result.ok && result.categoryId === categoryId) {
    dispatch({ type: "specsLoaded", requestId, specs: result.specs });
  } else {
    dispatch({ type: "specsUnavailable", requestId });
  }
}
