import { describe, expect, it } from "@jest/globals";
import {
  EndEarlyQuote,
  currentPeriod,
  endEarlyCopy,
  endingEarlyLine,
  isMonthly,
  monthlyReturnLine,
  overdueAlert,
  overduePeriod,
  payPeriodCopy,
  periodPill,
  periodRow,
  rentPaidOf,
  scheduleFoot,
  scheduleHead,
  shopOverdueAlert,
} from "../billing";
import { BookingCustomer, RentPeriod, noticeLine } from "../booking";
import { noticeWords } from "../plans";

/** Figma's sofa: ₹1,800 a month, booked for six months from Sat 24 Oct, month 3 due on Wed 23 Dec. */
const month = (n: number, first: string, last: string, over: Partial<RentPeriod> = {}): RentPeriod => ({
  booking: "RN-31207",
  n,
  label: `Month ${n}`,
  kind: "rent",
  first_day: first,
  last_day: last,
  amount: "1800.00",
  state: "upcoming",
  link_on: null,
  pay_by: first,
  grace_ends: null,
  paid_at: null,
  linked_at: null,
  ...over,
});

const sofa = (): RentPeriod[] => [
  month(1, "2026-10-24", "2026-11-22", { state: "paid", paid_at: "2026-10-20T05:00:00Z" }),
  month(2, "2026-11-23", "2026-12-22", { state: "paid", paid_at: "2026-11-20T05:00:00Z" }),
  month(3, "2026-12-23", "2027-01-21", {
    state: "due",
    link_on: "2026-12-20",
    pay_by: "2026-12-23",
    grace_ends: "2026-12-26",
    linked_at: "2026-12-20T03:30:00Z",
  }),
  month(4, "2027-01-22", "2027-02-20", { link_on: "2027-01-19" }),
  month(5, "2027-02-21", "2027-03-22", { link_on: "2027-02-18" }),
  month(6, "2027-03-23", "2027-04-21", { link_on: "2027-03-20" }),
];

const money = (periods = sofa(), over = {}) => ({
  billing: "monthly" as const,
  periods,
  rate: "60.00",
  deposit: "5000.00",
  plan: { unit: "month" as const, price: "1800.00", min: 6 },
  ...over,
});

const booking = (periods = sofa(), over: Partial<BookingCustomer["money"]> = {}): BookingCustomer =>
  ({
    number: "RN-31207",
    product: { name: "PRO_sofa", title: "sofa", cover_image: null },
    shop: { name: "Urban Nest Furniture" },
    delivery_mode: "owner_delivery",
    money: money(periods, over),
  }) as unknown as BookingCustomer;

describe("isMonthly", () => {
  it("is false for an upfront booking and for an older server's answer", () => {
    expect(isMonthly(money())).toBe(true);
    expect(isMonthly({ billing: "upfront", periods: [] })).toBe(false);
    expect(isMonthly({})).toBe(false);
    expect(isMonthly({ billing: "monthly", periods: [] })).toBe(false);
  });
});

describe("periodPill and periodRow", () => {
  it("says each state as Figma 9477:5122 draws it", () => {
    const [one, , three, four] = sofa();
    expect(periodPill(one)).toEqual({ label: "Paid 20 Oct", tone: "success" });
    expect(periodPill(three)).toEqual({ label: "Due 23 Dec", tone: "brand" });
    expect(periodPill(four)).toEqual({ label: "Link on 19 Jan", tone: "neutral" });
    expect(periodPill({ ...three, state: "overdue" })).toEqual({ label: "Overdue", tone: "danger" });
    expect(periodPill({ ...four, state: "dropped" })).toEqual({ label: "Cancelled", tone: "neutral" });
    expect(periodPill({ ...three, state: "lapsed" })).toEqual({ label: "Not paid", tone: "neutral" });
  });

  it("marks a notice and draws its one day", () => {
    const notice = month(7, "2027-01-04", "2027-01-04", { kind: "notice", state: "due", label: "Notice month" });
    expect(periodPill(notice)).toEqual({ label: "Notice", tone: "warning" });
    expect(periodPill({ ...notice, state: "paid", paid_at: "2027-01-02T05:00:00Z" }).label).toBe("Paid 2 Jan");
    expect(periodRow(notice)).toMatchObject({ label: "Notice month", dates: "4 Jan", payable: true });
  });

  it("tints only the overdue row, greys months not yet asked for, and opens Rent due for due and overdue", () => {
    const [one, , three, four] = sofa();
    expect(periodRow(one)).toMatchObject({ label: "Month 1", dates: "24 Oct – 22 Nov", amount: "₹1,800", dim: false, tinted: false, payable: false });
    expect(periodRow(three)).toMatchObject({ payable: true, tinted: false });
    expect(periodRow({ ...three, state: "overdue" })).toMatchObject({ payable: true, tinted: true });
    expect(periodRow(four)).toMatchObject({ dim: true, payable: false });
  });
});

