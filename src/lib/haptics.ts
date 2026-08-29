import * as Haptics from "expo-haptics";

/**
 * Thin wrapper over expo-haptics.
 *
 * Every call is fire-and-forget and swallows its own errors: haptics are a
 * garnish, and a device without a Taptic Engine (or a JS bundle running against
 * a native binary built before expo-haptics was added) must not crash because of
 * one. Never await these.
 */
function fire(run: () => Promise<void>) {
  try {
    void run().catch(() => {});
  } catch {
    // Native module unavailable — silently continue.
  }
}

/** A favourite, a tab change, a toggle. The default. */
export const tapFeedback = () =>
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** A commit: submitting a listing, sending a message, confirming dates. */
export const commitFeedback = () =>
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const successFeedback = () =>
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const warningFeedback = () =>
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const errorFeedback = () =>
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

/** Passing a discrete step: a segmented control, a carousel page. */
export const selectionFeedback = () => fire(() => Haptics.selectionAsync());
