/**
 * `403 publish_locked` (API-CONTRACT, `POST /api/my/products/`): a merchant who may
 * not publish yet. `details.missing` names what is in the way, any of
 * `owner_terms`, `shop_approval`, `shop_address`, `id_check`, `bank_account`.
 */

const WHAT: Record<string, string> = {
  owner_terms: "the owner terms",
  shop_approval: "Renit's approval of your shop",
  shop_address: "your shop's address",
  id_check: "your ID check",
  bank_account: "a verified bank account",
};

/** The `missing` list out of the error's details, whatever else it holds. */
export function lockedItems(details: Record<string, unknown> | null | undefined): string[] {
  const list = details?.missing;
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
}

/** True when the tick is the (or one of the) things in the way: the owner can fix that here. */
export function needsOwnerTerms(items: string[]): boolean {
  return items.includes("owner_terms");
}

/** "Still needed: your ID check and a verified bank account." Unknown items are left out. */
export function publishLockedMessage(items: string[]): string {
  const named = items.map((item) => WHAT[item]).filter(Boolean);
  if (named.length === 0) return "You can't publish yet.";
  const list =
    named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
  return `Still needed: ${list}.`;
}
