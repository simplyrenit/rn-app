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
  merchantStatusLabel,
  dayLabel,
  dayToOpen,
  deliveryFormFrom,
  Area,
  areaChanges,
  areasKm,
  deliveryDraftFrom,
  offWithin,
  areaGroups,
  prefillFees,
  previewAreas,
  savedMessage,
  stepKm,
  toggleExcluded,
  unsavedSummary,
  coversWholeDay,
  deliveryPatch,
  hoursChanged,
  deviceSignOutQuestion,
  devicesNote,
  hasDashboard,
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
  shopAddressBody,
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
    expect(deliverySummary(shop)).toBe("Up to 15 km · all areas · ₹50 + ₹15 a km");
    expect(deliverySummary({ ...shop, excluded_pincodes: [] })).toBe("Up to 15 km · all areas · ₹50 + ₹15 a km");
    expect(deliverySummary({ ...shop, excluded_pincodes: ["400061"] })).toBe("Up to 15 km · 1 area off · ₹50 + ₹15 a km");
    expect(deliverySummary({ ...shop, coordinates: null })).toBe("Up to 15 km · add your shop address · ₹50 + ₹15 a km");
    expect(deliverySummary({ ...shop, excluded_pincodes: ["400061", "400049"] })).toBe(
      "Up to 15 km · 2 areas off · ₹50 + ₹15 a km"
    );
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

  it("sends the areas that are off, sorted and once each, only while delivering", () => {
    const form = { delivers: true, base: "50", perKm: "15", maxKm: "5" };
    expect(deliveryPatch({ ...form, excluded: ["400061", "400049", "400061"] })).toMatchObject({
      excluded_pincodes: ["400049", "400061"],
    });
    expect(deliveryPatch({ ...form, excluded: [] })).toMatchObject({ excluded_pincodes: [] });
    expect(deliveryPatch({ ...form, delivers: false, excluded: ["400061"] })).toEqual({ delivers: false });
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

  it("says what Sign out everywhere does: the password stops working, a code to the shop's number gets back in, and no new password is promised (no screen sets one)", () => {
    expect(SIGN_OUT_EVERYWHERE_NOTE).toBe(
      "To sign every device out and switch your password off, use Sign out everywhere on the dashboard. Your password then no longer works: sign in with a code sent to your shop's number."
    );
    expect(SIGN_OUT_EVERYWHERE_NOTE).not.toMatch(/new password/);
  });

  it("sends the reader to the dashboard only when the shop has one: an approved merchant", () => {
    expect(hasDashboard(true, "approved")).toBe(true);
    expect(hasDashboard(true, "pending")).toBe(false);
    expect(hasDashboard(true, "rejected")).toBe(false);
    expect(hasDashboard(true, null)).toBe(false);
    expect(hasDashboard(true, undefined)).toBe(false);
    // An individual owner has no dashboard, whatever the status says.
    expect(hasDashboard(false, "approved")).toBe(false);
    expect(hasDashboard(undefined, "approved")).toBe(false);
  });
});

describe("the list of signed-in devices (test run D-10)", () => {
  // The shape `GET /api/access/devices/` answers (access/views.py DevicesView), a test account signed in on this phone.
  const phone = { id: 7, name: "Meera's iPhone", platform: "ios", this_device: true, first_seen_at: "2026-10-12T04:00:00Z", last_seen_at: "2026-10-12T04:30:00Z" };
  const other = { id: 8, name: "Counter tablet", platform: "android", this_device: false, first_seen_at: "2026-10-11T04:00:00Z", last_seen_at: "2026-10-11T08:00:00Z" };

  it("a normal session lists this phone, and nothing more needs saying", () => {
    expect(devicesNote([phone])).toEqual({ empty: null, thisPhone: null });
    expect(devicesNote([phone, other])).toEqual({ empty: null, thisPhone: null });
  });

  it("an empty list is a sentence, not a blank sheet: this phone's old sign-in has no session, and how to get one", () => {
    const note = devicesNote([]);
    expect(note.thisPhone).toBeNull();
    expect(note.empty).toBe(
      "No devices are listed. This phone's sign-in is from before an update, so Renit has no record of it. Log out and sign in again and this phone will be listed."
    );
  });

  it("other devices without this one say that this phone is missing", () => {
    expect(devicesNote([other])).toEqual({
      empty: null,
      thisPhone: "This phone isn't on the list: its sign-in is from before an update. Log out and sign in again and this phone will be listed.",
    });
  });
});

