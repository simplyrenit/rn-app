/**
 * The design-fixture switch (ENG-426, dev builds only). While a fixture is on, a request interceptor on the app's
 * axios instance answers the fixture's requests from its JSON (by setting `config.adapter`), lets other reads go to
 * QA, and refuses every other write, so a screen opened for a screenshot can never change QA data.
 *
 * It covers `axiosInstance` only: bare `axios` (the token refresh), the listing flow's SSE stream, `fetch` and
 * Firestore are not served. Installed by the one `__DEV__` require in networkUtils.ts.
 */
import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
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
    } else if (!READS.has(method)) {
      config.adapter = async (c) => {
        throw new AxiosError(`Design fixture ${frameId}: no response for ${method} ${path}`, "ERR_DESIGN_FIXTURE", c);
      };
    }
    return config;
  });
}
