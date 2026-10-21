/**
 * Monthly billing (ENG-282), in words. A month plan of more than 30 days pays month 1 after the accept and each later month
 * by a link sent 3 days before it starts; an unpaid month has 3 days' grace, then the rental ends. The server works out
 * every month, its amount and its state; this file only says them, for the customer's screens and the shop's.
 */
import {
  BookingCustomer,
  MonthlyMoney,
  RentPeriod,
  addDays,
  dayMonth,
  dayOf,
  dayShort,
  money,
  noticeLine,
} from "@/lib/booking";
import { pluralize } from "@/lib/pluralize";

type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

/** Billed a month at a time, with the months to show. An older server sends neither field: upfront, as before. */
export const isMonthly = (m: MonthlyMoney | null | undefined): boolean =>
  m?.billing === "monthly" && (m.periods?.length ?? 0) > 0;

/** A month that will never be billed by link: ended early, cancelled, lapsed after its grace, or taken from the deposit. */
const gone = (p: RentPeriod) => p.state === "dropped" || p.state === "lapsed" || p.state === "from_deposit";

/** The rent months still on the schedule (not the notice, not those dropped). */
const liveRent = (periods: RentPeriod[]) => periods.filter((p) => p.kind === "rent" && !gone(p));

/** What has been paid of the rent so far: to the shop, what it has earned. The server's sum, else the paid months added up. */
export function rentPaidOf(m: MonthlyMoney): number {
  if (m.rent_paid_amount != null && Number.isFinite(Number(m.rent_paid_amount))) return Number(m.rent_paid_amount);
  return (m.periods ?? []).filter((p) => p.state === "paid").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/** "23 Dec – 21 Jan"; a notice, whose two days are the return day, as one day. */
export function periodDates(p: Pick<RentPeriod, "first_day" | "last_day">): string {
  return p.first_day === p.last_day ? dayMonth(p.first_day) : `${dayMonth(p.first_day)} – ${dayMonth(p.last_day)}`;
}

/**
 * The row's pill (Figma 9477:5122): "Paid 20 Oct", "Due 23 Dec", "Link on 19 Jan", "Overdue", "Cancelled", "Notice". A
 * lapse drops its month and every later one: only the first says "Not paid" (`laterLapse` for the others).
 */
export function periodPill(p: RentPeriod, laterLapse = false): { label: string; tone: Tone } {
  const paidDay = dayOf(p.paid_at);
  switch (p.state) {
    case "paid":
      return { label: paidDay ? `Paid ${dayMonth(paidDay)}` : "Paid", tone: "success" };
    case "overdue":
      return { label: "Overdue", tone: "danger" };
    case "lapsed":
      return { label: laterLapse ? "Cancelled" : "Not paid", tone: "neutral" };
    case "dropped":
      return { label: "Cancelled", tone: "neutral" };
    case "from_deposit":
      return { label: "From deposit", tone: "neutral" };
    default:
      break;
  }
  if (p.kind === "notice") return { label: "Notice", tone: "warning" };
  if (p.state === "due") return { label: `Due ${dayMonth(p.pay_by ?? p.first_day)}`, tone: "brand" };
  return { label: p.link_on ? `Link on ${dayMonth(p.link_on)}` : "Upcoming", tone: "neutral" };
}

export interface PeriodRowView {
  key: string;
  label: string;
  dates: string;
  amount: string;
  pill: { label: string; tone: Tone };
  /** Grey amount: a month not yet asked for, or never to be. */
  dim: boolean;
  /** The overdue row is tinted. */
  tinted: boolean;
  /** The row opens Rent due (`canPayPeriod`). */
  payable: boolean;
}

/**
 * Whether this booking's screen can pay month `p`: a month of this very booking (a chain's other months are paid from their
 * own booking), never its month 1 (paid with the rent after the accept), due or overdue, and offered by the server: its
 * `pay_now` names the month, or `can` has `pay_period`.
 */
export function canPayPeriod(
  p: RentPeriod,
  booking: { number: string; can: string[]; pay_now?: { period?: number } | null }
): boolean {
  if (p.booking !== booking.number || p.n === 1 || (p.state !== "due" && p.state !== "overdue")) return false;
  return booking.pay_now?.period === p.n || booking.can.includes("pay_period");
}

export function periodRow(p: RentPeriod, payable = false, laterLapse = false): PeriodRowView {
  return {
    key: `${p.booking}-${p.n}`,
    label: p.label,
    dates: periodDates(p),
    amount: money(p.amount),
    pill: periodPill(p, laterLapse),
    dim: p.state === "upcoming" || gone(p),
    tinted: p.state === "overdue",
    payable,
  };
}

/** Every row of the schedule, in order, each lapsed month after the first said as cancelled. */
export function scheduleRows(periods: RentPeriod[], canPay: (p: RentPeriod) => boolean = () => false): { period: RentPeriod; row: PeriodRowView }[] {
  let lapsed = false;
  return periods.map((period) => {
    const later = period.state === "lapsed" && lapsed;
    if (period.state === "lapsed") lapsed = true;
    return { period, row: periodRow(period, canPay(period), later) };
  });
}

/** The rent month `today` falls in; before the first, the first, and after the last, the last. */
export function currentPeriod(periods: RentPeriod[], today: string): RentPeriod | null {
  const rent = liveRent(periods);
  return (
    rent.find((p) => p.first_day <= today && today <= p.last_day) ??
    (rent[0] && today < rent[0].first_day ? rent[0] : rent[rent.length - 1]) ??
    null
  );
}

/**
 * The schedule card's corner: "Month 3 of 6", counted across an extension chain as the labels are. Months dropped by ending
 * early or a lapse leave the count: the rental is then that much shorter.
 */
export function scheduleHead(periods: RentPeriod[], today: string): string | null {
  const current = currentPeriod(periods, today);
  return current ? `${current.label} of ${liveRent(periods).length}` : null;
}

/**
 * The schedule's foot. The customer: "₹10,800 for 6 months · ₹3,600 paid." and, while a month is still to be linked and none
 * is overdue, when the links come. The shop: what it has earned so far.
 */
export function scheduleFoot(m: MonthlyMoney, side: "customer" | "owner"): string {
  const periods = m.periods ?? [];
  if (side === "owner") return `You've earned ${money(rentPaidOf(m))} so far.`;
  // The rent alone: the delivery fee paid with month 1 and a notice are not "for 6 months". Renit's fee is left out too,
  // which is right while it is charged at nothing (launch); say it here if it ever is not.
  const rentOf = (p: RentPeriod) => Number(p.rent ?? p.amount) || 0;
  const rent = liveRent(periods);
  const total = rent.reduce((sum, p) => sum + rentOf(p), 0);
  const paid = periods.filter((p) => p.kind === "rent" && p.state === "paid").reduce((sum, p) => sum + rentOf(p), 0);
  const head = `${money(total)} for ${pluralize(rent.length, "month")} · ${money(paid)} paid.`;
  const linksToCome = rent.some((p) => p.state === "upcoming") && !periods.some((p) => p.state === "overdue");
  return linksToCome ? `${head} Each month's pay link comes 3 days before it starts.` : head;
}

/** The month in its grace, if any. */
export const overduePeriod = (m: MonthlyMoney | null | undefined): RentPeriod | null =>
  m?.periods?.find((p) => p.state === "overdue") ?? null;

/** The day the rental ends on if a month stays unpaid: the day before that month. */
const endsOn = (p: RentPeriod) => dayShort(addDays(p.first_day, -1));

/** Figma 9477:5336's alert, above the return-by card while a month is overdue. */
export function overdueAlert(p: RentPeriod, item: string, rate: string): { title: string; body: string } {
  return {
    title: `${p.label} rent is overdue`,
    body: `${money(p.amount)} was due ${dayShort(p.pay_by ?? p.first_day)}. Pay by the end of ${dayShort(
      p.grace_ends ?? p.first_day
    )} to keep the ${item}. After that, the rental ends on ${endsOn(p)}, the ${item} is collected, and each day you keep it costs ${money(
      rate
    )} from your deposit.`,
  };
}

/** The shop's (Figma 9478:3635). `amount` is what the shop earns for the month, as its schedule says. */
export function shopOverdueAlert(p: RentPeriod, firstName: string, item: string): { title: string; body: string } {
  return {
    title: `${p.label} isn't paid yet`,
    body: `${money(p.amount)} was due ${dayShort(p.pay_by ?? p.first_day)}. Renit's desk is calling ${firstName}, so you don't need to chase. If it's still unpaid at the end of ${dayShort(
      p.grace_ends ?? p.first_day
    )}, the rental ends on ${endsOn(p)} and we'll ask you to collect the ${item}. Days after that are paid to you from the deposit.`,
  };
}

/** The return-by card's line on a monthly booking: "Booked for 6 months, paid monthly. Each late day costs ₹60, taken from your deposit." */
export function monthlyReturnLine(m: MonthlyMoney & { rate: string }, held: boolean): string {
  const months = liveRent(m.periods ?? []).length;
  return `Booked for ${pluralize(months, "month")}, paid monthly. Each late day costs ${money(m.rate)}${
    held ? ", taken from your deposit" : ""
  }.`;
}

type PlanMoney = MonthlyMoney & { plan?: { unit: string; price: string; min?: number | null } };

/**
 * The month plan's minimum and price while ending a monthly booking today would owe the notice, else null. The minimum's
 * last day is `min × 30` days from the chain's first day (the first month's). It mirrors the server's cap (D12, D13): the
 * notice is owed only while the month after the current one is inside the minimum and unpaid, so nothing is said in the
 * minimum's last month or when the next month is already paid (it then counts as the notice). Nothing either once the
 * rental has an end already (ended early, or a month unpaid ended it), and nothing without the plan's minimum (a server
 * that does not send it).
 */
function insideMinimum(m: PlanMoney, today: string): { min: number; price: string } | null {
  const min = m.plan?.unit === "month" ? m.plan.min : undefined;
  const periods = m.periods ?? [];
  if (!isMonthly(m) || !min || min < 2 || !m.plan) return null;
  if (periods.some((p) => p.kind === "notice" || p.state === "dropped" || p.state === "lapsed")) return null;
  // `n` counts within one booking of a chain; the first day is the chain's.
  const first = periods.filter((p) => p.kind === "rent").sort((a, b) => a.first_day.localeCompare(b.first_day))[0];
  const current = currentPeriod(periods, today);
  if (!first || !current) return null;
  const minEnd = addDays(first.first_day, min * 30 - 1);
  // The month after the current one: inside the minimum and unpaid, it is what the notice stands for.
  const next = liveRent(periods)
    .filter((p) => p.first_day > current.last_day)
    .sort((a, b) => a.first_day.localeCompare(b.first_day))[0];
  const owed = next !== undefined && next.state !== "paid" && next.first_day <= minEnd;
  return today < minEnd && owed ? { min, price: m.plan.price } : null;
}

/**
 * The rental screen's line under the deposit, for a monthly booking: the notice while ending now would owe it
 * (`insideMinimum`), else nothing.
 */
export function endingEarlyLine(m: PlanMoney, today: string): string | null {
  const inside = insideMinimum(m, today);
  return inside ? noticeLine(inside.min, inside.price) : null;
}

/**
 * The return screen's line: handing the item back before the last day and inside the minimum ends the rental early, which
 * owes the notice month (the server treats it as `end_early`).
 */
export function returnNoticeLine(m: PlanMoney, today: string, lastDay: string): string | null {
  const inside = today < lastDay ? insideMinimum(m, today) : null;
  return inside
    ? `Returning before ${inside.min} months costs one month's rent (${money(inside.price)}) as notice. Pay it in the app, or it comes out of your deposit.`
    : null;
}

// ---- Rent due (BK-13 for a month, Figma 9477:5285) ----------------------------------------------------------------

export interface PayPeriodCopy {
  /** `to_pay`: due or overdue. `paid`. `not_yet`: its link has not come. `gone`: it will not be billed. `missing`: no such month. */
  state: "to_pay" | "paid" | "not_yet" | "gone" | "missing";
  period: RentPeriod | null;
  title: string;
  sub: string;
  amount: string;
  line: string;
  payBy: string | null;
  sent: string | null;
  info: string | null;
  warning: string | null;
  button: string;
  /** For a screen with nothing to pay: what it says instead. */
  done: string;
}

/** `n` is the month's number on `booking` itself, the booking the screen was opened for (the month's own). */
export function payPeriodCopy(booking: BookingCustomer, n: number, today: string): PayPeriodCopy {
  const m = booking.money;
  const p = m.periods?.find((x) => x.booking === booking.number && x.n === n) ?? null;
  const item = booking.product.title;
  const notice = p?.kind === "notice";
  const base = {
    period: p,
    title: notice ? "Notice due" : "Rent due",
    sub: `${item} · ${booking.number}`,
    amount: money(p?.amount),
    button: `Pay ${money(p?.amount)}`,
  };
  if (!p) {
    return { ...base, state: "missing", line: "", payBy: null, sent: null, info: null, warning: null, done: "This month is not on the booking." };
  }
  const line = notice
    ? `Notice · return on ${dayShort(p.first_day)}`
    : `${p.label} of ${liveRent(m.periods ?? []).length} · ${periodDates(p)}`;
  const sentDay = dayOf(p.linked_at);
  const held = Number(m.deposit) > 0;
  const rest = {
    line,
    sent: sentDay ? `Sent ${dayShort(sentDay)} by WhatsApp and here` : null,
  };
  if (p.state === "paid") {
    const paidDay = dayOf(p.paid_at);
    return { ...base, ...rest, state: "paid", payBy: null, info: null, warning: null, done: paidDay ? `Paid ${dayShort(paidDay)}.` : "Paid." };
  }
  if (p.state === "from_deposit") {
    return { ...base, ...rest, state: "gone", payBy: null, info: null, warning: null, done: "It was taken from your deposit." };
  }
  if (gone(p)) {
    return { ...base, ...rest, state: "gone", payBy: null, info: null, warning: null, done: "This month is no longer billed." };
  }
  if (p.state === "upcoming") {
    return {
      ...base,
      ...rest,
      state: "not_yet",
      payBy: null,
      info: null,
      warning: null,
      done: p.link_on ? `Its pay link comes on ${dayShort(p.link_on)}.` : "Its pay link comes 3 days before it starts.",
    };
  }
  const due = dayShort(p.pay_by ?? p.first_day);
  const grace = dayShort(p.grace_ends ?? p.first_day);
  if (notice) {
    return {
      ...base,
      ...rest,
      state: "to_pay",
      payBy: `Pay by ${due}, 11:59 pm`,
      info: "Paying ends the rental on the return day. The shop gets the notice month.",
      warning: held ? "Not paid by the return day? It comes out of your deposit." : null,
      done: "",
    };
  }
  return {
    ...base,
    ...rest,
    state: "to_pay",
    payBy: p.state === "overdue" ? `Was due ${due} · pay by the end of ${grace}` : `Pay by ${due}, 11:59 pm`,
    // The shop is paid the morning after the month is paid, once it has started (plan §6).
    info: `Paying keeps your rental going. The shop gets this month's rent ${today >= p.first_day ? "the next morning" : "the morning it starts"}.`,
    warning: `Not paid by the end of ${grace}? The rental ends on ${endsOn(p)} and the ${item} is collected.${
      held ? ` Each day you keep it after that costs ${money(m.rate)} from your deposit.` : ""
    }`,
    done: "",
  };
}

// ---- Ending early (Figma 9481:5305) -------------------------------------------------------------------------------

/** `GET /api/bookings/{number}/end-early/?day=`: what ending on `day` costs. Writes nothing. */
export interface EndEarlyQuote {
  day: string;
  /** The return days that can be picked: today to the last day of the current month. */
  earliest: string;
  latest: string;
  inside_minimum: boolean;
  /** One month's rent, owed inside the minimum; "0.00" after it. */
  notice: string;
  /** An already-paid next month that counts as the notice ("Month 4"), else null; `pay_now` is then nothing. */
  notice_paid_by: string | null;
  current: { label: string; last_day: string };
  /** The later months that are not billed, or null when there are none. */
  cancelled: { from: string; to: string } | null;
  /** An already-paid next month given back, after the minimum. */
  refund: string;
  pay_now: string;
}

export interface EndEarlyLine {
  label: string;
  value: string;
  /** Grey value: not money moving ("Not refunded", "Cancelled"). */
  quiet?: boolean;
}

const monthNumber = (label: string) => label.replace(/^Month\s+/i, "");
const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

/** The sheet's words, from the quote: its lead, what happens to each month, the note under the day and the button. */
export function endEarlyCopy(
  quote: EndEarlyQuote,
  booking: Pick<BookingCustomer, "delivery_mode" | "product" | "shop"> & { money: { plan?: { unit: string; min?: number | null } } },
): { lead: string; lines: EndEarlyLine[]; total: EndEarlyLine; note: string; button: string } {
  const plan = booking.money.plan;
  const min = plan?.unit === "month" ? plan.min : undefined;
  const where = lower(quote.current.label);
  // Inside the minimum the server can still owe nothing (its last month, D12): no notice is then talked about.
  const lead = !quote.inside_minimum
    ? "Your minimum is over, so ending early costs nothing more."
    : !(Number(quote.notice) > 0) && !quote.notice_paid_by
      ? "Ending early costs nothing more."
      : quote.notice_paid_by
      ? `You're in ${where}${min ? ` of a ${min}-month minimum` : ", inside your minimum"}. ${quote.notice_paid_by} is already paid, so it counts as the notice.`
      : `You're in ${where}${min ? ` of a ${min}-month minimum` : ", inside your minimum"}. Ending now costs one more month's rent as notice.`;

  const lines: EndEarlyLine[] = [];
  if (Number(quote.notice) > 0) {
    lines.push(
      quote.notice_paid_by
        ? { label: `Notice · ${quote.notice_paid_by}, already paid`, value: money(quote.notice), quiet: true }
        : { label: "Notice · one month's rent", value: money(quote.notice) }
    );
  }
  if (quote.day < quote.current.last_day) {
    lines.push({ label: `Rest of ${where} (to ${dayMonth(quote.current.last_day)})`, value: "Not refunded", quiet: true });
  }
  if (quote.cancelled) {
    const { from, to } = quote.cancelled;
    lines.push({
      label: from === to ? from : `Months ${monthNumber(from)} to ${monthNumber(to)}`,
      value: "Cancelled",
      quiet: true,
    });
  }
  if (Number(quote.refund) > 0) lines.push({ label: "Next month, already paid", value: `${money(quote.refund)} back` });

  const day = dayShort(quote.day);
  const item = booking.product.title;
  const handBack =
    booking.delivery_mode === "owner_delivery"
      ? `${booking.shop.name} collects the ${item} on ${day}.`
      : `Return the ${item} to ${booking.shop.name} on ${day}.`;
  const paying = Number(quote.pay_now) > 0;
  return {
    lead,
    lines,
    total: { label: "You pay now", value: money(quote.pay_now) },
    note: paying ? `Not paid by the return day? It comes out of your deposit. The shop gets the notice month. ${handBack}` : handBack,
    button: paying ? `Pay ${money(quote.pay_now)} and end the rental` : `End the rental on ${day}`,
  };
}

/** What to say when the quote or the end itself is refused. */
export function endEarlyErrorText(error: { code?: string | null; message?: string | null } | null): string {
  switch (error?.code) {
    case "end_early_not_allowed":
      return error.message ?? "This rental can't be ended early now. Pay any month that is due first, or ask Renit's desk.";
    case "day_out_of_range":
      return "Pick a return day from today to the end of this month.";
    case "payments_unavailable":
      return "Payments are not working for a moment. Nothing was changed. Try again.";
    default:
      return error?.message ?? "We couldn't work out what ending early costs. Check your connection and try again.";
  }
}

/** What to say when a month's payment cannot be started (`POST …/periods/{n}/pay/`). */
export function payPeriodErrorText(error: { code?: string | null; message?: string | null } | null): string {
  switch (error?.code) {
    case "period_not_due":
      return "This month's pay link has not come yet.";
    case "period_lapsed":
      return "The time to pay this month has passed. Ask Renit's desk.";
    case "period_paid":
      return "This month is already paid.";
    case "payments_unavailable":
      return "Payments are not working for a moment. Nothing was charged. Try again.";
    default:
      return error?.message ?? "We couldn't start the payment. Check your connection and try again.";
  }
}
