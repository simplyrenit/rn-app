import { useGlobalContext } from "@/context/global-context";
import { GET_FAVORITES } from "@/lib/config";
import { BackendProduct } from "@/lib/types";
import axios from "axios";
import { useState, useEffect } from "react";

const useSaved = () => {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { access_token } = authTokens || {};
  const [favorites, setFavorites] = useState<BackendProduct[]>([]);

  useEffect(() => {
    if (isAuthenticated && access_token) {
      getFavorites();
    }
  }, [access_token, isAuthenticated]);

  const getFavorites = async (): Promise<BackendProduct[]> => {
    if (!isAuthenticated || !access_token) {
      return [];
    }

    try {
      const response = await axios.get<BackendProduct[]>(GET_FAVORITES, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });
      setFavorites(response.data);

      return response.data;
    } catch (error) {
      console.error("Error Fetching favorites:", error);
      throw error;
    }
  };

  const saveFavorite = async (productName: string) => {
    if (!isAuthenticated || !access_token) {
      return null;
    }

    try {
      const response = await fetch(GET_FAVORITES, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: productName,
        }),
      });
      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error saving favorite:", error);
      throw error;
    }
  };

  const deleteFavorite = async (productName: string) => {
    if (!isAuthenticated || !access_token) {
      return null;
    }

    try {
      setFavorites((prevFavorites) =>
        prevFavorites.filter((favorite) => favorite.name !== productName)
      );

      const response = await fetch(GET_FAVORITES, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: productName,
        }),
      });

      if (response.status !== 204) {
        const data = await response.json();
        return data;
      }

      return null;
    } catch (error) {
      console.error("Error deleting favorite:", error);
      throw error;
    }
  };

  return {
    getFavorites,
    saveFavorite,
    deleteFavorite,
    favorites,
  };
};

export default useSaved;
