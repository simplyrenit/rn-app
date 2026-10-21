/**
 * The owner's shop settings on the phone (API-CONTRACT OE-B; ARCHITECTURE 2.1).
 * Plain functions, so the words and the checks can be tested.
 *
 * Every time here is India time: hours are `HH:MM` as the owner thinks of them,
 * days are `YYYY-MM-DD`, instants are UTC and are shown in India time.
 */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: readonly DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_SHORT: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const DAY_LONG: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export interface DayHours {
  /** 24-hour `HH:MM`. */
  open: string;
  close: string;
}

/** A missing day, or `null`, is closed that day. */
export type Hours = Partial<Record<DayKey, DayHours | null>>;

export interface OpenState {
  is_open: boolean;
  /** `hours`, `manual`, `missed_requests`, `closed_until`, `no_hours`. */
  reason: string;
  /** When closed: the next opening (null if none in 14 days). */
  opens_at: string | null;
  /** When open: the next closing. */
  closes_at: string | null;
}

/** `GET /api/shop/`, the fields the phone uses. */
export interface Shop {
  name: string;
  /** The full address and pin the owner confirmed; empty and null before. */
  address: string;
  locality: string;
  coordinates: { lat: number; long: number } | null;
  address_confirmed: boolean;
  hours: Hours;
  closed_until: string | null;
  min_notice_hours: number;
  open: OpenState;
  delivers: boolean;
  delivery_base_fee: string;
  delivery_per_km: string;
  delivery_max_km: string;
  /**
   * PIN codes the shop won't deliver to, sorted (ENG-284). Missing on an older server: read it as `[]`
   * (`excludedPins`).
   */
  excluded_pincodes?: string[];
  /** A merchant has the dashboard; an individual owner does not. */
  is_merchant: boolean;
  /** Nothing in the shop's `missing` list stops it taking bookings, so its requests will ring. */
  can_take_bookings?: boolean;
}

// ---- Times and days -------------------------------------------------------------

