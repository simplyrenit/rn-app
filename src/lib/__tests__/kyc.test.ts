import { describe, expect, it } from "@jest/globals";
import {
  cleanId,
  fieldErrors,
  GSTIN_PATTERN,
  gstinMatchesPan,
  hasVerificationData,
  isBusinessPan,
  kycError,
  kycStateCopy,
  PAN_PATTERN,
  parseKycReturn,
  retryLimitBody,
  sessionClaim,
} from "@/lib/kyc";
import { consentSections, KYC_CONSENT_TEXTS, KYC_CONSENT_VERSION } from "@/lib/kyc-consent";
import type { KycStatus, KycStatusResponse } from "@/lib/types";

// Synthetic identities only: the PAN's digits are the 0000 block.
const PAN = "ABCPE0000F";
const GSTIN = "27ABCPE0000F1Z5";

const status = (over: Partial<KycStatusResponse> = {}): KycStatusResponse => ({
  kyc_status: "none",
  case_ref: null,
  business_verified: false,
  business_verified_at: null,
  reason_code: null,
  next_action: { type: "start" },
  updated_at: null,
  ...over,
});

describe("PAN and GSTIN fields", () => {
  it("keeps only letters and digits, upper-cased, up to the length", () => {
    expect(cleanId(" abcpe-0000 f!", 10)).toBe(PAN);
    expect(cleanId("27abcpe0000f1z5extra", 15)).toBe(GSTIN);
  });

  it("accepts a well-formed PAN and GSTIN and nothing else", () => {
    expect(PAN_PATTERN.test(PAN)).toBe(true);
    expect(GSTIN_PATTERN.test(GSTIN)).toBe(true);
    for (const bad of ["ABCPE0000", "ABCPE00000", "1BCPE0000F", "abcpe0000f"]) {
      expect(PAN_PATTERN.test(bad)).toBe(false);
    }
    for (const bad of ["27ABCPE0000F1Z", "AAABCPE0000F1Z5", "27ABCPE0000F0Z5", "27ABCPE0000F1A5"]) {
      expect(GSTIN_PATTERN.test(bad)).toBe(false);
    }
  });

  it("spots a GSTIN that belongs to another PAN, and a business PAN", () => {
    expect(gstinMatchesPan(GSTIN, PAN)).toBe(true);
    expect(gstinMatchesPan("27ABCPE0001F1Z5", PAN)).toBe(false);
    expect(isBusinessPan(PAN)).toBe(false); // 4th character P: a person
    expect(isBusinessPan("ABCCE0000F")).toBe(true); // C: a company
    expect(isBusinessPan("ABCC")).toBe(false); // not a PAN yet
  });
});

describe("state copy", () => {
  it("has a title, a body and a tone for every status", () => {
    const all: KycStatus[] = ["none", "pending", "action_required", "in_review", "verified", "rejected"];
    for (const kycStatus of all) {
      const copy = kycStateCopy(kycStatus, null);
      for (const text of [copy.cardTitle, copy.cardBody, copy.title, copy.body]) {
        expect(text.length).toBeGreaterThan(0);
      }
      expect(["brand", "info", "warning"]).toContain(copy.tone);
    }
  });

  it("offers a button only where the merchant can act", () => {
    expect(kycStateCopy("none", null).ctaKind).toBe("start");
    expect(kycStateCopy("action_required", null)).toMatchObject({ ctaKind: "resume", secondary: "start_over" });
    expect(kycStateCopy("pending", null).cta).toBeNull();
    // No "start over" while a reviewer may be looking at the case.
    expect(kycStateCopy("in_review", null)).toMatchObject({ cta: null, secondary: null });
    expect(kycStateCopy("verified", null).ctaKind).toBe("profile");
  });

  it("explains a rejection by reason, and reads an unknown reason as 'other'", () => {
    const mismatch = kycStateCopy("rejected", "pan_name_mismatch");
    expect(mismatch.body).toContain("name on your PAN");
    expect(mismatch.cardBody).toBe("The name on your PAN didn't match the name on your Renit account.");
    expect(mismatch.cta).toBe("Try again");
    const other = kycStateCopy("rejected", "other");
    expect(kycStateCopy("rejected", "a_code_from_the_future")).toEqual(other);
    expect(kycStateCopy("rejected", null)).toEqual(other);
  });

  it("sends a duplicate to support without saying why", () => {
    const copy = kycStateCopy("rejected", "duplicate_identity");
    expect(copy).toMatchObject({ cta: "Contact support", ctaKind: "support" });
    expect(copy.body.toLowerCase()).not.toMatch(/duplicate|another account|already/);
  });

  it("says a timed-out case timed out, and treats any other reason on 'none' as a fresh start", () => {
    expect(kycStateCopy("none", "case_expired")).toMatchObject({
      title: "Your verification timed out",
      cta: "Start again",
      tone: "warning",
    });
    expect(kycStateCopy("none", "gstin_inactive")).toEqual(kycStateCopy("none", null));
  });

  it("never promises how long review takes", () => {
    const copy = kycStateCopy("in_review", null);
    expect(`${copy.cardBody} ${copy.body}`).not.toMatch(/hour|day|minute/i);
  });

  it("offers removal only when there is something on file", () => {
    expect(hasVerificationData(status())).toBe(false);
    expect(hasVerificationData(status({ kyc_status: "rejected" }))).toBe(true);
    expect(hasVerificationData(status({ case_ref: "kyc_X" }))).toBe(true);
    expect(hasVerificationData(status({ business_verified: true }))).toBe(true);
  });
});

