/**
 * The design-fixture switch (ENG-426, dev builds only). While a fixture is on, a request interceptor on the app's
 * `axiosInstance` answers the fixture's requests from its JSON (by setting `config.adapter`), lets other reads go to
 * QA, answers the analytics batch POST with a no-op 204, and refuses every other write with a 409.
 *
 * Only `axiosInstance` is covered. Bare `axios` (the token refresh), the listing flow's SSE stream, `fetch` and
 * Firestore (chat) are not intercepted, so a write through any of those still reaches QA while a fixture is on.
 * Events tracked during a fixture are dropped when it is turned off, so the queue's 10 s timer cannot post them later.
 *
 * A fixture with a `session` also starts the design session (session.ts): the app looks signed in as the fixture's
 * user, its me-request is answered with that user, and a read the fixture does not list gets a 404 instead of going
 * to QA, so nothing reaches QA without (or with someone else's) credentials, and no 401 starts a refresh or a logout.
 * Installed by the one `__DEV__` require in networkUtils.ts.
 */
import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { EVENTS, MY_DETAILS_ENDPOINT } from "@/lib/config";
import { resetEvents } from "@/lib/events";
import { DevFixture, FIXTURES } from "./registry";
import { setDesignSession } from "./session";

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_FIXTURES_MARKER = "RENIT_DEV_FIXTURES_MARKER";

let active: { frameId: string; fixture: DevFixture } | null = null;

export function activeFixture() {
  return active;
}

/** Turns on the fixture for a frame id; false when there is none. */
export function activateFixture(frameId: string): boolean {
  // Leaving a fixture for another frame: its queued events go too (see deactivateFixture).
  if (active) resetEvents();
  const fixture = FIXTURES[frameId];
  active = fixture ? { frameId, fixture } : null;
  setDesignSession(fixture?.session?.user ?? null);
  return Boolean(fixture);
}

export function deactivateFixture() {
  // Anything tracked on a fixture screen describes fixture data; posting it after the switch would file it in QA.
  // Always reset: activateFixture() may already have cleared `active` for an unknown frame id.
  resetEvents();
  active = null;
  setDesignSession(null);
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

/** A real HTTP error answer: thrown, because axios does not apply `validateStatus` to a custom adapter's response. */
function refuse(config: InternalAxiosRequestConfig, status: number, statusText: string, message: string) {
  config.adapter = async (c) => {
    throw new AxiosError(message, "ERR_DESIGN_FIXTURE", c, undefined, {
      data: { error: message, detail: message },
      status,
      statusText,
      headers: {},
      config: c,
    });
  };
}

export function installDesignFixtures(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    if (!active) return config;
    const { frameId, fixture } = active;
    const method = (config.method ?? "get").toUpperCase();
    const path = pathOf(config);
    const key = Object.keys(fixture.responses).find((k) => matchesKey(k, method, path));
    const sessionUser = fixture.session?.user;
    if (key || (sessionUser && method === "GET" && path === pathOf({ url: MY_DETAILS_ENDPOINT } as InternalAxiosRequestConfig))) {
      // A copy per request: a screen that edits its response must not edit the fixture.
      const data = JSON.parse(JSON.stringify(key ? fixture.responses[key] : sessionUser));
      config.adapter = async (c): Promise<AxiosResponse> => ({ data, status: 200, statusText: "OK", headers: {}, config: c });
    } else if (method === "POST" && path === pathOf({ url: EVENTS } as InternalAxiosRequestConfig)) {
      // Accepted and dropped. The events queue puts a failed batch back and retries it, so refusing it here would
      // only hold the fixture session's events until the fixture is off and then send them to QA.
      config.adapter = async (c): Promise<AxiosResponse> => ({ data: "", status: 204, statusText: "No Content", headers: {}, config: c });
    } else if (!READS.has(method)) {
      // A real HTTP answer, not a bare error: callers read an AxiosError with no `response` as "offline" (and the
      // events queue keeps such a batch to send again), so a 4xx makes the screen show its error state instead.
      refuse(config, 409, "Conflict", `Design fixture ${frameId}: no response for ${method} ${path}`);
    } else if (sessionUser) {
      // In a design session a read must not reach QA: the device may be signed out (its 401 would start a refresh
      // and a logout) or signed in as someone other than the user on screen.
      refuse(config, 404, "Not Found", `Design fixture ${frameId}: no response for ${method} ${path}`);
    }
    return config;
  });
}
