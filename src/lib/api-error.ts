import axios from "axios";

/**
 * What a failed call said, in one shape.
 *
 * The Order execution endpoints answer `{"error": {"code", "message", "details"}}`
 * (API-CONTRACT, Common › Errors) and a screen switches on `code`. Endpoints that
 * existed before keep their own shapes — `{"error": "text"}` from the listing
 * routes, `{"detail": "text"}` from DRF itself — so those still yield a message,
 * with no code.
 */
export interface ApiError {
  /** HTTP status; 0 when the request never got an answer. */
  status: number;
  code: string | null;
  message: string | null;
  details: Record<string, unknown> | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

/** The failed call as an `ApiError`, or null when it was not an HTTP failure at all. */
export function apiError(error: unknown): ApiError | null {
  if (!axios.isAxiosError(error)) return null;
  const status = error.response?.status ?? 0;
  const body: unknown = error.response?.data;

  if (isRecord(body) && isRecord(body.error)) {
    return {
      status,
      code: asText(body.error.code),
      message: asText(body.error.message),
      details: isRecord(body.error.details) ? body.error.details : null,
    };
  }
  if (isRecord(body)) {
    return {
      status,
      code: null,
      message: asText(body.error) ?? asText(body.detail),
      details: null,
    };
  }
  return { status, code: null, message: null, details: null };
}

/** True for an error that carries this stable `code`. */
export function hasApiCode(error: unknown, code: string) {
  return apiError(error)?.code === code;
}

/** A `validation_error`'s per-field messages, first message per field. */
export function fieldErrors(error: ApiError | null): Record<string, string> {
  const fields = error?.details?.fields;
  if (!isRecord(fields)) return {};
  const out: Record<string, string> = {};
  for (const [name, messages] of Object.entries(fields)) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    const text = asText(first);
    if (text) out[name] = text;
  }
  return out;
}
