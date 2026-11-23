import type { DevFixture } from "./registry";

const asha = "asha.k@example.com";
const phone = "+919812345678"; // Never sent: every send handler returns early under a seed (plan §1, seed-guards test).
const welcome = (slide: number): DevFixture => ({ route: "Welcome", params: { design: { slide } }, responses: {} });
const loc = (design: object): DevFixture => ({ route: "Location", params: { design }, responses: {} });
const place = (place_id: string, name: string, lat: number, lng: number) => ({
  place_id,
  name,
  vicinity: "Bandra West, Mumbai",
  geometry: { location: { lat, lng } },
});

/** Design fixtures for Figma section 02, keyed by frame id (registry.ts). A screen reads `params.design` only in __DEV__ (plan §1). */
export const fixtures: Record<string, DevFixture> = {
  "2089:15349": welcome(0),
  "2089:15444": welcome(1),
  "2089:15529": welcome(2),
  // Signed-out device required: a fixture cannot sign the app out.
  "2089:15649": { route: "MainTabs", params: { screen: "Saved" }, responses: {} },
  "2089:15719": { route: "MainTabs", params: { screen: "Profile" }, responses: {} },
  "2089:21637": { route: "Email", params: { design: { email: asha } }, responses: {} },
  "2089:21681": { route: "Email", params: { design: { email: "asha.k@example", touched: true } }, responses: {} },
  "2089:21726": { route: "Phone", params: { design: { phone } }, responses: {} },
  // The screen strips spaces, so the frame's "98123 45678" can never be on screen: text-only diff.
  "2089:21763": { route: "Phone", params: { design: { phone: "9812345678", error: "Enter a valid mobile number with country code, for example +919876543210." } }, responses: {} },
  "2089:21800": { route: "Verify", params: { email: asha, verificationType: "otp", design: { code: "4821" } }, responses: {} },
  "2089:21853": { route: "Verify", params: { phone, verificationType: "phone", design: { code: "482193" } }, responses: {} },
  "2089:21903": { route: "Verify", params: { email: asha, verificationType: "otp", design: { code: "482139", wrong: true } }, responses: {} },
  "2089:21957": { route: "Verify", params: { email: asha, verificationType: "password", design: { password: "renit@2026" } }, responses: {} },
  "2089:25271": { route: "About", params: { design: { firstName: "Asha", lastName: "Kapoor", agreed: true } }, responses: {} },
  // Born 12 March 2015: under 13 until 12 March 2028, so the existing DOB effect shows the under-13 line.
  "2089:25343": { route: "About", params: { design: { firstName: "", lastName: "Kapoor", dob: { date: "12", month: "March", year: "2015" }, errors: { firstName: "First name is required" }, agreed: true } }, responses: {} },
  "2089:25419": { route: "About", params: { design: { merchant: true, businessName: "Kapoor Camera Rentals", firstName: "Asha", lastName: "Kapoor", ownerTerms: { version: "design", url: "", accepted: null }, ownerTermsAccepted: true, agreed: true } }, responses: {} },
  "2089:25483": { route: "Password", params: { design: { password: "renit2026", focused: true } }, responses: {} },
  "2089:25541": { route: "Password", params: { design: { password: "renit@2026", focused: true } }, responses: {} },
  "2089:25599": { route: "ConfirmPassword", params: { enteredPassword: "renit@2026", design: { password: "renit@2026" } }, responses: {} },
  "2089:25642": { route: "ConfirmPassword", params: { enteredPassword: "renit@2026", design: { password: "renit@2025", error: "The passwords don’t match. Please try again." } }, responses: {} },
  "2089:28033": loc({ state: "no-permission" }),
  "2089:28076": loc({ state: "fetching" }),
  "2089:28104": loc({ state: "failed" }),
  "2089:28140": loc({
    state: "map",
    coords: { latitude: 19.0596, longitude: 72.8295 },
    selected: { latitude: 19.0656, longitude: 72.8221 },
    address: "Hill Road, Bandra West, Mumbai, Maharashtra 400050",
    selectedAddress: "Carter Road, Bandra West, Mumbai, Maharashtra 400050",
    nearby: [
      place("design-1", "Bandra Railway Station", 19.0544, 72.8406),
      place("design-2", "Carter Road Promenade", 19.0657, 72.8226),
      place("design-3", "Linking Road", 19.0622, 72.8344),
    ],
  }),
  "2089:28209": { route: "Terms", params: { design: { state: "loading" } }, responses: {} },
  "2089:28232": { route: "Terms", params: { design: { state: "fallback" } }, responses: {} },
  "2089:28263": { route: "Privacy", responses: {} },
};
