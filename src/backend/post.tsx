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
      end_date: moment(range.endDate)
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
    return new Promise(async (resolve, reject) => {
      try {
        console.log('upload to s3');
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl, true);

        // Only set these specific headers
        xhr.setRequestHeader("Content-Type", "image/jpeg");
        // Don't set any other headers to avoid signature mismatch

        // Add detailed error logging
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
          }
        };

        xhr.onload = () => {
          console.log(xhr.status);
          if (xhr.status === 200) {
            console.log('upload success')
            resolve();
          } else {
            const errorText = xhr.responseText;
            console.error("Upload failed with status:", xhr.status);
            console.error("Error response:", errorText);
            reject(new Error(`Upload failed: ${xhr.status} ${errorText}`));
          }
        };

        xhr.onerror = () => {
          const errorText = xhr.responseText;
          console.error("Network error during upload");
          console.error("Error details:", errorText);
          reject(new Error("Network error during upload"));
        };

        // Log the actual request being sent

        xhr.send(blob);
      } catch (error) {
        console.error("Upload error:", error);
        reject(error);
      }
    });
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
      console.log("post product");
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

      console.log('imageUrl is uploaded');
      await uploadToS3(coverImageUrl[0], product.coverImage.image);

      console.log('cover image is uploaded');
      const finalProductData = {
        ...transformedProduct,
        images: imageUrls.map((url) => url.split("?")[0]),
        cover_image: coverImageUrl[0].split("?")[0],
      };
      console.log("POST_MY_PRODUCTS", POST_MY_PRODUCTS);
      console.log("finalProductData", finalProductData);
      const response = await axiosInstance.post(POST_MY_PRODUCTS, finalProductData, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 90000, // 1 minute 30 seconds in milliseconds
      });

      console.log('status', response.status);
      console.log('data', response.data)
      return { status: response.status, data: response.data };
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { postProduct, loading, getPresignedURLs, uploadToS3 };
}
