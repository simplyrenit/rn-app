import { type ApiError, fieldErrors } from "@/lib/api-error";
import { isMonthly, monthlyReturnLine } from "@/lib/billing";
import {
  BookingCustomer,
  BookingDay,
  DayStatus,
  DeliveryMode,
  HANDOVER_ID,
  clock,
  dayOf,
  dayShort,
  deliveryPlace,
  depositAfterLate,
  keptLineOf,
  keptReasons,
  money,
  todayIst,
  addDays,
  windowErrorText,
  windowLabel,
  windowSummary,
} from "@/lib/booking";
import { isBasket, itemsText, liveLines, madeOf } from "@/lib/booking-lines";
import type { CaptureFlags, Moment, Side } from "@/lib/capture";
import { COURIER, CourierBanner, CourierStep, byRenit } from "@/lib/delivery";

/**
 * The day of the handover and the return, for both sides (API-CONTRACT OE-I;
 * ARCHITECTURE 4.1 rows 15 to 22; booking plan, "On the day"). Plain functions:
 * which buttons a side sees, when Call and "They did not come" open, what a
 * refused code says, and the words of BK-13, BK-14, BK-19, BK-20 and BK-21.
 *
 * Every `now` here is the server's time (`correctedNow`): these are the clocks
 * that money hangs on, and a phone with a wrong clock must not open or close them.
 * The server still decides; the phone only chooses what to offer.
 */

const NO_DAY: BookingDay = {
  call_number: null,
  call_from: null,
  my_status: "",
  their_status: "",
  no_show_from: null,
  handover_code: null,
};

/** A booking's day block; all empty if an answer came without one, so a screen never reads through nothing. */
export function dayBlock<D extends BookingDay>(booking: { day?: D | null }): D | BookingDay {
  return booking.day ?? NO_DAY;
}

/** Whether each side's capture for a moment is on the server. */
export function captured(booking: { captures?: CaptureFlags | null }, moment: Moment): { mine: boolean; theirs: boolean } {
  return booking.captures?.[moment] ?? { mine: false, theirs: false };
}

// ---- Times --------------------------------------------------------------------------------------

/** True once the instant has come, by `now`. An instant that is missing has not. */
export function reached(iso: string | null | undefined, now: Date): boolean {
  const at = new Date(iso ?? "").getTime();
  return Number.isFinite(at) && now.getTime() >= at;
}

/** "8:00 am" when it is today, else "8:00 am on Sat 24 Oct". */
export function whenShort(iso: string | null | undefined, now: Date): string {
  const day = dayOf(iso);
  if (!day) return "";
  return day === todayIst(now) ? clock(iso) : `${clock(iso)} on ${dayShort(day)}`;
}

/** "today", "tomorrow", or "on Sat 24 Oct". */
function dayWord(day: string | null, now: Date): string {
  if (!day) return "";
  const today = todayIst(now);
  if (day === today) return "today";
  return day === addDays(today, 1) ? "tomorrow" : `on ${dayShort(day)}`;
}

// ---- The three preset buttons (decision A-36) ---------------------------------------------------------

export interface StatusButton {
  status: Exclude<DayStatus, "">;
  label: string;
}

/** The side that travels: the customer on self pickup, the shop on owner delivery. */
export const travels = (role: Side, mode: DeliveryMode) => (role === "customer") === (mode === "pickup");

/**
 * Which preset buttons a side sees. The one who travels sees all three. The one
 * who waits sees two: `i_am_here`, labelled "Ready for you", and "Running late".
 * No free text, and no fourth value.
 */
export function statusButtons(role: Side, mode: DeliveryMode): StatusButton[] {
  return travels(role, mode)
    ? [
        { status: "on_my_way", label: "On my way" },
        { status: "running_late", label: "Running late" },
        { status: "i_am_here", label: "I am here" },
      ]
    : [
        { status: "i_am_here", label: "Ready for you" },
        { status: "running_late", label: "Running late" },
      ];
}

/**
 * The other side's last tap, as a line: "The shop is ready for you", "Aarav is on the way". Null when they have not
 * tapped. With `since` (the day block's `their_status_at` and the server's time) it says when: "…, 4:10 pm".
 */
