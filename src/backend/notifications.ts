import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getFirestoreDb, getFirestoreModule } from "@/lib/firebase";
import axiosInstance from "@/lib/networkUtils";
import { REGISTER_PUSH_TOKEN_ENDPOINT } from "@/lib/config";

// Task name for background fetch
const MESSAGE_NOTIFICATION_TASK = "MESSAGE_NOTIFICATION_TASK";

// Renit registers tokens with its authenticated API; Expo's persisted
// auto-registration retries while offline before app code can handle it.
void Notifications.setAutoServerRegistrationEnabledAsync(false);

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

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      throw new Error("Missing EAS project ID for push notifications");
    }

    try {
      await fetch("https://exp.host");
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
          baseUrl: "https://exp.host/--/api/v2/",
        })
      ).data;
    } catch {
      return;
    }

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
          isAuthenticationRequired: false,
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

// Keep both chat transports supplied with the current Expo token.
export async function updateUserPushToken(firebaseUid: string, pushToken: string) {
  try {
    await axiosInstance.post(REGISTER_PUSH_TOKEN_ENDPOINT, {
      expo_push_token: pushToken,
    });
  } catch (error) {
  }

  try {
    const firestore = getFirestoreDb();
    if (!firestore) {
      return;
    }

    const { doc, setDoc } = getFirestoreModule();
    const userRef = doc(firestore, "users", firebaseUid);
    await setDoc(
      userRef,
      {
        pushToken,
        lastTokenUpdate: new Date().toISOString(),
        platform: Platform.OS,
      },
      { merge: true }
    );
  } catch (error) {
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
  const firestore = getFirestoreDb();
  if (!firestore) {
    return () => undefined;
  }

  const { collection, onSnapshot } = getFirestoreModule();
  const messagesRef = collection(firestore, `users/${userId}/messages`);
  return onSnapshot(messagesRef, (snapshot: any) => {
    snapshot.docChanges().forEach((change: any) => {
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
  const handleResponse = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data as any;
    if (data?.conversationId) {
      onNotificationResponse(data.conversationId);
    }
  };

  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleResponse
  );

  void Notifications.getLastNotificationResponseAsync().then(handleResponse);

  // Also add a notification received listener for when the app is in the foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      // Handle foreground notifications if needed
    }
  );

  return () => {
    subscription.remove();
    foregroundSubscription.remove();
  };
}

export async function checkForNewMessagesOrConversations() {
  try {
    const firestore = getFirestoreDb();
    if (!firestore) {
      return null;
    }

    const { collection, query, where, orderBy, limit, getDocs } =
      getFirestoreModule();
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