describe("the schedule card", () => {
  it("says which month it is of how many", () => {
    expect(scheduleHead(sofa(), "2026-12-25")).toBe("Month 3 of 6");
    // Before the first month, the first; after the last, the last.
    expect(scheduleHead(sofa(), "2026-10-20")).toBe("Month 1 of 6");
    expect(currentPeriod(sofa(), "2027-05-01")?.n).toBe(6);
    // Ended early: the dropped months leave the count.
    const ended = sofa().map((p) => (p.n > 3 ? { ...p, state: "dropped" as const } : p));
    expect(scheduleHead(ended, "2026-12-25")).toBe("Month 3 of 3");
  });

  it("adds up the months and what is paid, and says when the links come", () => {
    expect(scheduleFoot(money(), "customer")).toBe(
      "₹10,800 for 6 months · ₹3,600 paid. Each month's pay link comes 3 days before it starts."
    );
    // While a month is overdue the links line gives way, as on Figma 9477:5336.
    const overdue = sofa().map((p) => (p.n === 3 ? { ...p, state: "overdue" as const } : p));
    expect(scheduleFoot(money(overdue), "customer")).toBe("₹10,800 for 6 months · ₹3,600 paid.");
    expect(scheduleFoot(money(), "owner")).toBe("You've earned ₹3,600 so far.");
  });

  it("reads what is paid from the server first", () => {
    expect(rentPaidOf(money())).toBe(3600);
    expect(rentPaidOf({ ...money(), rent_paid: true, rent_paid_amount: "3420.00" })).toBe(3420);
    // Without the sum (an answer from before it), the paid months are added up.
    expect(rentPaidOf({ ...money(), rent_paid: true, rent_paid_amount: null })).toBe(3600);
  });
});

describe("an overdue month", () => {
  const overdue = month(3, "2026-12-23", "2027-01-21", { state: "overdue", pay_by: "2026-12-23", grace_ends: "2026-12-26" });

  it("is found on the booking", () => {
    expect(overduePeriod(money())).toBeNull();
    expect(overduePeriod(money([overdue]))?.n).toBe(3);
  });

  it("tells the customer when the rental ends", () => {
    expect(overdueAlert(overdue, "sofa", "60.00")).toEqual({
      title: "Month 3 rent is overdue",
      body: "₹1,800 was due Wed 23 Dec. Pay by the end of Sat 26 Dec to keep the sofa. After that, the rental ends on Tue 22 Dec, the sofa is collected, and each day you keep it costs ₹60 from your deposit.",
    });
  });

  it("tells the shop the desk is on it", () => {
    expect(shopOverdueAlert(overdue, "Aarav", "sofa")).toEqual({
      title: "Month 3 isn't paid yet",
      body: "₹1,800 was due Wed 23 Dec. Renit's desk is calling Aarav, so you don't need to chase. If it's still unpaid at the end of Sat 26 Dec, the rental ends on Tue 22 Dec and we'll ask you to collect the sofa. Days after that are paid to you from the deposit.",
    });
  });
});

describe("the notice", () => {
  it("says the minimum when it is known", () => {
    expect(noticeLine(6, "1800.00")).toBe("Ending before 6 months costs one month's rent (₹1,800).");
    expect(noticeLine(null, "1800.00")).toBe("Ending early costs one month's rent (₹1,800).");
    expect(noticeLine(6, null)).toBeNull();
    expect(noticeLine(6, "0.00")).toBeNull();
  });

  it("is on the rental screen only inside the minimum", () => {
    // Six months from 24 Oct: the minimum's last day is 21 Apr.
    expect(endingEarlyLine(money(), "2026-12-25")).toBe("Ending before 6 months costs one month's rent (₹1,800).");
    expect(endingEarlyLine(money(), "2027-04-21")).toBeNull();
    // Without the plan's minimum nothing can be said.
    expect(endingEarlyLine(money(sofa(), { plan: { unit: "month", price: "1800.00" } }), "2026-12-25")).toBeNull();
    expect(endingEarlyLine(money(sofa(), { plan: { unit: "month", price: "1800.00", min: 1 } }), "2026-12-25")).toBeNull();
  });

  it("is on the product page for a month plan of 2 months or more", () => {
    expect(noticeWords([{ unit: "month", price: "1800.00", min: 6 }])).toBe("Ending early costs one month's rent");
    expect(noticeWords([{ unit: "month", price: "1800.00", min: 1 }])).toBeNull();
    expect(noticeWords([{ unit: "day", price: "100.00", min: 60 }])).toBeNull();
  });

  it("is the return-by card's line on a monthly booking", () => {
    expect(monthlyReturnLine(money(), true)).toBe("Booked for 6 months, paid monthly. Each late day costs ₹60, taken from your deposit.");
    expect(monthlyReturnLine(money(), false)).toBe("Booked for 6 months, paid monthly. Each late day costs ₹60.");
  });
});

