/**
 * How the phone app pays (PAYMENTS-DESIGN section 5, decision P-07; API-CONTRACT
 * PaymentStart). One function for screens, `startPayment`: it opens rn-pay's pay
 * page in the phone's own browser, waits for the customer to come back, then asks
 * rn-api what happened.
 *
 * Three rules this file keeps:
 *  - the pay page's `checkout_url` is opened as given, never built or changed;
 *  - it is opened with `Linking.openURL`, never in a WebView (UPI apps do not open
 *    from one, and rn-app has no in-app browser module);
 *  - nothing is ever marked paid from the return link. The link and the app coming
 *    to the front are only the nudge to ask rn-api, whose answer is the only one
 *    that counts.
 */
import { PAYMENTS_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking } from "react-native";

export type PayResult = "paid" | "failed" | "expired" | "cancelled" | "pending";

export type PaymentStatus = "created" | "failed" | "paid" | "expired" | "cancelled";

/** The three fields of a PaymentStart the hand-off needs. */
export interface PaymentHandoff {
  payment_id: string;
  checkout_url: string;
  expires_at: string;
}

/** `POST /api/payments/{payment_id}/confirm/`. `booking` is the customer's booking after any stage change. */
export interface PaymentConfirmation<Booking = unknown> {
  payment: {
    id: string;
    purpose: string;
    amount: string;
    status: PaymentStatus;
    text: string | null;
    failure_code: string | null;
  };
  booking: Booking;
}

/** Where rn-pay's "Back to Renit" button sends the customer. The scheme is already registered. */
const PAY_RETURN = "renit://pay/return";

/** The contract's asking rhythm: at once, then every 3 seconds for up to 60. */
const ASK_EVERY_MS = 3000;
const ASK_FOR_MS = 60_000;

/**
 * Reads `renit://pay/return?payment_id=…&status=…`. Parsed by hand: React
 * Native's `URL` does not read a custom scheme's query reliably. `status` is
 * returned for logging only; no caller may act on it.
 */
export function parsePayReturn(
  url: string | null | undefined
): { payment_id: string; status: string | null } | null {
  if (!url) return null;
  const [path, query = ""] = url.split("#")[0].split("?");
  if (path.replace(/\/$/, "") !== PAY_RETURN) return null;
  const params: Record<string, string> = {};
  for (const pair of query.split("&")) {
    const [key, value = ""] = pair.split("=");
    if (!key) continue;
    try {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      // A badly escaped pair is skipped; the link is only a nudge.
    }
  }
  return params.payment_id ? { payment_id: params.payment_id, status: params.status ?? null } : null;
}

export async function confirmPayment<Booking = unknown>(
  paymentId: string
): Promise<PaymentConfirmation<Booking>> {
  const response = await axiosInstance.post<PaymentConfirmation<Booking>>(
    `${PAYMENTS_ENDPOINT}${encodeURIComponent(paymentId)}/confirm/`,
    {}
  );
  return response.data;
}

