/**
 * A listing's pricing plans (ENG-281): a price for a day, a week and/or a
 * month, each with a minimum rental in its own unit. The API sends them as
 * `plans`, sorted day, week, month. The server prices every booking; this file
 * only says plans in words: the smallest one for a card, what a plan works out
 * to a day, and the shortest booking a listing allows.
 */
import { formatCurrency } from "./format";
import { pluralize } from "./pluralize";

export type PlanUnit = "day" | "week" | "month";

export interface Plan {
  unit: PlanUnit;
  /** One unit's price, rupees as a string: "2500.00". */
  price: string;
  /** The minimum rental, in this plan's unit. */
  min: number;
}

export const UNITS: PlanUnit[] = ["day", "week", "month"];
export const UNIT_DAYS: Record<PlanUnit, number> = { day: 1, week: 7, month: 30 };
export const UNIT_WORDS: Record<PlanUnit, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

/** The listing's plans; a day plan at `rate` for a product from a server before ENG-281. */
export function plansOf(product: { plans?: Plan[] | null; rate?: string | number | null }): Plan[] {
  if (product.plans && product.plans.length > 0) return sortPlans(product.plans);
  const rate = Number(product.rate);
  if (product.rate == null || String(product.rate).trim() === "" || !Number.isFinite(rate) || rate <= 0) return [];
  return [{ unit: "day", price: String(product.rate), min: 1 }];
}

export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => UNITS.indexOf(a.unit) - UNITS.indexOf(b.unit));
}

/** The plan with the smallest unit: the price a card and the price line show. */
export function smallestPlan(plans: Plan[]): Plan | null {
  return sortPlans(plans)[0] ?? null;
}

/** What one day of `plan` costs, to the paisa. */
export function perDay(plan: Plan): number {
  return Math.round((Number(plan.price) / UNIT_DAYS[plan.unit]) * 100) / 100;
}

/** The shortest booking any plan allows, in days. */
export function minDays(plans: Plan[]): number {
  if (plans.length === 0) return 1;
  return Math.min(...plans.map((p) => p.min * UNIT_DAYS[p.unit]));
}

/** The shortest minimum as a customer reads it: "3 days", "1 week", "6 months". */
export function minimumWords(plans: Plan[]): string {
  const plan = [...plans].sort((a, b) => a.min * UNIT_DAYS[a.unit] - b.min * UNIT_DAYS[b.unit])[0];
  return plan ? pluralize(plan.min, plan.unit) : pluralize(1, "day");
}

/** "Minimum rental · 3 days", or null when any day can be booked on its own. */
export function minimumLine(plans: Plan[]): string | null {
  return minDays(plans) > 1 ? `Minimum rental · ${minimumWords(plans)}` : null;
}

/**
 * ENG-282: a month plan whose minimum is 2 months or more is billed a month at a time, and ending inside the minimum
 * costs one more month's rent as notice. Null for any other listing.
 */
export function noticeWords(plans: Plan[]): string | null {
  const month = plans.find((p) => p.unit === "month");
  return month && month.min >= 2 ? "Ending early costs one month's rent" : null;
}

/** "₹610 per day", "₹1,800 per month": a card's price. */
export function perUnitLabel(plan: Plan): string {
  return `${formatCurrency(plan.price)} per ${plan.unit}`;
}

/** "₹610 a day", "₹1,800 a month": the product page and the share text. */
export function aUnitLabel(plan: Plan): string {
  return `${formatCurrency(plan.price)} a ${plan.unit}`;
}

/** The card price of a product: its smallest plan per unit, or null with no price yet. */
export function priceLabel(product: { plans?: Plan[] | null; rate?: string | number | null }): string | null {
  const plan = smallestPlan(plansOf(product));
  return plan ? perUnitLabel(plan) : null;
}

/** "Works out to ₹357 a day", for a week or month plan. */
export function worksOutLine(plan: Plan): string | null {
  if (plan.unit === "day" || !(Number(plan.price) > 0)) return null;
  return `Works out to ${formatCurrency(Math.round(perDay(plan)))} a day`;
}

// ---- Plans as a shop types them (create and edit listing) ------------------

/** A plan on the listing form: `price` is the text in the box. */
export interface DraftPlan {
  unit: PlanUnit;
  price: string;
  min: number;
}

/** The longest minimum rental of each unit: a year. */
export const MAX_MIN: Record<PlanUnit, number> = { day: 365, week: 52, month: 12 };

const PRICE = /^\d+(\.\d{1,2})?$/;

function priceOk(price: string) {
  const trimmed = price.trim();
  return PRICE.test(trimmed) && Number(trimmed) > 0;
}

/** The units picked with no price typed yet: what the form asks for. */
export function missingPrices(drafts: DraftPlan[] | null | undefined): PlanUnit[] {
  return (drafts ?? []).filter((d) => !priceOk(d.price)).map((d) => d.unit);
}

/** What the API is sent, or null while a picked plan has no price (or none is picked). */
export function toPlans(drafts: DraftPlan[] | null | undefined): Plan[] | null {
  if (!drafts || drafts.length === 0 || missingPrices(drafts).length > 0) return null;
  return sortPlans(drafts.map((d) => ({ unit: d.unit, price: d.price.trim(), min: d.min })));
}

/** A listing's plans back on the form: "2500.00" is typed as "2500". */
export function draftsOf(plans: Plan[]): DraftPlan[] {
  return sortPlans(plans).map((p) => ({ unit: p.unit, price: String(Number(p.price)), min: p.min }));
}

/** The price a day the server keeps as `rate`: the day price, or else the lowest price a day. */
export function derivedRate(plans: Plan[] | null): number | null {
  if (!plans || plans.length === 0) return null;
  const day = plans.find((p) => p.unit === "day");
  return day ? Number(day.price) : Math.min(...plans.map(perDay));
}

/** The plan a new listing starts with: furniture is rented by the month, everything else by the day. */
export function defaultUnit(parentSlug?: string | null): PlanUnit {
  return parentSlug === "furniture" ? "month" : "day";
}
