import axios from "axios";
import { useState } from "react";
import { useGlobalContext } from "../context/global-context";
import { NOTIFICATIONS_ENDPOINT } from "../lib/config";

interface NotificationResponse {
  results: Notification[];
}

export function useNotifications() {
  const { authTokens } = useGlobalContext();
  const { access_token } = authTokens || {};
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function getNotifications() {
    if (!access_token) return; // Perform function only if access_token is not null
    try {
      const response = await axios.get<NotificationResponse>(
        NOTIFICATIONS_ENDPOINT,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      setNotifications(response.data.results);
      return response.data.results;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async function markAllAsRead() {
    if (!access_token) return; // Perform function only if access_token is not null
    try {
      const updatedNotifications = await Promise.all(
        notifications.map((notification) =>
          axios
            .patch(
              `${NOTIFICATIONS_ENDPOINT}${notification.id}/`,
              { is_read: true },
              {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                },
              }
            )
            .then((response) => response.data)
        )
      );

      setNotifications(updatedNotifications);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      throw error;
    }
  }

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
