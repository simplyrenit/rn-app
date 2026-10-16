import { RECORD_FIRST } from "@/lib/capture";
import { problemLine, problemState } from "@/lib/claims";
import { clock, dayOf, dayShort, depositAfterLate, lateDaysLabel, money, todayIst, windowLabel } from "@/lib/booking";
import { captured, cameBackOn, dayBlock, handoverAt, returnedAt, theirStatusLine, whenShort } from "@/lib/day-of";
import { BookingShop, howLine, moneyView } from "@/lib/shop-booking";
import { customerName } from "@/lib/shop-ring";
import { depositPill } from "@/lib/shop-today";

/**
 * The shop's day on the phone: the handover (SH-08, SH-09) and the return
 * (SH-10). Plain functions over the shop's booking, on top of `day-of.ts`, which
 * holds the rules both sides share (the buttons, Call, the no-show clock, the codes).
 */

export interface Step {
  label: string;
  sub?: string;
  state: "done" | "next" | "todo";
}

const inOrder = (steps: { label: string; sub?: string; done: boolean }[]): Step[] => {
  const next = steps.findIndex((step) => !step.done);
  return steps.map(({ done, ...step }, i) => ({ ...step, state: done ? "done" : i === next ? "next" : "todo" }));
};

/** Which shop screen a booking opens on from Today and the booking page, or null for neither. */
export function dayScreen(b: Pick<BookingShop, "stage" | "exit">): "ShopHandover" | "ShopReturn" | null {
  if (b.exit) return null;
  if (b.stage === "ready") return "ShopHandover";
  return b.stage === "out" || b.stage === "returned" ? "ShopReturn" : null;
}

/** The button on the shop's booking page that opens the day's screen. */
export function dayButton(b: Pick<BookingShop, "stage" | "exit">): string | null {
  switch (dayScreen(b)) {
    case "ShopHandover":
      return "Open the handover";
    case "ShopReturn":
      return b.stage === "out" ? "Open the return" : "See the return";
    default:
      return null;
  }
}

// ---- SH-08 and SH-09, the handover -----------------------------------------------------------------

export interface HandoverCopy {
  title: string;
  sub: string;
  /** "Aarav M. · collecting 10:00 – 11:00 am". */
  who: string;
  pills: { label: string; tone: "success" | "warning" | "danger" | "neutral" }[];
  /** Owner delivery: where the item goes. */
  address: string | null;
  letKnow: string;
  codeTitle: string;
  codeSub: string;
}

export function handoverCopy(b: BookingShop, now: Date): HandoverCopy {
  const first = b.customer.first_name;
  const pickup = b.delivery_mode === "pickup";
  const day = dayBlock(b);
  const windowDay = dayOf(b.window?.start) ?? b.first_day;
  const their = theirStatusLine("owner", b.delivery_mode, day.their_status, first, { at: day.their_status_at, now });
  const deposit = depositPill(b.money.deposit_state);
  return {
    title: `${pickup ? "Hand over" : "Deliver"} the ${b.product.title}`,
    sub: [windowDay === todayIst(now) ? "Today" : dayShort(windowDay), b.number, howLine(b)].join(" · "),
    who: b.window
      ? `${customerName(b.customer)} · ${pickup ? "collecting" : "expecting you"} ${windowLabel(b.window)}`
      : customerName(b.customer),
    pills: [...(their ? [{ label: their, tone: "success" as const }] : []), ...(deposit ? [deposit] : [])],
    address: !pickup && typeof b.customer.address === "string" && b.customer.address ? b.customer.address : null,
    letKnow: `Let ${first} know`,
    codeTitle: `Type ${first}'s code`,
    codeSub: `${first} shows it to you after checking the item.`,
  };
}

/** The ID line of the first step (T-44): the name to match, or what can be matched when the booking does not show it. */
const idMatchStepNote = (first: string, fullName: string | null | undefined) =>
  fullName?.trim()
    ? `Look at ${first}'s ID too: the name on it must be ${fullName.trim()}.`
    : `Look at ${first}'s ID too: only the first name and last initial are shown, so that is what can be matched.`;

