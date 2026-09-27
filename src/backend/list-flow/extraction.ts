import { LISTING_EXTRACTION, LISTING_EXTRACTION_STREAM } from "@/lib/config";
import {
  DoneEvent,
  ExtractionErrorCode,
  ExtractionJsonResponse,
  ExtractionRequest,
  FieldEvent,
  RunEvent,
  WarningEvent,
} from "@/lib/list-flow/types";
import axiosInstance, { ensureFreshAccessToken, refreshAccessToken } from "@/lib/networkUtils";
import axios from "axios";
import EventSource from "react-native-sse";

export type Transport = "sse" | "json";

export interface ExtractionHandlers {
  onRun: (run: RunEvent) => void;
  onField: (field: FieldEvent) => void;
  onWarning: (warning: WarningEvent) => void;
  onDone: (done: DoneEvent, transport: Transport) => void;
  /**
   * A request that created (or very likely created) a run on the server. The
   * server allows 3 runs per attempt and counts every one — a JSON fallback
   * and a stream abandoned at the client timeout included — so the app counts
   * the same events to keep `canRunAgain` honest.
   */
  onServerRun?: () => void;
  /** The stream failed and the JSON endpoint is being tried (§7.4). */
  onFallback?: (code: ExtractionErrorCode) => void;
  /** 429: `quota_attempts` or `quota_runs`. Never retried. */
  onRateLimited: (code: "quota_attempts" | "quota_runs") => void;
  /** Everything else that ends the run without a result: Review opens blank. */
  onFailed: (code: ExtractionErrorCode, transport: Transport) => void;
}

/**
 * Both client deadlines sit past the server's 45 s request limit, so a run
 * the server is still finishing is not abandoned from this side first.
 */
export const STREAM_TIMEOUT_MS = 50_000;
export const JSON_TIMEOUT_MS = 50_000;
/** How often to look for a response that ended without `done`. */
const CLOSE_POLL_MS = 500;

export type Classified =
  | { kind: "rate_limited"; code: "quota_attempts" | "quota_runs" }
  | { kind: "terminal"; code: ExtractionErrorCode }
  | { kind: "unauthorized" }
  | { kind: "retryable"; code: ExtractionErrorCode };

function bodyCode(body: unknown): string | undefined {
  if (body && typeof body === "object" && "code" in body) {
    const code = (body as { code: unknown }).code;
    return typeof code === "string" && code ? code : undefined;
  }
  return undefined;
}

/**
 * §4.6's error table. 400/403/429/503 are answers, not accidents, so they are
 * acted on without retrying; everything else is worth one more try over JSON.
 * The server's own `code` is kept wherever it sent one, so `extraction_failed`
 * records what actually happened rather than the status family.
 */
export function classifyHttpError(status: number, body: unknown): Classified {
  const code = bodyCode(body);
  if (status === 401) return { kind: "unauthorized" };
  if (status === 429) {
    return { kind: "rate_limited", code: code === "quota_runs" ? "quota_runs" : "quota_attempts" };
  }
  if (status === 400) return { kind: "terminal", code: code ?? "invalid_request" };
  if (status === 403) return { kind: "terminal", code: code ?? "merchant_not_approved" };
  if (status === 503) return { kind: "terminal", code: code ?? "extraction_unavailable" };
  if (status === 0) return { kind: "retryable", code: "network" };
  return { kind: "retryable", code: code ?? "server_error" };
}

/**
 * Whether a JSON response means the server created a run. Pre-run refusals
 * (400/401/403/429) never do; a 503 does only when it says so by carrying a
 * `run`; anything else that got an answer, or timed out waiting for one, did.
 */
function jsonCreatedRun(status: number, body: unknown, timedOut: boolean) {
  if (timedOut) return true;
  if (status === 0) return false;
  if ([400, 401, 403, 429].includes(status)) return false;
  if (status === 503) return Boolean(body && typeof body === "object" && "run" in body && (body as { run: unknown }).run);
  return true;
}

