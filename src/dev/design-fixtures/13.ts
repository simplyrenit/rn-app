import type { MyDetailsResponse } from "@/lib/my-details";
import type { DevFixture } from "./registry";

// The customer the profile frames show (profile-signed-in · customer, 2095:25572): name and email as drawn, no photo
// (the avatar shows the initials). `firebase_uid` is empty so chat's Firestore listeners stay off in the session.
const riya: MyDetailsResponse = {
  username: "riya_sharma",
  firebase_uid: "",
  email: "riya.sharma@gmail.com",
  first_name: "Riya",
  last_name: "Sharma",
  phone: "",
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

/** Design fixtures for Figma section 13, keyed by frame id (registry.ts). */
export const fixtures: Record<string, DevFixture> = {
  "2095:25572": { route: "MainTabs", params: { screen: "Profile" }, responses: {}, session: { user: riya } },
};
