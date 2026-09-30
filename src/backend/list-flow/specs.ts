import { LISTING_EXTRACTION_SPECS } from "@/lib/config";
import { SpecsRequest, SpecsResponse, WireSpec } from "@/lib/list-flow/types";
import axiosInstance from "@/lib/networkUtils";
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
