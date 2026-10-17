/**
 * The URL out of whatever an API image field holds: a bare string, an
 * `{ image_url }` object, or nothing. Returns "" for anything else, which
 * `Avatar` reads as "no photo" and draws a monogram.
 */
export function imageUrlOf(
  image: string | { image_url?: string | null } | null | undefined
): string {
  if (typeof image === "string") return image;
  if (image && typeof image.image_url === "string") return image.image_url;
  return "";
}

/**
 * Backends commonly hand back a generic silhouette PNG rather than null. Four of six rows in the inbox were the same grey
 * figure, so the list carried no information beyond order: a monogram is strictly better than that.
 */
const PLACEHOLDER_PATTERNS = [
  "default",
  "placeholder",
  "avatar-default",
  "no-image",
  "noimage",
  "anonymous",
  "user.png",
  "profile.png",
];

/**
 * The photo an `Avatar` should draw, or null for a monogram. Takes anything an API image field can hold, and anything it
 * should not: a nested user's `image` is `{ name, image_url }` (the server's public user), `null` when there is no photo, and
 * a string elsewhere. A value that is none of those is no photo, never an error (it was `uri.toLowerCase is not a function`,
 * and a blank app, for an account that has a photo). A generic silhouette is no photo either.
 */
export function photoUrlOf(image: unknown): string | null {
  const url = imageUrlOf(image as string | { image_url?: string | null } | null | undefined).trim();
  if (!url) return null;
  const lower = url.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((token) => lower.includes(token)) ? null : url;
}
