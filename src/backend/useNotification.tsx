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
    // Only what is still unread: opening the screen used to PATCH every
    // notification on the account each time, read or not.
    const unread = items.filter((notification) => !notification.is_read);
    if (!isAuthenticated || !access_token || unread.length === 0) {
      return;
    }

    // allSettled, so one failed PATCH does not throw away the ones that went
    // through: those rows are read on the server and should be read here too.
    const results = await Promise.allSettled(
      unread.map((notification) =>
        axiosInstance
          .patch(`${NOTIFICATIONS_ENDPOINT}${notification.id}/`, {
            is_read: true,
          })
          .then((response) => response.data)
      )
    );

    const updatedById = new Map<string, Notification>();
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        updatedById.set(result.value.id, result.value);
      } else {
        console.error("Error marking a notification as read:", result.reason);
      }
    });

    // Keep the ones that were already read; replacing the list with only the
    // patched ones would drop them from the screen.
    setNotifications(
      items.map((notification) => updatedById.get(notification.id) ?? notification)
    );
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
