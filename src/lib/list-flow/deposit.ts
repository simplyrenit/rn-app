import { DepositRule, WireDepositRule } from "./types";

/**
 * The rule used when the server has none for a category, or none has loaded
 * yet. Mirrors the backend's `DEPOSIT_DEFAULT_MULTIPLIER` / `_FLOOR` settings
 * and the seeded rows (§5.4), so a slow rules request cannot show a different
 * default from the one the server would have sent.
 */
export const DEFAULT_DEPOSIT_RULE: DepositRule = {
  multiplier: 5,
  floor: 500,
  round_to: 50,
};

/** The API sends decimals as strings ("5.00"); anything unparseable is dropped. */
export function parseDepositRule(
  wire: WireDepositRule | null | undefined
): DepositRule | null {
  if (!wire) return null;
  const multiplier = Number(wire.multiplier);
  const floor = Number(wire.floor);
  const roundTo = Number(wire.round_to);
  if (!Number.isFinite(multiplier) || !Number.isFinite(floor)) return null;
  return {
    parent: wire.parent,
    multiplier,
    floor,
    round_to: Number.isFinite(roundTo) && roundTo > 0 ? roundTo : 50,
  };
}

/** A positive daily rate, or null while the price field is empty or invalid. */
export function parseRate(rate: string | null | undefined): number | null {
  if (rate === null || rate === undefined) return null;
  const trimmed = String(rate).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
}

/**
 * deposit = max(floor, ceil(k × rate / round_to) × round_to)  — §5.4.
 *
 * The epsilon keeps a float artefact (5 × 0.1 × 10 = 5.000000000000001) from
 * rounding a whole step up; money that is already on a step stays on it.
 */
export function computeDepositDefault(
  rate: number | null,
  rule: DepositRule | null = DEFAULT_DEPOSIT_RULE
): number | null {
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return null;
  const { multiplier, floor, round_to } = rule ?? DEFAULT_DEPOSIT_RULE;
  const step = round_to > 0 ? round_to : 1;
  const steps = Math.ceil((multiplier * rate) / step - 1e-9);
  return Math.max(floor, steps * step);
}
