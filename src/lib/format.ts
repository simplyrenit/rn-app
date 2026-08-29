/**
 * Presentation formatters. One implementation each, so the same value cannot
 * render as "₹15000" on one screen and "₹100.00" on the next.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const inrWithPaiseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/**
 * Money, in Indian digit grouping: ₹15,000 — not ₹15000.
 * Paise are dropped unless the amount actually has them, because a rental rate
 * is a round number and "₹100.00" reads like a price tag from a different app.
 */
export function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return (hasPaise ? inrWithPaiseFormatter : inrFormatter).format(amount);
}

/** Plain grouped number, no currency symbol. */
export function formatNumber(value: number | string | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN").format(amount);
}

const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const TIME = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});
const SHORT_DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const SHORT_DATE_YEAR = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Conversation-list timestamp, iOS convention: a time today, "Yesterday", a
 * weekday inside the last week, then a short date. Never a raw US datetime.
 */
export function formatListTimestamp(value: string | number | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDelta <= 0) return TIME.format(date);
  if (dayDelta === 1) return "Yesterday";
  if (dayDelta < 7) return WEEKDAY.format(date);
  if (date.getFullYear() === now.getFullYear()) return SHORT_DATE.format(date);
  return SHORT_DATE_YEAR.format(date);
}

/** Time shown against an individual chat message. */
export function formatMessageTime(value: string | number | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return TIME.format(date);
}

/** Sticky day header inside a conversation. */
export function formatDayHeading(value: string | number | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (dayDelta <= 0) return "Today";
  if (dayDelta === 1) return "Yesterday";
  if (dayDelta < 7) return new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(date);
  if (date.getFullYear() === now.getFullYear()) return SHORT_DATE.format(date);
  return SHORT_DATE_YEAR.format(date);
}

/** True when two timestamps fall on the same calendar day. */
export function isSameDay(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined
) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return startOfDay(da) === startOfDay(db);
}

/**
 * Truncate on a word boundary and only claim truncation when it happened.
 * `slice(0, n) + "..."` cuts mid-word and appends an ellipsis to strings that
 * were never cut, so a 40-character review reads as though it continues.
 */
export function truncateWords(text: string, limit: number) {
  const clean = (text ?? "").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > limit * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}
