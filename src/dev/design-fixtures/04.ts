import { fixtures as cartDates } from "./04-cart-dates";
import { fixtures as reviewsAddress } from "./04-reviews-address";
import type { DevFixture } from "./registry";

/**
 * Design fixtures for Figma section 04, keyed by frame id (registry.ts). Each build group owns a sub-file; this file
 * only aggregates them. The PDP group's `04-pdp.ts` is not written yet.
 */
export const fixtures: Record<string, DevFixture> = { ...cartDates, ...reviewsAddress };
