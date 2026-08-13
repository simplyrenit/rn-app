import { useProductContext } from "@/context/product-context";
import { GENERATE_SIGNED_URLS, POST_MY_PRODUCTS } from "@/lib/config";
import { Product, ProductImage } from "@/lib/types";
import axios from "axios";
import { useState } from "react";
import { useGlobalContext } from "@/context/global-context";
import moment from "moment-timezone";
import axiosInstance from "@/lib/networkUtils";

interface PresignedResponse {
  presigned_urls: string[];
}

const transformProduct = (product: Product) => {
  const transformed = {
    title: product.name,
    description: product.productDescription,
    security_deposit: parseFloat(product.securityDeposit),
    category: {
      parent: product?.category.title,
      title: product?.subcategory.title,
    },
    condition: product.condition.toLowerCase(),
    rate: product.pricePerDay,
    currency: "INR",
    coordinates: {
      lat: product.location.lat,
      long: product.location.long,
    },
    images: {
      filenames: product.images.map((img) => img.image),
      file_types: product.images.map((img) => img.file_type),
    },
    location: product.address,
    cover_image: {
      filenames: [product.coverImage.image],
      file_types: [product.coverImage.file_type],
    },
    brand_name: product.brandName,
    model_name: product.modelName,
    usage_description: product.usageDescription,
    contact_number: product.personOfContact.phoneNumber,
    contact_name: product.personOfContact.name,
    blocked_dates: product.productAvailability.map((range) => ({
      start_date: moment(range.startDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DDTHH:mm:ssZ"),
      end_date: moment(range.endDate || range.startDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DDTHH:mm:ssZ"),
    })),
  };

  return transformed;
};

export function usePost() {
  const { product } = useProductContext();
  const [loading, setLoading] = useState(false);
  const { authTokens } = useGlobalContext();
  const { access_token } = authTokens || {};

  const uploadToS3 = async (
    presignedUrl: string,
    imageUri: string
  ): Promise<void> => {
    if (!authTokens) return;
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
  };

  const getPresignedURLs = async (images: ProductImage[]) => {
    if (!authTokens) return [];
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
  };

  const postProduct = async () => {
    setLoading(true);
    try {
      if (!authTokens) return { status: 401, data: null };
      const transformedProduct = transformProduct(product);

      const imageUrls = await getPresignedURLs(product.images);
      const coverImageUrl = await getPresignedURLs([product.coverImage]);

      // Upload all images to S3
      await Promise.all(
        product.images.map((img, index) => {
          return uploadToS3(imageUrls[index], img.image);
        })
      );

      await uploadToS3(coverImageUrl[0], product.coverImage.image);

      const finalProductData = {
        ...transformedProduct,
        images: imageUrls.map((url) => url.split("?")[0]),
        cover_image: coverImageUrl[0].split("?")[0],
      };


      const response = await axiosInstance.post(POST_MY_PRODUCTS, finalProductData, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 90000, // 1 minute 30 seconds in milliseconds
      });

      return { status: response.status, data: response.data };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { postProduct, loading, getPresignedURLs, uploadToS3 };
}
