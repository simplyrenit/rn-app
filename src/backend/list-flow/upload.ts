import { requestPresignedURLs, uploadImageToS3 } from "@/backend/post";
import { uuidv4 } from "@/lib/uuid";
import { prepareImage } from "./images";

/**
 * Resize, presign and PUT one photo; resolves to its public URL.
 *
 * Each photo gets its own unique filename (§7.3). The picker's names repeat —
 * every camera capture on iOS can come back as the same basename — and two
 * photos presigned under one key would overwrite each other in the bucket.
 */
export async function uploadPhoto(
  localUri: string,
  size?: { width?: number; height?: number }
): Promise<string> {
  const prepared = await prepareImage(localUri, size);
  const [presigned] = await requestPresignedURLs([
    { image: `listing-${uuidv4()}.jpg`, file_type: "image/jpeg" },
  ]);
  if (!presigned) throw new Error("No presigned URL returned");
  await uploadImageToS3(presigned, prepared);
  // The query string is the signature; the object's URL is what is left.
  return presigned.split("?")[0];
}
