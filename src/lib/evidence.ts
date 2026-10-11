/**
 * Putting the photos of a report on the bucket (a fault report, a damage report, a
 * reply). One photo failing must not lose the others: every photo is tried, the ones
 * that went up keep their address, and only the ones that did not are tried again at
 * the next press. So a send that fails half way never uploads the same photo twice,
 * and never leaves the person to take a photo again.
 */
export interface Uploadable {
  uri: string;
  /** Its address on the bucket once it is up. */
  url: string | null;
}

export interface Uploaded<T extends Uploadable> {
  /** Every photo, in order, with the address of each one that is up. */
  photos: T[];
  /** How many are still not up. */
  failed: number;
}

export async function uploadKeeping<T extends Uploadable>(
  photos: T[],
  upload: (uri: string) => Promise<string>
): Promise<Uploaded<T>> {
  const out: T[] = [];
  let failed = 0;
  // One at a time: a phone on a poor connection does better with one file in flight.
  for (const photo of photos) {
    if (photo.url) {
      out.push(photo);
      continue;
    }
    try {
      out.push({ ...photo, url: await upload(photo.uri) });
    } catch {
      failed += 1;
      out.push(photo);
    }
  }
  return { photos: out, failed };
}

/** The photos' addresses, in order, once none is missing; otherwise null. */
export function urlsOf(photos: Uploadable[]): string[] | null {
  const urls = photos.map((p) => p.url);
  return urls.every((u): u is string => Boolean(u)) ? urls : null;
}

/** "2 of 5 photos did not upload. Check your connection and try again: the others are kept." */
export function failedPhotosText(failed: number, total: number): string {
  const which = failed === total ? (total === 1 ? "The photo did not upload" : `The ${total} photos did not upload`) : `${failed} of ${total} photos did not upload`;
  return total > 1 && failed < total ? `${which}. Check your connection and try again: the others are kept.` : `${which}. Check your connection and try again.`;
}
