/**
 * Merchant verification: the copy for every state, the field rules, and how a KYC error is
 * read (ENG-12). No network and no React here, so all of it is unit-tested.
 *
 * The PAN and GSTIN live only in the details screen's state. Nothing in this module stores,
 * logs or returns one beyond the value it was handed.
 */
import type { KycErrorCode, KycReasonCode, KycStatus, KycStatusResponse } from "@/lib/types";

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** What the PAN and GSTIN inputs keep of what was typed. */
export const cleanId = (text: string, length: number) =>
  text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, length);

/** A GSTIN carries its holder's PAN in characters 3 to 12. A mismatch is a warning, never a block. */
export const gstinMatchesPan = (gstin: string, pan: string) => gstin.slice(2, 12) === pan;

/** The 4th PAN character is P for a person; anything else is a company, firm, trust and so on. */
export const isBusinessPan = (pan: string) => PAN_PATTERN.test(pan) && pan[3] !== "P";

export type KycTone = "brand" | "info" | "warning";
export type KycIcon = "shield" | "shield-solid" | "clock" | "identification" | "exclamation";
export type KycCta = "start" | "resume" | "profile" | "support";

export interface KycStateCopy {
  cardTitle: string;
  cardBody: string;
  title: string;
  body: string;
  /** The primary button's label, when the state has one. */
  cta: string | null;
  /** What the primary button does; it follows `next_action` from the server. */
  ctaKind: KycCta | null;
  /** A quieter second action offered with this state. */
  secondary: "start_over" | "support" | null;
  icon: KycIcon;
  tone: KycTone;
}

const REJECTED: Record<string, string> = {
  pan_invalid: "We couldn't verify the PAN you entered. Check the number and try again.",
  pan_name_mismatch:
    "The name on your PAN didn't match the name on your Renit account. Use a PAN in your own name or your business's name, then try again.",
  gstin_inactive:
    "Your GSTIN shows as inactive in the GST records. Once it's active again you can try again. If your business isn't registered for GST, you can verify without it.",
  gstin_name_mismatch:
    "The name on your GSTIN didn't match the name on your PAN. Check both and try again.",
  aadhaar_signature_invalid:
    "We couldn't read your details from DigiLocker this time. Please try again.",
  aadhaar_name_mismatch:
    "The name on your Aadhaar didn't match your PAN. Check that both are yours and try again.",
  duplicate_identity:
    "We couldn't complete your verification online. Please contact support and we'll help you sort it out.",
  business_name_unverifiable:
    "We couldn't match your business name to your documents. Check that the business name on your account matches your GST or PAN records, then try again.",
  other:
    "We couldn't complete your verification this time. You can try again, or contact support and we'll help.",
};

const firstSentence = (text: string) => text.slice(0, text.indexOf(".") + 1) || text;

/**
 * Title, body, button and tone for a status. The profile card and the status screen both read
 * this, so they cannot disagree. A reason code the app does not know reads as `other` (when
 * rejected) or as the plain start state (when there is no case), so a server that adds a code
 * never produces a blank screen.
 */