describe("Save is greyed until something changed (test run D-12)", () => {
  const form = { delivers: true, base: "50", perKm: "10", maxKm: "15" };

  const draft = { ...form, excluded: [] as string[] };

  it("delivery: nothing changed, nothing to save; a changed switch or number is", () => {
    expect(unsavedSummary(draft, { ...draft }, [])).toBeNull();
    expect(unsavedSummary(draft, { ...draft, delivers: false }, [])).toBe("delivery turned off");
    expect(unsavedSummary(draft, { ...draft, base: "60" }, [])).toBe("fee changed");
    expect(unsavedSummary(draft, { ...draft, maxKm: "12.5" }, [])).toBe("up to 12.5 km");
    // The same number typed another way is not a change.
    expect(unsavedSummary(draft, { ...draft, base: "50.0", perKm: "10.00" }, [])).toBeNull();
    // Half-typed or emptied is a change (and the form's own check says what is wrong).
    expect(unsavedSummary(draft, { ...draft, base: "" }, [])).toBe("fee changed");
  });

  it("delivery: a shop that does not deliver has nothing else to save, whatever is typed in the boxes it is not using", () => {
    const off = { delivers: false, base: "", perKm: "", maxKm: "", excluded: [] as string[] };
    expect(unsavedSummary(off, { ...off }, [])).toBeNull();
    expect(unsavedSummary(off, { ...off, base: "40" }, [])).toBeNull();
    expect(unsavedSummary(off, { ...off, excluded: ["400061"] }, [])).toBeNull();
    expect(unsavedSummary(off, { ...off, delivers: true, base: "50", perKm: "15", maxKm: "5" }, [])).toBe(
      "delivery turned on, up to 5 km, fee changed"
    );
  });

  it("hours: the same hours are not a change; a day opened, closed or retimed is", () => {
    const week = { ...checkHoursOpenWeek() };
    expect(hoursChanged(week, { ...week })).toBe(false);
    expect(hoursChanged(week, { ...week, mon: null })).toBe(true);
    expect(hoursChanged(week, { ...week, mon: { open: "09:00", close: "19:00" } })).toBe(true);
  });
});

function checkHoursOpenWeek() {
  return {
    mon: { open: "09:00", close: "18:00" },
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  } as import("../shop").Hours;
}

