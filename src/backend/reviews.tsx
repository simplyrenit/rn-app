import { useGlobalContext } from "@/context/global-context";
import { OWNER_REVIEWS, REVIEW_STATS, WRITE_REVIEW } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { OwnerReview, ReviewData } from "@/lib/types";
import axios from "axios";
import { useState } from "react";

export default function useReviews() {
  const { authTokens } = useGlobalContext();
  const { access_token } = authTokens || {};
  const [isLoading, setIsLoading] = useState(false);

  async function getReviewStats(name: string) {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`${REVIEW_STATS}?product_name=${name}`);

      const reviewStats = Object.keys(response.data).map((key) => ({
        rating: parseInt(key),
        count: response.data[key],
      }));
      return reviewStats;
    } catch (error: any) {
    } finally {
      setIsLoading(false);
    }
  }

  async function getReviews(name: string) {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get<OwnerReview[]>(
        `${OWNER_REVIEWS}${name}/`
      );
      return response.data || [];
    } catch (error: any) {
    } finally {
      setIsLoading(false);
    }
  }

  async function writeAReview(data: ReviewData) {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post(WRITE_REVIEW, data);
      return response.data;
    } catch (error: any) {
    } finally {
      setIsLoading(false);
    }
  }

  return {
    getReviewStats,
    getReviews,
    writeAReview,
    isLoading,
  };
}
