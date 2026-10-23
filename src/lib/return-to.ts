import type { NavigationUseType, RootStackParamList } from "@/lib/types";

/**
 * Where a customer was when the app asked them to sign in, so signing in takes
 * them back there instead of to Home (ENG-172): the listing, with the dates of
 * their search still on it, ready for Book now.
 *
 * Kept in memory only and for a short while: it is for the sign-in that follows
 * the prompt, not for one made tomorrow from the Profile tab.
 */
export type ReturnTo =
  | { name: "ProductDetail"; params: RootStackParamList["ProductDetail"] }
  // ENG-292: "Sign in to see who delivers to you" comes back to the same search
  // (text, place and dates); filters and sort start again.
  | { name: "SearchResults"; params: RootStackParamList["SearchResults"] };

const KEEP_MS = 15 * 60 * 1000;

let kept: { target: ReturnTo; at: number } | null = null;

export function rememberReturnTo(target: ReturnTo, now: number = Date.now()) {
  kept = { target, at: now };
}

/** The place to go back to, once: taking it forgets it. Null when there is none, or it is old. */
export function takeReturnTo(now: number = Date.now()): ReturnTo | null {
  const held = kept;
  kept = null;
  return held && now - held.at < KEEP_MS ? held.target : null;
}

/**
 * `{intent: "cart_add"}` while the sign-in under way was asked for by Add to
 * cart, for the sign-in calls to send (cart plan D50: rn-api counts how many of
 * those sign-ins finish). Looking does not take the target.
 */
export function signInIntent(now: number = Date.now()): { intent?: "cart_add" } {
  const target = kept && now - kept.at < KEEP_MS ? kept.target : null;
  return target?.name === "ProductDetail" && target.params.add ? { intent: "cart_add" } : {};
}

/**
 * The last step of every sign-in and sign-up: back to where the customer was
 * asked to sign in, or to the tabs as before. The stack is rebuilt, because the
 * sign-in screens sit on top of the listing they were opened from.
 */
export function goAfterSignIn(navigation: Pick<NavigationUseType, "navigate" | "reset">) {
  const target = takeReturnTo();
  if (target) navigation.reset({ index: 1, routes: [{ name: "MainTabs" }, target] });
  else navigation.navigate("MainTabs");
}
