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
  /** The stream failed and the JSON endpoint is being tried (§7.4). */
  onFallback?: (code: ExtractionErrorCode) => void;
  /** 429: `quota_attempts` or `quota_runs`. Never retried. */
  onRateLimited: (code: "quota_attempts" | "quota_runs") => void;
  /** Everything else that ends the run without a result: Review opens blank. */
  onFailed: (code: ExtractionErrorCode, transport: Transport) => void;
}

/** §7.4: 40 s without `done` and the stream is abandoned for the JSON call. */
const STREAM_TIMEOUT_MS = 40_000;
const JSON_TIMEOUT_MS = 45_000;
/** How often to look for a response that ended without `done`. */
const CLOSE_POLL_MS = 500;

type Classified =
  | { kind: "rate_limited"; code: "quota_attempts" | "quota_runs" }
  | { kind: "terminal"; code: ExtractionErrorCode }
  | { kind: "unauthorized" }
  | { kind: "retryable"; code: ExtractionErrorCode };

/**
 * §4.6's error table. 400/403/429/503 are answers, not accidents, so they are
 * acted on without retrying; everything else is worth one more try over JSON.
 */
export function classifyHttpError(status: number, body: unknown): Classified {
  const code =
    body && typeof body === "object" && "code" in body
      ? String((body as { code: unknown }).code)
      : undefined;
  if (status === 401) return { kind: "unauthorized" };
  if (status === 429) {
    return { kind: "rate_limited", code: code === "quota_runs" ? "quota_runs" : "quota_attempts" };
  }
  if (status === 400) return { kind: "terminal", code: "invalid_request" };
  if (status === 403) return { kind: "terminal", code: "merchant_not_approved" };
  if (status === 503) return { kind: "terminal", code: "extraction_unavailable" };
  if (status === 0) return { kind: "retryable", code: "network" };
  return { kind: "retryable", code: "server_error" };
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
 * up (§7.4). Each listener fires as results arrive, whichever transport
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
      // A server-sent `event: error` arrives here too, carrying data.
      if ("data" in event) {
        void runJson("server_error");
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
    // ends, so a stream that closes without `done` would sit until the 40 s
    // timeout. Its XHR is internal; peeking at it is the only signal there is.
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
