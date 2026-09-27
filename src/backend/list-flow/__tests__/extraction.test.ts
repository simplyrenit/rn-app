import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AxiosError, AxiosResponse } from "axios";
import EventSource from "react-native-sse";
import axiosInstance, { refreshAccessToken } from "@/lib/networkUtils";
import {
  ExtractionHandlers,
  STREAM_TIMEOUT_MS,
  classifyHttpError,
  startExtraction,
} from "../extraction";

jest.mock("@/lib/config", () => ({
  LISTING_EXTRACTION: "https://api.test/listing-extractions/",
  LISTING_EXTRACTION_STREAM: "https://api.test/listing-extractions/stream/",
}));

jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { post: jest.fn() },
  ensureFreshAccessToken: jest.fn(async () => "token-1"),
  refreshAccessToken: jest.fn(async () => "token-2"),
}));

jest.mock("react-native-sse", () => {
  class FakeEventSource {
    static instances: FakeEventSource[] = [];
    listeners: Record<string, ((event: unknown) => void)[]> = {};
    _xhr: { readyState: number; status: number } | null = null;
    closed = false;
    url: string;
    options: { headers: Record<string, string> };
    constructor(target: string, init: { headers: Record<string, string> }) {
      this.url = target;
      this.options = init;
      FakeEventSource.instances.push(this);
    }
    addEventListener(type: string, fn: (event: unknown) => void) {
      (this.listeners[type] ??= []).push(fn);
    }
    removeAllEventListeners() {
      this.listeners = {};
    }
    close() {
      this.closed = true;
    }
    emit(type: string, event: unknown) {
      (this.listeners[type] ?? []).forEach((fn) => fn(event));
    }
  }
  return { __esModule: true, default: FakeEventSource };
});

type Fake = {
  url: string;
  options: { headers: Record<string, string> };
  _xhr: { readyState: number; status: number } | null;
  emit: (type: string, event: unknown) => void;
};
const instances = () => (EventSource as unknown as { instances: Fake[] }).instances;
const post = axiosInstance.post as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const request = {
  attempt_id: "attempt-1",
  image_urls: ["https://cdn.test/a.jpg"],
  photo_sources: ["camera" as const],
  category_hint: null,
};

