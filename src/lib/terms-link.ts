import type { Terms } from "@/backend/terms";

/**
 * Open the server's customer terms page. False when the server cannot be read or the
 * link cannot be opened, so the caller shows the terms bundled in the app instead.
 * `wanted` is checked once the read is back: false when the person has already
 * left the screen, so no browser opens over another one.
 */
export async function openCustomerTerms(
  read: () => Promise<Terms>,
  open: (url: string) => Promise<unknown>,
  wanted: () => boolean = () => true
): Promise<boolean> {
  try {
    const url = (await read()).customer.url;
    if (!url || !wanted()) return false;
    await open(url);
    return true;
  } catch {
    return false;
  }
}
