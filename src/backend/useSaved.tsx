import { useGlobalContext } from "@/context/global-context";
import { GET_FAVORITES } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import { useCallback, useState } from "react";
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

  // True only while the customer's own pull-to-refresh is in flight.
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: favorites = [],
    isLoading,
    refetch,
  } = useQuery(FAVORITES_QUERY_KEY, fetchFavorites, {
    enabled: Boolean(isAuthenticated && access_token),
    // Every FavouriteButton — so every product card in the app — subscribes to
    // this query. Without a stale window each card that mounts starts another
    // fetch, and with three rails plus a grid the query never settled: the
    // Saved tab's RefreshControl stayed open permanently, spinning above
    // content that had already loaded and pushing the grid ~150pt down.
    staleTime: 30_000,
  });

  /** Pull-to-refresh. Resolves the control even if the request fails. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  /**
   * Both mutations write the cache before the request leaves the device and roll
   * back if it fails. Without this the heart only moves once the round-trip
   * resolves, so on a slow connection a tap looks like it did nothing and people
   * tap again.
   */
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
      onMutate: async (productName: string) => {
        await queryClient.cancelQueries(FAVORITES_QUERY_KEY);
        const previous =
          queryClient.getQueryData<BackendProduct[]>(FAVORITES_QUERY_KEY);
        queryClient.setQueryData<BackendProduct[]>(
          FAVORITES_QUERY_KEY,
          (current = []) =>
            current.some((item) => item.name === productName)
              ? current
              : [...current, { name: productName } as BackendProduct]
        );
        return { previous };
      },
      onError: (_error, _productName, context) => {
        const previous = (context as { previous?: BackendProduct[] })?.previous;
        if (previous) queryClient.setQueryData(FAVORITES_QUERY_KEY, previous);
      },
      onSettled: () => {
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
      onMutate: async (productName: string) => {
        await queryClient.cancelQueries(FAVORITES_QUERY_KEY);
        const previous =
          queryClient.getQueryData<BackendProduct[]>(FAVORITES_QUERY_KEY);
        queryClient.setQueryData<BackendProduct[]>(
          FAVORITES_QUERY_KEY,
          (current = []) => current.filter((item) => item.name !== productName)
        );
        return { previous };
      },
      onError: (_error, _productName, context) => {
        const previous = (context as { previous?: BackendProduct[] })?.previous;
        if (previous) queryClient.setQueryData(FAVORITES_QUERY_KEY, previous);
      },
      onSettled: () => {
        queryClient.invalidateQueries(FAVORITES_QUERY_KEY);
      },
    }
  );

  return {
    favorites,
    loading: isLoading,
    refreshing,
    refetch: refresh,
    saveFavorite: saveFavoriteMutation.mutateAsync,
    deleteFavorite: deleteFavoriteMutation.mutateAsync,
  };
};

export default useSaved;
