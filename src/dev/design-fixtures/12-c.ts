import type { BankAccount } from "@/lib/bank";
import type { MyDetailsResponse } from "@/lib/my-details";
import type { Shop } from "@/lib/shop";
import type { UnlockState } from "@/lib/unlock";
import type { DevFixture } from "./registry";

// Section 12, group 3 (ENG-437 plan §2.6, §2.7): shop address and bank account. Every value is fake and comes from the
// frames. Every write these screens could send (confirm address, save/verify the account, unlock) gets the fixture's
// 409; the unlock read is answered unlocked so a stray tap never opens the code sheet, which sends a real Firebase SMS.
//
// ponytail: mumbaiGearHub, SHOP and UNLOCKED are local because 12-common.ts (plan §1, step 0) was not there when this
// was written; swap them for its exports once it lands.

const mumbaiGearHub: MyDetailsResponse = {
  username: "mumbai_gear_hub",
  // Empty, so chat's Firestore listeners stay off in the design session.
  firebase_uid: "",
  email: "hello@mumbaigearhub.in",
  first_name: "Mumbai Gear",
  last_name: "Hub",
  // A number, so the bank screen does not send the owner to add one first.
  phone: "+91 90000 04471",
  country: "IN",
  image: null,
  addresses: [],
  business_name: "Mumbai Gear Hub",
  account_type: "merchant",
  merchant_approval_status: "approved",
  coordinates: { lat: 19.06, long: 72.83 },
  timezone: "Asia/Kolkata",
  email_verified: true,
  phone_verified: true,
  business_verified: false,
  currency: "INR",
  bills_to_business: false,
  billing_as_business: false,
};
const session = { user: mumbaiGearHub };

const day = { open: "10:00", close: "20:00" };
const SHOP: Shop = {
  name: "Mumbai Gear Hub",
  address: "14, Hill Road, Bandra West, Mumbai 400050",
  locality: "Bandra West",
  coordinates: { lat: 19.06, long: 72.83 },
  address_confirmed: true,
  hours: { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: null },
  closed_until: null,
  min_notice_hours: 3,
  open: { is_open: true, reason: "hours", opens_at: null, closes_at: null },
  delivers: true,
  delivery_base_fee: "50",
  delivery_per_km: "15",
  delivery_max_km: "5",
  excluded_pincodes: ["400049"],
  is_merchant: true,
  can_take_bookings: true,
  gst_registered: true,
  gstin: "27ABCDE1234F1Z5",
};

const UNLOCKED: UnlockState = {
  unlocked: true,
  unlocked_until: "2099-01-01T00:00:00Z",
  phone_masked: "··· ··· 4471",
  minutes: 30,
};

const account = (over: Partial<BankAccount>): BankAccount => ({
  status: "none",
  bank_name: null,
  account_last4: null,
  ifsc: null,
  holder_name: null,
  name_at_bank: null,
  name_match: null,
  failure_code: null,
  verified_at: null,
  payouts_paused: false,
  can_verify_again: false,
  ...over,
});
const hdfc = { bank_name: "HDFC Bank", account_last4: "4471", ifsc: "HDFC0001234", holder_name: "Rahul Mehta" };

const shopAddress = (shop: Shop, params?: object): DevFixture => ({
  route: "ShopAddress",
  params,
  responses: { "GET /shop/": shop },
  session,
});

const bank = (bankAccount: BankAccount, params?: object): DevFixture => ({
  route: "BankAccount",
  params,
  responses: {
    "GET /access/unlock/": UNLOCKED,
    // Off here: a verified account would mount RingPermissionCard, which asks for the notification permission on a
    // real device (the frame draws no card; a simulator reports it unavailable anyway).
    "GET /shop/": { ...SHOP, can_take_bookings: false },
    "GET /shop/bank-account/": bankAccount,
  },
  session,
});

export const fixtures: Record<string, DevFixture> = {
  // shop-address · not set yet
  "2097:30130": shopAddress({ ...SHOP, address: "", locality: "", coordinates: null, address_confirmed: false }),
  // shop-address · confirmed
  "2097:30162": shopAddress(SHOP),
  // shop-address · new place picked (seed: the picked place, no map or geocoder; coordinates are fake)
  "2097:30195": shopAddress(SHOP, {
    design: {
      picked: { locality: "Khar West", address: "7th Road, Khar West, Mumbai 400052", latitude: 19.07, longitude: 72.84 },
    },
  }),
  // bank-account · no account yet
  "2097:30247": bank(account({})),
  // bank-account · checking (polls every 3s; the fixture answers the same)
  "2097:30281": bank(account({ ...hdfc, status: "pending", payouts_paused: true })),
  // bank-account · verified ("Verified 12 Nov" in IST)
  "2097:30326": bank(account({ ...hdfc, status: "verified", verified_at: "2026-11-12T06:30:00Z" })),
  // bank-account · check failed (name mismatch, Check again offered)
  "2097:30370": bank(
    account({
      ...hdfc,
      holder_name: "Rahul Mehta Traders",
      status: "failed",
      failure_code: "name_mismatch",
      name_at_bank: "RAHUL MEHTA",
      name_match: "no",
      payouts_paused: true,
      can_verify_again: true,
    })
  ),
  // bank-account · add account form (seed: the frame's fake values, Confirm focused; never submitted)
  "2097:30421": bank(account({}), {
    design: {
      form: { holderName: "Rahul Mehta", accountNumber: "50100234564471", confirmNumber: "501002345" },
      focus: "confirmNumber",
    },
  }),
  // 2097:30474 (not an owner, a 403), 30513 and 30585 (the code sheet: Firebase SMS and the clock) are jest renders.
};
