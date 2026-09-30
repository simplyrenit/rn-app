import { ProductSpec } from "@/lib/types";

/**
 * The product page's specs (ENG-35). Values are shown exactly as stored — a
 * range stays a range ("1.1 – 1.5 Ton"); the page never narrows one to an
 * exact value the listing does not have.
 */

/** A spec's value as one line: a multi-value spec lists its values. */
export function specValueText(value: ProductSpec["value"]): string {
  return valuesOf(value).join(", ");
}

/**
 * A spec's values as strings. The type says strings, but a stored value is
 * JSON: a number or boolean that slipped past the server must not crash the
 * page (`.toLowerCase` of 5) or silently fail to match.
 */
function valuesOf(value: ProductSpec["value"]): string[] {
  return (Array.isArray(value) ? value : [value]).map(String);
}

/**
 * Tokens only, lower case, so "1.5-Ton", "1.5ton" and "1.5 ton" compare equal,
 * and "12,000" is the number 12000 on both sides. A hyphenated word stays one
 * token, so "Non-AC" is not the word "AC" and "USB-C" is not "USB".
 */
function normalise(text: string): string {
  return (
    String(text)
      .toLowerCase()
      .replace(/(\d),(?=\d)/g, "$1")
      .match(/\d+(?:\.\d+)?|[a-z]+(?:-[a-z]+)*/g)
      ?.join(" ") ?? ""
  );
}

/** "1.1 – 1.5 Ton", "120-200 sq ft": two numbers joined by a dash. */
const RANGE = /\d\s*[-–—]\s*\d/;

/**
 * Whether the title already says this value.
 *
 * Whole tokens, so "AC" is not found inside "Black" or "Non-AC". A range
 * counts as stated when the title gives one of its ends followed by the whole
 * unit: "1.1 – 1.5 Ton" is stated by "Daikin 1.5 Ton …", and "120 – 200 sq ft"
 * is not stated by "200 sq m". A number inside the range is not — that would
 * be the page guessing the listing's exact value.
 */
function titleStates(title: string, value: string): boolean {
  const haystack = ` ${normalise(title)} `;
  const needle = normalise(value);
  if (!needle) return true;
  if (haystack.includes(` ${needle} `)) return true;
  if (!RANGE.test(value)) return false;

  const tokens = needle.split(" ");
  const isNumber = tokens.map((t) => /^\d/.test(t));
  const unit = tokens.slice(isNumber.lastIndexOf(true) + 1).join(" ");
  if (!unit) return false;
  return tokens
    .filter((_, i) => isNumber[i])
    .some((n) => haystack.includes(` ${n} ${unit} `));
}

/** At most this many facts under the title. */
const KEY_SPEC_LIMIT = 3;

/**
 * The line under the title: the main specs the title does not already state,
 * at most three, "·"-separated. Empty when the title covers them all, and the
 * page then shows no line at all — repeating the title under itself is noise.
 */
export function keySpecLine(title: string, specs: ProductSpec[]): string {
  return specs
    .filter((spec) => spec.facet === "default")
    .filter((spec) => !valuesOf(spec.value).every((v) => titleStates(title, v)))
    .slice(0, KEY_SPEC_LIMIT)
    .map((spec) => specValueText(spec.value))
    .join(" · ");
}

/**
 * Whether one of the renter's search filters picked this spec. Filter options
 * are the stored values themselves, so this is an exact comparison — the same
 * one the server made when it returned this listing for those filters.
 */
export function specMatchesFilters(
  spec: ProductSpec,
  filters: Record<string, string[]> | undefined
): boolean {
  const chosen = filters?.[spec.key];
  if (!chosen?.length) return false;
  return valuesOf(spec.value).some((v) => chosen.includes(v));
}
