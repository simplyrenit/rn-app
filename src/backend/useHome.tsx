import { useGlobalContext } from "@/context/global-context";
import {
  GET_POPULAR_PRODUCTS_NEAR_YOU,
  GET_TOP_EXPERIENCE,
  GET_TOP_PICKS,
} from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import axios from "axios";

const useHome = () => {
  const { authTokens, isAuthenticated } = useGlobalContext();

  const access_token = authTokens?.access_token || "";

  const getAuthHeaders = () => {
    const headers = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    return headers;
  };

  const fetchData = async (endpoint: string, lat: number, long: number) => {
    try {
      const url = `${endpoint}?lat=${lat}&long=${long}`;
      const headers = getAuthHeaders();
      const response = await axiosInstance.get(url, headers);
      return { ...response.data, results: response.data.results.filter(data => !data?.moderation_labels?.length) };
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
      throw error;
    }
  };

  return {
    fetchTopExperiences: (lat: number, long: number) =>
      fetchData(GET_TOP_EXPERIENCE, lat, long),
    fetchTopPicks: (lat: number, long: number) =>
      fetchData(GET_TOP_EXPERIENCE, lat, long),
    fetchPopularProductsNearYou: (lat: number, long: number) =>
      fetchData(GET_TOP_EXPERIENCE, lat, long),
  };
};

export default useHome;
