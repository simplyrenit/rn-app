import { useGlobalContext } from "@/context/global-context";
import {
  GET_PRODUCT_DETAILS,
  GET_REVIEWS,
  SIMILAR_PRODUCTS,
} from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct, BackendReview } from "@/lib/types";
import axios from "axios";
import { useState } from "react";

interface SimilarProducts {
  results: BackendProduct[];
}

interface ReviewResponse {
  results: BackendReview[];
}

export function useProduct() {
  const { authTokens } = useGlobalContext();
  const { access_token } = authTokens || {};
  const [loading, setLoading] = useState(false);

  const fetchProduct = async (id: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<BackendProduct>(
        `${GET_PRODUCT_DETAILS}${id}/`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Error fetching product:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarProducts = async (name: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<SimilarProducts>(
        `${SIMILAR_PRODUCTS}?product_name=${name}`
      );

      return response.data.results;
    } catch (error) {
      console.error("Error fetching similar products:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (name: string) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<ReviewResponse>(
        `${GET_REVIEWS}?product_name=${name}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.results;
    } catch (error) {
      console.error("Error fetching reviews:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { fetchProduct, fetchReviews, fetchSimilarProducts, loading };
}