export function kycStateCopy(
  status: KycStatus,
  reason: KycReasonCode | string | null | undefined
): KycStateCopy {
  switch (status) {
    case "pending":
      return {
        cardTitle: "Checking your details",
        cardBody: "This usually takes a minute.",
        title: "Checking your details",
        body: "We're checking your details with our verification partner. You can close this screen.",
        cta: null,
        ctaKind: null,
        secondary: null,
        icon: "clock",
        tone: "info",
      };
    case "action_required":
      return {
        cardTitle: "Finish verifying with DigiLocker",
        cardBody: "One more step: confirm your Aadhaar with DigiLocker.",
        title: "Finish verifying with DigiLocker",
        body: "You started verifying your business but haven't finished the DigiLocker step. It takes a couple of minutes.",
        cta: "Continue verification",
        ctaKind: "resume",
        secondary: "start_over",
        icon: "identification",
        tone: "warning",
      };
    case "in_review":
      return {
        cardTitle: "Under review",
        cardBody: "Our team is reviewing your details. We'll notify you.",
        title: "Under review",
        body: "Our team is reviewing your details. We'll send a notification when it's done. You can also check here any time.",
        cta: null,
        ctaKind: null,
        secondary: null,
        icon: "clock",
        tone: "info",
      };
    case "verified":
      return {
        cardTitle: "Verified business",
        cardBody: "Your badge shows on your profile and listings.",
        title: "You're a Verified business",
        body: 'Renters now see the Verified business badge on your profile and your listings. Need to change your PAN or GSTIN? Use "Remove my verification data" below, then verify again. Your badge stays off until the new check is approved.',
        cta: "See my public profile",
        ctaKind: "profile",
        secondary: null,
        icon: "shield-solid",
        tone: "brand",
      };
    case "rejected": {
      const code = reason && reason in REJECTED ? reason : "other";
      const body = REJECTED[code];
      // Retrying cannot help a duplicate, and the copy must not say why.
      const support = code === "duplicate_identity";
      return {
        cardTitle: "We couldn't verify your business",
        cardBody: firstSentence(body),
        title: "We couldn't verify your business",
        body,
        cta: support ? "Contact support" : "Try again",
        ctaKind: support ? "support" : "start",
        secondary: null,
        icon: "exclamation",
        tone: "warning",
      };
    }
    default:
      if (reason === "case_expired") {
        const body =
          "The DigiLocker step wasn't finished in time, so we closed it. Start again whenever you're ready.";
        return {
          cardTitle: "Your verification timed out",
          cardBody: body,
          title: "Your verification timed out",
          body,
          cta: "Start again",
          ctaKind: "start",
          secondary: "support",
          icon: "exclamation",
          tone: "warning",
        };
      }
      return {
        cardTitle: "Get a Verified business badge",
        cardBody: "Show renters your business is real. It takes a few minutes.",
        title: "Verify your business",
        body: "Earn a Verified business badge. It shows on your profile and listings.",
        cta: "Verify my business",
        ctaKind: "start",
        secondary: null,
        icon: "shield",
        tone: "brand",
      };
  }
}

/** Anything on file that "Remove my verification data" would remove. */
export const hasVerificationData = (status: KycStatusResponse) =>
  status.case_ref !== null || status.kyc_status !== "none" || status.business_verified;

export interface KycError {
  /** HTTP status, or 0 when there was no response at all. */
  status: number;
  code: KycErrorCode | null;
  details: Record<string, unknown> | null;
}

/**
 * Reads `{"error": {"code", "details"}}` off a failed KYC call. The server's `message` is for
 * developers and is never shown, so it is not returned.
 */
export function kycError(error: unknown): KycError {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | null)?.response;
  const status = typeof response?.status === "number" ? response.status : 0;
  const body = (response?.data as { error?: unknown } | undefined)?.error;
  if (!body || typeof body !== "object") return { status, code: null, details: null };
  const { code, details } = body as { code?: unknown; details?: unknown };
  return {
    status,
    code: typeof code === "string" && code ? (code as KycErrorCode) : null,
    details: details && typeof details === "object" ? (details as Record<string, unknown>) : null,
  };
}

/**
 * `validation_error` names fields by path ("inputs.gstin"); the form knows them by their last
 * segment. Returns the server's reason per form field, and whether a key matched none.
 */
export function fieldErrors(details: Record<string, unknown> | null) {
  const out: { pan?: string; gstin?: string; consent?: boolean; other: boolean } = { other: false };
  const fields = details?.fields;
  if (!fields || typeof fields !== "object") return { ...out, other: true };
  for (const path of Object.keys(fields)) {
    const name = path.split(".").pop();
    if (name === "pan") out.pan = "Enter a valid 10-character PAN, like ABCDE1234F.";
    else if (name === "gstin") out.gstin = "Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5.";
    else if (name === "consent_version") out.consent = true;
    else out.other = true;
  }
  return out;
}

/** The body of the "Too many attempts" state, from `retry_limit` details. */
export function retryLimitBody(details: Record<string, unknown> | null) {
  const at = typeof details?.retry_at === "string" ? new Date(details.retry_at) : null;
  const { max_cases: max, window_days: days } = details ?? {};
  if (!at || Number.isNaN(at.getTime()) || typeof max !== "number" || typeof days !== "number") {
    return "You've reached the limit for verifications. Please try again later.";
  }
  const date = at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `You've sent ${max} verifications for review in the last ${days} days, which is the limit. You can try again on ${date}.`;
}

/**
 * What the return link claims happened. The page that sends it is unauthenticated, so this is
 * for analytics only: nothing is shown or decided from it.
 */
export function parseKycReturn(url: string): { result: "success" | "cancelled" | "failed" | "unknown" } {
  const claimed = /[?&]result=([a-z]+)/.exec(url)?.[1];
  return {
    result: claimed === "success" || claimed === "cancelled" || claimed === "failed" ? claimed : "unknown",
  };
}
