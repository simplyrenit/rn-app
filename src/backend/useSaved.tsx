import { useGlobalContext } from "@/context/global-context";
import { GET_FAVORITES } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";

const useSaved = () => {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { access_token } = authTokens || {};
  const queryClient = useQueryClient();

  const fetchFavorites = useCallback(async (): Promise<BackendProduct[]> => {
    const response = await axiosInstance.get<BackendProduct[]>(GET_FAVORITES, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data.filter(item => !item?.moderation_labels?.length);
  }, []);

  const { data: favorites = [], isLoading } = useQuery(
    ["favorites"],
    fetchFavorites,
    {
      enabled: isAuthenticated && !!access_token && isAuthenticated,
    }
  );


  const saveFavoriteMutation = useMutation(
    async (productName: string) => {
      if (!isAuthenticated || !access_token) {
        return null;
      }

      const response = await axiosInstance.post(GET_FAVORITES, {
        product_name: productName,
      }).catch(e => {
      });
      const data = response?.data;

      return data;
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
          method: 'DELETE',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`
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
    loading: isLoading,
    saveFavorite: saveFavoriteMutation.mutateAsync,
    deleteFavorite: deleteFavoriteMutation.mutateAsync,
  };
};

export default useSaved;
