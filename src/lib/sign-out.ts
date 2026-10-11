import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { getAuthTokens } from "./auth-fns";
import { ACCESS_DEVICES_ENDPOINT, GET_REFRESH_TOKEN } from "./config";

/**
 * Ending this phone's session on the server when the person signs out, so it
 * stops ringing and leaves "Signed-in devices" (`POST /api/access/devices/current/sign-out/`,
 * API-CONTRACT OE-B, ENG-146).
 *
 * The phone signs out whatever the network does. When the call does not reach the
 * server, the session's tokens are kept aside, the call is repeated when the
 * network is back (at the next start and each time the app comes to the front),
 * and only then are they forgotten. Until then the server still holds the session
 * and its push token, so a `ring` push that reaches a signed-out phone is dropped.
 */

export const PENDING_SIGN_OUT_KEY = "renit-pending-sign-out";

export interface PendingSignOut {
  access_token: string;
  refresh_token: string;
}

/** An HTTP status, or "network" when no answer came back (no signal, a timeout). */
export type Answer = number | "network";

/**
 * Whether an answer ends the matter. 2xx: the session is ended. 404, 403 or 400: the
 * server has nothing more to end or will not be asked again. No answer, a 5xx, a
 * 408, a 429 or a 401 (the access token has run out) leave it to be repeated.
 */
export function signOutIsSettled(answer: Answer): boolean {
  if (answer === "network") return false;
  if (answer >= 200 && answer < 300) return true;
  return answer >= 400 && answer < 500 && answer !== 401 && answer !== 408 && answer !== 429;
}

export interface SignOutDeps {
  signOut: (access: string, timeoutMs: number) => Promise<Answer>;
  refresh: (refresh: string) => Promise<{ status: Answer; access?: string }>;
}

/**
 * The repeat: sign the kept session out, renewing its access token first when it
 * has run out (it lasts 30 minutes). "done" means the tokens can be forgotten;
 * "later" means try again at the next start. A refresh the server refuses means
 * the session is already over, which is the same as done.
 */
export async function repeatSignOut(
  pending: PendingSignOut,
  deps: SignOutDeps,
  timeoutMs = 8000
): Promise<"done" | "later"> {
  const first = await deps.signOut(pending.access_token, timeoutMs);
  if (first !== 401) return signOutIsSettled(first) ? "done" : "later";

  const renewed = await deps.refresh(pending.refresh_token);
  if (renewed.status === "network" || renewed.status >= 500) return "later";
  if (!renewed.access) return "done";
  const second = await deps.signOut(renewed.access, timeoutMs);
  // A 401 on a token that was just made: the session is gone.
  return second === 401 || signOutIsSettled(second) ? "done" : "later";
}

/** A `ring` push that reaches a phone with no one signed in is not for it. */
export function shouldDropPush(data: unknown, signedIn: boolean): boolean {
  const type = (data as { type?: unknown } | null | undefined)?.type;
  return type === "ring" && !signedIn;
}

// ---- The real calls ---------------------------------------------------------------

// Plain `axios`, with the tokens named: `axiosInstance` carries the header of
// whoever is signed in now, which after a sign-out is nobody or someone else.
const realDeps: SignOutDeps = {
  async signOut(access, timeoutMs) {
    try {
      const response = await axios.post(
        `${ACCESS_DEVICES_ENDPOINT}current/sign-out/`,
        {},
        { headers: { Authorization: `Bearer ${access}` }, timeout: timeoutMs, validateStatus: () => true }
      );
      return response.status;
    } catch {
      return "network";
    }
  },
  async refresh(refresh) {
    try {
      const response = await axios.post(
        GET_REFRESH_TOKEN,
        { refresh },
        { timeout: 8000, validateStatus: () => true }
      );
      const access = response.status === 200 ? response.data?.access : undefined;
      return { status: response.status, access: typeof access === "string" ? access : undefined };
    } catch {
      return { status: "network" };
    }
  },
};

export async function readPendingSignOut(): Promise<PendingSignOut | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SIGN_OUT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PendingSignOut>) : null;
    return parsed?.access_token && parsed.refresh_token
      ? { access_token: parsed.access_token, refresh_token: parsed.refresh_token }
      : null;
  } catch {
    return null;
  }
}

async function keepPendingSignOut(pending: PendingSignOut) {
  try {
    await AsyncStorage.setItem(PENDING_SIGN_OUT_KEY, JSON.stringify(pending));
  } catch {
    // Nothing more can be done on a phone that cannot store it.
  }
}

async function clearPendingSignOut() {
  try {
    await AsyncStorage.removeItem(PENDING_SIGN_OUT_KEY);
  } catch {
    // As above.
  }
}

let repeating = false;

/** Repeats a kept sign-out, if there is one. Safe to call at any time and from anywhere. */
export async function retryPendingSignOut(): Promise<void> {
  if (repeating) return;
  repeating = true;
  try {
    const pending = await readPendingSignOut();
    if (!pending) return;
    if ((await repeatSignOut(pending, realDeps)) === "done") await clearPendingSignOut();
  } finally {
    repeating = false;
  }
}

/**
 * Called by `logout` before the tokens go. Tries once, for at most three seconds,
 * so a poor connection never holds the person at the sign-out button; if that does
 * not settle it, keeps the tokens aside and starts the repeat in the background.
 * Never throws.
 */
export async function endSessionOnServer(): Promise<void> {
  try {
    const tokens = await getAuthTokens();
    if (!tokens?.access_token) return;
    const answer = await realDeps.signOut(tokens.access_token, 3000);
    if (signOutIsSettled(answer)) return;
    await keepPendingSignOut({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
    void retryPendingSignOut();
  } catch {
    // Signing out of the phone never depends on this.
  }
}
