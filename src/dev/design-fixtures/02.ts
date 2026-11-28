import type { DevFixture } from "./registry";

const phone = "+919812345678"; // Never sent: every send handler returns early under a seed (plan §1, seed-guards test).

/**
 * Design fixtures for Figma sections 02 and 02b, keyed by frame id (registry.ts). A screen reads `params.design` only
 * in __DEV__ (plan §1). ENG-463 retired the carousel Welcome, the phone screen, the password and the About, Password,
 * Confirm password and Location steps (their 02 frames are marked n/a in tracker-notes.tsv); 02b holds their successors.
 */
export const fixtures: Record<string, DevFixture> = {
  // Signed-out device required: a fixture cannot sign the app out.
  "2089:15649": { route: "MainTabs", params: { screen: "Saved" }, responses: {} },
  "2089:15719": { route: "MainTabs", params: { screen: "Profile" }, responses: {} },
  // 02b (ENG-463).
  "2179:31785": { route: "Welcome", params: { design: {} }, responses: {} },
  "2179:31895": { route: "Email", params: { design: { email: "asha@example.com" } }, responses: {} },
  "2179:31931": { route: "Verify", params: { phone, verificationType: "phone", design: { code: "482193", resendIn: 24 } }, responses: {} },
  "2179:31979": { route: "YourName", params: { design: { firstName: "Asha", lastName: "Kapoor" } }, responses: {} },
  "2089:28209": { route: "Terms", params: { design: { state: "loading" } }, responses: {} },
  "2089:28232": { route: "Terms", params: { design: { state: "fallback" } }, responses: {} },
  "2089:28263": { route: "Privacy", responses: {} },
};
