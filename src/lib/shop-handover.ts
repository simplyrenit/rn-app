import { clock, dayOf, dayShort, money, todayIst, windowLabel } from "@/lib/booking";
import { captured, dayBlock, theirStatusLine, whenShort } from "@/lib/day-of";
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
  const their = theirStatusLine("owner", b.delivery_mode, day.their_status, first);
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

/** "At the handover": record, check each other's photos, type the code. */
export function handoverSteps(b: BookingShop, recorded: boolean): Step[] {
  const first = b.customer.first_name;
  const flags = captured(b, "handover");
  const started = b.stage !== "ready";
  return inOrder([
    {
      label: `Record its condition (you and ${first} both do this)`,
      sub: b.id_match_required ? `Look at ${first}'s ID too: the name must match the booking.` : undefined,
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
  const at = b.timeline.find((entry) => entry.event === "handover")?.at;
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

/** Why the payout waits, when it does: the owner's own record is not on the server yet. */
export function payoutWaits(b: BookingShop): string | null {
  if (b.stage === "ready" || captured(b, "handover").mine) return null;
  return "You are paid once your photos and video of the handover have uploaded.";
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

export function returnCopy(b: BookingShop, now: Date): ReturnCopy {
  const first = b.customer.first_name;
  const handoverAt = b.timeline.find((entry) => entry.event === "handover")?.at;
  const returnAt = b.timeline.find((entry) => entry.event === "return")?.at;
  const today = todayIst(now);
  const backDay = dayOf(returnAt) ?? today;
  const due = b.return_by;
  const overdue = b.stage === "out" && Boolean(due) && now.getTime() > new Date(due ?? "").getTime();
  const held = Number(b.money.deposit) > 0 && b.money.deposit_state !== "none";
  const until = b.report_problem_until;
  return {
    title: b.stage === "out" ? `Take the ${b.product.title} back` : `${b.product.title} is back`,
    sub: [b.number, customerName(b.customer), dayShort(backDay)].join(" · "),
    late: overdue && due ? `It was due back ${whenShort(due, now)}. Each late day's rent comes to you from the deposit.` : null,
    handoverDay: shortDay(dayOf(handoverAt) ?? b.first_day),
    returnDay: shortDay(backDay),
    codeTitle: `Show ${first} this code`,
    codeSub: held
      ? `${first} types it to finish the return. The deposit goes back to ${first} within 48 hours unless you report a problem in the next 24 hours.`
      : `${first} types it to finish the return. You then have 24 hours to report a problem.`,
    returned:
      b.stage === "out"
        ? null
        : {
            title: returnAt ? `Returned · ${whenShort(returnAt, now)}` : "Returned",
            body: until
              ? `You can report a problem until ${whenShort(until, now)}.${held ? ` After that the deposit goes back to ${first}.` : ""}`
              : held
                ? `The deposit is settled with ${first} once both return records are in.`
                : "This rental is finished.",
          },
  };
}

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
export function reportFirstNote(b: BookingShop): string {
  return `Finish the return first: show ${b.customer.first_name} the code. You then have 24 hours to report the problem, with these photos as the record.`;
}
