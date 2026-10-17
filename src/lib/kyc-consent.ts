/**
 * The consent texts a merchant agrees to before verification (ENG-12).
 *
 * rn-api holds the canonical text for each version (`src/kyc/consent/<version>.txt`); each
 * entry here is a verbatim copy of that file. Never retype or reflow one: to change the
 * wording, add a new version to rn-api first, copy its file here, and make it the newest key.
 * The app sends only the version string with `start/`. Older versions stay so a build can
 * tell whether it has something newer than the one the server just refused.
 *
 * Bracketed placeholders in a text are not finished copy: they block a production release.
 */
export const KYC_CONSENT_TEXTS: Record<string, string> = {
  "kyc-merchant-2026-10": `What we collect
Your PAN. Your GSTIN, if you tell us you're registered for GST. Your Aadhaar details from DigiLocker when you approve sharing; what DigiLocker shares can include your name, date of birth, gender, address and photo. We read them once to check them and keep only the few details listed below. We don't ask for photos or selfies.

Why
To check that you and your business are who you say you are, so we can show a Verified business badge. We don't use this information for anything else.

Who handles it
[VERIFICATION PARTNER NAME] checks your PAN and GSTIN and connects you to DigiLocker for us. They handle your details under their own privacy policy: [LINK]. A member of the Renit team reviews each case before it's approved, and can see your name, your PAN's last 4 digits and the few Aadhaar details listed below.

How long we keep it
From your Aadhaar we keep only a few details: your name, year of birth, state, pincode and the last 4 digits of your Aadhaar number. We keep them for up to 180 days after we decide, then delete them. We never keep a copy of your Aadhaar itself. We don't store your full PAN or GSTIN: we keep the last 4 digits and a scrambled code that helps us spot duplicates. We keep the result of your verification for as long as you have a Renit account.

Your choices
Verification is optional. You can remove your verification data any time from Business verification, without deleting your account, and you can delete your Renit account from Profile, Personal details. Copies in our backups are cleared within 30 days after the 180 days. Questions about your data: support@simplyrenit.com.

Version: kyc-merchant-2026-10`,
};

/** The newest key of KYC_CONSENT_TEXTS: what `start/` is sent. */
export const KYC_CONSENT_VERSION = "kyc-merchant-2026-10";

export interface ConsentSection {
  heading: string;
  body: string;
}

/**
 * A text is sections separated by a blank line: a heading line, then its text. The closing
 * "Version: ..." line is not a section; the screen shows the version itself.
 */
export function consentSections(version: string): ConsentSection[] {
  const text = KYC_CONSENT_TEXTS[version] ?? "";
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith("Version:"))
    .map((block) => {
      const [heading, ...rest] = block.split("\n");
      return { heading: heading.trim(), body: rest.join(" ").trim() };
    });
}