/** "At the handover": record, check each other's photos, type the code. */
export function handoverSteps(b: BookingShop, recorded: boolean): Step[] {
  const first = b.customer.first_name;
  const flags = captured(b, "handover");
  const started = b.stage !== "ready";
  return inOrder([
    {
      label: `Record its condition (you and ${first} both do this)`,
      sub: b.id_match_required ? idMatchStepNote(first, b.customer.full_name) : undefined,
      done: recorded || flags.mine,
    },
    { label: "Check each other's photos", done: (flags.mine && flags.theirs) || started },
    { label: `Type ${first}'s code`, done: started },
  ]);
}

export interface StartedCopy {
  title: string;
  /** The payout: how much, and where it stands, in the server's words. */
  payout: string | null;
  fee: { struck: string | null; charged: string };
  dueBack: string | null;
}

/** SH-09's green card, once the code is typed and the rental has started. */
export function startedCopy(b: BookingShop, now: Date): StartedCopy {
  const at = handoverAt(b);
  const m = moneyView(b);
  const payout = b.money.payout;
  const day = dayOf(b.return_by);
  return {
    title: at ? `Rental started · ${whenShort(at, now)}` : "Rental started",
    payout: payout ? `${money(payout.amount)} · ${payout.text}` : null,
    fee: m.fee,
    dueBack: day ? `Due back ${dayShort(day)} by ${clock(b.return_by)}` : null,
  };
}

/**
 * True while the owner's payout waits for the owner's own handover record: the
 * code is typed, the record is not on the server, and no payout has been asked
 * for yet (staff can release one by hand, decision A-46). It is what keeps the
 * record button on the shop's screens after the code, on a closed booking too.
 */
export function payoutPending(b: BookingShop): boolean {
  if (b.stage === "ready" || b.exit || captured(b, "handover").mine) return false;
  return (b.money.payout?.status ?? "none") === "none";
}

/** Why the payout waits, when it does, said on the "Rental started" card. */
export function payoutWaits(b: BookingShop): string | null {
  return payoutPending(b) ? "You are paid once your photos and video of the handover have uploaded." : null;
}

// ---- SH-10, the return -----------------------------------------------------------------------------

export interface ReturnCopy {
  title: string;
  sub: string;
  /** The item is overdue: said first. */
  late: string | null;
  handoverDay: string;
  returnDay: string;
  codeTitle: string;
  codeSub: string;
  /** After the code: what happened and until when a problem can be reported. */
  returned: { title: string; body: string } | null;
}

/** "Sat 24": a column title's day. */
const shortDay = (day: string | null) => (day ? dayShort(day).split(" ").slice(0, 2).join(" ") : "");

