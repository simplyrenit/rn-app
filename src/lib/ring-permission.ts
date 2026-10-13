/**
 * Whether this phone can ring (review round 1, finding 2). A ring is a push, and a
 * phone that has not been allowed to show notifications never gets one: every
 * request then goes unanswered, each is a missed one, and two in a row close the
 * shop. So the shop's own screens say whether this phone will ring, ask for the
 * permission with the reason, and send the owner to the system settings when it was
 * refused. Plain functions, so the words and the rule can be tested.
 */

/** What the system says about notifications (`expo-notifications`' `getPermissionsAsync`). */
export interface SystemPermission {
  status: string;
  /** False once the system will not show its prompt again: only the settings can change it. */
  canAskAgain?: boolean;
}

/**
 * `granted`: this phone can ring. `ask`: not allowed yet and the system will still
 * ask. `settings`: refused, and only the phone's settings can change it.
 * `unavailable`: a phone that cannot get pushes at all (a simulator): nothing to say.
 */
export type RingPermission = "granted" | "ask" | "settings" | "unavailable";

export function ringPermission(permission: SystemPermission | null | undefined, isDevice: boolean): RingPermission | null {
  if (!isDevice) return "unavailable";
  if (!permission) return null;
  if (permission.status === "granted") return "granted";
  // Never asked, or refused once where the system will still ask (Android before its second refusal).
  return permission.status === "undetermined" || permission.canAskAgain !== false ? "ask" : "settings";
}

/** True when this phone will ring, false when it will not, null when that is not known or does not apply. */
export function ringsHere(state: RingPermission | null): boolean | null {
  if (state === "granted") return true;
  return state === "ask" || state === "settings" ? false : null;
}

export interface RingNotice {
  title: string;
  body: string;
  /** What the button does: asks the system for the permission, or opens the phone's settings. */
  action: "turn_on" | "open_settings";
  label: string;
}

/** The warning for a phone that will not ring; null when there is nothing to warn about. */
export function ringNotice(state: RingPermission | null): RingNotice | null {
  switch (state) {
    case "ask":
      return {
        title: "Turn on notifications to hear new requests",
        body: "A customer's request rings this phone as a notification. Until they are on, this phone will not ring.",
        action: "turn_on",
        label: "Turn on notifications",
      };
    case "settings":
      return {
        title: "This phone will not ring",
        body: "Notifications are off for Renit, so new requests will not ring here. Turn them on in your phone's settings.",
        action: "open_settings",
        label: "Open settings",
      };
    default:
      return null;
  }
}

/** The line under the Open switch: what the server says, and the truth about this phone. */
export function ringCaption(line: string, isOpen: boolean, state: RingPermission | null): string {
  return isOpen && ringsHere(state) === false ? `${line} · this phone won't ring` : line;
}

/** What a quiet Today says: it never promises a ring this phone cannot give. */
export function quietBody(state: RingPermission | null): string {
  return ringsHere(state) === false
    ? "What goes out and comes back today shows up here."
    : "New requests ring this phone. What goes out and comes back today shows up here.";
}

/** What is said when the shop is switched to Open on a phone that will not ring. */
export const OPEN_BUT_QUIET = {
  title: "Open, but this phone won't ring",
  message: "Notifications are off for Renit. Turn them on to hear new requests.",
} as const;

/**
 * What a customer who is waiting on a push is told when this phone cannot show one
 * (review before merge, R-1): the owner's answer and the rent's deadline both arrive
 * as a push, and chat, the only other place a customer was asked, is off. The shop's
 * warning above is about ringing; this one is in a customer's words. Null when the
 * push will arrive, and when that is not known or does not apply.
 */
export function customerPushNotice(state: RingPermission | null): string | null {
  return ringsHere(state) === false
    ? "Notifications are off, so we can't tell you when the owner answers. Turn them on in Settings."
    : null;
}

/** The same fact on the screens with a deadline, where the push is what says the time is running out. */
export function customerDeadlineNotice(state: RingPermission | null): string | null {
  return ringsHere(state) === false
    ? "Notifications are off, so we can't remind you before this runs out. Turn them on in Settings."
    : null;
}