export function theirStatusLine(
  role: Side,
  mode: DeliveryMode,
  status: DayStatus,
  name: string,
  since?: { at: string | null | undefined; now: Date }
): string | null {
  if (!status) return null;
  const line =
    status === "running_late"
      ? `${name} is running late`
      : status === "on_my_way"
        ? `${name} is on the way`
        : // The other side waits when this one travels: their "I am here" is "Ready for you".
          travels(role, mode)
          ? `${name} is ready for you`
          : `${name} is here`;
  const when = since?.at ? whenShort(since.at, since.now) : "";
  return when ? `${line}, ${when}` : line;
}

/**
 * When the handover code was typed and when the return code was: the booking's own `handover_at` and `returned_at`, else
 * the timeline's entry (an answer from before the fields). Both objects carry them (P5-4 era).
 */
export function handoverAt(b: { handover_at?: string | null; timeline: { event: string; at: string }[] }): string | null {
  return b.handover_at ?? b.timeline.find((entry) => entry.event === "handover")?.at ?? null;
}
/**
 * The day the item came back when staff recorded the return later and named it (T-22, `came_back_on`), else null: a return
 * by the code is on `returned_at`'s own day. Where a screen says when an item was returned, this day comes first.
 */
export function cameBackOn(b: { came_back_on?: string | null }): string | null {
  return typeof b.came_back_on === "string" && /^\d{4}-\d{2}-\d{2}/.test(b.came_back_on) ? b.came_back_on.slice(0, 10) : null;
}

export function returnedAt(b: { returned_at?: string | null; timeline: { event: string; at: string }[] }): string | null {
  return b.returned_at ?? b.timeline.find((entry) => entry.event === "return")?.at ?? null;
}

/** Under the buttons while they are not open yet. */
export function statusNote(day: Pick<BookingDay, "call_from">, now: Date): string | null {
  if (reached(day.call_from, now)) return null;
  return day.call_from ? `These open at ${whenShort(day.call_from, now)}.` : "These open once an arrival window is picked.";
}

/** The shop's note while the code step is shut: it opens 2 hours before the arrival window, whatever the hour. */
export function codeOpensCopy(name: string, day: Pick<BookingDay, "call_from">, now: Date): string {
  return day.call_from
    ? `${name}'s code can be typed from ${whenShort(day.call_from, now)}, 2 hours before the arrival time.`
    : `${name}'s code can be typed once an arrival window is picked.`;
}

// ---- Call (a direct dial) ---------------------------------------------------------------------------------

export interface CallCopy {
  label: string;
  /** `+91…`, to dial; null while calls are not open. */
  number: string | null;
  note: string;
}

/**
 * The Call button: open from two hours before the window until the handover, as the server says. `courier`: a B1 courier
 * booking, where both sides call Renit's desk line (`call_number`, from Ready until the item is back), never each other.
 */
export function callCopy(
  role: Side,
  day: Pick<BookingDay, "call_number" | "call_from">,
  name: string,
  now: Date,
  courier = false
): CallCopy {
  const until = role === "customer" ? "until you have the item" : "until the handover";
  const number = typeof day.call_number === "string" && day.call_number ? day.call_number : null;
  if (courier) {
    return {
      label: "Call via Renit",
      number,
      note: number ? "Calls go through Renit, so your number stays private." : "Renit's desk is on Get help below.",
    };
  }
  return {
    label: role === "customer" ? "Call the shop" : `Call ${name}`,
    number,
    note: number
      ? `Calls are open ${until}`
      : day.call_from
        ? `Calls open from ${whenShort(day.call_from, now)} ${until}`
        : "Calls open shortly before the arrival window",
  };
}

/** The link the phone dials. Only digits and a leading plus survive. */
export const telUrl = (number: string) => `tel:${number.replace(/(?!^\+)[^\d]/g, "")}`;

// ---- "They did not come" ------------------------------------------------------------------------------

export interface NoShowCopy {
  /** The clock has run: the report can be made. */
  open: boolean;
  title: string;
  sub: string;
}

