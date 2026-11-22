/**
 * The design-fixture switch (ENG-426, dev builds only). While a fixture is on, a request interceptor on the app's
 * `axiosInstance` answers the fixture's requests from its JSON (by setting `config.adapter`), lets other reads go to
 * QA, answers the analytics batch POST with a no-op 204, and refuses every other write with a 409.
 *
 * Only `axiosInstance` is covered. Bare `axios` (the token refresh), the listing flow's SSE stream, `fetch` and
 * Firestore (chat) are not intercepted, so a write through any of those still reaches QA while a fixture is on.
 * Events tracked during a fixture are dropped when it is turned off, so the queue's 10 s timer cannot post them later.
 * Installed by the one `__DEV__` require in networkUtils.ts.
 */
import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { EVENTS } from "@/lib/config";
import { resetEvents } from "@/lib/events";
import { DevFixture, FIXTURES } from "./registry";

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_FIXTURES_MARKER = "RENIT_DEV_FIXTURES_MARKER";

let active: { frameId: string; fixture: DevFixture } | null = null;

export function activeFixture() {
  return active;
}

/** Turns on the fixture for a frame id; false when there is none. */
export function activateFixture(frameId: string): boolean {
  const fixture = FIXTURES[frameId];
  active = fixture ? { frameId, fixture } : null;
  return Boolean(fixture);
}

export function deactivateFixture() {
  // Anything tracked on a fixture screen describes fixture data; posting it after the switch would file it in QA.
  if (active) resetEvents();
  active = null;
}

/** `/api/category/?page=2` from an absolute or relative request URL. */
function pathOf(config: InternalAxiosRequestConfig): string {
  return (config.url ?? "").replace(/^[a-z]+:\/\/[^/]+/i, "").split(/[?#]/)[0];
}

/** `"GET /users/*"` against a method and a path: the pattern is a suffix of the path, `*` one segment. */
export function matchesKey(key: string, method: string, path: string): boolean {
  const [keyMethod, pattern = ""] = key.split(" ");
  if (keyMethod.toUpperCase() !== method) return false;
  const source = pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]+");
  return new RegExp(`${source}$`).test(path);
}

const READS = new Set(["GET", "HEAD", "OPTIONS"]);

export function installDesignFixtures(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    if (!active) return config;
    const { frameId, fixture } = active;
    const method = (config.method ?? "get").toUpperCase();
    const path = pathOf(config);
    const key = Object.keys(fixture.responses).find((k) => matchesKey(k, method, path));
    if (key) {
      // A copy per request: a screen that edits its response must not edit the fixture.
      const data = JSON.parse(JSON.stringify(fixture.responses[key]));
      config.adapter = async (c): Promise<AxiosResponse> => ({ data, status: 200, statusText: "OK", headers: {}, config: c });
    } else if (method === "POST" && path === pathOf({ url: EVENTS } as InternalAxiosRequestConfig)) {
      // Accepted and dropped. The events queue puts a failed batch back and retries it, so refusing it here would
      // only hold the fixture session's events until the fixture is off and then send them to QA.
      config.adapter = async (c): Promise<AxiosResponse> => ({ data: "", status: 204, statusText: "No Content", headers: {}, config: c });
    } else if (!READS.has(method)) {
      // A real HTTP answer, not a bare error: callers read an AxiosError with no `response` as "offline" (and the
      // events queue keeps such a batch to send again), so a 4xx makes the screen show its error state instead.
      // Thrown, because axios does not apply `validateStatus` to a response a custom adapter returns.
      config.adapter = async (c) => {
        const message = `Design fixture ${frameId}: no response for ${method} ${path}`;
        throw new AxiosError(message, "ERR_DESIGN_FIXTURE", c, undefined, {
          data: { error: message, detail: message },
          status: 409,
          statusText: "Conflict",
          headers: {},
          config: c,
        });
      };
    }
    return config;
  });
}
