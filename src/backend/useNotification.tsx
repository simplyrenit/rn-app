import { useCallback, useState } from "react";
import { useGlobalContext } from "../context/global-context";
import { NOTIFICATIONS_ENDPOINT } from "../lib/config";
import axiosInstance from "@/lib/networkUtils";
import axios from "axios";

interface NotificationResponse {
  results: Notification[];
}

export function useNotifications() {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const { access_token } = authTokens || {};
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const getNotifications = useCallback(async () => {
    if (!isAuthenticated || !access_token) {
      setNotifications([]);
      return [];
    }

    try {
      const response = await axiosInstance.get<NotificationResponse>(
        NOTIFICATIONS_ENDPOINT,
      );

      setNotifications(response.data.results);
      return response.data.results;
    } catch (error) {
      if (!(axios.isAxiosError(error) && !error.response)) {
        console.error("Error fetching notifications:", error);
      }
      setNotifications([]);
      return [];
    }
  }, [access_token, isAuthenticated]);

  const markAllAsRead = useCallback(async (items: Notification[]) => {
    if (!isAuthenticated || !access_token || items.length === 0) {
      return;
    }

    try {
      const updatedNotifications = await Promise.all(
        items.map((notification) =>
          axiosInstance
            .patch(`${NOTIFICATIONS_ENDPOINT}${notification.id}/`, {
              is_read: true,
            })
            .then((response) => response.data)
        )
      );

      setNotifications(updatedNotifications);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      return;
    }
  }, [access_token, isAuthenticated]);

  return { notifications, getNotifications, markAllAsRead };
}

export interface Notification {
  id: string;
  user: {
    username: string;
    image: string;
    first_name: string;
    last_name: string;
  };
  actor: {
    username: string;
    image: string;
    first_name: string;
    last_name: string;
  };
  message: string;
  is_read: boolean;
  created_at: string;
}