/** The row that opens the no-show report: thirty minutes after the window ends, by the server's time. */
export function noShowCopy(
  role: Side,
  day: Pick<BookingDay, "no_show_from">,
  name: string,
  now: Date
): NoShowCopy {
  const open = reached(day.no_show_from, now);
  const title = role === "customer" ? "The shop isn't here?" : `${name} hasn't come?`;
  const gain = role === "customer" ? "You get everything back." : "One day's rent comes to you.";
  return {
    open,
    title,
    sub: open
      ? `Report it with a photo taken on the spot. ${gain}`
      : day.no_show_from
        ? `You can report it from ${whenShort(day.no_show_from, now)}, once the window has ended. ${gain}`
        : `You can report it once the arrival window has ended. ${gain}`,
  };
}

export type ReportKind = "no_show" | "owner_absent";

export interface ReportCopy {
  header: string;
  title: string;
  body: string;
  photo: string;
  button: string;
  done: string;
}

/** The screen that takes the photo and sends the report. */
export function reportCopy(kind: ReportKind, role: Side, name: string, mode: DeliveryMode): ReportCopy {
  if (kind === "owner_absent") {
    return {
      header: "Return",
      title: "The shop isn't here",
      body: "Take a photo of where you are, at the shop. Late charges stop from the moment you send this, and Renit's staff arrange the return. Keep the item safe until then.",
      photo: "A photo of the shop, taken now",
      button: "Tell Renit",
      done: "Renit has been told. Late charges have stopped.",
    };
  }
  if (role === "customer") {
    return {
      header: "Handover",
      title: "The shop did not come",
      body: "Take a photo of where you are. The booking ends and everything you paid comes back to you, the booking amount included.",
      photo: "A photo of where you are, taken now",
      button: "Report it",
      done: "Reported. Your money is on its way back.",
    };
  }
  return {
    header: "Handover",
    title: `${name} did not come`,
    body: `Take a photo of where you are. The booking ends: one day's rent comes to you${
      mode === "owner_delivery" ? ", with the delivery fee if you travelled," : ""
    } and the rest goes back to ${name}.`,
    photo: "A photo of where you are, taken now",
    button: "Report it",
    done: "Reported. The booking has ended.",
  };
}

// ---- Codes ------------------------------------------------------------------------------------------

/**
 * What a refused code says (decision A-16): three wrong tries lock it for five
 * minutes, and the third lock closes it for good. The times are the server's.
 */
export function codeErrorText(error: ApiError | null, now: Date): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "wrong_code": {
      const left = error.details?.tries_left;
      return typeof left === "number"
        ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "That code is not right.";
    }
    case "code_locked": {
      const until = typeof error.details?.until === "string" ? whenShort(error.details.until, now) : "";
      return until ? `Too many wrong tries. Try again at ${until}.` : "Too many wrong tries. Try again in a few minutes.";
    }
    case "code_closed":
      return "This code no longer works after too many wrong tries. Renit's desk has been told and will finish it by phone or send a new code.";
    case "too_early": {
      const from = typeof error.details?.from === "string" ? whenShort(error.details.from, now) : "";
      return from ? `The rental can be started from ${from}.` : "It is too early to start this rental.";
    }
    case "claim_open":
      return "A report is open on this booking. The code is paused until Renit decides.";
    case "stage_not_allowed":
      return "This booking has moved on, so the code is not needed now.";
    case "validation_error":
      return "Type all six digits.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}

/** True when the code can never work again: the screen stops asking for it. */
export const codeIsClosed = (error: ApiError | null) => error?.code === "code_closed";

