import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { Platform } from "react-native";
import { firestore } from "@/lib/config";
import {
  doc,
  updateDoc,
  collection,
  onSnapshot,
} from "@react-native-firebase/firestore";

// Task name for background fetch
const MESSAGE_NOTIFICATION_TASK = "MESSAGE_NOTIFICATION_TASK";

// Function to register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }

    // Get the token with the correct project ID
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "4694f1b4-ada3-42b1-84ab-9a7d6fe2c1cb", // Your Expo project ID from app.json
      })
    ).data;

    console.log("Notification token:", token);
  } else {
    alert("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("chat", {
      name: "Chat Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
      enableVibrate: true,
      enableLights: true,
    });
  }
  if (Platform.OS === "ios") {
    await Notifications.setNotificationCategoryAsync("chat", [
      {
        identifier: "reply",
        buttonTitle: "Reply",
        options: {
          opensAppToForeground: true,
          authenticationRequired: false,
        },
      },
      {
        identifier: "view",
        buttonTitle: "View",
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  }

  return token;
}

// Function to save the push token to Firestore
export async function updateUserPushToken(userId: string, pushToken: string) {
  try {
    const userRef = doc(firestore, "users", userId);
    await updateDoc(userRef, {
      pushToken,
      lastTokenUpdate: new Date().toISOString(),
      platform: Platform.OS,
    });
    console.log("Push token updated successfully");
  } catch (error) {
    console.error("Error updating push token:", error);
  }
}

// Notification settings for when the app is open
export function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Listen for new messages in Firestore
export function listenForNewMessages(userId: string) {
  const messagesRef = collection(firestore, `users/${userId}/messages`);
  return onSnapshot(messagesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const newMessage = change.doc.data();
        Notifications.scheduleNotificationAsync({
          content: {
            title: `New message from ${newMessage.username}`,
            body: newMessage.text,
          },
          trigger: null,
        });
      }
    });
  });
}

// Background task to check for new messages and conversations
TaskManager.defineTask(MESSAGE_NOTIFICATION_TASK, async () => {
  try {
    // Implement a function to check your server or Firestore for new message or conversation data
    const hasNewData = await checkForNewMessagesOrConversations();

    if (hasNewData) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "New Message",
          body: `You have a new message from ${hasNewData.username}`,
          data: { conversationId: hasNewData.conversationId },
        },
        trigger: null,
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error("Error in background fetch task:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background fetch task
export async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(MESSAGE_NOTIFICATION_TASK, {
    minimumInterval: 60, // Check every minute
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

// Listener for notification response to navigate to conversation
export function setupNotificationListeners(
  onNotificationResponse: (conversationId: string) => void
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as any;
      if (data?.conversationId) {
        onNotificationResponse(data.conversationId);
      }
    }
  );

  // Also add a notification received listener for when the app is in the foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // Handle foreground notifications if needed
      console.log("Received notification in foreground:", notification);
    }
  );

  return () => {
    subscription.remove();
    foregroundSubscription.remove();
  };
}

import {
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "@react-native-firebase/firestore";

export async function checkForNewMessagesOrConversations() {
  try {
    // Assuming user ID and last checked timestamp are available
    const userId = `${Platform.OS}`; // Replace with actual user ID
    const lastReadTimestamp = new Date(); // This should be set to the last time you checked for messages

    // Query to fetch messages for the user that were created after lastReadTimestamp
    const messagesRef = collection(firestore, "messages");
    const messagesQuery = query(
      messagesRef,
      where("recipientId", "==", userId),
      where("createdAt", ">", lastReadTimestamp),
      orderBy("createdAt", "asc"),
      limit(1)
    );

    const snapshot = await getDocs(messagesQuery);

    // Check if there are any new messages
    if (!snapshot.empty) {
      const newMessageData = snapshot.docs[0].data();
      const senderUsername = newMessageData.senderUsername || "Someone";

      // Return data for the notification
      return {
        conversationId: newMessageData.conversationId,
        username: senderUsername,
      };
    }

    return null; // No new messages found
  } catch (error) {
    console.error("Error checking for new messages:", error);
    return null;
  }
}

// Function to handle incoming chat notifications
export function setupChatNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });
}
