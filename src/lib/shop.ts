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
  hours: Hours;
  closed_until: string | null;
  min_notice_hours: number;
  open: OpenState;
  delivers: boolean;
  delivery_base_fee: string;
  delivery_per_km: string;
  delivery_max_km: string;
  /** A merchant has the dashboard; an individual owner does not. */
  is_merchant: boolean;
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

/**
 * The summary on SH-13: runs of days with the same hours become one row, as
 * "Mon – Fri  10 am – 8 pm", "Sat  10 am – 9 pm", "Sun  Closed".
 */
export function hoursRows(hours: Hours | null | undefined): HoursRow[] {
  const valueOf = (day: DayKey) => {
    const h = hours?.[day];
    return h ? `${time12(h.open)} – ${time12(h.close)}` : "Closed";
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

/** The Delivery row's second line on SH-13. */
export function deliverySummary(
  shop: Pick<Shop, "delivers" | "delivery_base_fee" | "delivery_per_km" | "delivery_max_km">
): string {
  if (!shop.delivers) return "We don't deliver";
  return `We deliver · ${rupees(shop.delivery_base_fee)} + ${rupees(shop.delivery_per_km)} a km · up to ${kmText(
    shop.delivery_max_km
  )}`;
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
    errors.maxKm = "Enter how far you go, more than 0 km";
  }
  return errors;
}

/** The PATCH body: money to two places, distance to one, as the API formats them. */
export function deliveryPatch(form: DeliveryForm) {
  if (!form.delivers) return { delivers: false };
  return {
    delivers: true,
    delivery_base_fee: Number(form.base).toFixed(2),
    delivery_per_km: Number(form.perKm).toFixed(2),
    delivery_max_km: Number(form.maxKm).toFixed(1),
  };
}