/** What any other refused tap on the day says (status, no-show, refusing at the door, the deposit, extending). */
export function dayErrorText(error: ApiError | null, now: Date): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "too_early": {
      const from = typeof error.details?.from === "string" ? whenShort(error.details.from, now) : "";
      return from ? `This opens at ${from}.` : "It is too early for this.";
    }
    case "claim_open":
      return "A report is open on this booking. Renit's decision comes first.";
    case "stage_not_allowed":
      return "This booking has moved on, so that can't be done now.";
    case "window_required":
      return "Pick your arrival window first.";
    case "nothing_to_pay":
      return "There is no deposit left to pay.";
    case "payments_unavailable":
      return "Payments are not working for a moment. Nothing was charged. Try again.";
    case "validation_error": {
      // The server's sentence for the field when it names one (a file not on Renit's storage, the most photos).
      const fields = fieldErrors(error);
      return fields.photos ?? fields.photo ?? fields.statement ?? "Something is missing. Check the photo and the words, then try again.";
    }
    // B1: the courier's own refusals (b1-plan §2).
    case "courier_booking":
      return "Renit's courier partner carries this booking, so Renit's desk does this. Call via Renit.";
    case "window_taken":
      return "That slot has just filled. Pick another.";
    case "window_closed":
      return "That window can't be picked any more. Pick another, or call via Renit.";
    case "capture_missing":
      return "Record the item on camera first.";
    case "other_side":
      return "The other side of the booking does this, not you.";
    case "already_extending":
      return "An extension is already open for this rental.";
    case "shop_closed":
      return "The shop is closed now. An extension can be asked for while it is open.";
    case "too_late_to_extend":
      return "It is too close to the return time for the shop to answer. Return the item, then book it again.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}

// ---- BK-13, pay the deposit ---------------------------------------------------------------------------------

export interface DepositCopy {
  /** `to_pay`; `window_first` (no arrival window yet); `paid`; `none` (no deposit, or the booking has ended). */
  state: "to_pay" | "window_first" | "paid" | "none";
  sub: string;
  amount: string;
  refund: string;
  /** A basket's deposit, item by item (cart D21, CT-37): "Made of: Camera ₹20,000 · Lens ₹5,000". Null for one item. */
  madeOf: string | null;
  payBy: string | null;
  when: string | null;
  unlocks: string;
  warning: string;
  button: string;
}

/** The deposit the customer is shown: what the pay page must take. */
export function depositCharge(booking: Pick<BookingCustomer, "pay_now" | "money">): { amount: string } {
  const open = booking.pay_now?.purpose === "deposit" ? booking.pay_now.payment ?? booking.pay_now : null;
  return { amount: open?.amount ?? booking.money.deposit };
}

export function depositCopy(booking: BookingCustomer): DepositCopy {
  const m = booking.money;
  const pickup = booking.delivery_mode === "pickup";
  const amount = money(depositCharge(booking).amount);
  const due = m.deposit_due_at;
  const dueDay = dayOf(due);
  const state: DepositCopy["state"] =
    booking.exit || m.deposit_state === "none" || m.deposit_state === "forfeited"
      ? "none"
      : m.deposit_state === "not_due" || m.deposit_state === "due"
        ? booking.window
          ? "to_pay"
          : "window_first"
        : "paid";
  return {
    state,
    sub: `${booking.product.title} · ${booking.number}`,
    amount,
    refund: "Refundable. Back within 48 hours of closing.",
    madeOf: madeOf(booking) ? `Made of: ${madeOf(booking)}` : null,
    payBy: dueDay ? `Pay by ${dayShort(dueDay)}, ${clock(due)}` : null,
    when: booking.window ? `${pickup ? "Collecting" : "Arriving"} ${windowSummary(booking.window)}` : null,
    unlocks: pickup
      ? "Paying the deposit shows you the shop's address and unlocks your handover code."
      : "Paying the deposit unlocks your handover code.",
    warning: `If it isn't paid by then, the booking is cancelled and one day's rent (${money(m.rate)}) goes to the shop.`,
    button: `Pay ${amount}`,
  };
}

// ---- BK-14, the day of the handover ---------------------------------------------------------------------------

export interface DayOfCopy {
  title: string;
  /** An item whose handover needs the ID match: bring a photo ID in your own name. Null for any other. */
  idNote: string | null;
  place: { name: string; address: string | null };
  window: string | null;
  codeNote: string;
}