/** "10:00" → "10 am", "20:30" → "8:30 pm". */
export function time12(hhmm: string): string {
  const [hh, mm] = hhmm.split(":");
  const hour = Number(hh);
  const minute = Number(mm);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return hhmm;
  const suffix = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 || 12;
  return minute === 0 ? `${h12} ${suffix}` : `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-13" → "13 Oct". The day is read as written, never through a time zone. */
export function dayLabel(day: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? "");
  if (!match) return null;
  const month = Number(match[2]) - 1;
  return MONTHS[month] ? `${Number(match[3])} ${MONTHS[month]}` : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar day in India, `YYYY-MM-DD`, of an instant. */
export function istDay(at: Date): string {
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** The day after today in India: the earliest "Closed until" the server accepts. */
export function tomorrowIst(now: Date = new Date()): string {
  return istDay(new Date(now.getTime() + DAY_MS));
}

/**
 * When an instant is, for someone in India: "today 10 am", "tomorrow 10 am",
 * "Tue 10 am", and past a week "13 Oct 10 am".
 */
export function istWhen(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const midnight = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const ahead = Math.round((midnight(ist) - midnight(istNow)) / DAY_MS);
  const time = time12(`${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`);
  if (ahead === 0) return `today ${time}`;
  if (ahead === 1) return `tomorrow ${time}`;
  if (ahead > 1 && ahead < 7) {
    return `${DAY_SHORT[DAY_KEYS[(ist.getUTCDay() + 6) % 7]]} ${time}`;
  }
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${time}`;
}

// ---- Handover hours ---------------------------------------------------------------

export function hasHours(hours: Hours | null | undefined): boolean {
  return DAY_KEYS.some((day) => Boolean(hours?.[day]));
}

export interface HoursRow {
  label: string;
  value: string;
  days: DayKey[];
}

/** Open from midnight to the last minute of the day: what an all-day shop's hours are stored as ("00:00" to "23:59"). */
export const ALL_DAY = "All day";

export function coversWholeDay(hours: DayHours): boolean {
  return hours.open === "00:00" && (hours.close === "23:59" || hours.close === "24:00" || hours.close === "23:59:59");
}

/**
 * The summary on SH-13: runs of days with the same hours become one row, as
 * "Mon – Fri  10 am – 8 pm", "Sat  10 am – 9 pm", "Sun  Closed".
 */
export function hoursRows(hours: Hours | null | undefined): HoursRow[] {
  const valueOf = (day: DayKey) => {
    const h = hours?.[day];
    return h ? (coversWholeDay(h) ? ALL_DAY : `${time12(h.open)} – ${time12(h.close)}`) : "Closed";
  };
  const rows: HoursRow[] = [];
  for (const day of DAY_KEYS) {
    const value = valueOf(day);
    const last = rows[rows.length - 1];
    if (last && last.value === value) last.days.push(day);
    else rows.push({ label: "", value, days: [day] });
  }
  for (const row of rows) {
    const first = DAY_SHORT[row.days[0]];
    const end = DAY_SHORT[row.days[row.days.length - 1]];
    row.label =
      row.days.length === 1 ? first : row.days.length === 2 ? `${first} & ${end}` : `${first} – ${end}`;
  }
  return rows;
}

/** Every half hour from midnight: what the time list offers. */
export const TIME_SLOTS: readonly string[] = Array.from({ length: 48 }, (_, i) =>
  `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? "00" : "30"}`
);

/** The list, with a time that is not on the half hour (set on the dashboard) kept in it. */
export function slotsWith(current: string | null | undefined): string[] {
  if (!current || TIME_SLOTS.includes(current)) return [...TIME_SLOTS];
  return [...TIME_SLOTS, current].sort();
}

/** What a closed day becomes when it is switched on: the week's own hours, else 10 am to 8 pm. */
export function dayToOpen(hours: Hours | null | undefined): DayHours {
  for (const day of DAY_KEYS) {
    const h = hours?.[day];
    if (h) return { open: h.open, close: h.close };
  }
  return { open: "10:00", close: "20:00" };
}

export interface HoursCheck {
  /** Per day, the problem with it. */
  days: Partial<Record<DayKey, string>>;
  /** A problem with the week as a whole. */
  week: string | null;
  ok: boolean;
}

/** The server's rule (open before close, the same day) and one of ours: at least one open day. */
export function checkHours(hours: Hours): HoursCheck {
  const days: Partial<Record<DayKey, string>> = {};
  for (const day of DAY_KEYS) {
    const h = hours[day];
    if (h && !(h.open < h.close)) days[day] = "Opening time must be before closing time";
  }
  const week = hasHours(hours) ? null : "Pick at least one day you hand items over";
  return { days, week, ok: week === null && Object.keys(days).length === 0 };
}

/** The whole week as the API wants it: all seven keys, `null` for a closed day. */
export function hoursPayload(hours: Hours): Record<DayKey, DayHours | null> {
  const out = {} as Record<DayKey, DayHours | null>;
  for (const day of DAY_KEYS) out[day] = hours[day] ? { ...(hours[day] as DayHours) } : null;
  return out;
}

/** Whether the hours on the form differ from the ones the screen opened with: "Save hours" is greyed until they do (test run D-12). */
export function hoursChanged(initial: Hours, hours: Hours): boolean {
  return JSON.stringify(hoursPayload(initial)) !== JSON.stringify(hoursPayload(hours));
}

// ---- The Open switch --------------------------------------------------------------

export interface OpenCopy {
  title: string;
  subtitle: string;
}

/** What the Open card says, from the server's reason. */
export function openCopy(
  open: OpenState,
  closedUntil: string | null,
  now: Date = new Date()
): OpenCopy {
  if (open.is_open) {
    return {
      title: "Open · you'll be asked about new bookings",
      subtitle: open.reason === "manual" ? "You switched it on by hand" : "Follows your hours by itself",
    };
  }
  const title = open.opens_at
    ? "Closed · new bookings wait until you open"
    : "Closed · customers can't book from you right now";
  switch (open.reason) {
    case "hours":
      return {
        title,
        subtitle: open.opens_at
          ? `Outside your hours · opens ${istWhen(open.opens_at, now)}`
          : "Outside your hours",
      };
    case "manual":
      return { title, subtitle: "You switched it off by hand" };
    case "missed_requests":
      return { title, subtitle: "Closed after two missed requests in a row" };
    case "closed_until": {
      const day = dayLabel(closedUntil);
      return { title, subtitle: day ? `Closed until ${day}` : "Closed for a holiday" };
    }
    case "no_hours":
      return { title, subtitle: "Set your handover hours to open" };
    default:
      return { title, subtitle: "" };
  }
}

/** The line shown when `POST /api/shop/open/` answers `409 cannot_open`. */
export function cannotOpenMessage(reason: unknown, closedUntil: string | null): string {
  if (reason === "no_hours") return "Set your handover hours first.";
  if (reason === "closed_until") {
    const day = dayLabel(closedUntil);
    return day
      ? `You're closed until ${day}. Clear that date to open now.`
      : "You're closed for a holiday. Clear the date to open now.";
  }
  return "You can't open right now.";
}

// ---- Shortest notice --------------------------------------------------------------

/** Hours of notice the list offers; the server takes 0 to 168. */
export const NOTICE_OPTIONS: readonly number[] = [0, 1, 2, 3, 4, 6, 12, 24, 48, 72];

export function noticeLabel(hours: number): string {
  if (hours === 0) return "No notice";
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/** The list, with a value set on the dashboard (say 5) kept in it, in order. */
export function noticeOptions(current: number): number[] {
  const all = NOTICE_OPTIONS.includes(current) ? [...NOTICE_OPTIONS] : [...NOTICE_OPTIONS, current];
  return all.sort((a, b) => a - b);
}

// ---- Delivery ---------------------------------------------------------------------

/** "50.00" → "₹50", "12.50" → "₹12.50". */
export function rupees(value: string | number | null | undefined): string {
  const n = value === null || value === undefined || value === "" ? NaN : Number(value);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? `₹${n}` : `₹${n.toFixed(2)}`;
}

/** "15.0" → "15 km", "7.5" → "7.5 km". */
export function kmText(value: string | number | null | undefined): string {
  const n = value === null || value === undefined || value === "" ? NaN : Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Number.isInteger(n) ? n : n.toFixed(1)} km`;
}

/** "1 area off", "3 areas off". */
const areasOff = (n: number) => `${n} ${n === 1 ? "area" : "areas"} off`;

/** The Delivery row's second line on SH-13: "Up to 5 km · 1 area off · ₹50 + ₹15 a km". */
export function deliverySummary(
  shop: Pick<Shop, "delivers" | "delivery_base_fee" | "delivery_per_km" | "delivery_max_km" | "excluded_pincodes"> &
    Partial<Pick<Shop, "coordinates">>
): string {
  if (!shop.delivers) return "We don't deliver";
  const off = excludedPins(shop).length;
  // With no pin there is nothing to measure from, so no areas: say what to do instead.
  const areas = shop.coordinates === null ? "add your shop address" : off ? areasOff(off) : "all areas";
  return `Up to ${kmText(shop.delivery_max_km)} · ${areas} · ${rupees(
    shop.delivery_base_fee
  )} + ${rupees(shop.delivery_per_km)} a km`;
}

/** The delivery form as typed: text, so a half-typed "1." is not rewritten under a finger. */
export interface DeliveryForm {
  delivers: boolean;
  base: string;
  perKm: string;
  maxKm: string;
}

const trimZeros = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
};

export function deliveryFormFrom(
  shop: Pick<Shop, "delivers" | "delivery_base_fee" | "delivery_per_km" | "delivery_max_km">
): DeliveryForm {
  return {
    delivers: shop.delivers,
    base: trimZeros(shop.delivery_base_fee),
    perKm: trimZeros(shop.delivery_per_km),
    maxKm: trimZeros(shop.delivery_max_km),
  };
}

const sameNumber = (a: string, b: string) => (a === b ? true : a !== "" && b !== "" && Number(a) === Number(b));

/** Digits and one point, at most `places` after it. */
export function cleanDecimal(value: string, places: number): string {
  const kept = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = kept.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, places)}`;
}

export type DeliveryErrors = Partial<Record<"base" | "perKm" | "maxKm", string>>;

const MONEY = /^\d+(\.\d{1,2})?$/;
const KM = /^\d+(\.\d)?$/;

/** Nothing to check while the shop does not deliver. A delivering shop needs all three numbers. */
export function checkDelivery(form: DeliveryForm): DeliveryErrors {
  if (!form.delivers) return {};
  const errors: DeliveryErrors = {};
  if (!MONEY.test(form.base)) errors.base = "Enter the starting fee in rupees, 0 or more";
  if (!MONEY.test(form.perKm)) errors.perKm = "Enter the amount per km in rupees, 0 or more";
  if (!KM.test(form.maxKm) || Number(form.maxKm) <= 0) {
    errors.maxKm = "Choose how far you go, more than 0 km";
  }
  return errors;
}

/**
 * The PATCH body: money to two places, distance to one, as the API formats them. The areas go with a delivering shop only:
 * while delivery is off the areas card is hidden, so what it held is not what the owner is saving.
 */
export function deliveryPatch(form: DeliveryForm & { excluded?: string[] }) {
  if (!form.delivers) return { delivers: false };
  return {
    delivers: true,
    delivery_base_fee: Number(form.base).toFixed(2),
    delivery_per_km: Number(form.perKm).toFixed(2),
    delivery_max_km: Number(form.maxKm).toFixed(1),
    ...(form.excluded ? { excluded_pincodes: [...new Set(form.excluded)].sort() } : {}),
  };
}

// ---- Delivery areas (ENG-284) ------------------------------------------------------

/** One PIN code around the shop, from `GET /api/shop/pincodes/?km=`. */
export interface Area {
  pin: string;
  /** India Post's name: "Vesava". */
  name: string;
  /** From the shop's pin to the area's centre, "2.4". */
  km: string;
  /** The centre is within the km asked for. */
  inside: boolean;
  /** Off as saved on the server. The screens read the draft's list instead. */
  excluded: boolean;
}

export interface AreasResponse {
  km: string;
  /** Nearest first. */
  areas: Area[];
}

/** The shop's areas that are off; an older server sends no list, which is none off. */
export const excludedPins = (shop: Pick<Shop, "excluded_pincodes">): string[] => shop.excluded_pincodes ?? [];

/** The delivery screen's whole draft: the form plus the PIN codes that are off. Shared by Delivery and All areas. */
export interface DeliveryDraft extends DeliveryForm {
  excluded: string[];
}

export function deliveryDraftFrom(
  shop: Pick<Shop, "delivers" | "delivery_base_fee" | "delivery_per_km" | "delivery_max_km" | "excluded_pincodes">
): DeliveryDraft {
  return { ...deliveryFormFrom(shop), excluded: [...excludedPins(shop)] };
}

/** One area on or off. */
export function toggleExcluded(excluded: readonly string[], pin: string): string[] {
  return excluded.includes(pin) ? excluded.filter((p) => p !== pin) : [...excluded, pin];
}

/** The chips on the Delivery screen: what is off first (so it is never hidden past the eighth), then nearest. */
export function previewAreas(areas: readonly Area[], off: readonly string[], count = 8): Area[] {
  const isOff = (a: Area) => (off.includes(a.pin) ? 0 : 1);
  return [...areas].sort((a, b) => isOff(a) - isOff(b) || Number(a.km) - Number(b.km)).slice(0, count);
}

/** The areas inside the distance that are off: the ones a customer would be refused in. */
export function offWithin(areas: readonly Area[], excluded: readonly string[]): Area[] {
  return areas.filter((a) => a.inside && excluded.includes(a.pin));
}

/** What the server takes for `?km=`; a stored distance outside it still lists the nearest it can. */
export const AREAS_KM_MIN = 0.5;
export const AREAS_KM_MAX = 50;
export const areasKm = (km: number) => Math.min(AREAS_KM_MAX, Math.max(AREAS_KM_MIN, km));

/** Half a km at a time up to 2 km, where a half matters; whole km after, to 50. */
const KM_STEPS: readonly number[] = [0.5, 1, 1.5, ...Array.from({ length: 49 }, (_, i) => i + 2)];

/**
 * The next distance the − or + gives, or null when there is none (the button is disabled). A distance off the steps (7.5
 * from the dashboard, or 0) stays as it is until a button is pressed, then moves to the next step that way: 7.5 → 8 or 7.
 * Past 50 only − works, and it goes to 50.
 */
export function stepKm(km: number, direction: 1 | -1): number | null {
  const EPS = 1e-9;
  const next =
    direction > 0 ? KM_STEPS.find((s) => s > km + EPS) : [...KM_STEPS].reverse().find((s) => s < km - EPS);
  return next ?? null;
}

/** The areas whose state the draft changed, by name (PIN when the list doesn't have it). */
export function areaChanges(
  saved: readonly string[],
  draft: readonly string[],
  areas: readonly Area[]
): { off: string[]; on: string[] } {
  const name = (pin: string) => areas.find((a) => a.pin === pin)?.name ?? pin;
  return {
    off: draft.filter((p) => !saved.includes(p)).map(name),
    on: saved.filter((p) => !draft.includes(p)).map(name),
  };
}

const namesTurned = (names: string[], how: "off" | "on") =>
  names.length === 0
    ? null
    : names.length === 1
      ? `${names[0]} turned ${how}`
      : names.length === 2
        ? `${names[0]} and ${names[1]} turned ${how}`
        : `${names.length} areas turned ${how}`;

/**
 * The pinned bar's words for what isn't saved: "up to 6 km, fee changed, Juhu turned off", or null when nothing is.
 * A shop switching delivery off has nothing else to save (the cards are hidden), as `deliveryPatch` sends.
 */
export function unsavedSummary(saved: DeliveryDraft, draft: DeliveryDraft, areas: readonly Area[]): string | null {
  if (saved.delivers && !draft.delivers) return "delivery turned off";
  if (!draft.delivers) return null;
  const parts: (string | null)[] = [];
  if (!saved.delivers) parts.push("delivery turned on");
  if (!sameNumber(saved.maxKm, draft.maxKm)) parts.push(`up to ${kmText(draft.maxKm)}`);
  if (!sameNumber(saved.base, draft.base) || !sameNumber(saved.perKm, draft.perKm)) parts.push("fee changed");
  const changes = areaChanges(saved.excluded, draft.excluded, areas);
  parts.push(namesTurned(changes.off, "off"), namesTurned(changes.on, "on"));
  const said = parts.filter((p): p is string => p !== null);
  return said.length ? said.join(", ") : null;
}

/** The toast after a save. Turning areas off is when the owner most needs telling pickup still works there. */
export function savedMessage(turnedOff: readonly string[]): string {
  if (turnedOff.length === 0) return "Saved.";
  return turnedOff.length === 1
    ? `Saved. Customers in ${turnedOff[0]} can still pick up.`
    : "Saved. Customers in those areas can still pick up.";
}

/** What "We deliver" switched on suggests (D7). */
export const SUGGESTED_FEES = { base: "50", perKm: "15", maxKm: "5" } as const;

/**
 * Switching delivery on. A shop with both fees at 0 has never set them: it gets ₹50 + ₹15 a km and 5 km, marked as a
 * suggestion. Any fee already set is left alone.
 */
export function prefillFees<T extends DeliveryForm>(form: T): { form: T; suggested: boolean } {
  const on = { ...form, delivers: true };
  if (Number(form.base || 0) !== 0 || Number(form.perKm || 0) !== 0) return { form: on, suggested: false };
  return { form: { ...on, ...SUGGESTED_FEES }, suggested: true };
}

// ---- Signing a device out (decision T-43) ----------------------------------------------------

/**
 * What signing one device out does, in words that are true: the device stops working at once, but the shop's password is not
 * touched, so it can sign in again with it (and with an emailed code, Google or Apple). "Each one needs a code" was not true.
 */
export const DEVICE_SIGN_OUT_NOTE = "A device you sign out here stops working at once, but it can sign in again with your password.";

/**
 * What "Sign out everywhere" on the dashboard does: every device is signed out (the phone that shows this note too) and the
 * password is switched off, so the owner signs in with a code sent to the shop's number. No screen sets a new password yet, so
 * none is promised.
 */
export const SIGN_OUT_EVERYWHERE_NOTE =
  "To sign every device out and switch your password off, use Sign out everywhere on the dashboard. Your password then no longer works: sign in with a code sent to your shop's number.";

/**
 * Whether this shop has the dashboard to go to: an approved merchant. An individual owner, or a merchant still waiting for
 * approval, has none, and the note that sends the reader there is not shown.
 */
export const hasDashboard = (isMerchant: boolean | undefined, approval: string | null | undefined): boolean =>
  Boolean(isMerchant) && approval === "approved";

/** The body of `POST /api/shop/confirm-address/`. */
export interface ShopAddressBody {
  address: string;
  locality: string;
  coordinates: { lat: number; long: number };
}

/**
 * The body from what the map picker gave. When the geocoder had nothing
 * (`mapAddress` null) the locality stands in, so the address is never blank.
 * The server's column is 255 characters.
 */
export function shopAddressBody(
  pin: { latitude: number; longitude: number },
  mapAddress: string | null,
  locality: string
): ShopAddressBody {
  return {
    address: (mapAddress?.trim() || locality).slice(0, 255),
    locality: locality.slice(0, 255),
    coordinates: { lat: pin.latitude, long: pin.longitude },
  };
}

/** The confirmation for signing one device out. */
export const deviceSignOutQuestion = (name: string | null | undefined) => ({
  title: `Sign out ${name || "this device"}?`,
  message: "It stops working at once. It can sign in again with your password.",
});

// ---- The list of signed-in devices (test run D-10) --------------------------------------------

/** The part of a device the list needs. */
interface DeviceLike {
  this_device: boolean;
}

/**
 * What the devices sheet says besides the rows. A phone that is signed in lists itself (`this_device`); when the list is empty,
 * or has other devices but not this one, this phone's sign-in has no session on the server: it is from before the sessions
 * existed (the one day an old sign-in lives out), and only a new sign-in makes one. An empty list is never a blank sheet.
 */
export function devicesNote(devices: readonly DeviceLike[]): { empty: string | null; thisPhone: string | null } {
  const LOG_OUT_AND_IN = "Log out and sign in again and this phone will be listed.";
  if (devices.length === 0) {
    return { empty: "No devices are listed. This phone's sign-in is from before an update, so Renit has no record of it. " + LOG_OUT_AND_IN, thisPhone: null };
  }
  if (!devices.some((device) => device.this_device)) {
    return { empty: null, thisPhone: "This phone isn't on the list: its sign-in is from before an update. " + LOG_OUT_AND_IN };
  }
  return { empty: null, thisPhone: null };
}

/** The merchant approval status as the profile card says it: "Approved", not the server's bare lower-case word. */
export function merchantStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending approval";
    case "rejected":
      return "Not approved";
    default:
      return status ?? "";
  }
}
