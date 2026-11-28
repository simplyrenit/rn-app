/** A name a provider handed over at sign-in (Apple gives it only the first time the person allows the app). */
export type GivenName = { first?: string | null; last?: string | null };

type AccountName = { first_name?: string | null; last_name?: string | null };

/**
 * What a Google or Apple sign-in does about the account's name (ENG-463):
 * - `save`: the whole name to write now, from what the account has plus what the provider gave;
 * - `ask`: open the name step, prefilled with whatever is known.
 *
 * Only a whole name is ever saved. An account with a first name and no last name (or the reverse) is one rn-api's
 * sign-up refuses to finish (409 "Account already exists") while its code checks still treat it as unfinished, so
 * a later sign-in by email or phone code would dead-end. Half a name goes to the name step instead.
 */
export function nameAfterProvider(
  account: AccountName,
  given: GivenName
): { save: { first_name: string; last_name: string } | null; ask: { firstName: string; lastName: string } | null } {
  const first = (account.first_name ?? "").trim();
  const last = (account.last_name ?? "").trim();
  if (first && last) return { save: null, ask: null };
  const firstName = first || (given.first ?? "").trim();
  const lastName = last || (given.last ?? "").trim();
  if (firstName && lastName) return { save: { first_name: firstName, last_name: lastName }, ask: null };
  return { save: null, ask: { firstName, lastName } };
}
