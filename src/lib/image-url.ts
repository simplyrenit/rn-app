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