function handlers() {
  return {
    onRun: jest.fn(),
    onField: jest.fn(),
    onWarning: jest.fn(),
    onDone: jest.fn(),
    onServerRun: jest.fn(),
    onFallback: jest.fn(),
    onRateLimited: jest.fn(),
    onFailed: jest.fn(),
  } satisfies ExtractionHandlers;
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

function httpError(status: number, data: unknown, code?: string) {
  return new AxiosError("request failed", code, undefined, undefined, {
    status,
    data,
    statusText: "",
    headers: {},
    config: {} as never,
  } as AxiosResponse);
}

beforeEach(() => {
  jest.useFakeTimers();
  instances().length = 0;
  post.mockReset();
  (refreshAccessToken as unknown as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("classifyHttpError", () => {
  it("keeps the server's code on a 503", () => {
    expect(classifyHttpError(503, { code: "provider_down", retryable: false, run: {} })).toEqual({
      kind: "terminal",
      code: "provider_down",
    });
    expect(classifyHttpError(503, null)).toEqual({ kind: "terminal", code: "extraction_unavailable" });
  });

  it("separates the two quotas and treats the rest per §4.6", () => {
    expect(classifyHttpError(429, { code: "quota_runs" })).toEqual({ kind: "rate_limited", code: "quota_runs" });
    expect(classifyHttpError(429, { code: "quota_attempts" })).toEqual({
      kind: "rate_limited",
      code: "quota_attempts",
    });
    expect(classifyHttpError(403, null)).toEqual({ kind: "terminal", code: "merchant_not_approved" });
    expect(classifyHttpError(401, null)).toEqual({ kind: "unauthorized" });
    expect(classifyHttpError(0, null)).toEqual({ kind: "retryable", code: "network" });
    expect(classifyHttpError(502, null)).toEqual({ kind: "retryable", code: "server_error" });
  });
});

describe("startExtraction", () => {
  it("streams a run through to done and counts it once", async () => {
    const h = handlers();
    startExtraction(request, h);
    await flush();
    const es = instances()[0];
    expect(es.options.headers.Authorization).toBe("Bearer token-1");
    es.emit("open", { type: "open" });
    es.emit("run", { data: JSON.stringify({ run_id: "r1" }) });
    es.emit("field", { data: JSON.stringify({ field: "title", status: "filled", value: "PS5" }) });
    es.emit("done", { data: JSON.stringify({ run_id: "r1", filled: ["title"], blank: [] }) });
    expect(h.onField).toHaveBeenCalledTimes(1);
    expect(h.onDone).toHaveBeenCalledWith(expect.objectContaining({ run_id: "r1" }), "sse");
    expect(h.onServerRun).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
  });

  it("does not rerun over JSON when the server says the error is not retryable", async () => {
    const h = handlers();
    startExtraction(request, h);
    await flush();
    instances()[0].emit("error", {
      type: "error",
      data: JSON.stringify({ code: "timeout", retryable: false }),
    });
    await flush();
    expect(post).not.toHaveBeenCalled();
    expect(h.onFailed).toHaveBeenCalledWith("timeout", "sse");
  });

  it("falls back to JSON when the server marks its error retryable", async () => {
    post.mockResolvedValueOnce({
      data: {
        run: { run_id: "r2" },
        fields: [{ field: "brand_name", status: "filled", value: "Sony" }],
        warnings: [],
        done: { run_id: "r2", filled: ["brand_name"], blank: [] },
      },
    });
    const h = handlers();
    startExtraction(request, h);
    await flush();
    instances()[0].emit("error", {
      type: "error",
      data: JSON.stringify({ code: "provider_error", retryable: true }),
    });
    await flush();
    expect(h.onFallback).toHaveBeenCalledWith("provider_error");
    expect(post).toHaveBeenCalledTimes(1);
    expect(h.onField).toHaveBeenCalledWith(expect.objectContaining({ field: "brand_name" }));
    expect(h.onDone).toHaveBeenCalledWith(expect.objectContaining({ run_id: "r2" }), "json");
    expect(h.onServerRun).toHaveBeenCalledTimes(1);
  });

  it("falls back when the stream closes without done", async () => {
    post.mockResolvedValueOnce({
      data: { run: null, fields: [], warnings: [], done: { run_id: "r3", filled: [], blank: [] } },
    });
    const h = handlers();
    startExtraction(request, h);
    await flush();
    const es = instances()[0];
    es.emit("open", { type: "open" });
    es._xhr = { readyState: 4, status: 200 };
    jest.advanceTimersByTime(500);
    await flush();
    expect(h.onFallback).toHaveBeenCalledWith("network");
    expect(post).toHaveBeenCalledTimes(1);
    expect(h.onDone).toHaveBeenCalledWith(expect.anything(), "json");
    // The abandoned stream and the JSON call were both runs on the server.
    expect(h.onServerRun).toHaveBeenCalledTimes(2);
  });

  it("falls back at the client timeout, counting the abandoned stream", async () => {
    post.mockResolvedValueOnce({
      data: { run: null, fields: [], warnings: [], done: { run_id: "r4", filled: [], blank: [] } },
    });
    const h = handlers();
    startExtraction(request, h);
    await flush();
    instances()[0].emit("open", { type: "open" });
    jest.advanceTimersByTime(STREAM_TIMEOUT_MS - 1);
    await flush();
    expect(post).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await flush();
    expect(h.onFallback).toHaveBeenCalledWith("timeout");
    expect(h.onServerRun).toHaveBeenCalledTimes(2);
  });

  it("refreshes the token and retries once on 401, then gives up", async () => {
    const h = handlers();
    startExtraction(request, h);
    await flush();
    instances()[0].emit("error", { type: "error", xhrStatus: 401, xhrState: 4, message: "" });
    await flush();
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(instances()).toHaveLength(2);
    expect(instances()[1].options.headers.Authorization).toBe("Bearer token-2");

    instances()[1].emit("error", { type: "error", xhrStatus: 401, xhrState: 4, message: "" });
    await flush();
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(instances()).toHaveLength(2);
    expect(h.onFailed).toHaveBeenCalledWith("unauthorized", "sse");
    expect(post).not.toHaveBeenCalled();
  });

  it("reads the code from a JSON 503 body and counts the run it reports", async () => {
    post.mockRejectedValueOnce(
      httpError(503, { code: "provider_down", retryable: false, run: { run_id: "r5" } })
    );
    const h = handlers();
    startExtraction(request, h);
    await flush();
    // The library reports a dropped connection as an `error` of type exception.
    instances()[0].emit("error", { type: "exception", message: "boom", error: new Error("boom") });
    await flush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(h.onFailed).toHaveBeenCalledWith("provider_down", "json");
    expect(h.onServerRun).toHaveBeenCalledTimes(1);
  });

  it("stops at a 429 without falling back", async () => {
    const h = handlers();
    startExtraction(request, h);
    await flush();
    instances()[0].emit("error", {
      type: "error",
      xhrStatus: 429,
      xhrState: 4,
      message: JSON.stringify({ code: "quota_runs" }),
    });
    await flush();
    expect(h.onRateLimited).toHaveBeenCalledWith("quota_runs");
    expect(post).not.toHaveBeenCalled();
    expect(h.onServerRun).not.toHaveBeenCalled();
  });
});
