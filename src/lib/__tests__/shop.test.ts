import { describe, expect, it } from "@jest/globals";
import {
  DEVICE_SIGN_OUT_NOTE,
  Hours,
  SIGN_OUT_EVERYWHERE_NOTE,
  TIME_SLOTS,
  cannotOpenMessage,
  checkDelivery,
  checkHours,
  cleanDecimal,
  dayLabel,
  dayToOpen,
  deliveryFormFrom,
  deliveryPatch,
  deviceSignOutQuestion,
  deliverySummary,
  hasHours,
  hoursPayload,
  hoursRows,
  istDay,
  istWhen,
  kmText,
  noticeLabel,
  noticeOptions,
  openCopy,
  rupees,
  slotsWith,
  time12,
  tomorrowIst,
} from "../shop";

const week: Hours = {
  mon: { open: "10:00", close: "20:00" },
  tue: { open: "10:00", close: "20:00" },
  wed: { open: "10:00", close: "20:00" },
  thu: { open: "10:00", close: "20:00" },
  fri: { open: "10:00", close: "20:00" },
  sat: { open: "10:00", close: "21:00" },
  sun: null,
};

// 12 Oct 2026, 10:00 in India (04:30 UTC), a Monday.
const NOW = new Date("2026-10-12T04:30:00Z");

describe("times and days", () => {
  it("writes 12-hour times as the frame does", () => {
    expect(time12("10:00")).toBe("10 am");
    expect(time12("20:00")).toBe("8 pm");
    expect(time12("20:30")).toBe("8:30 pm");
    expect(time12("00:00")).toBe("12 am");
    expect(time12("12:00")).toBe("12 pm");
    expect(time12("09:05")).toBe("9:05 am");
  });

  it("writes a day without a time zone getting in the way", () => {
    expect(dayLabel("2026-10-13")).toBe("13 Oct");
    expect(dayLabel("2026-01-05")).toBe("5 Jan");
    expect(dayLabel(null)).toBeNull();
    expect(dayLabel("13/10/2026")).toBeNull();
  });

  it("finds the day in India", () => {
    expect(istDay(new Date("2026-10-12T04:30:00Z"))).toBe("2026-10-12");
    // 19:00 UTC is 00:30 next day in India.
    expect(istDay(new Date("2026-10-12T19:00:00Z"))).toBe("2026-10-13");
    expect(tomorrowIst(new Date("2026-10-12T19:00:00Z"))).toBe("2026-10-14");
  });

  it("says when an instant is, for someone in India", () => {
    expect(istWhen("2026-10-12T10:00:00Z", NOW)).toBe("today 3:30 pm");
    expect(istWhen("2026-10-13T04:30:00Z", NOW)).toBe("tomorrow 10 am");
    expect(istWhen("2026-10-15T04:30:00Z", NOW)).toBe("Thu 10 am");
    expect(istWhen("2026-10-24T04:30:00Z", NOW)).toBe("24 Oct 10 am");
    expect(istWhen("nope", NOW)).toBe("");
  });
});

