/** The sign-in number (02b): the picked country, and the typed number turned into E.164 for Firebase phone auth. */

export type PhoneCountry = { cca2: string; callingCode: string };

export const INDIA: PhoneCountry = { cca2: "IN", callingCode: "91" };

/** The flag emoji of a two-letter country code (the picker's own flag needs its image set loaded). */
export const flagOf = (cca2: string) =>
  String.fromCodePoint(...cca2.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/**
 * The number as Firebase phone auth wants it (E.164), or null when it cannot be one. Spaces, dashes and a leading 0
 * (how many people write an Indian mobile) are dropped. A number that already carries its country code, as autofill
 * and pasting often give it ("+91 98123 45678", or "919812345678" with India picked), is taken as it is rather than
 * getting the code twice. An Indian number must have its 10 digits.
 */
export function toE164(country: PhoneCountry, typed: string): string | null {
  const raw = typed.trim();
  let e164: string;
  if (raw.startsWith("+")) {
    e164 = `+${raw.replace(/\D/g, "")}`;
  } else {
    let digits = raw.replace(/\D/g, "").replace(/^0+/, "");
    if (country.cca2 === "IN" && digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    e164 = `+${country.callingCode}${digits}`;
  }
  if (e164.startsWith("+91") && e164.length !== 13) return null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

/** "+91 98123 45678" for an Indian mobile, the E.164 string as it is for any other. */
export function formatPhone(e164: string): string {
  const india = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return india ? `+91 ${india[1]} ${india[2]}` : e164;
}
