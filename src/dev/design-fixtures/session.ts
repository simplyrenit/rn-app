/**
 * The design session (dev builds only): while a fixture that has a `session` is on, the global context reports a
 * signed-in user (the fixture's) so signed-in screens can be diffed on a signed-out device, without any real token.
 *
 * Kept free of imports so the global context can reach it (through its one `__DEV__` require) without pulling in
 * the registry and every fixture. The interceptor sets it from activateFixture/deactivateFixture.
 */
import type { MyDetailsResponse } from "@/lib/my-details";

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_DESIGN_SESSION_MARKER = "RENIT_DEV_DESIGN_SESSION_MARKER";

export type DesignSession = {
  user: MyDetailsResponse;
  /** In memory only, for the screens that gate on `authTokens && isAuthenticated`; never stored, never sent. */
  tokens: { access_token: string; refresh_token: string };
};

let session: DesignSession | null = null;
const listeners = new Set<(s: DesignSession | null) => void>();

export function designSession() {
  return session;
}

export function setDesignSession(user: MyDetailsResponse | null) {
  const next = user ? { user, tokens: { access_token: "design-session", refresh_token: "design-session" } } : null;
  if (!next && !session) return;
  session = next;
  listeners.forEach((listener) => listener(session));
}

/** Calls `listener` now and on every change; returns the unsubscribe. */
export function subscribeDesignSession(listener: (s: DesignSession | null) => void) {
  listeners.add(listener);
  listener(session);
  return () => {
    listeners.delete(listener);
  };
}
