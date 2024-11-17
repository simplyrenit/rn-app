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
    setLoading(true);
    try {
      const response = await axios.get<BackendProduct[]>(
        `${PRODUCTS_BY_OWNER}${username}/`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      return response.data;
    } catch (error: any) {
      console.log("Error fetching owner products:", error);
    } finally {
      setLoading(false);
    }
  }

  return {
    getOwnerDetails,
    getOwnerProducts,
  };
}
