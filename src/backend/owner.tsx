import { OWNER_DETAILS, PRODUCTS_BY_OWNER } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct, PublicOwner } from "@/lib/types";
import { useState } from "react";

export default function useOwner() {
  const [loading, setLoading] = useState(false);

  async function getOwnerDetails(username: string): Promise<PublicOwner | null> {
    setLoading(true);
    try {
      const response = await axiosInstance.get<PublicOwner>(OWNER_DETAILS, {
        params: { username },
      });
      return response.data;
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
    return null;
  }

  async function getOwnerProducts(username: string) {
    try {
      const response = await axiosInstance.get(`${PRODUCTS_BY_OWNER}${username}/`,);

      return response.data || [];
    } catch (error) {
      console.error("Detailed error in getOwnerProducts:", error);
      return [];
    }
  }

  return {
    getOwnerDetails,
    getOwnerProducts,
  };
}
