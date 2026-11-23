import type { BuyerGstin } from "@/lib/business";
import type { SavedAddress } from "@/lib/addresses";
import type { MyDetailsResponse } from "@/lib/my-details";
import type { KycStatusResponse } from "@/lib/types";
import type { UnlockState } from "@/lib/unlock";
import type { DevFixture } from "./registry";

// The customer the profile frames show (profile-signed-in · customer, 2095:25572): name and email as drawn, no photo
// (the avatar shows the initials). The phone is stored spaced, as the Personal details sheet shows it.
// `firebase_uid` is empty so chat's Firestore listeners stay off in the session.
const riya: MyDetailsResponse = {
  username: "riya_sharma",
  firebase_uid: "",
  email: "riya.sharma@gmail.com",
  first_name: "Riya",
  last_name: "Sharma",
  phone: "+91 98765 43210",
  country: "IN",
  image: null,
  addresses: [],
  business_name: null,
  account_type: "user",
  merchant_approval_status: null,
  coordinates: { lat: 12.9716, long: 77.5946 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};

/** Riya while verified: the Personal details sheet locks her name (2096:27788). */
export const riyaLocked: MyDetailsResponse = { ...riya, business_verified: true };

// The shop (2095:25822 / 26102): the avatar and title read `name` = first + last, so "Lens House" / "LH".
const lensHouse: MyDetailsResponse = {
  ...riya,
  username: "lens_house",
  email: "hello@lenshouse.in",
  first_name: "Lens",
  last_name: "House",
  business_name: "Lens House",
  account_type: "merchant",
  merchant_approval_status: "pending",
};

const kyc = (over: Partial<KycStatusResponse>): KycStatusResponse => ({
  kyc_status: "none",
  case_ref: null,
  business_verified: false,
  business_verified_at: null,
  reason_code: null,
  next_action: null,
  updated_at: null,
  ...over,
});

const profile = { route: "MainTabs", params: { screen: "Profile" } } as const;

// Plan safety rule 3: from Profile the pencil reaches the email and phone pencils, and UnlockSheet sends a real
// Firebase SMS as soon as it opens. Answered unlocked, `unlockNext` carries on and the sheet never opens.
const unlocked: UnlockState = {
  unlocked: true,
  unlocked_until: "2099-01-01T00:00:00Z",
  phone_masked: "+91 ••••• ••210",
  minutes: 30,
};
const UNLOCK = { "GET /access/unlock/": unlocked };

// Pending approval, nothing on file: "Get a Verified business badge" / "Verify my business".
const shopPending: DevFixture = {
  ...profile,
  responses: { ...UNLOCK, "GET /kyc/merchant/status/": kyc({}) },
  session: { user: lensHouse },
};

// Saved addresses (2097:28843). `addressLine()` builds "locality · flat, landmark", so the frame's whole line sits in
// `locality` with empty lines to draw the frame's text exactly.
const address = (id: number, locality: string, over: Partial<SavedAddress>): SavedAddress => ({
  id,
  address: "",
  address_line_1: "",
  address_line_2: "",
  locality,
  address_type: "other",
  label: "",
  coordinates: { lat: 12.9716, long: 77.5946 },
  is_default: false,
  postal_code: "",
  ...over,
});
const HOME = address(1, "Flat 1203, Tower B, Prestige Shantiniketan, Whitefield, Bengaluru 560048", {
  address_type: "home",
  is_default: true,
  coordinates: { lat: 12.9698, long: 77.75 },
  postal_code: "560048",
});
const WORK = address(2, "3rd Floor, 91springboard, Koramangala 5th Block, Bengaluru 560095", {
  address_type: "work",
  coordinates: { lat: 12.9352, long: 77.6245 },
  postal_code: "560095",
});
const MOMS_PLACE = address(3, "22, 6th Main, Indiranagar, Bengaluru 560038", {
  label: "Mom's place",
  coordinates: { lat: 12.9784, long: 77.6408 },
  postal_code: "560038",
});
const ADDRESSES = { "GET /my/addresses/": [HOME, WORK, MOMS_PLACE] };

// Business billing (2097:29036): the saved GSTIN row.
const GSTIN: BuyerGstin = {
  gstin: "29ABCDE1234F1Z5",
  legal_name: "Sharma Event Rentals Private Limited",
  trade_name: "Sharma Event Rentals",
  address: "No. 14, 2nd Floor, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
  pincode: "560038",
  state_code: "29",
  state: "Karnataka",
  checked_at: "2026-11-01T10:00:00Z",
};
const billing = (bills_to_business: boolean, responses: Record<string, unknown>): DevFixture => ({
  route: "BusinessBilling",
  responses,
  session: { user: { ...riya, billing_as_business: true, bills_to_business } },
});

// Over Profile: the tester taps the pencil, then a sheet's control. Never Verify, Delete, Save or a picture tile.
const overProfile: DevFixture = { ...profile, responses: UNLOCK, session: { user: riya } };

/** Design fixtures for Figma section 13, keyed by frame id (registry.ts). */
export const fixtures: Record<string, DevFixture> = {
  // Customer: no KYC read is listed, so the session 404s it and the card stays hidden.
  "2095:25572": { ...profile, responses: UNLOCK, session: { user: riya } },
  "2095:25349": { ...profile, responses: UNLOCK, session: { user: riya } },
  // Then tap the Appearance row; the device theme must be "system".
  "2096:28163": { ...profile, responses: UNLOCK, session: { user: riya } },
  "2095:25822": shopPending,
  "2097:30662": shopPending,
  // Not approved, and the verification rejected: the reason's first sentence and "Try again".
  "2095:26102": {
    ...profile,
    responses: {
      ...UNLOCK,
      "GET /kyc/merchant/status/": kyc({
        kyc_status: "rejected",
        case_ref: "kyc_design_26102",
        reason_code: "gstin_name_mismatch",
      }),
    },
    session: { user: { ...lensHouse, merchant_approval_status: "rejected" } },
  },
  // Guest: no session, so the precondition is a signed-out device (a fixture can't sign one out).
  "2095:25130": { ...profile, responses: {} },
  "2095:24982": { ...profile, responses: {} },
  // Group 2: the sheets over Profile. 27788 is verified, so the name is locked.
  "2096:27684": overProfile,
  "2096:27788": { ...overProfile, session: { user: riyaLocked } },
  "2096:28005": overProfile,
  "2096:28081": overProfile,
  "2096:30599": overProfile,
  "2096:30773": overProfile,
  "2096:31063": overProfile,
  // Delete address on AddressDetails: Home is the default, and the newest left (highest id) takes over, so Work gets
  // the top id to read "Your default will move to Work." No DELETE key is listed (plan rule 4).
  "2097:28985": {
    route: "AddressDetails",
    params: { address: HOME },
    responses: { "GET /my/addresses/": [HOME, MOMS_PLACE, { ...WORK, id: 4 }] },
    session: { user: riya },
  },
  // Group 3: saved addresses and business billing. 28950 lists nothing, so the session 404s the read.
  "2097:28843": { route: "SavedAddresses", responses: ADDRESSES, session: { user: riya } },
  "2097:28908": { route: "SavedAddresses", responses: { "GET /my/addresses/": [] }, session: { user: riya } },
  "2097:28950": { route: "SavedAddresses", responses: {}, session: { user: riya } },
  "2097:29036": billing(true, { "GET /business/gstin/": GSTIN }),
  // Then type the GSTIN and blur the field; never tap Check GSTIN.
  "2097:29097": billing(true, { "GET /business/gstin/": "" }),
  "2097:29139": billing(false, {}),
};
