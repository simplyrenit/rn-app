import type { Terms } from "@/backend/terms";

/**
 * Open the server's customer terms page. False when the server cannot be read or the
 * link cannot be opened, so the caller shows the terms bundled in the app instead.
 */
export async function openCustomerTerms(
  read: () => Promise<Terms>,
  open: (url: string) => Promise<unknown>
): Promise<boolean> {
  try {
    const url = (await read()).customer.url;
    if (!url) return false;
    await open(url);
    return true;
  } catch {
    return false;
  }
}
