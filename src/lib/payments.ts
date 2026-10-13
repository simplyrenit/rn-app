/**
 * How the phone app pays (PAYMENTS-DESIGN section 5, decision P-07; API-CONTRACT
 * PaymentStart). One function for screens, `startPayment`: it opens rn-pay's pay
 * page in the phone's own browser, waits for the customer to come back, then asks
 * rn-api what happened.
 *
 * Four rules this file keeps:
 *  - the pay page's `checkout_url` is opened as given, never built or changed;
 *  - it is opened with `Linking.openURL`, never in a WebView (UPI apps do not open
 *    from one, and rn-app has no in-app browser module);
 *  - nothing is ever marked paid from the return link. The link and the app coming
 *    to the front are only the nudge to ask rn-api, whose answer is the only one
 *    that counts;
 *  - the phone's clock decides nothing. A pay page the server has just handed out
 *    is opened whatever the phone thinks of its `expires_at`; whether it has run
 *    out is the server's to say (the page itself, or `confirm` answering `expired`).
 *
 * The pay page of an open payment is not kept on the phone: it rides on the
 * booking (`pay_now.payment`), so any phone can resume it. What is kept is one
 * small note of the payment in flight, only so a restarted app can ask about it.
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
  // `expires_at` is not looked at: a phone whose clock runs ahead would refuse a
  // payment the server just said can be paid. If the page really has run out it
  // says so itself, and `confirm` answers `expired`.

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

// ---- The payment in flight: a note for the next app start --------------------------------

const PENDING_KEY = "renit-pending-payment";

/** Tidying only: a note this old is about a payment nobody is in the middle of. */
const NOTE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface PaymentNote {
  /** Whose payment it is: another account on this phone must not be sent to it. */
  user: string;
  /** The booking number. */
  booking: string;
  payment_id: string;
  /** When it was noted, by this phone's clock. Used for tidying, never to refuse a payment. */
  at: number;
}

/**
 * Notes which payment was handed to the pay page, because the phone may close
 * the app while the customer is in the browser or a UPI app. Nothing is read
 * back from it but "which payment to ask rn-api about, and which booking to
 * open": the pay page itself always comes from the booking.
 * ponytail: one note; a second payment in flight replaces the first, whose
 * booking still shows the truth when opened. Keep a list if that ever bites.
 */
export async function notePayment(user: string, booking: string, paymentId: string): Promise<void> {
  const note: PaymentNote = { user, booking, payment_id: paymentId, at: Date.now() };
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(note));
  } catch {
    // Only a convenience: the server knows the payment.
  }
}

export async function forgetPayment(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // As above.
  }
}

/**
 * For app start, once it is known who is signed in: if this person had a
 * payment in flight when the app last closed, ask rn-api about it once (which
 * also moves the booking on if it was paid) and return the booking's number so
 * the app can open it. Null when there is nothing of theirs to ask about.
 */
export async function resumePayment(user: string): Promise<string | null> {
  let note: PaymentNote | null = null;
  try {
    note = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? "null") as PaymentNote | null;
  } catch {
    return null;
  }
  if (!note?.booking || !note.payment_id) return null;
  if (!(Date.now() - note.at < NOTE_MAX_AGE_MS)) {
    await forgetPayment();
    return null;
  }
  // Someone else's: left alone, for when they sign back in (or until it is a day old).
  if (note.user !== user) return null;
  try {
    const { payment } = await confirmPayment(note.payment_id);
    if (payment.status !== "created" && payment.status !== "failed") await forgetPayment();
  } catch {
    // The booking screen asks the server itself when it opens.
  }
  return note.booking;
}

/**
 * For the app's whole life while someone is signed in (review before merge, R-2): the
 * return link of a payment nobody is waiting on. `startPayment`'s own listener goes
 * after the first time the app comes back to the front, so a customer who looks at
 * Renit for a moment, pays later and taps "Back to Renit" sends a link no one hears.
 * When one arrives and no `startPayment` is in flight for its payment, ask rn-api
 * once the way a restart does (`resumePayment`) and hand the booking to open to
 * `onBooking`. Still only a nudge: nothing is marked paid from the link.
 * A link that launches the app from closed needs no listener of its own: the start
 * asks about the noted payment anyway.
 */
export function watchStrayReturns(user: string, onBooking: (number: string) => void): () => void {
  let stopped = false;
  const subscription = Linking.addEventListener("url", ({ url }) => {
    const back = parsePayReturn(url);
    if (!back || inFlight.has(back.payment_id)) return;
    void resumePayment(user).then((number) => {
      if (number && !stopped) onBooking(number);
    });
  });
  return () => {
    stopped = true;
    subscription.remove();
  };
}
