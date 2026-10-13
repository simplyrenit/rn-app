/**
 * A session that ended under the app's feet (T-26): the server answers 401 at once for a device that was signed out from
 * another one, and the refresh then answers 401 `token_not_valid` with its reason ("This device has been signed out."). The
 * app signs out cleanly, once, with one plain message, from whatever screen it is on, a ring included. Plain functions.
 */

/** `signed_out`: another device (or Renit) signed this phone out. `expired`: the session ran out, or the token is no good. */
export type SessionEnd = "signed_out" | "expired";

/** Which it was, from the refresh's refusal (`{"detail": "This device has been signed out.", "code": "token_not_valid"}`). */
export function sessionEndFrom(data: unknown): SessionEnd {
  const detail = typeof data === "object" && data !== null ? (data as { detail?: unknown }).detail : null;
  return typeof detail === "string" && /signed out/i.test(detail) ? "signed_out" : "expired";
}

/** The one message shown, in plain words. */
export function sessionEndText(end: SessionEnd): { title: string; message: string } {
  return end === "signed_out"
    ? { title: "You were signed out", message: "This phone was signed out from another device. Sign in again to carry on." }
    : { title: "Your session expired", message: "Please sign in again." };
}

/**
 * Whether to take the person to Welcome: the app was signed in and now is not (a forced sign-out; a sign-out they
 * chose resets the stack itself) and the screen on top is not one a signed-out person can be on. From a screen deep in
 * a flow, or over a ring, the stack is cleared so nothing of the old account stays on screen.
 */
export function shouldGoToWelcome(
  was: boolean | null | undefined,
  now: boolean | null | undefined,
  route: string | null | undefined
): boolean {
  if (was !== true || now !== false) return false;
  return !route || !SIGNED_OUT_SCREENS.has(route);
}

const SIGNED_OUT_SCREENS = new Set(["Welcome", "Email", "Phone", "Verify", "About", "Password", "ConfirmPassword", "Location"]);
