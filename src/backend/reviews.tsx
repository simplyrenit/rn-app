import { useGlobalContext } from "@/context/global-context";
import { OWNER_REVIEWS, REVIEW_STATS, WRITE_REVIEW } from "@/lib/config";
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
      const response = await axios.get(`${REVIEW_STATS}?product_name=${name}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const reviewStats = Object.keys(response.data).map((key) => ({
        rating: parseInt(key),
        count: response.data[key],
      }));
      return reviewStats;
    } catch (error: any) {
      console.log("Error fetching review stats:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function getReviews(name: string) {
    setIsLoading(true);
    try {
      const response = await axios.get<OwnerReview[]>(
        `${OWNER_REVIEWS}${name}/`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      return response.data || [];
    } catch (error: any) {
      console.log("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function writeAReview(data: ReviewData) {
    setIsLoading(true);
    try {
      const response = await axios.post(WRITE_REVIEW, data, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      return response.data;
    } catch (error: any) {
      console.log("Error writing a review:", error);
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
