import { useGlobalContext } from "@/context/global-context";
import {
  AVAILABILITY,
  DELETE_MY_ACCOUNT_ENDPOINT,
  MY_DETAILS_ENDPOINT,
  MY_PRODUCT_DETAILS_ENDPOINT,
  MY_PRODUCTS_ENDPOINT,
  REQUEST_MERCHANT_REVIEW_ENDPOINT,
  REPORT_PROBLEM_ENDPOINT,
  UPDATE_MY_DETAILS_ENDPOINT,
} from "@/lib/config";
import {
  AccountType,
  BackendProduct,
  MerchantApprovalStatus,
  ProductImage,
  UnavailabilityFormData,
} from "@/lib/types";
import axios from "axios";
import { usePost } from "./post";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import axiosInstance from "@/lib/networkUtils";
import {
  fetchMyDetailsRequest,
  MyDetailsResponse,
} from "@/lib/my-details";

type ProductUpdateData = Partial<Omit<BackendProduct, "category">> & {
  category?: { parent: string; title: string };
};

export function useProfile() {
  const { authTokens, fetchUserDetails, logout } = useGlobalContext();
  const { access_token } = authTokens || {};
  const { getPresignedURLs, uploadToS3 } = usePost();
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  async function getMyDetails(token?: string) {
    setLoading(true);
    try {
      return await fetchMyDetailsRequest(token);
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
      const response = await axiosInstance.patch<MyDetails>(
        `${UPDATE_MY_DETAILS_ENDPOINT}${username}/`,
        data,
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

  async function requestMerchantReview() {
    setLoading(true);
    try {
      const response = await axiosInstance.post<MyDetails>(
        REQUEST_MERCHANT_REVIEW_ENDPOINT
      );
      await fetchUserDetails();
      return response.data;
    } catch (error) {
      console.error("Error requesting merchant review:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function deleteMyAccount(username: string) {
    setLoading(true);
    try {
      const response = await axiosInstance.delete(`${DELETE_MY_ACCOUNT_ENDPOINT}${username}/`)
    } catch (error) {
      console.error("Error deleting user account:", `${DELETE_MY_ACCOUNT_ENDPOINT}${username}`, error);
      throw error;
    } finally {
      setLoading(false);
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: "Welcome" }],
      });
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


      const response = await axiosInstance.patch(
        `${UPDATE_MY_DETAILS_ENDPOINT}${username}/`,
        body,
        { headers: { "Content-Type": "application/json" } }
      );

      await fetchUserDetails();

      return response.data;
    } catch (error: any) {
      console.error("Error updating profile image:", error.response.data);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function getMyProducts(link?: string) {
    setLoading(true);
    try {
      const response = await axiosInstance.get(link ?? MY_PRODUCTS_ENDPOINT,);
      return response.data;
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
      const response = await axiosInstance.get<BackendProduct>(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`
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
    data: ProductUpdateData
  ) {
    setLoading(true);

    try {
      const response = await axiosInstance.patch<BackendProduct>(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`,
        data,
      );
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


      const response = await axiosInstance.patch<BackendProduct>(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`,
        body,
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
    data: ProductUpdateData
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
      const response = await axiosInstance.delete(
        `${MY_PRODUCT_DETAILS_ENDPOINT}${name}/`,
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
      const response = await axiosInstance.post(
        REPORT_PROBLEM_ENDPOINT,
        {
          comment: message,
        },
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
      const response = await axiosInstance.post(
        REPORT_PROBLEM_ENDPOINT,
        {
          comment: message,
        },
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
      const response = await axiosInstance.post(AVAILABILITY, data);

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
    requestMerchantReview,
    loading,
    submitUnavailabilityForm,
    deleteMyAccount,
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

export type MyDetails = MyDetailsResponse;