export function returnCopy(b: BookingShop, now: Date, claimKinds?: readonly string[] | null): ReturnCopy {
  const first = b.customer.first_name;
  const handedAt = handoverAt(b);
  const returnAt = returnedAt(b);
  const today = todayIst(now);
  // The day staff named when they recorded the return later (T-22), else the day it was recorded.
  const cameBack = cameBackOn(b);
  const backDay = cameBack ?? dayOf(returnAt) ?? today;
  const due = b.return_by;
  const overdue = b.stage === "out" && Boolean(due) && now.getTime() > new Date(due ?? "").getTime();
  const held = Number(b.money.deposit) > 0 && b.money.deposit_state !== "none";
  // Whether a problem can be reported is the server's (`can`, P4-10), and what is left of the deposit to claim against (A-50):
  // the lines below say so, they do not promise 24 hours the booking does not offer.
  const problem = problemState(b, now, claimKinds);
  const open = problem === "open";
  const nothingLeft = problem === "none_left" || problem === "forfeited";
  const until = open ? b.report_problem_until : null;
  // Late days come out of the deposit to the shop (N11): neither line may say the whole deposit goes back (review r1 #3).
  const late = depositAfterLate(b.money);
  const lateShare =
    late.kept <= 0
      ? null
      : late.back > 0
        ? `${money(late.kept)} of the deposit comes to you for ${lateDaysLabel(late.days)}`
        : `The whole ${money(late.deposit)} deposit comes to you for ${lateDaysLabel(late.days)}`;
  return {
    title: b.stage === "out" ? `Take the ${b.product.title} back` : `${b.product.title} is back`,
    sub: [b.number, customerName(b.customer), dayShort(backDay)].join(" · "),
    late: overdue && due ? `It was due back ${whenShort(due, now)}. Each late day's rent comes to you from the deposit.` : null,
    handoverDay: shortDay(dayOf(handedAt) ?? b.first_day),
    returnDay: shortDay(backDay),
    codeTitle: `Show ${first} this code`,
    codeSub: nothingLeft
      ? [
          `${first} types it to finish the return.`,
          lateShare ? `${lateShare}.` : null,
          problem === "forfeited"
            ? "The deposit has already come to you, so there is nothing to claim against: if something is wrong, use Get help."
            : "Nothing is left of the deposit to claim against: if something is wrong, use Get help.",
        ]
          .filter(Boolean)
          .join(" ")
      : !lateShare
        ? `${first} types it to finish the return. The deposit goes back to ${first} within 48 hours unless you report a problem in the next 24 hours.`
        : `${first} types it to finish the return. ${lateShare}; the rest goes back to ${first} within 48 hours unless you report a problem in the next 24 hours.`,
    returned:
      b.stage === "out"
        ? null
        : {
            title: cameBack ? `Came back on ${dayShort(cameBack)}` : returnAt ? `Returned · ${whenShort(returnAt, now)}` : "Returned",
            body: [
              until ? `You can report a problem until ${whenShort(until, now)}.` : problemLine(problem),
              !held
                ? open
                  ? null
                  : "This rental is finished."
                : lateShare
                  ? late.back > 0
                    ? `${lateShare}. The rest (${money(late.back)}) goes back to ${first}${open ? " by itself after that" : ""}.`
                    : `${lateShare}. Nothing goes back to ${first}.`
                  : problem === "reported"
                    ? `The part of the deposit that is not claimed goes back to ${first}.`
                    : open
                      ? // No "all good" call exists: with no report the server sends the deposit back by itself (D-26).
                        `If nothing is reported by then, the deposit goes back to ${first} by itself.`
                      : `The deposit is settled with ${first} once both return records are in.`,
            ]
              .filter(Boolean)
              .join(" "),
          },
  };
}

const RECORD_UPLOADING = "Your record is still uploading. It is needed before the code.";

/** The line under a code step that is waiting for the shop's own record: still uploading (the record card's state), or not made. */
export const recordFirstNote = (uploading: boolean): string => (uploading ? RECORD_UPLOADING : RECORD_FIRST);

/** The steps of the return, for the shop. */
export function shopReturnSteps(b: BookingShop, recorded: boolean): Step[] {
  const first = b.customer.first_name;
  const flags = captured(b, "return");
  const returned = b.stage !== "out";
  return inOrder([
    { label: "Record its condition again", done: recorded || flags.mine },
    { label: "Compare it with the handover", sub: "All good, or report a problem", done: returned },
    { label: `Show ${first} your code`, sub: `${first} types it to finish the return`, done: returned },
  ]);
}

/** What "Report a problem" says before the return is finished: the code comes first (decision A-35). */
export function reportFirstNote(b: BookingShop, now: Date = new Date(), claimKinds?: readonly string[] | null): string {
  const first = `Finish the return first: show ${b.customer.first_name} the code.`;
  // Nothing left to claim against (A-50): say so now, not after the code, and point to Get help.
  const state = problemState(b, now, claimKinds);
  if (state === "none_left" || state === "forfeited") return `${first} ${problemLine(state)}`;
  return `${first} You then have 24 hours to report the problem, with these photos as the record.`;
}