describe("hours that cover the whole day (test run D-13)", () => {
  it("00:00 to 23:59 (or 24:00) is all day; any other hours are not", () => {
    expect(coversWholeDay({ open: "00:00", close: "23:59" })).toBe(true);
    expect(coversWholeDay({ open: "00:00", close: "24:00" })).toBe(true);
    expect(coversWholeDay({ open: "00:00", close: "23:00" })).toBe(false);
    expect(coversWholeDay({ open: "06:00", close: "23:59" })).toBe(false);
  });

  it("the rows of an all-day week read All day, not 12 am – 11:59 pm", () => {
    const allDay = { open: "00:00", close: "23:59" };
    expect(hoursRows({ mon: allDay, tue: allDay, wed: allDay, thu: allDay, fri: allDay, sat: allDay, sun: allDay })).toEqual([
      { label: "Mon – Sun", value: "All day", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
    ]);
  });
});

describe("merchantStatusLabel", () => {
  it("says the approval status as a person would read it, not the server's bare word", () => {
    expect(merchantStatusLabel("approved")).toBe("Approved");
    expect(merchantStatusLabel("pending")).toBe("Pending approval");
    expect(merchantStatusLabel("rejected")).toBe("Not approved");
    expect(merchantStatusLabel(null)).toBe("");
    expect(merchantStatusLabel(undefined)).toBe("");
  });
});

describe("the shop address body (ENG-265)", () => {
  const pin = { latitude: 19.1364, longitude: 72.8296 };

  it("sends the map's address, the locality and the pin as lat and long", () => {
    expect(shopAddressBody(pin, "Lokhandwala Complex, Andheri West, Mumbai 400053", "Andheri West, Mumbai")).toEqual({
      address: "Lokhandwala Complex, Andheri West, Mumbai 400053",
      locality: "Andheri West, Mumbai",
      coordinates: { lat: 19.1364, long: 72.8296 },
    });
  });

  it("uses the locality when the geocoder had no address, and keeps within 255 characters", () => {
    expect(shopAddressBody(pin, null, "Andheri West, Mumbai").address).toBe("Andheri West, Mumbai");
    expect(shopAddressBody(pin, "  ", "Andheri West, Mumbai").address).toBe("Andheri West, Mumbai");
    expect(shopAddressBody(pin, "x".repeat(300), "Andheri").address).toHaveLength(255);
  });
});

const area = (pin: string, name: string, km: string, inside = true, excluded = false): Area => ({
  pin,
  name,
  km,
  inside,
  excluded,
});

describe("delivery areas (ENG-284)", () => {
  const areas: Area[] = [
    area("400053", "Andheri W", "0.4"),
    area("400058", "Four Bungalows", "1.6"),
    area("400102", "Jogeshwari W", "2.1"),
    area("400061", "Vesava", "2.4", true, true),
    area("400047", "Marol", "2.9"),
    area("400060", "Jogeshwari E", "3.2"),
    area("400049", "Juhu", "3.4"),
    area("400104", "Goregaon W", "3.9"),
    area("400069", "Chakala", "4.1"),
    area("400056", "Vile Parle W", "5.6", false),
  ];

  it("previews what is off first, then the nearest, eight at most", () => {
    const shown = previewAreas(areas, ["400061", "400056"]);
    expect(shown.map((a) => a.pin)).toEqual([
      "400061",
      "400056",
      "400053",
      "400058",
      "400102",
      "400047",
      "400060",
      "400049",
    ]);
    expect(previewAreas(areas, []).map((a) => a.name)[0]).toBe("Andheri W");
    expect(previewAreas(areas.slice(0, 3), [])).toHaveLength(3);
  });

  it("counts as off only the areas inside the distance", () => {
    expect(offWithin(areas, ["400061", "400056"]).map((a) => a.pin)).toEqual(["400061"]);
    expect(offWithin(areas, [])).toEqual([]);
  });

  it("keeps each row in the group it was drawn in, counting from the draft", () => {
    const shown = areas.slice(0, 4);
    // Drawn with Vesava off; then Vesava turned back on and Andheri W off.
    const groups = areaGroups(shown, ["400061"], ["400053"]);
    expect(groups.off.map((a) => a.pin)).toEqual(["400061"]);
    expect(groups.on.map((a) => a.pin)).toEqual(["400053", "400058", "400102"]);
    expect([groups.offCount, groups.onCount]).toEqual([1, 3]);
    expect(areaGroups([], ["400061"], ["400061"])).toEqual({ off: [], on: [], offCount: 0, onCount: 0 });
  });

  it("turns one area on or off", () => {
    expect(toggleExcluded(["400061"], "400049")).toEqual(["400061", "400049"]);
    expect(toggleExcluded(["400061", "400049"], "400061")).toEqual(["400049"]);
  });

  it("steps half a km under 2 km and whole km above, 0.5 to 50", () => {
    expect(stepKm(5, 1)).toBe(6);
    expect(stepKm(5, -1)).toBe(4);
    expect(stepKm(2, -1)).toBe(1.5);
    expect(stepKm(1.5, 1)).toBe(2);
    expect(stepKm(0.5, -1)).toBeNull();
    expect(stepKm(50, 1)).toBeNull();
    expect(stepKm(49, 1)).toBe(50);
  });

  it("leaves a stored distance off the steps alone until pressed, then moves to the next step", () => {
    expect(stepKm(7.5, 1)).toBe(8);
    expect(stepKm(7.5, -1)).toBe(7);
    expect(stepKm(1.2, 1)).toBe(1.5);
    expect(stepKm(1.2, -1)).toBe(1);
    expect(stepKm(0, 1)).toBe(0.5);
    expect(stepKm(0, -1)).toBeNull();
    expect(stepKm(60, 1)).toBeNull();
    expect(stepKm(60, -1)).toBe(50);
    expect(stepKm(50.5, -1)).toBe(50);
  });

  it("asks the server for a distance it takes", () => {
    expect(areasKm(0)).toBe(0.5);
    expect(areasKm(7.5)).toBe(7.5);
    expect(areasKm(60)).toBe(50);
  });

  it("says what is unsaved, areas by name", () => {
    const saved = { delivers: true, base: "50", perKm: "15", maxKm: "5", excluded: ["400061"] };
    expect(unsavedSummary(saved, { ...saved, excluded: ["400061", "400049"] }, areas)).toBe("Juhu turned off");
    expect(unsavedSummary(saved, { ...saved, maxKm: "6", perKm: "20", excluded: ["400061", "400049"] }, areas)).toBe(
      "up to 6 km, fee changed, Juhu turned off"
    );
    expect(unsavedSummary(saved, { ...saved, excluded: [] }, areas)).toBe("Vesava turned on");
    expect(unsavedSummary(saved, { ...saved, excluded: ["400061", "400049", "400047"] }, areas)).toBe(
      "Juhu and Marol turned off"
    );
    expect(
      unsavedSummary(saved, { ...saved, excluded: ["400061", "400049", "400047", "400060"] }, areas)
    ).toBe("3 areas turned off");
    // A PIN the list doesn't carry is named by its number.
    expect(unsavedSummary(saved, { ...saved, excluded: ["400061", "400099"] }, areas)).toBe("400099 turned off");
    // The same areas in another order are not a change.
    const two = { ...saved, excluded: ["400061", "400049"] };
    expect(unsavedSummary(two, { ...two, excluded: ["400049", "400061"] }, areas)).toBeNull();
  });

  it("names the areas a save turned off", () => {
    expect(areaChanges(["400061"], ["400061", "400049"], areas)).toEqual({ off: ["Juhu"], on: [] });
    expect(savedMessage([])).toBe("Saved.");
    expect(savedMessage(["Vesava"])).toBe("Saved. Customers in Vesava can still pick up.");
    expect(savedMessage(["Vesava", "Juhu"])).toBe("Saved. Customers in those areas can still pick up.");
  });

  it("suggests ₹50 + ₹15 a km and 5 km when delivery goes on with both fees at 0", () => {
    const zero = { delivers: false, base: "0", perKm: "0", maxKm: "0", excluded: [] as string[] };
    expect(prefillFees(zero)).toEqual({
      form: { delivers: true, base: "50", perKm: "15", maxKm: "5", excluded: [] },
      suggested: true,
    });
    expect(prefillFees({ ...zero, base: "", perKm: "" }).suggested).toBe(true);
    const set = { ...zero, base: "40", maxKm: "8" };
    expect(prefillFees(set)).toEqual({ form: { ...set, delivers: true }, suggested: false });
    expect(prefillFees({ ...zero, perKm: "10" }).suggested).toBe(false);
  });

  it("reads a shop from an older server as having nothing off", () => {
    const shop = { delivers: true, delivery_base_fee: "50.00", delivery_per_km: "15.00", delivery_max_km: "7.5" };
    expect(deliveryDraftFrom(shop)).toEqual({ delivers: true, base: "50", perKm: "15", maxKm: "7.5", excluded: [] });
    expect(deliveryDraftFrom({ ...shop, excluded_pincodes: ["400061"] }).excluded).toEqual(["400061"]);
  });
});
