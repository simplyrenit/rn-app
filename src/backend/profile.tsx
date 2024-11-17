import { useGlobalContext } from "@/context/global-context";
import {
  AVAILABILITY,
  MY_DETAILS_ENDPOINT,
  MY_PRODUCT_DETAILS_ENDPOINT,
  MY_PRODUCTS_ENDPOINT,
  REPORT_PROBLEM_ENDPOINT,
  UPDATE_MY_DETAILS_ENDPOINT,
} from "@/lib/config";
import {
  BackendProduct,
  ProductImage,
  UnavailabilityFormData,
} from "@/lib/types";
import axios from "axios";
import { usePost } from "./post";
import { useState } from "react";

export function useProfile() {
  const { authTokens, fetchUserDetails } = useGlobalContext();
  const { access_token } = authTokens || {};
  const { getPresignedURLs, uploadToS3 } = usePost();
  const [loading, setLoading] = useState(false);

  async function getMyDetails() {
    setLoading(true);
    try {
      const response = await axios.get<MyDetails>(MY_DETAILS_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error getting user details:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function updateMyDetails(username: string, data: Partial<MyDetails>) {
    setLoading(true);
    try {
      const response = await axios.patch<MyDetails>(
        `${UPDATE_MY_DETAILS_ENDPOINT}${username}/`,
        data,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      await fetchUserDetails();

      return response.data;
    } catch (error) {
      console.error("Error updating user details:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function updateMyProfileImage(username: string, image: string) {
    setLoading(true);
    try {
      const imageUrls = await getPresignedURLs([
        { image, file_type: "image/jpeg" },
      ]);

      await uploadToS3(imageUrls[0], image);

      const body = {
        image: { name: username, image_url: imageUrls[0].split("?")[0] },
      };

      console.log(JSON.stringify(body));

      const response = await fetch(
        `${UPDATE_MY_DETAILS_ENDPOINT}${username}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const res = await response.json();
      await fetchUserDetails();

      return res;
    } catch (error: any) {
      console.error("Error updating profile image:", error.response.data);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function getMyProducts() {
    setLoading(true);
    try {
      const response = await fetch(MY_PRODUCTS_ENDPOINT, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      const data = await response.json();

      console.log("MY PRODUCTSS", data);

      return data.results;
    } catch (error) {
      console.error("Error getting user products:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function getMyProductDetails(name: string) {
    setLoading(true);
    try {
      const response = await axios.get<BackendProduct>(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error getting product details:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function updateMyProductDetails(
    name: string,
    data: Partial<BackendProduct>
  ) {
    setLoading(true);

    console.log(data);

    try {
      const response = await axios.patch<BackendProduct>(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`,
        data,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      console.log("UPDATE MY PRODUCT DETAILS", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error updating product details:", error.response.data);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function updateProductImages(
    name: string,
    data: {
      images: ProductImage[];
      cover_image: ProductImage;
    }
  ) {
    setLoading(true);
    try {
      const imageUrls = await getPresignedURLs(data.images);
      const coverImageUrl = await getPresignedURLs([data.cover_image]);

      await Promise.all(
        data.images.map((img, index) => {
          console.log(`Uploading image ${index + 1}...`);
          return uploadToS3(imageUrls[index], img.image);
        })
      );

      await uploadToS3(coverImageUrl[0], data.cover_image.image);

      // const response = await updateMyProductDetails(name, {
      //   images: imageUrls.map((url) => url.split("?")[0]),
      //   cover_image: coverImageUrl[0].split("?")[0],
      // });

      const body = {
        images: imageUrls.map((url) => url.split("?")[0]),
        cover_image: coverImageUrl[0].split("?")[0],
      };

      console.log("BODY", body);

      const response = await axios.patch<BackendProduct>(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`,
        body,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      return response;
    } catch (error) {
      console.error("Error updating product images:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function updateProductDetails(
    name: string,
    data: Partial<BackendProduct>
  ) {
    setLoading(true);
    try {
      const response = await updateMyProductDetails(name, data);
      return response;
    } catch (error) {
      console.error("Error updating product details:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function deleteMyProduct(name: string) {
    setLoading(true);
    try {
      const response = await axios.delete(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error deleting product:", error.response.data);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function reportAProblem(message: string) {
    setLoading(true);
    try {
      const response = await axios.post(
        REPORT_PROBLEM_ENDPOINT,
        {
          comment: message,
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error reporting problem:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function giveFeedback(message: string) {
    setLoading(true);
    try {
      const response = await axios.post(
        REPORT_PROBLEM_ENDPOINT,
        {
          comment: message,
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error giving feedback:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function submitUnavailabilityForm(data: UnavailabilityFormData) {
    setLoading(true);
    try {
      const response = await axios.post(AVAILABILITY, data, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      return { status: response.status, data: response.data };
    } catch (error) {
      console.error("Error submitting unavailability form:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return {
    getMyProducts,
    reportAProblem,
    giveFeedback,
    getMyProductDetails,
    deleteMyProduct,
    updateMyProductDetails,
    updateProductImages,
    updateProductDetails,
    updateMyProfileImage,
    getMyDetails,
    updateMyDetails,
    loading,
    submitUnavailabilityForm,
  };
}

interface MyProduct {
  name: string;
  title: string;
  images: string[];
  description: string;
  total_rating: string;
  review_count: number;
  category: {
    title: string;
    parent: string;
    light_icon: string;
    dark_icon: string;
  };
  condition: string;
  coordinates: {
    lat: number;
    long: number;
  };
  booked: string;
  average_rating: string;
  security_deposit: string;
  rate: string;
  currency: string;
  location: string;
  brand_name: string;
  model_name: string;
  usage_description: string;
  contact_number: string;
  contact_name: string;
  cover_image: string;
}

export interface MyDetails {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  image: {
    image_url: string;
    name: string;
  };
  addresses: {
    address: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    address_type: string;
    coordinates: {
      lat: number;
      long: number;
    };
    is_default: boolean;
  };
  business_name: string;
  coordinates: {
    lat: number;
    long: number;
  };
  timezone: string;
  email_verified: boolean;
  phone_verified: boolean;
}