export function dayOfCopy(booking: BookingCustomer, now: Date): DayOfCopy {
  const pickup = booking.delivery_mode === "pickup";
  // A basket (cart CT-34): "Your 3 items arrive today".
  const basket = isBasket(booking);
  const item = basket ? itemsText(liveLines(booking).length) : booking.product.title;
  const word = dayWord(booking.window ? dayOf(booking.window.start) : booking.first_day, now);
  const delivery = deliveryPlace(booking.delivery_address);
  // The address is on the booking only once the deposit is paid. Drawn only when it is text.
  const address = typeof booking.shop.address === "string" && booking.shop.address ? booking.shop.address : null;
  // B1: Renit's courier partner brings it, not the shop.
  const bringer = !pickup && byRenit(booking) ? COURIER : booking.shop.name;
  return {
    // B1: once the desk says it was delivered (`open_by` is sent), it is at the door.
    title: pickup
      ? `Collect your ${item} ${word}`
      : booking.courier?.open_by
        ? `Your ${item} ${basket ? "are" : "is"} here`
        : `Your ${item} ${basket ? "arrive" : "arrives"} ${word}`,
    // From Ready on a booking that needs the match (`id_match_required`): said again, since the price screen was long ago.
    idNote: booking.id_match_required ? HANDOVER_ID : null,
    place: pickup
      ? { name: booking.shop.name, address: address ?? booking.shop.locality }
      : { name: delivery ? `${bringer} brings it to ${delivery.title}` : `${bringer} brings it to you`, address: delivery?.line ?? null },
    window: booking.window ? windowLabel(booking.window) : null,
    codeNote: booking.claim_open
      ? "You reported this item as not as described. Renit decides within one day, and your code is paused until then."
      : basket
        ? "Show this to the shop after both of you have recorded every item."
        : "Show this to the shop only after you have checked the item and both of you have recorded its condition.",
  };
}

/** Where a maps app should open: the shop's pin for a pickup. Null when there is none. */
export function mapsUrl(coordinates: { lat: number; long: number } | null | undefined, label: string, ios: boolean): string | null {
  if (!coordinates || typeof coordinates.lat !== "number" || typeof coordinates.long !== "number") return null;
  const at = `${coordinates.lat},${coordinates.long}`;
  const q = encodeURIComponent(label);
  return ios ? `http://maps.apple.com/?ll=${at}&q=${q}` : `geo:${at}?q=${at}(${q})`;
}

// ---- B1, Renit's courier partner (b1-plan §2, §6 APP-2) ---------------------------------------------------------------

/** The first step of the return leg. The server lists the outbound steps, then the return's, from this one on. */
const RETURN_FROM = "return_window";

/**
 * One leg of the server's tracker, as `StepList` draws it: the server's `now` is the ring, and a done step's time goes
 * before its sub ("2:40 pm · Seal 4821"). Nothing here decides a state; the server wrote every one.
 */
export function courierRows(steps: CourierStep[] | null | undefined, leg: "out" | "return", now: Date): ReturnStep[] {
  const all = steps ?? [];
  const split = all.findIndex((step) => step.key === RETURN_FROM);
  const mine = split < 0 ? (leg === "out" ? all : []) : leg === "out" ? all.slice(0, split) : all.slice(split);
  return mine.map((step) => {
    const when = step.state === "done" && step.at ? whenShort(step.at, now) : "";
    return {
      label: step.label,
      sub: [when, step.sub].filter(Boolean).join(" · "),
      state: step.state === "done" ? "done" : step.state === "now" ? "next" : "todo",
    };
  });
}

/** The desk's banner as a `Notice` tone. A tone this build does not know is plain information. */
export function bannerTone(banner: Pick<CourierBanner, "tone">): "brand" | "warning" | "danger" {
  return banner.tone === "bad" ? "danger" : banner.tone === "warn" ? "warning" : "brand";
}

/**
 * Whether the customer may start recording it: from the moment the rider has it (`picked_up`) and once delivered (O9).
 * Before that the item is still at the shop.
 */
export const courierMayRecord = (courier: { state: string | null } | null | undefined) =>
  courier?.state === "picked_up" || courier?.state === "delivered";

