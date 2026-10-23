import type { ApiError } from "@/lib/api-error";
import type { BookingDay, CourierState } from "@/lib/booking";
import { clock, dayOf, dayShort, todayIst, windowSummary } from "@/lib/booking";
import type { CallCopy } from "@/lib/day-of";
import { byRenit } from "@/lib/delivery";
import type { Step } from "@/lib/shop-handover";

/**
 * Unified delivery B1, the owner's side of a booking Renit's courier carries (b1-plan §2, ENG-309). The shop packs,
 * records it with the seal, types the seal number and taps Packed; shows the rider the OTP the desk typed in and taps
 * "Handed to rider" with a photo of the bag; later takes the item back from a rider and records it. Shop and customer
 * never meet, and the shop never sees the customer's address or phone.
 *
 * Every word of the tracker (`steps`, `banner`) is the server's; these functions only pick which of them to draw. With
 * `delivered_by` absent or `shop`, none of this is drawn.
 */

/** "Renit courier": how the owner's screens name the way, where a shop booking says "Delivery". */
export const COURIER_WAY = "Renit courier";

/** One step of the server-written tracker. */
export interface CourierStep {
  key: string;
  label: string;
  sub: string | null;
  at: string | null;
  state: "done" | "now" | "todo";
}

/** A desk-typed notice: a delay, a rider change. A blank one is null. */
export interface CourierBanner {
  tone: "info" | "warn" | "bad";
  title: string;
  body: string | null;
}

/** The rider of the current leg. `otp` is the aggregator's code, shown to the rider (O3); the customer never gets it. */
export interface CourierRider {
  name: string | null;
  vehicle: string | null;
  plate: string | null;
  otp?: string | null;
}

/** `courier` on the owner's booking (rn-api `courier.block(b, "owner")`). Only on a booking with `delivered_by: "renit"`. */
export interface OwnerCourier {
  state: CourierState | null;
  steps: CourierStep[];
  banner: CourierBanner | null;
  /** The number the shop typed at Packed. */
  seal: string | null;
  rider: CourierRider | null;
  /** When the shop must have packed; null until a window is picked. */
  pack_by?: string | null;
  return: {
    state: string;
    window: { from: string; to: string } | null;
    earliest: string;
    seal: string | null;
  };
  attempt: number;
  not_delivered_reason: string | null;
}

/** What these functions read of a booking. */
export interface CourierBooking {
  delivered_by?: "shop" | "renit" | null;
  courier?: OwnerCourier | null;
}

/** The courier block, only on a booking Renit's courier carries. */
export const courierOf = (b: CourierBooking): OwnerCourier | null => (byRenit(b) && b.courier ? b.courier : null);

// ---- The ring and Today -----------------------------------------------------------------------------

/** The ring's courier line (plan-v2 §5.11): the exact time comes once the customer picks a window. Null for a shop booking. */
export function ringCourierLine(ring: { delivered_by?: "shop" | "renit" | null; first_day: string }): string | null {
  if (!byRenit(ring)) return null;
  return `Courier collects ${dayShort(ring.first_day)} in your open hours. Exact pack-by time once the customer picks.`;
}

/** "Pack by 3:15 pm", with the day when it is not today. */
export function packByText(packBy: string, now: Date): string {
  const day = dayOf(packBy);
  return `Pack by ${clock(packBy)}${day && day !== todayIst(now) ? `, ${dayShort(day)}` : ""}`;
}

// ---- "Pack it for the courier" (S2, S2b) -------------------------------------------------------------

/** The server's tracker for one leg, as the step list draws it. `now` reads as the step list's `next`. */
export function legSteps(courier: OwnerCourier, leg: "out" | "return"): Step[] {
  const back = (key: string) => key.startsWith("return_") || key === "at_shop";
  return courier.steps
    .filter((step) => back(step.key) === (leg === "return"))
    .map((step) => ({
      label: step.label,
      sub: step.sub ?? undefined,
      state: step.state === "done" ? "done" : step.state === "now" ? "next" : "todo",
    }));
}

/** The banner's tone, as a notice draws it. */
export const bannerTone = (banner: CourierBanner): "info" | "warning" | "danger" =>
  banner.tone === "bad" ? "danger" : banner.tone === "warn" ? "warning" : "info";

