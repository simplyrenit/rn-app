import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackActions } from "@react-navigation/native";

import type { KycStatus, NavigationUseType, RootStackParamList } from "@/lib/types";

export type BookingToResume = RootStackParamList["ReviewAndBook"];

/**
 * ENG-447: the price screen a customer left for the ID check, kept for a day, so the approval push can bring them back
 * to it even after the app was closed meanwhile (the status screen's "Continue your booking"). Kept for the account that
 * left it only: a phone can change hands.
 */
const RESUME_KEY = "kyc_booking_to_resume";
const RESUME_FOR_MS = 24 * 60 * 60 * 1000;
type Saved = { user: string; at: number; params: BookingToResume };

/** The saved price screen, if it is this account's and less than a day old. */
export function resumable(saved: unknown, user: string | undefined, now: number): BookingToResume | null {
  if (!user || typeof saved !== "object" || saved === null) return null;
  const { user: owner, at, params } = saved as Partial<Saved>;
  if (owner !== user || typeof at !== "number" || now - at > RESUME_FOR_MS || now < at || !params?.item) return null;
  return params;
}

export async function bookingToResume(user: string | undefined): Promise<BookingToResume | null> {
  try {
    const raw = await AsyncStorage.getItem(RESUME_KEY);
    return raw ? resumable(JSON.parse(raw), user, Date.now()) : null;
  } catch {
    return null;
  }
}

export function forgetBookingToResume() {
  AsyncStorage.removeItem(RESUME_KEY).catch(() => undefined);
}

/**
 * The one way into the customer's ID check from a booking (ENG-176, ENG-351).
 *
 * The check is rn-kyc's individual one (PAN and Aadhaar through DigiLocker, then a reviewer),
 * through the same three screens as a business's verification. With nothing on file it starts at
 * the explanation; with a check on file it opens where it stands, which for a failed check is its
 * whole reason and the right way on (try again, or support for a duplicate).
 * Both are pushed on top of the price screen (`source: "booking"`), so Back returns to it, and it
 * reads the quote again when it comes back into view: the dates are kept, and "ID check passed"
 * shows by itself.
 *
 * Pushed, not navigated: `navigate` would jump back to an ID check screen already in the stack
 * and drop the price screen above it, with its product and dates.
 *
 * `status` is the customer's verification status, when it has been read.
 */
export function startIdCheck(
  navigation: NavigationUseType,
  status: KycStatus | undefined,
  resume?: { user: string | undefined; params: BookingToResume },
  // ENG-449: an owner's publish locked on the ID check comes back to its listing the same way.
  source: "booking" | "listing" = "booking"
) {
  // A second tap while the first screen opens would push it twice.
  const routes = navigation.getState?.()?.routes ?? [];
  const top = routes[routes.length - 1]?.name;
  if (top?.startsWith("Kyc")) return;
  if (resume?.user) {
    const saved: Saved = { user: resume.user, at: Date.now(), params: resume.params };
    AsyncStorage.setItem(RESUME_KEY, JSON.stringify(saved)).catch(() => undefined);
  }
  if (status === undefined || status === "none") {
    navigation.dispatch(StackActions.push("KycIntro", { source }));
  } else {
    navigation.dispatch(StackActions.push("KycStatus", { source }));
  }
}
