import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { GET_CATEGORIES, GET_REFRESH_TOKEN } from "./config";
import { getAuthTokens, setAuthTokens } from "./auth-fns";

const NETWORK_LOG_PREFIX = "[network]";
let requestCounter = 0;

// When the server explicitly rejects a refresh token the session is over, but
// this module cannot import the global context (that context imports this
// module), so the provider registers a callback here instead.
type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;
// Several requests usually fail together when a session expires. Without this
// guard each one would fire its own logout and its own "signed out" toast.
let sessionExpiryNotified = false;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null) => {
  onSessionExpired = handler;
};

// Called after a successful sign-in so the next expiry is reported again.
export const resetSessionExpiryNotice = () => {
  sessionExpiryNotified = false;
};

type RequestMetadata = {
  requestId: number;
  startedAt: number;
};

interface NetworkRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  metadata?: RequestMetadata;
}

const REDACTED_KEYS = new Set([
  "password",
  "current_password",
  "new_password",
  "access_token",
  "refresh_token",
  "refresh",
  "authorization",
  "token",
  "id_token",
  "identityToken",
]);

const summarizeArray = (value: unknown[]) => {
  const firstItem = value[0];

  return {
    type: "array",
    length: value.length,
    sampleKeys:
      firstItem && typeof firstItem === "object" && !Array.isArray(firstItem)
        ? Object.keys(firstItem as Record<string, unknown>).slice(0, 8)
        : undefined,
  };
};

const summarizeObject = (value: Record<string, unknown>) => {
  const keys = Object.keys(value);

  return {
    type: "object",
    keys: keys.slice(0, 10),
    totalKeys: keys.length,
    totalResults:
      typeof value.total_results === "number" ? value.total_results : undefined,
    resultCount: Array.isArray(value.results) ? value.results.length : undefined,
  };
};

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        REDACTED_KEYS.has(key) ? "[REDACTED]" : sanitizeValue(nestedValue),
      ])
    );
  }

  return value;
};

const summarizeValue = (value: unknown): unknown => {
  const sanitizedValue = sanitizeValue(value);

  if (Array.isArray(sanitizedValue)) {
    return summarizeArray(sanitizedValue);
  }

  if (sanitizedValue && typeof sanitizedValue === "object") {
    return summarizeObject(sanitizedValue as Record<string, unknown>);
  }

  return sanitizedValue;
};

const buildRequestUrl = (config: AxiosRequestConfig): string => {
  const baseUrl = config.baseURL ?? "";
  const requestUrl = config.url ?? "";

  if (requestUrl.startsWith("http://") || requestUrl.startsWith("https://")) {
    return requestUrl;
  }

  return `${baseUrl}${requestUrl}`;
};

const getDurationMs = (config?: NetworkRequestConfig): number | undefined => {
  if (!config?.metadata?.startedAt) {
    return undefined;
  }

  return Date.now() - config.metadata.startedAt;
};

const getAuthAttached = (config?: AxiosRequestConfig): boolean => {
  const headers = config?.headers as
    | Record<string, unknown>
    | undefined;

  const authorizationHeader =
    headers?.Authorization ?? headers?.authorization;

  return typeof authorizationHeader === "string"
    ? authorizationHeader.includes("Bearer ")
    : false;
};

// Create axios instance with shared timeout/header defaults.
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const networkConfig = config as NetworkRequestConfig;
    networkConfig.metadata = {
      requestId: ++requestCounter,
      startedAt: Date.now(),
    };

    console.log(`${NETWORK_LOG_PREFIX} request`, {
      requestId: networkConfig.metadata.requestId,
      method: (networkConfig.method || "GET").toUpperCase(),
      url: buildRequestUrl(networkConfig),
      hasAuth: getAuthAttached(networkConfig),
      params: summarizeValue(networkConfig.params),
      data: summarizeValue(networkConfig.data),
      timeout: networkConfig.timeout,
    });

    return config;
  },
  (error) => {
    console.error(`${NETWORK_LOG_PREFIX} request setup failed`, {
      message: error.message,
    });
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    const networkConfig = response.config as NetworkRequestConfig;
    console.log(`${NETWORK_LOG_PREFIX} response`, {
      requestId: networkConfig.metadata?.requestId,
      method: (networkConfig.method || "GET").toUpperCase(),
      url: buildRequestUrl(networkConfig),
      status: response.status,
      durationMs: getDurationMs(networkConfig),
      hasAuth: getAuthAttached(networkConfig),
      data: summarizeValue(response.data),
    });

    return response;
  },
  async (error) => {
    const originalRequest = error.config as NetworkRequestConfig | undefined;
    const status = error?.response?.status;
    const authHeader = originalRequest?.headers?.Authorization;
    const canRetryWithRefresh =
      status === 401 &&
      authHeader?.includes("Bearer ") &&
      !originalRequest?._retry;

    if (canRetryWithRefresh) {
      try {
        console.log(`${NETWORK_LOG_PREFIX} attempting token refresh`, {
          requestId: originalRequest?.metadata?.requestId,
          failedStatus: status,
          url: originalRequest ? buildRequestUrl(originalRequest) : undefined,
        });
        const tokens = await getAuthTokens();
        if (!tokens?.refresh_token) {
          return Promise.reject(error);
        }

        const response = await axios.post(GET_REFRESH_TOKEN, {
          refresh: tokens.refresh_token,
        });

        const newTokens = response.data;

        await setAuthTokens({
          access_token: newTokens.access,
          refresh_token: tokens.refresh_token,
        });

        console.log(`${NETWORK_LOG_PREFIX} token refresh succeeded`, {
          requestId: originalRequest?.metadata?.requestId,
        });

        if (originalRequest?.headers) {
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
        }
        axiosInstance.defaults.headers.Authorization = `Bearer ${newTokens.access}`;
        if (originalRequest) {
          originalRequest._retry = true;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        const refreshStatus =
          refreshError instanceof AxiosError
            ? refreshError.response?.status
            : undefined;

        console.error(`${NETWORK_LOG_PREFIX} token refresh failed`, {
          requestId: originalRequest?.metadata?.requestId,
          message:
            refreshError instanceof AxiosError
              ? refreshError.message
              : "Unknown refresh error",
          status: refreshStatus,
          responseData:
            refreshError instanceof AxiosError
              ? sanitizeValue(refreshError.response?.data)
              : undefined,
        });

        // Only a 401/403 means the refresh token itself was rejected and the
        // session is genuinely over. A timeout, a dropped connection or a 5xx
        // says nothing about the token, and signing the user out on those would
        // turn a passing network blip into a forced logout.
        const sessionIsOver = refreshStatus === 401 || refreshStatus === 403;

        if (sessionIsOver && !sessionExpiryNotified) {
          sessionExpiryNotified = true;
          onSessionExpired?.();
        }
      }
    }

    // 401s and transport failures are handled by callers; logging either as
    // errors makes expected offline/session recovery look like an app fault.
    const logFailure = status === 401 || !status ? console.log : console.error;
    logFailure(`${NETWORK_LOG_PREFIX} response failed`, {
      requestId: originalRequest?.metadata?.requestId,
      method: (originalRequest?.method || "GET").toUpperCase(),
      url: originalRequest ? buildRequestUrl(originalRequest) : undefined,
      status,
      durationMs: getDurationMs(originalRequest),
      hasAuth: getAuthAttached(originalRequest),
      message: error.message,
      responseData: sanitizeValue(error?.response?.data),
    });

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