/** What the server takes as a seal number: letters, digits and dashes, up to 20 (rn-api `_packed`). */
export const SEAL_PATTERN = /^[A-Za-z0-9-]{1,20}$/;

/** The number as it is sent: no spaces, capitals. */
export const sealOf = (typed: string) => typed.replace(/\s+/g, "").toUpperCase();

/** Whether the shop may tap Packed: the server offers it, and the number reads as a seal. */
export const canPack = (can: readonly string[], typed: string) => can.includes("mark_packed") && SEAL_PATTERN.test(sealOf(typed));

/** The shop's own three steps before Packed: record it with the seal, type the number, tap Packed. */
export function packSteps(courier: OwnerCourier, recorded: boolean, typed: string): Step[] {
  const packed = Boolean(courier.seal);
  const steps = [
    {
      label: "Seal it, then record it",
      sub: "Pack it in the bag or case and close the seal. The last photo is the seal, with its number readable.",
      done: recorded || packed,
    },
    { label: "Type the seal number", done: packed || SEAL_PATTERN.test(sealOf(typed)) },
    { label: "Tap Packed", sub: "Renit then books the rider", done: packed },
  ];
  const next = steps.findIndex((step) => !step.done);
  return steps.map(({ done, ...step }, i) => ({ ...step, state: done ? "done" : i === next ? "next" : "todo" }));
}

/** The rider card (S2c), while a rider is on the way to the shop and the bag has not left. */
export function riderCard(courier: OwnerCourier): { title: string; vehicle: string | null; otp: string | null } | null {
  const rider = courier.rider;
  if (!rider || courier.state !== "rider_assigned") return null;
  return {
    title: rider.name ? `${rider.name} collects it` : "A rider collects it",
    vehicle: [rider.vehicle, rider.plate].filter(Boolean).join(" · ") || null,
    otp: rider.otp || null,
  };
}

/** Under "Handed to rider": the shop checks the seal before the bag goes. */
export const HANDOVER_NOTE = "Check the seal is unbroken and the number matches, then take a photo of the bag at the bike.";

/**
 * The payout on a courier booking starts when the customer opens it on camera, not at a code (D2). Said while the item
 * is on its way; once the rental has started the server's payout line takes over.
 */
export function courierPayoutLine(b: { stage: string; exit: string }): string | null {
  return b.stage === "ready" && !b.exit ? "Your payout starts once the customer opens it on camera." : null;
}

/** Call via Renit: the desk answers for the courier and the customer, both ways (A15). */
export function courierCall(day: Pick<BookingDay, "call_number">): CallCopy {
  const number = typeof day.call_number === "string" && day.call_number ? day.call_number : null;
  return {
    label: "Call via Renit",
    number,
    note: number ? "Renit's desk speaks to the rider and the customer for you" : "Renit's desk line opens once the booking is ready",
  };
}

/** What a refused Packed or "Handed to rider" says. */
export function courierErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "capture_missing":
      return "Your record with the seal photo hasn't reached Renit yet. Let it finish uploading, then try again.";
    case "seal_required":
      return "Type the number on the seal first: letters, digits and dashes only.";
    case "stage_not_allowed":
      return "This booking has moved on, so that can't be done now.";
    case "validation_error":
      return "The photo didn't go through. Take it again.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}

// ---- The return (owner) -------------------------------------------------------------------------------

/**
 * "Item arriving Mon 26 Oct, 4:00 – 6:00 pm" once the customer has picked a return window, else what the shop waits for.
 * Null once it is back.
 */
export function arrivingLine(courier: OwnerCourier): string | null {
  const state = courier.return.state;
  if (state === "at_shop" || state === "self_return") return null;
  const window = courier.return.window;
  if (!window) return "The customer picks a return window. You are told when a rider is booked.";
  const when = windowSummary({ start: window.from, end: window.to });
  return state === "picked_up" ? `Item arriving ${when}: it is with the rider now` : `Item arriving ${when}`;
}

/** The return steps the owner does itself: take it from the rider, record it, then report within 24 hours if needed. */
export const RECEIPT_NOTE =
  "When the rider hands it over, check the seal, then record its condition before you open anything else. A problem can be reported with that record.";