describe("errors", () => {
  const failed = (httpStatus: number, error: unknown) => ({ response: { status: httpStatus, data: { error } } });

  it("reads the code and details, never the message", () => {
    const read = kycError(failed(409, { code: "case_in_progress", message: "internal", details: { kyc_status: "in_review" } }));
    expect(read).toEqual({ status: 409, code: "case_in_progress", details: { kyc_status: "in_review" } });
    expect(JSON.stringify(read)).not.toContain("internal");
  });

  it("copes with no response, and with a body that is not the envelope", () => {
    expect(kycError(new Error("Network Error"))).toEqual({ status: 0, code: null, details: null });
    expect(kycError({ response: { status: 404, data: "<html>" } })).toEqual({ status: 404, code: null, details: null });
    expect(kycError({ response: { status: 401, data: { detail: "Token expired" } } }).code).toBeNull();
    expect(kycError(null).status).toBe(0);
  });

  it("matches validation errors to form fields by their last path segment", () => {
    expect(fieldErrors({ fields: { "inputs.gstin": "x", pan: "y" } })).toMatchObject({ other: false });
    expect(fieldErrors({ fields: { "inputs.gstin": "x" } }).gstin).toBeDefined();
    expect(fieldErrors({ fields: { consent_version: "unknown" } }).consent).toBe(true);
    expect(fieldErrors({ fields: { supersede: "x" } }).other).toBe(true);
    expect(fieldErrors(null).other).toBe(true);
  });

  it("builds the retry-limit message from the details, with a fallback", () => {
    const body = retryLimitBody({ max_cases: 3, window_days: 30, retry_at: "2026-10-20T00:00:00Z" });
    expect(body).toContain("3 verifications");
    expect(body).toContain("30 days");
    expect(retryLimitBody(null)).toBe("You've reached the limit for verifications. Please try again later.");
    expect(retryLimitBody({ max_cases: 3, window_days: 30, retry_at: "soon" })).toContain("reached the limit");
  });
});

describe("the return link", () => {
  it("reads the claimed result and nothing else", () => {
    expect(parseKycReturn("renit://kyc/return?case_ref=kyc_X&result=success")).toEqual({ result: "success" });
    expect(parseKycReturn("renit://kyc/return?result=cancelled")).toEqual({ result: "cancelled" });
    expect(parseKycReturn("renit://kyc/return?result=verified")).toEqual({ result: "unknown" });
    expect(parseKycReturn("renit://kyc/return")).toEqual({ result: "unknown" });
  });

  it("names how a DigiLocker session ended, for analytics only", () => {
    expect(sessionClaim({ type: "success", url: "renit://kyc/return?result=failed" })).toBe("failed");
    expect(sessionClaim({ type: "success", url: "renit://kyc/return" })).toBe("unknown");
    expect(sessionClaim({ type: "cancel" })).toBe("cancelled");
    expect(sessionClaim({ type: "dismiss" })).toBe("dismissed");
    expect(sessionClaim({ type: "locked" })).toBe("locked");
  });
});

describe("consent text", () => {
  it("bundles a text for the version the app sends, in five sections", () => {
    expect(KYC_CONSENT_TEXTS[KYC_CONSENT_VERSION]).toContain(`Version: ${KYC_CONSENT_VERSION}`);
    const sections = consentSections(KYC_CONSENT_VERSION);
    expect(sections.map((section) => section.heading)).toEqual([
      "What we collect",
      "Why",
      "Who handles it",
      "How long we keep it",
      "Your choices",
    ]);
    for (const section of sections) expect(section.body.length).toBeGreaterThan(20);
    expect(consentSections("kyc-merchant-1999-01")).toEqual([]);
  });
});
