/**
 * Design fixtures (ENG-426, dev builds only), keyed by Figma frame id: the screen to open and the API responses
 * that make it show the frame's content, so a pixel diff compares layout rather than whatever QA data holds.
 *
 * One file per Figma section, so the flow stories (ENG-427..439) each add to their own file. A fixture lists its
 * responses as `"METHOD /path/suffix/"` (a `*` matches one path segment) to the JSON body; see interceptor.ts.
 * A fixture without a `session` needs a signed-in QA account; one with a `session` shows its user signed in on any
 * device (session.ts) and serves every read itself. Images are bundled `require()` assets resolved to URIs.
 *
 * Reached only through the `__DEV__` require in networkUtils.ts: release bundles never contain it.
 */
import type { MyDetailsResponse } from "@/lib/my-details";
import type { RootStackParamList } from "@/lib/types";
import { fixtures as s02 } from "./02";
import { fixtures as s03 } from "./03";
import { fixtures as s04 } from "./04";
import { fixtures as s05 } from "./05";
import { fixtures as s06 } from "./06";
import { fixtures as s07 } from "./07";
import { fixtures as s08 } from "./08";
import { fixtures as s09 } from "./09";
import { fixtures as s10 } from "./10";
import { fixtures as s11 } from "./11";
import { fixtures as s12 } from "./12";
import { fixtures as s13 } from "./13";
import { fixtures as s14 } from "./14";

export type DevFixture = {
  /** Where the fixture opens, as `navigation.replace(route, params)`. A tab is `MainTabs` with `{ screen }`. */
  route: Extract<keyof RootStackParamList, string>;
  params?: object;
  /** `"GET /category/"` → the response body, served with status 200. */
  responses: Record<string, unknown>;
  /**
   * Signed in as `user` (the me-request's body) without a token: the design session (session.ts). Reads the fixture
   * does not list then get a 404 rather than going to QA. Keep `firebase_uid` empty so chat's Firestore stays off.
   */
  session?: { user: MyDetailsResponse };
};

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_FIXTURE_REGISTRY_MARKER = "RENIT_DEV_FIXTURE_REGISTRY_MARKER";

export const FIXTURES: Record<string, DevFixture> = {
  ...s02, ...s03, ...s04, ...s05, ...s06, ...s07, ...s08, ...s09, ...s10, ...s11, ...s12, ...s13, ...s14,
};