interface AskOptions {
  everyMs?: number;
  forMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * Asks until the payment is no longer `created`, for at most a minute. After
 * that the answer is `pending`: the bank is slow, the push on payment finishes
 * the job and the booking screen shows the truth whenever it is opened.
 *
 * A call that fails is not an answer, so it is asked again; a payment is never
 * called failed because the network was.
 */
export async function askUntilSettled(
  ask: () => Promise<PaymentStatus>,
  {
    everyMs = ASK_EVERY_MS,
    forMs = ASK_FOR_MS,
    sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
  }: AskOptions = {}
): Promise<PayResult> {
  const until = now() + forMs;
  for (;;) {
    let status: PaymentStatus = "created";
    try {
      status = await ask();
    } catch {
      // Asked again below.
    }
    if (status !== "created") return status;
    if (now() + everyMs > until) return "pending";
    await sleep(everyMs);
  }
}

/**
 * Resolves when the customer is back: the return link for this payment arrives,
 * or the app comes to the front again after having left it (they may switch back
 * from the UPI app without touching the browser). Whichever is first.
 */
function listenForReturn(paymentId: string) {
  let stop = () => {};
  const back = new Promise<void>((resolve) => {
    // Starts false: the customer tapped Pay, so the app is in front. Coming to
    // the front only counts once the app has been left for the browser.
    let left = false;
    const link = Linking.addEventListener("url", ({ url }) => {
      if (parsePayReturn(url)?.payment_id === paymentId) done();
    });
    const state = AppState.addEventListener("change", (next) => {
      if (next !== "active") left = true;
      else if (left) done();
    });
    stop = () => {
      link.remove();
      state.remove();
    };
    function done() {
      stop();
      resolve();
    }
  });
  return { back, stop };
}

async function pay(payment: PaymentHandoff): Promise<PayResult> {
  // A pay page past its time only says "This payment has ended"; the caller asks
  // rn-api for a new payment instead.
  if (new Date(payment.expires_at).getTime() <= Date.now()) return "expired";

  // Listening starts before the page opens, so a fast return is not missed.
  const { back, stop } = listenForReturn(payment.payment_id);
  try {
    await Linking.openURL(payment.checkout_url);
  } catch {
    stop();
    return "failed";
  }
  await back;
  return askUntilSettled(async () => (await confirmPayment(payment.payment_id)).payment.status);
}

const inFlight = new Map<string, Promise<PayResult>>();

/**
 * Opens the pay page, waits for the customer to come back, and asks rn-api what
 * happened. A second call for a payment already in flight (a double tap) joins
 * the first: the page is not opened twice.
 */
export function startPayment(payment: PaymentHandoff): Promise<PayResult> {
  const running = inFlight.get(payment.payment_id);
  if (running) return running;
  const run = pay(payment).finally(() => inFlight.delete(payment.payment_id));
  inFlight.set(payment.payment_id, run);
  return run;
}

// ---- A payment in flight, kept on the phone ------------------------------------------

const PENDING_KEY = "renit-pending-payment";

interface PendingPayment<P extends PaymentHandoff = PaymentHandoff> {
  /** The booking number. */
  booking: string;
  payment: P;
}

/**
 * Remembers the payment a booking is waiting on, because the phone may close the
 * app while the customer is in the browser or a UPI app. With it, the app can ask
 * rn-api again when it next starts, and "Try again" can open the same pay page.
 * ponytail: one payment at a time; a second one in flight replaces the first,
 * which the booking screen then reads from the server. Keep a list if that bites.
 */
export async function rememberPayment(booking: string, payment: PaymentHandoff): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ booking, payment }));
  } catch {
    // Only a convenience: the server still knows the payment.
  }
}

export async function forgetPayment(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // As above.
  }
}

async function readPending(): Promise<PendingPayment | null> {
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? "null") as PendingPayment | null;
    if (!stored?.booking || !stored.payment?.payment_id || !stored.payment.checkout_url) return null;
    if (new Date(stored.payment.expires_at).getTime() <= Date.now()) {
      await forgetPayment();
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

/** The pay page this booking can still be paid on, if the phone remembers one. */
export async function rememberedPayment<P extends PaymentHandoff = PaymentHandoff>(
  booking: string
): Promise<P | null> {
  const stored = await readPending();
  return stored?.booking === booking ? (stored.payment as P) : null;
}

/**
 * For app start: if a payment was in flight when the app last closed, ask rn-api
 * about it once (which also moves the booking on if it was paid) and return the
 * booking's number so the app can open it. Null when nothing was in flight.
 */
export async function resumePayment(): Promise<string | null> {
  const stored = await readPending();
  if (!stored) return null;
  try {
    const { payment } = await confirmPayment(stored.payment.payment_id);
    if (payment.status !== "created" && payment.status !== "failed") await forgetPayment();
  } catch {
    // The booking screen asks the server itself when it opens.
  }
  return stored.booking;
}
