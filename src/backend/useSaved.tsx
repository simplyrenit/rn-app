import { useGlobalContext } from "@/context/global-context";
import { GET_FAVORITES } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";

const FAVORITES_QUERY_KEY = ["favorites"];

const useSaved = () => {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { access_token } = authTokens || {};
  const queryClient = useQueryClient();

  const fetchFavorites = useCallback(async (): Promise<BackendProduct[]> => {
    if (!isAuthenticated || !access_token) {
      return [];
    }

    const response = await axiosInstance.get<BackendProduct[]>(GET_FAVORITES, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data.filter((item) => !item?.moderation_labels?.length);
  }, [access_token, isAuthenticated]);

  const { data: favorites = [], isLoading } = useQuery(
    FAVORITES_QUERY_KEY,
    fetchFavorites,
    {
      enabled: Boolean(isAuthenticated && access_token),
    }
  );

  const saveFavoriteMutation = useMutation(
    async (productName: string) => {
      if (!isAuthenticated || !access_token) {
        return null;
      }

      const response = await axiosInstance.post(GET_FAVORITES, {
        product_name: productName,
      });

      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(FAVORITES_QUERY_KEY);
      },
    }
  );

  const deleteFavoriteMutation = useMutation(
    async (productName: string) => {
      if (!isAuthenticated || !access_token) {
        return null;
      }

      const response = await axiosInstance.delete(GET_FAVORITES, {
        params: {
          product_name: productName,
        },
      });

      return response.data ?? null;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(FAVORITES_QUERY_KEY);
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
