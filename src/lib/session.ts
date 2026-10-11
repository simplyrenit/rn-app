/**
 * This phone's own session id, for telling "you answered" from "another device
 * answered" (API-CONTRACT P3-14). Every sign-in call answers with a `session_id`
 * and the tokens carry the same number in their `sid` claim, so it is read from
 * the access token: it is right after a refresh, and for the sign-in that answers
 * with no `session_id` (the OTP check). Null when the token cannot be read or has
 * no `sid` (a token an older server issued): the server's own `this_device` then
 * has to do.
 */
export function sessionIdFromToken(
  jwt: string | null | undefined,
  decode: (base64: string) => string = (s) => globalThis.atob(s)
): number | null {
  try {
    const payload = jwt?.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const sid = (JSON.parse(decode(padded)) as { sid?: unknown }).sid;
    const id = typeof sid === "string" && sid.trim() !== "" ? Number(sid) : sid;
    return typeof id === "number" && Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