describe("payPeriodCopy", () => {
  it("is Figma's Rent due for a due month", () => {
    const copy = payPeriodCopy(booking(), 3, "2026-12-21");
    expect(copy).toMatchObject({
      state: "to_pay",
      title: "Rent due",
      sub: "sofa · RN-31207",
      amount: "₹1,800",
      line: "Month 3 of 6 · 23 Dec – 21 Jan",
      payBy: "Pay by Wed 23 Dec, 11:59 pm",
      sent: "Sent Sun 20 Dec by WhatsApp and here",
      button: "Pay ₹1,800",
      warning:
        "Not paid by the end of Sat 26 Dec? The rental ends on Tue 22 Dec and the sofa is collected. Each day you keep it after that costs ₹60 from your deposit.",
    });
    // Paid before the month starts, the shop is paid the morning it starts.
    expect(copy.info).toBe("Paying keeps your rental going. The shop gets this month's rent the morning it starts.");
    expect(payPeriodCopy(booking(), 3, "2026-12-23").info).toBe(
      "Paying keeps your rental going. The shop gets this month's rent the next morning."
    );
  });

  it("says when an overdue month must be paid by", () => {
    const periods = sofa().map((p) => (p.n === 3 ? { ...p, state: "overdue" as const } : p));
    expect(payPeriodCopy(booking(periods), 3, "2026-12-24").payBy).toBe("Was due Wed 23 Dec · pay by the end of Sat 26 Dec");
  });

  it("has nothing to pay for a paid, a later, a dropped or an unknown month", () => {
    expect(payPeriodCopy(booking(), 1, "2026-12-21")).toMatchObject({ state: "paid", done: "Paid Tue 20 Oct." });
    expect(payPeriodCopy(booking(), 4, "2026-12-21")).toMatchObject({ state: "not_yet", done: "Its pay link comes on Tue 19 Jan." });
    const ended = sofa().map((p) => (p.n === 4 ? { ...p, state: "dropped" as const } : p));
    expect(payPeriodCopy(booking(ended), 4, "2026-12-21").state).toBe("gone");
    expect(payPeriodCopy(booking(), 9, "2026-12-21").state).toBe("missing");
    // A month of another booking of the chain is paid from that booking's own screen.
    const chain = sofa().map((p) => (p.n === 3 ? { ...p, booking: "RN-31300" } : p));
    expect(payPeriodCopy(booking(chain), 3, "2026-12-21").state).toBe("missing");
  });
});

describe("endEarlyCopy", () => {
  const quote = (over: Partial<EndEarlyQuote> = {}): EndEarlyQuote => ({
    day: "2027-01-04",
    earliest: "2026-12-28",
    latest: "2027-01-21",
    inside_minimum: true,
    notice: "1800.00",
    notice_paid_by: null,
    current: { label: "Month 3", last_day: "2027-01-21" },
    cancelled: { from: "Month 4", to: "Month 6" },
    refund: "0.00",
    pay_now: "1800.00",
    ...over,
  });

  it("is Figma 9481:5305 inside the minimum", () => {
    expect(endEarlyCopy(quote(), booking())).toEqual({
      lead: "You're in month 3 of a 6-month minimum. Ending now costs one more month's rent as notice.",
      lines: [
        { label: "Notice · one month's rent", value: "₹1,800" },
        { label: "Rest of month 3 (to 21 Jan)", value: "Not refunded", quiet: true },
        { label: "Months 4 to 6", value: "Cancelled", quiet: true },
      ],
      total: { label: "You pay now", value: "₹1,800" },
      note: "Not paid by the return day? It comes out of your deposit. The shop gets the notice month. Urban Nest Furniture collects the sofa on Mon 4 Jan.",
      button: "Pay ₹1,800 and end the rental",
    });
  });

  it("counts an already-paid next month as the notice", () => {
    const copy = endEarlyCopy(quote({ notice_paid_by: "Month 4", pay_now: "0.00", cancelled: { from: "Month 5", to: "Month 6" } }), booking());
    expect(copy.lead).toBe("You're in month 3 of a 6-month minimum. Month 4 is already paid, so it counts as the notice.");
    expect(copy.lines[0]).toEqual({ label: "Notice · Month 4, already paid", value: "₹1,800", quiet: true });
    expect(copy.button).toBe("End the rental on Mon 4 Jan");
    expect(copy.note).toBe("Urban Nest Furniture collects the sofa on Mon 4 Jan.");
  });

  it("costs nothing after the minimum, and gives back a month already paid", () => {
    const copy = endEarlyCopy(
      quote({ inside_minimum: false, notice: "0.00", pay_now: "0.00", refund: "1800.00", cancelled: { from: "Month 8", to: "Month 8" }, day: "2027-01-21" }),
      booking()
    );
    expect(copy.lead).toBe("Your minimum is over, so ending early costs nothing more.");
    expect(copy.lines).toEqual([
      { label: "Month 8", value: "Cancelled", quiet: true },
      { label: "Next month, already paid", value: "₹1,800 back" },
    ]);
  });
});
