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
 * The last step of every sign-in and sign-up: back to where the customer was
 * asked to sign in, or to the tabs as before. The stack is rebuilt, because the
 * sign-in screens sit on top of the listing they were opened from.
 */
export function goAfterSignIn(navigation: Pick<NavigationUseType, "navigate" | "reset">) {
  const target = takeReturnTo();
  if (target) navigation.reset({ index: 1, routes: [{ name: "MainTabs" }, target] });
  else navigation.navigate("MainTabs");
}