/** The line under "Open it on camera": the minutes left to `open_by`, by the server's clock. */
export function openByLine(openBy: string | null | undefined, now: Date): string {
  const at = new Date(openBy ?? "").getTime();
  if (!Number.isFinite(at)) return "Start recording as soon as the rider hands it to you, with the seal in view.";
  const left = Math.ceil((at - now.getTime()) / 60_000);
  return left > 0
    ? `${left} min left. After that, we take it that it arrived fine.`
    : "The 30 minutes are up, so we take it that it arrived fine. You can still record it.";
}

/** What to do at the door (C3, C4). */
export function courierDoorTips(seal: string | null | undefined): string[] {
  return [
    "Be there in your window. The rider hands it to you, not to the gate.",
    seal
      ? `Check seal ${seal} is unbroken. Broken seal or crushed box? Don't open it: record it first.`
      : "Check the seal is unbroken. Broken seal or crushed box? Don't open it: record it first.",
    "Start recording with the seal in view, then open it, show every side and switch it on.",
    "Turn off location tags in your camera app first: a video that saves where you are can't be used.",
    "The partner may text you a delivery code. That one is fine to share. Never share a Renit code.",
  ];
}

/**
 * C6, the return window picker. `earliest` is the server's first day with no late fee; `day` the day it offers slots
 * on, which is later only when that day's slots are gone. The late clock stops at the customer's return record (F6), so
 * a record by `earliest` charges no late day, whenever the rider comes. `today` is the server's, in India.
 */
export function returnWindowCopy(
  slots: { day: string; earliest: string },
  lastDay: string,
  changing: boolean,
  today: string
): { title: string; sub: string; note: string | null } {
  const { day, earliest } = slots;
  return {
    title: changing ? "Change your return window" : "When should the rider collect it?",
    sub: `${dayShort(day)} · the ${COURIER} collects it in the window you pick`,
    note:
      // A no-fee day already gone (a rider who could not collect it, say) promises nothing any more.
      earliest < today
        ? null
        : day > earliest
        ? `No slot is left on ${dayShort(earliest)}. Record it and seal the bag by then and no late day is charged, even if the rider comes on ${dayShort(day)}.`
        : earliest > lastDay
          ? `There is no courier slot on your last day, so it is due back on ${dayShort(earliest)} with no late fee.`
          : null,
  };
}

/** What a refused return-window pick says. The desk may already be booking the rider (`stage_not_allowed`). */
export function returnWindowErrorText(error: ApiError | null): string {
  if (error?.code === "stage_not_allowed") return "The return window can't be changed now. Call via Renit to move it.";
  return windowErrorText(error);
}

// ---- BK-19, not as described ---------------------------------------------------------------------------------------

/** B1: what the customer found at the door of a courier booking. A broken seal or box is the trip's fault (plan §8a). */
export type DoorProblem = "seal_broken" | "box_damaged" | "not_as_described";

export const DOOR_PROBLEMS: { problem: DoorProblem; label: string }[] = [
  { problem: "seal_broken", label: "The seal is broken" },
  { problem: "box_damaged", label: "The box is damaged" },
  { problem: "not_as_described", label: "It isn't as described" },
];

/**
 * The notice under the report. On a courier booking (`delivered_by` renit) a broken seal or box is the trip's: Renit
 * pays, never the customer (plan-v2 §5.11); anything else is decided as today, and the courier trips used are kept.
 */
export function refuseCopy(
  booking: Pick<BookingCustomer, "money" | "delivered_by">,
  attached: number,
  problem: DoorProblem = "not_as_described"
): { notice: string; attachedNote: string | null } {
  const m = booking.money;
  const courier = byRenit(booking);
  const notice =
    courier && problem !== "not_as_described"
      ? "Damage on the way is on Renit, not you. Renit decides within one day: if the trip damaged it, you get everything back, the courier fee included."
      : `Renit decides within one day. If we agree, you get everything back, including the ${money(
          m.booking_amount
        )}. If we don't, it counts as cancelling inside 24 hours and one day's rent (${money(m.rate)}) goes to the shop${
          courier ? ", and Renit keeps the courier fee for the trips already used" : ""
        }.`;
  return { notice, attachedNote: attached > 0 ? `The ${attached} you just took` : null };
}

