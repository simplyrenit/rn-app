import { useGlobalContext } from "@/context/global-context";
import { OWNER_DETAILS, PRODUCTS_BY_OWNER } from "@/lib/config";
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
      const response = await axios.get<Owner>(`${OWNER_DETAILS}${username}/`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      return response.data;
    } catch (error: any) {
      console.log("Error fetching owner details:", error);
    } finally {
      setLoading(false);
    }
    return null;
  }

  async function getOwnerProducts(username: string) {
    console.log("Getting products for username:", username);
    try {
      const response = await fetch(`${PRODUCTS_BY_OWNER}${username}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      return data || [];
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
