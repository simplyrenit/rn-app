import { useGlobalContext } from "@/context/global-context";
import { GET_FAVORITES } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import { AxiosError } from "axios";
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";

const FAVORITES_QUERY_KEY = ["favorites"];

const useSaved = () => {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { access_token } = authTokens || {};
  const queryClient = useQueryClient();

  const deleteFavoriteWithFetchFallback = useCallback(
    async (productName: string) => {
      const formBody = `product_name=${encodeURIComponent(productName)}`;

      const response = await fetch(GET_FAVORITES, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${access_token}`,
        },
        body: formBody,
      });

      if (!response.ok && response.status !== 204) {
        let errorMessage = `Favorite delete failed with status ${response.status}`;

        try {
          const errorPayload = await response.json();
          if (errorPayload?.error || errorPayload?.detail) {
            errorMessage = errorPayload.error || errorPayload.detail;
          }
        } catch {
          // Ignore JSON parse failures and use the status-derived message.
        }

        throw new Error(errorMessage);
      }

      return null;
    },
    [access_token]
  );

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

      try {
        const response = await axiosInstance.request({
          method: "DELETE",
          url: GET_FAVORITES,
          data: {
            product_name: productName,
          },
        });

        return response.data ?? null;
      } catch (error) {
        const isTransportFailure =
          error instanceof AxiosError &&
          !error.response &&
          error.message === "Network Error";

        if (!isTransportFailure) {
          throw error;
        }

        console.warn(
          "[favorites] axios delete failed on native client, retrying with fetch",
          {
            productName,
          }
        );

        return deleteFavoriteWithFetchFallback(productName);
      }
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
