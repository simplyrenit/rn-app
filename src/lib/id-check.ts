import type { NavigationUseType } from "@/lib/types";

/**
 * The one way into the customer's ID check (ENG-176).
 *
 * The check itself is ENG-12's work, and its first release checks merchants
 * only: there is no check a customer can take yet (ARCHITECTURE 9.6, decision
 * A-18). Until one exists the server answers "passed" for every customer, so
 * this is reached only when QA marks a test customer as not passed.
 *
 * Returns false when there is no flow to open, and the caller says so. When the
 * customer flow lands, navigate to it here and return true; the price screen
 * reads the quote again when it comes back into view, so the dates are kept and
 * "ID check passed" shows by itself.
 */
export function startIdCheck(_navigation: NavigationUseType): boolean {
  return false;
}
