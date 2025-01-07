import { useGlobalContext } from "@/context/global-context";
import { GET_FAVORITES } from "@/lib/config";
import { BackendProduct } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "react-query";
import axios from "axios";
import axiosInstance from "@/lib/networkUtils";

const useSaved = () => {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { access_token } = authTokens || {};
  const queryClient = useQueryClient();

  const fetchFavorites = async (): Promise<BackendProduct[]> => {
    if (!isAuthenticated || !access_token) {
      return [];
    }

    const response = await axiosInstance.get<BackendProduct[]>(GET_FAVORITES, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data.filter(item => !item?.moderation_labels?.length);
  };

  const { data: favorites = [] } = useQuery(
    ["favorites", access_token],
    fetchFavorites,
    {
      enabled: isAuthenticated && !!access_token,
    }
  );

  const saveFavoriteMutation = useMutation(
    async (productName: string) => {
      if (!isAuthenticated || !access_token) {
        return null;
      }

      const response = await fetch(GET_FAVORITES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: productName,
        }),
      });

      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("favorites");
      },
    }
  );

  const deleteFavoriteMutation = useMutation(
    async (productName: string) => {
      if (!isAuthenticated || !access_token) {
        return null;
      }
      try {
        const response = await fetch(GET_FAVORITES, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_name: productName,
          }),
        });

        if (response.status !== 204) {
          return response.json();
        }
      }
      catch (e) {
      }

      return null;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("favorites");
      },
    }
  );

  return {
    favorites,
    saveFavorite: saveFavoriteMutation.mutateAsync,
    deleteFavorite: deleteFavoriteMutation.mutateAsync,
  };
};

export default useSaved;
