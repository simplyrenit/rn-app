import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { ACCESS_TOKEN, DEV_MODE, GET_CATEGORIES } from "./config";

// Create axios instance with interceptors for debugging
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  },
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log("Making request to:", config.url);
    return config;
  },
  (error) => {
    console.error("Request Error:", error.message);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`Response received from ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error("Server Error:", {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error("Network Error:", error.message);
    } else {
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

interface RetryConfig extends AxiosRequestConfig {
  retries?: number;
  retryDelay?: number;
}

export const fetchWithRetry = async (url: string, config: RetryConfig = {}) => {
  const { retries = 3, retryDelay = 1000, ...axiosConfig } = config;

  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.log(`Retry attempt ${i + 1} of ${retries}`);
      }

      const response = await axiosInstance({
        url,
        method: axiosConfig.method || "GET",
        ...axiosConfig,
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        // Don't retry on client errors (4xx)
        if (
          error.response?.status &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          throw error;
        }

        if (i === retries - 1) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      throw error;
    }
  }
};

// Helper function to check server availability
export const checkServerConnection = async () => {
  try {
    console.log("Testing connection to:", GET_CATEGORIES);
    const response = await axiosInstance.get(GET_CATEGORIES);
    console.log("Server check successful");
    return true;
  } catch (error) {
    console.error("Server check failed:", error.message);
    return false;
  }
};
