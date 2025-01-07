import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { ACCESS_TOKEN, DEV_MODE, GET_CATEGORIES, GET_REFRESH_TOKEN } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthTokens, setAuthTokens } from "./auth-fns";

// Create axios instance with interceptors for debugging
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error("Request Error:", error.message);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.log('###', error.response.status, originalRequest?.headers?.Authorization, error.response && error.response.status === 401 && originalRequest?.headers?.Authorization?.includes('Bearer ') && !originalRequest._retry)
    if (error.response && error.response.status === 401 && originalRequest?.headers?.Authorization?.includes('Bearer ') && !originalRequest._retry) {
    try {
      console.log('### getting new token');
      const tokens = await getAuthTokens();
      console.log('### existing', tokens);
        const response = await axios.post(GET_REFRESH_TOKEN, {
          refresh: tokens?.refresh_token,
        });

        const newTokens = response.data;
        console.log('### newtokens', newTokens);

        await setAuthTokens({
          access_token: newTokens.access,
          refresh_token: tokens?.refresh_token!,
        });

        originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
        axiosInstance.defaults.headers.Authorization = `Bearer ${newTokens.access}`;
        originalRequest._retry = true;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Handle refresh token error, e.g., log out the user
        // Clear tokens from storage
        // Redirect or handle user session expiration
      }
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
    const response = await axiosInstance.get(GET_CATEGORIES);
    return true;
  } catch (error) {
    return false;
  }
};

export default axiosInstance;