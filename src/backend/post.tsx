import { GENERATE_SIGNED_URLS } from "@/lib/config";
import { ProductImage } from "@/lib/types";
import { useGlobalContext } from "@/context/global-context";
import axiosInstance from "@/lib/networkUtils";

interface PresignedResponse {
  presigned_urls: string[];
}

/**
 * PUT one local image to its presigned S3 URL.
 *
 * Exported for the photo-first listing flow, which uploads each photo as soon
 * as it is added rather than all at once on submit; `usePost` wraps the same
 * code for the edit flow.
 */
export async function uploadImageToS3(
  presignedUrl: string,
  imageUri: string
): Promise<void> {
  const imageResponse = await fetch(imageUri);
  if (!imageResponse.ok) {
    throw new Error(`Unable to read the selected image: ${imageResponse.status}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: await imageResponse.blob(),
      signal: controller.signal,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Image upload failed: ${uploadResponse.status}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Presigned PUT URLs, one per image, in order. */
export async function requestPresignedURLs(images: ProductImage[]) {
  try {
    // Clean the filenames - only keep the actual filename without path
    const processedImages = images.map((img) => ({
      ...img,
      image: img.image
        .split("/")
        .pop()!
        .replace(/^file:\/\//, "")
        .toLowerCase(), // ensure consistent casing
    }));

    const response = await axiosInstance.post<PresignedResponse>(
      GENERATE_SIGNED_URLS,
      {
        filenames: processedImages.map((img) => img.image),
        file_types: processedImages.map((img) => "image/jpeg"), // explicitly set type
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.presigned_urls;
  } catch (error) {
    console.error("Error getting presigned URLs:", error);
    throw error;
  }
}

export function usePost() {
  const { authTokens } = useGlobalContext();

  // The hook keeps its old contract — a signed-out caller gets a no-op — and
  // delegates to the module-level functions the listing flow also uses.
  const uploadToS3 = async (
    presignedUrl: string,
    imageUri: string
  ): Promise<void> => {
    if (!authTokens) return;
    return uploadImageToS3(presignedUrl, imageUri);
  };

  const getPresignedURLs = async (images: ProductImage[]) => {
    if (!authTokens) return [];
    return requestPresignedURLs(images);
  };

  // Creating a listing moved to the photo-first flow
  // (src/backend/list-flow/submit.ts); this hook now only serves the edit flow.
  return { getPresignedURLs, uploadToS3 };
}
