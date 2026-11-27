import { fixtures as cartDates } from "./04-cart-dates";
import { fixtures as pdp } from "./04-pdp";
import { fixtures as reviewsAddress } from "./04-reviews-address";
import type { DevFixture } from "./registry";

/**
 * Design fixtures for Figma section 04, keyed by frame id (registry.ts). Each build group owns a sub-file; this file
 * only aggregates them.
 */
export const fixtures: Record<string, DevFixture> = { ...pdp, ...cartDates, ...reviewsAddress };
