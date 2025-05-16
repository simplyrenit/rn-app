import axios from "axios";
import { useState } from "react";
import { useGlobalContext } from "../context/global-context";
import { NOTIFICATIONS_ENDPOINT, NOTIFICATIONS_PUSH_TOKEN_ENDPOINT } from "../lib/config";
import axiosInstance from "@/lib/networkUtils";

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
      const response = await axiosInstance.get<NotificationResponse>(
        NOTIFICATIONS_ENDPOINT,
      );

      setNotifications(response.data.results);
      return response.data.results;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }


  
    async function useSubmitFCMToken(fcmToken : string) {
      if (!access_token) return; // Perform function only if access_token is not null
      try {
        const response = await axiosInstance.post<NotificationResponse>(
          NOTIFICATIONS_PUSH_TOKEN_ENDPOINT,
          {push_token : fcmToken}
        );
  
        return response.data.results;
      } catch (error) {
        console.error("Error sending fcm token to:", error);
        // throw error;
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

  return { notifications, getNotifications, markAllAsRead,useSubmitFCMToken };
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