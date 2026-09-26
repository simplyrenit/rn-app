import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/** One file serves the listing and the AI (§1.1): 1600 px long edge, JPEG 0.8. */
export const LONG_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/**
 * The resize for a photo of this size: the long edge only, and never an
 * upscale — a small photo is sent as it is, just re-encoded.
 */
export function resizeFor(width: number, height: number) {
  if (Math.max(width, height) <= LONG_EDGE) return [];
  return [{ resize: width >= height ? { width: LONG_EDGE } : { height: LONG_EDGE } }];
}

/**
 * Resize and re-encode a picked or captured photo before upload.
 *
 * The picker runs at quality 1 so compression happens once, here. When the
 * picker did not report dimensions, a no-op pass reads them first.
 */
export async function prepareImage(
  uri: string,
  size?: { width?: number; height?: number }
): Promise<string> {
  let width = size?.width ?? 0;
  let height = size?.height ?? 0;
  if (!width || !height) {
    const probe = await manipulateAsync(uri, []);
    width = probe.width;
    height = probe.height;
  }

  const result = await manipulateAsync(uri, resizeFor(width, height), {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}
