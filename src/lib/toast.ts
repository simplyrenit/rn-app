import type { ToastAction, ToastSeverity } from "@/components/core/toast";
import { errorFeedback, successFeedback, warningFeedback } from "@/lib/haptics";
import Toast from "react-native-toast-message";

interface ShowToastOptions {
  /** Optional second line. Say what to do next, not what went wrong again. */
  message?: string;
  /** Fire the matching notification haptic. On by default. */
  haptic?: boolean;
  /** One action on the toast's right: "View cart", "Undo", "Retry". A tap hides the toast. */
  action?: ToastAction;
}

function show(
  severity: ToastSeverity,
  title: string,
  { message, haptic = true, action }: ShowToastOptions = {}
) {
  if (haptic) {
    if (severity === "success") successFeedback();
    else if (severity === "error") errorFeedback();
    else if (severity === "warning") warningFeedback();
  }

  Toast.show({
    type: "customToast",
    position: "bottom",
    text1: title,
    text2: message,
    props: { severity, action },
  });
}

/**
 * The app's toast API. Prefer these over calling Toast.show directly so severity
 * and haptics stay consistent, and so the second line is a message rather than a
 * severity flag in disguise.
 */
export const toast = {
  success: (title: string, options?: ShowToastOptions) =>
    show("success", title, options),
  error: (title: string, options?: ShowToastOptions) =>
    show("error", title, options),
  warning: (title: string, options?: ShowToastOptions) =>
    show("warning", title, options),
  info: (title: string, options?: ShowToastOptions) =>
    show("info", title, options),
  /** An undoable change the customer just made ("Removed from cart"): no tone of its own, no haptic. */
  neutral: (title: string, options?: ShowToastOptions) =>
    show("neutral", title, { haptic: false, ...options }),
};