/**
 * Why "Send to Renit" is off, or null: the words and at least one photo are both needed. A broken seal or box needs only
 * the photos: what is wrong is the problem picked.
 */
export function refuseHold(statement: string, photos: number, problem: DoorProblem = "not_as_described"): string | null {
  if (problem === "not_as_described" && !statement.trim()) return "Say what is different from the listing.";
  return photos > 0 ? null : "Add at least one photo.";
}

// ---- BK-20, the rental ---------------------------------------------------------------------------------------------

/**
 * When the customer told Renit the shop was not there for the return, or null.
 * Read from the booking's timeline (the stage table's event, row 21), as the
 * handover and return times are. `remembered` is this phone's own note of a
 * report it has just sent, for a timeline that names the event otherwise.
 */
export function ownerAbsentAt(booking: Pick<BookingCustomer, "timeline">, remembered?: string | null): string | null {
  return booking.timeline.find((entry) => entry.event === "report_owner_absent")?.at ?? remembered ?? null;
}

/** Where this phone notes a report it has just sent (in the query cache, for this run of the app). */
export const ownerAbsentKey = (number: string) => ["owner-absent-reported", number];

/** What the rental and return screens say once "Owner did not come" has been reported (review r1 #11). */
export function ownerAbsentNote(at: string, now: Date): string {
  const when = whenShort(at, now);
  return `You told Renit the shop was not there${when ? ` (${when})` : ""}. Late charges stopped then, and Renit's staff will arrange the return. Keep the item safe until they call.`;
}

export interface ActiveCopy {
  title: string;
  sub: string;
  returnBy: string | null;
  /** The line under "Return by": what a late day costs, or what being late has cost so far. */
  late: { text: string; tone: "info" | "warning" };
  deposit: { amount: string; sub: string } | null;
  button: string;
}

/** `absentAt`: when the customer reported that the shop did not come to the return; the late-day line then gives way to that. */
export function activeCopy(booking: BookingCustomer, absentAt: string | null = null, now: Date = new Date()): ActiveCopy {
  const m = booking.money;
  const day = dayOf(booking.return_by);
  const held = Number(m.deposit) > 0;
  const lateDays = Number(m.late_days) || 0;
  return {
    title: `You have the ${booking.product.title}`,
    sub: `${booking.number} · ${booking.shop.name}`,
    returnBy: day ? `Return by ${dayShort(day)}, ${clock(booking.return_by)}` : null,
    late: absentAt
      ? { text: ownerAbsentNote(absentAt, now), tone: "info" }
      : lateDays > 0
        ? {
            text: `${lateDays} ${lateDays === 1 ? "day" : "days"} late so far: ${money(m.late_fee)}${
              held ? " comes off your deposit" : ""
            }. Each more day costs ${money(m.rate)}.`,
            tone: "warning",
          }
        : isMonthly(m)
          ? { text: monthlyReturnLine(m, held), tone: "info" }
          : { text: `Each late day costs ${money(m.rate)}${held ? ", taken from your deposit" : ""}.`, tone: "info" },
    deposit: held
      ? {
          amount: money(m.deposit),
          sub:
            m.deposit_state === "carried"
              ? "Carried over from your first booking · back within 48 hours of closing"
              : m.deposit_state === "forfeited"
                ? "Kept, as the item was not returned in time"
                : "Held by Renit · back within 48 hours of closing",
        }
      : null,
    button: `Return the ${booking.product.title}`,
  };
}

// ---- BK-21, the return ---------------------------------------------------------------------------------------------

export interface ReturnStep {
  label: string;
  sub: string;
  state: "done" | "next" | "todo";
}

/**
 * The three steps of the return. `recorded`: this phone has finished its record
 * (it may still be uploading). The code can be typed at any point: at a door with
 * no signal the upload follows.
 *
 * Once the code is in, a step says what is true, not what was meant to happen
 * (D-23): a return with no record on either side shows "Not recorded", and the
 * shop's check is never "Done" unless the shop's own record is on the server. The
 * shop's side then reads the 24 hours it has to report a problem (BK-21; the
 * "What happens next" block under the steps says what that means for the deposit).
 */