describe("hours rows", () => {
  it("groups a run of equal days, as SH-13 draws it", () => {
    expect(hoursRows(week)).toEqual([
      { label: "Mon – Fri", value: "10 am – 8 pm", days: ["mon", "tue", "wed", "thu", "fri"] },
      { label: "Sat", value: "10 am – 9 pm", days: ["sat"] },
      { label: "Sun", value: "Closed", days: ["sun"] },
    ]);
  });

  it("names a pair with an ampersand", () => {
    const rows = hoursRows({ mon: { open: "09:00", close: "17:00" }, tue: { open: "09:00", close: "17:00" } });
    expect(rows[0]).toMatchObject({ label: "Mon & Tue", value: "9 am – 5 pm" });
  });

  it("splits a day that is different in the middle", () => {
    const rows = hoursRows({ ...week, wed: null });
    expect(rows.map((r) => r.label)).toEqual(["Mon & Tue", "Wed", "Thu & Fri", "Sat", "Sun"]);
  });

  it("reads an empty week as closed all week", () => {
    expect(hoursRows({})).toEqual([
      { label: "Mon – Sun", value: "Closed", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
    ]);
    expect(hasHours({})).toBe(false);
    expect(hasHours(week)).toBe(true);
    expect(hasHours(undefined)).toBe(false);
  });
});

describe("editing hours", () => {
  it("offers every half hour, and keeps an odd time it was given", () => {
    expect(TIME_SLOTS).toHaveLength(48);
    expect(TIME_SLOTS[0]).toBe("00:00");
    expect(TIME_SLOTS[47]).toBe("23:30");
    expect(slotsWith("10:15")).toContain("10:15");
    expect(slotsWith("10:15")).toHaveLength(49);
    expect(slotsWith("10:30")).toHaveLength(48);
  });

  it("opens a closed day with the week's own hours, else 10 to 8", () => {
    expect(dayToOpen({ mon: null, tue: { open: "09:00", close: "18:00" } })).toEqual({ open: "09:00", close: "18:00" });
    expect(dayToOpen({})).toEqual({ open: "10:00", close: "20:00" });
  });

  it("holds a day to open before close", () => {
    expect(checkHours(week).ok).toBe(true);
    const bad = checkHours({ ...week, sat: { open: "21:00", close: "10:00" } });
    expect(bad.ok).toBe(false);
    expect(bad.days.sat).toBeDefined();
    // Equal times are not a day either.
    expect(checkHours({ mon: { open: "10:00", close: "10:00" } }).ok).toBe(false);
  });

  it("needs at least one open day", () => {
    const none = checkHours({ mon: null });
    expect(none.ok).toBe(false);
    expect(none.week).toBe("Pick at least one day you hand items over");
  });

  it("sends all seven days, null for closed", () => {
    const body = hoursPayload({ mon: { open: "10:00", close: "20:00" } });
    expect(Object.keys(body)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(body.mon).toEqual({ open: "10:00", close: "20:00" });
    expect(body.sun).toBeNull();
  });
});

describe("the Open card", () => {
  const open = (reason: string) => ({ is_open: true, reason, opens_at: null, closes_at: "2026-10-12T14:30:00Z" });
  const closed = (reason: string, opens_at: string | null = "2026-10-13T04:30:00Z") => ({
    is_open: false,
    reason,
    opens_at,
    closes_at: null,
  });

  it("says what SH-13 says when open by the hours", () => {
    expect(openCopy(open("hours"), null, NOW)).toEqual({
      title: "Open · you'll be asked about new bookings",
      subtitle: "Follows your hours by itself",
    });
  });

  it("says so when open by hand", () => {
    expect(openCopy(open("manual"), null, NOW).subtitle).toBe("You switched it on by hand");
  });

  it("gives a reason for every way of being closed", () => {
    expect(openCopy(closed("hours"), null, NOW).subtitle).toBe("Outside your hours · opens tomorrow 10 am");
    expect(openCopy(closed("manual"), null, NOW).subtitle).toBe("You switched it off by hand");
    expect(openCopy(closed("missed_requests"), null, NOW).subtitle).toBe("Closed after two missed requests in a row");
    expect(openCopy(closed("closed_until"), "2026-10-20", NOW).subtitle).toBe("Closed until 20 Oct");
    expect(openCopy(closed("no_hours", null), null, NOW).subtitle).toBe("Set your handover hours to open");
  });

  it("does not promise a morning booking when there is no next opening", () => {
    expect(openCopy(closed("hours", null), null, NOW).title).toBe("Closed · customers can't book from you right now");
    expect(openCopy(closed("hours"), null, NOW).title).toBe("Closed · new bookings wait until you open");
  });

  it("explains a refused switch", () => {
    expect(cannotOpenMessage("no_hours", null)).toBe("Set your handover hours first.");
    expect(cannotOpenMessage("closed_until", "2026-10-20")).toBe("You're closed until 20 Oct. Clear that date to open now.");
    expect(cannotOpenMessage(undefined, null)).toBe("You can't open right now.");
  });
});

describe("shortest notice", () => {
  it("labels hours as the frame does", () => {
    expect(noticeLabel(3)).toBe("3 hours");
    expect(noticeLabel(1)).toBe("1 hour");
    expect(noticeLabel(0)).toBe("No notice");
  });

  it("keeps a value set elsewhere in the list, in order", () => {
    expect(noticeOptions(3)).toContain(3);
    expect(noticeOptions(5)).toEqual([0, 1, 2, 3, 4, 5, 6, 12, 24, 48, 72]);
  });
});

describe("delivery", () => {
  const shop = { delivers: true, delivery_base_fee: "50.00", delivery_per_km: "15.00", delivery_max_km: "15.0" };

  it("writes the money and the distance plainly", () => {
    expect(rupees("50.00")).toBe("₹50");
    expect(rupees("12.50")).toBe("₹12.50");
    expect(rupees(null)).toBe("—");
    expect(kmText("15.0")).toBe("15 km");
    expect(kmText("7.5")).toBe("7.5 km");
  });

  it("summarises as SH-13 does", () => {
    expect(deliverySummary(shop)).toBe("We deliver · ₹50 + ₹15 a km · up to 15 km");
    expect(deliverySummary({ ...shop, delivers: false })).toBe("We don't deliver");
  });

  it("fills the form without trailing zeros", () => {
    expect(deliveryFormFrom(shop)).toEqual({ delivers: true, base: "50", perKm: "15", maxKm: "15" });
    expect(deliveryFormFrom({ ...shop, delivery_per_km: "12.50" }).perKm).toBe("12.5");
  });

  it("cleans typing to digits and one point", () => {
    expect(cleanDecimal("1a2.5.7", 2)).toBe("12.57");
    expect(cleanDecimal("15.55", 1)).toBe("15.5");
    expect(cleanDecimal("₹ 40", 2)).toBe("40");
    expect(cleanDecimal("7.", 2)).toBe("7.");
  });

  it("asks for all three numbers when delivering, none when not", () => {
    expect(checkDelivery({ delivers: true, base: "50", perKm: "15", maxKm: "15" })).toEqual({});
    expect(checkDelivery({ delivers: true, base: "0", perKm: "0", maxKm: "3" })).toEqual({});
    expect(Object.keys(checkDelivery({ delivers: true, base: "", perKm: "", maxKm: "" })).sort()).toEqual([
      "base",
      "maxKm",
      "perKm",
    ]);
    expect(checkDelivery({ delivers: true, base: "50", perKm: "15", maxKm: "0" }).maxKm).toBeDefined();
    expect(checkDelivery({ delivers: true, base: "50", perKm: "15", maxKm: "2.55" }).maxKm).toBeDefined();
    expect(checkDelivery({ delivers: false, base: "", perKm: "", maxKm: "" })).toEqual({});
  });

  it("sends the numbers as the API formats them", () => {
    expect(deliveryPatch({ delivers: true, base: "50", perKm: "15.5", maxKm: "15" })).toEqual({
      delivers: true,
      delivery_base_fee: "50.00",
      delivery_per_km: "15.50",
      delivery_max_km: "15.0",
    });
    expect(deliveryPatch({ delivers: false, base: "50", perKm: "15", maxKm: "15" })).toEqual({ delivers: false });
  });
});

describe("signing a device out (T-43)", () => {
  it("does not promise a new code: the password is not touched by one device's sign-out", () => {
    expect(DEVICE_SIGN_OUT_NOTE).toMatch(/sign in again with your password/);
    expect(deviceSignOutQuestion("Meera's iPhone")).toEqual({
      title: "Sign out Meera's iPhone?",
      message: "It stops working at once. It can sign in again with your password.",
    });
    expect(deviceSignOutQuestion("").title).toBe("Sign out this device?");
    for (const text of [DEVICE_SIGN_OUT_NOTE, SIGN_OUT_EVERYWHERE_NOTE, deviceSignOutQuestion("x").message]) {
      expect(text).not.toMatch(/needs? a (new )?code/i);
    }
  });

  it("says what Sign out everywhere does: the password stops working, a code to the shop's number gets back in", () => {
    expect(SIGN_OUT_EVERYWHERE_NOTE).toContain("Your password then no longer works: sign in with a code sent to your shop's number, and set a new password if you want one.");
  });
});