function parseJson<T>(text: string | null | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Run one extraction: the SSE stream first, then the JSON endpoint, then give
 * up (§7.4). The JSON call is only a fallback for a stream that broke — a
 * network error, a response that ended without `done`, or the client
 * timeout — or one the server marked `retryable`. Each listener fires as results arrive, whichever transport
 * delivered them. `cancel()` stops everything and silences the handlers.
 */
export function startExtraction(request: ExtractionRequest, handlers: ExtractionHandlers) {
  let cancelled = false;
  let finished = false;
  let source: EventSource<"run" | "field" | "warning" | "done"> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let closePoll: ReturnType<typeof setInterval> | null = null;

  const live = () => !cancelled && !finished;

  const stopStream = () => {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (closePoll) clearInterval(closePoll);
    timeoutTimer = null;
    closePoll = null;
    if (source) {
      source.removeAllEventListeners();
      source.close();
    }
    source = null;
  };

  const finish = () => {
    finished = true;
    stopStream();
  };

  const handleClassified = (result: Classified, transport: Transport) => {
    if (result.kind === "rate_limited") {
      finish();
      handlers.onRateLimited(result.code);
      return true;
    }
    if (result.kind === "terminal") {
      finish();
      handlers.onFailed(result.code, transport);
      return true;
    }
    return false;
  };

  const runJson = async (reason: ExtractionErrorCode) => {
    stopStream();
    if (!live()) return;
    handlers.onFallback?.(reason);
    try {
      const response = await axiosInstance.post<ExtractionJsonResponse>(
        LISTING_EXTRACTION,
        request,
        { timeout: JSON_TIMEOUT_MS }
      );
      if (!live()) return;
      handlers.onServerRun?.();
      const { run, fields, warnings, done } = response.data;
      if (run) handlers.onRun(run);
      (fields ?? []).forEach((field) => handlers.onField(field));
      (warnings ?? []).forEach((warning) => handlers.onWarning(warning));
      finish();
      handlers.onDone(done, "json");
    } catch (error) {
      if (!live()) return;
      const status = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      const body = axios.isAxiosError(error) ? error.response?.data : null;
      const timedOut = axios.isAxiosError(error) && error.code === "ECONNABORTED";
      if (jsonCreatedRun(status, body, timedOut)) handlers.onServerRun?.();
      const result = classifyHttpError(status, body);
      if (handleClassified(result, "json")) return;
      finish();
      handlers.onFailed(timedOut ? "timeout" : result.kind === "retryable" ? result.code : "server_error", "json");
    }
  };

  const openStream = async (allowAuthRetry: boolean, forceRefresh: boolean) => {
    // react-native-sse speaks XHR directly, so the Axios interceptor that
    // refreshes an expired token never sees this request (§7.4).
    let token: string | null = null;
    try {
      token = forceRefresh ? await refreshAccessToken() : await ensureFreshAccessToken(60);
    } catch {
      token = null;
    }
    if (!live()) return;

    const es = new EventSource<"run" | "field" | "warning" | "done">(LISTING_EXTRACTION_STREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
      // One run is one request: no automatic reconnect, no connect delay.
      pollingInterval: 0,
      timeoutBeforeConnection: 0,
    });
    source = es;
    let counted = false;

    // A 2xx response means the server passed its quota check and created the
    // run, whether or not it ever finishes.
    es.addEventListener("open", () => {
      if (!live() || counted) return;
      counted = true;
      handlers.onServerRun?.();
    });
    es.addEventListener("run", (event) => {
      const run = parseJson<RunEvent>(event.data);
      if (live() && run) handlers.onRun(run);
    });
    es.addEventListener("field", (event) => {
      const field = parseJson<FieldEvent>(event.data);
      if (live() && field) handlers.onField(field);
    });
    es.addEventListener("warning", (event) => {
      const warning = parseJson<WarningEvent>(event.data);
      if (live() && warning) handlers.onWarning(warning);
    });
    es.addEventListener("done", (event) => {
      const done = parseJson<DoneEvent>(event.data);
      if (!live()) return;
      finish();
      handlers.onDone(done ?? { run_id: "", filled: [], blank: [] }, "sse");
    });
    es.addEventListener("error", (event) => {
      if (!live()) return;
      // A server-sent `event: error` arrives here too, carrying data:
      // `{code, retryable}`. A run the server says cannot succeed is not run
      // again over JSON — that would only spend another of the attempt's
      // three runs; Review opens with the failure note instead.
      if ("data" in event) {
        const payload = parseJson<{ code?: string; retryable?: boolean }>(
          (event as { data: string | null }).data
        );
        const code = payload?.code || "server_error";
        if (payload?.retryable === true) {
          void runJson(code);
        } else {
          finish();
          handlers.onFailed(code, "sse");
        }
        return;
      }
      if (event.type === "timeout") {
        void runJson("timeout");
        return;
      }
      if (event.type === "exception") {
        void runJson("network");
        return;
      }
      const result = classifyHttpError(event.xhrStatus, parseJson(event.message));
      if (result.kind === "unauthorized") {
        stopStream();
        if (allowAuthRetry) void openStream(false, true);
        else {
          finish();
          handlers.onFailed("unauthorized", "sse");
        }
        return;
      }
      if (handleClassified(result, "sse")) return;
      void runJson(result.kind === "retryable" ? result.code : "server_error");
    });

    timeoutTimer = setTimeout(() => {
      if (live()) void runJson("timeout");
    }, STREAM_TIMEOUT_MS);

    // With polling off the library says nothing when a 200 response simply
    // ends, so a stream that closes without `done` would sit until the
    // client timeout. Its XHR is internal; peeking at it is the only signal there is.
    closePoll = setInterval(() => {
      const xhr = (es as unknown as { _xhr?: XMLHttpRequest | null })._xhr;
      if (live() && source === es && xhr && xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 400) {
        void runJson("network");
      }
    }, CLOSE_POLL_MS);
  };

  if (request.image_urls.length === 0) {
    finished = true;
    handlers.onFailed("no_photos", "sse");
  } else {
    void openStream(true, false);
  }

  return {
    cancel: () => {
      cancelled = true;
      stopStream();
    },
  };
}