export function returnSteps(booking: Pick<BookingCustomer, "captures" | "stage">, recorded: boolean): ReturnStep[] {
  const returned = booking.stage === "returned" || booking.stage === "closed";
  const flags = captured(booking, "return");
  const mine = recorded || flags.mine;
  const theirs = flags.theirs;
  const steps: Omit<ReturnStep, "state">[] = [
    {
      label: "Record its condition again",
      sub: mine
        ? "Done"
        : returned
          ? "Not recorded. You have no photos or video of how you returned it."
          : "The same photos and video as at the handover",
    },
    {
      label: "The shop checks it against the handover",
      sub: theirs
        ? "The shop's record is in."
        : !returned
          ? "They record it too, and compare"
          : booking.stage === "closed"
            ? "The shop did not record it. Its 24 hours to report a problem are over."
            : "The shop has not recorded it. It has 24 hours to report a problem.",
    },
    { label: "Type the shop's code", sub: returned ? "Done" : "The shop shows you a 6-digit code" },
  ];
  const done = [mine, theirs, returned];
  // After the return no step is "next": a record can still be added, but nothing is waiting on the person.
  const next = returned ? -1 : done.indexOf(false);
  return steps.map((step, i) => ({ ...step, state: done[i] ? "done" : i === next ? "next" : "todo" }));
}

/**
 * "What happens next", once the code is in. The late days are fixed at that
 * moment, so the line says what is kept for them and what comes back, never the
 * whole deposit when part of it is already the shop's (review r1 #3; N11, N16).
 */
export function returnedCopy(booking: BookingCustomer): { title: string; body: string } {
  const at = returnedAt(booking);
  const day = dayOf(at);
  const cameBack = cameBackOn(booking);
  const m = booking.money;
  const held = Number(m.deposit) > 0 && m.deposit_state !== "forfeited" && m.deposit_state !== "none";
  const late = depositAfterLate(m);
  const unless = "unless the shop reports a problem in the next 24 hours";
  return {
    // Staff recorded the return later and named the day it came back: that day, not the day it was recorded.
    title: cameBack ? `Came back on ${dayShort(cameBack)}.` : day ? `Returned ${dayShort(day)}, ${clock(at)}.` : "Returned.",
    body: !held
      ? "The shop has 24 hours to report a problem. After that the rental is closed."
      : late.kept + late.notice <= 0
        ? `Your deposit of ${money(m.deposit)} comes back within 48 hours, ${unless}.`
        : late.back > 0
          ? `Your deposit is ${money(late.deposit)}. ${keptLineOf(late)}, and ${money(
              late.back
            )} comes back within 48 hours, ${unless}.`
          : `Your ${money(late.deposit)} deposit is kept for ${keptReasons(late)}. Nothing comes back.`,
  };
}

/** True once the deposit's last moment has passed, by the server's clock: the booking is being cancelled or was just paid. */
export function depositOverdue(booking: Pick<BookingCustomer, "money">, now: Date): boolean {
  return reached(booking.money.deposit_due_at, now);
}

// ---- Extending -------------------------------------------------------------------------------------------------------

/** The most extra days the stepper offers. The server's stock rule decides what is really free. */
export const MAX_EXTRA_DAYS = 30;

/** The extension's dates: it starts the day after the rental's last day. */
export function extensionDays(lastDay: string, extra: number): { first_day: string; last_day: string } {
  const n = Math.min(Math.max(1, Math.floor(extra)), MAX_EXTRA_DAYS);
  return { first_day: addDays(lastDay, 1), last_day: addDays(lastDay, n) };
}

/** The plain lines under an extension's price. */
export function extensionLines(bookingAmount: string): string[] {
  return [
    "The item stays with you and your deposit carries on. There is nothing more to pay for the deposit.",
    `The shop has to accept the extra days. If they can't, the ${money(bookingAmount)} comes back and the item is due back on the original day.`,
    "Each late day costs one day's rent.",
  ];
}
