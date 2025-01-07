import { useGlobalContext } from "@/context/global-context";
import { OWNER_DETAILS, PRODUCTS_BY_OWNER } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct, Owner } from "@/lib/types";
import axios from "axios";
import { useState } from "react";

export default function useOwner() {
  const { authTokens } = useGlobalContext();
  const { access_token } = authTokens || {};
  const [loading, setLoading] = useState(false);

  async function getOwnerDetails(username: string): Promise<Owner | null> {
    setLoading(true);
    try {
      const response = await axiosInstance.get<Owner>(`${OWNER_DETAILS}${username}/`);
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
