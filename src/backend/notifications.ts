import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getFirestoreDb, getFirestoreModule } from "@/lib/firebase";
import axiosInstance from "@/lib/networkUtils";
import { REGISTER_PUSH_TOKEN_ENDPOINT } from "@/lib/config";
import { getAuthTokens } from "@/lib/auth-fns";
import { getDeviceInfo, sessionBody } from "@/lib/device";
import { PushRoute, pushRoute } from "@/lib/push-routes";
import { shouldDropPush } from "@/lib/sign-out";
import { colors } from "@/lib/design-tokens";

// Task name for background fetch
const MESSAGE_NOTIFICATION_TASK = "MESSAGE_NOTIFICATION_TASK";

// Renit registers tokens with its authenticated API; Expo's persisted
// auto-registration retries while offline before app code can handle it.
void Notifications.setAutoServerRegistrationEnabledAsync(false);

function expoProjectId(): string | undefined {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

/** The Expo push token, or undefined when it cannot be had (offline, no Expo answer). */
async function fetchExpoToken(projectId: string): Promise<string | undefined> {
  try {
    await fetch("https://exp.host");
    return (
      await Notifications.getExpoPushTokenAsync({
        projectId,
        baseUrl: "https://exp.host/--/api/v2/",
      })
    ).data;
  } catch {
    return undefined;
  }
}

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
      // Declining notifications is a legitimate choice, not an error worth
      // interrupting the user with. The app works fine without push.
      console.warn("Push notifications permission was not granted");
      return;
    }

    const projectId = expoProjectId();

    if (!projectId) {
      throw new Error("Missing EAS project ID for push notifications");
    }

    token = await fetchExpoToken(projectId);
    // As before: no token from Expo, nothing more to set up.
    if (!token) return;
  } else {
    // Simulators and emulators cannot register for push. This is a developer
    // diagnostic, so it must not surface as a blocking alert over the UI.
    console.warn("Push notifications require a physical device");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("chat", {
      name: "Chat Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.dark.brand,
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

/**
 * Tells the server which phone this session is, at every start once signed in
 * (ENG-146; API-CONTRACT `register-push-token`). The push token goes too when the
 * phone already has one, and the call is made without it when it has none: with
 * notifications off, on a simulator, or while Expo does not answer. That is what
 * fills a session an older build started, so it stops being asked for a fresh
 * code the phone has no screen for.
 *
 * It never asks for notification permission: that prompt stays where it was, with
 * the chat subscription. A failure is not shown; the next start tries again.
 */
export async function registerDeviceSession(): Promise<void> {
  let token: string | undefined;
  try {
    if (Device.isDevice) {
      const { status } = await Notifications.getPermissionsAsync();
      const projectId = expoProjectId();
      if (status === "granted" && projectId) token = await fetchExpoToken(projectId);
    }
  } catch {
    // No token this time; the device fields still go.
  }
  try {
    await axiosInstance.post(REGISTER_PUSH_TOKEN_ENDPOINT, sessionBody(token, await getDeviceInfo()));
  } catch {
    // Quietly: tried again at the next start.
  }
}

// Keep both chat transports supplied with the current Expo token.
export async function updateUserPushToken(firebaseUid: string, pushToken: string) {
  try {
    // With the device fields (ENG-146): the server files the token under this
    // phone's session, and fills the platform of a session an older build started
    // so that it stops being asked for a fresh code.
    await axiosInstance.post(REGISTER_PUSH_TOKEN_ENDPOINT, sessionBody(pushToken, await getDeviceInfo()));
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

// A tap is answered once: the last one is handed out again every time the
// listeners are set up (each sign-in), and must not reopen a booking each time.
let lastOpenedPush: string | null = null;

/**
 * The app's push router (ENG-173 owns it; API-CONTRACT, Common › Push
 * notifications). Every push carries `data.type`; `pushRoute` in
 * `src/lib/push-routes.ts` is the table that says where each type goes, and
 * later sub-tasks add their types there, not here.
 *
 * A push that arrives while the app is open says something changed
 * (`onArrive`: read it again). A tap on one opens its screen (`onOpen`), which
 * reads the truth from the API. `onOpen` answers whether it took the route: a
 * tap is marked as handled only then, so one that could not be opened yet is
 * offered again.
 */
export function setupPushRouter(handlers: {
  onArrive: (route: PushRoute) => void;
  onOpen: (route: PushRoute) => boolean;
}) {
  const open = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    const route = pushRoute(response.notification.request.content.data);
    const id = response.notification.request.identifier;
    if (!route || id === lastOpenedPush) return;
    if (handlers.onOpen(route)) lastOpenedPush = id;
  };

  const arrived = Notifications.addNotificationReceivedListener((notification) => {
    const route = pushRoute(notification.request.content.data);
    if (route) handlers.onArrive(route);
  });
  const opened = Notifications.addNotificationResponseReceivedListener(open);
  // The app was started by the tap.
  void Notifications.getLastNotificationResponseAsync().then(open);

  return () => {
    arrived.remove();
    opened.remove();
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

      // A `ring` for a shop reaches this phone only because the server still holds
      // its session, which happens while a sign-out waits to be repeated (ENG-146).
      // Nobody is signed in to answer it, so it is not shown and does not sound.
      if (shouldDropPush(data, Boolean(await getAuthTokens()))) {
        return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });
}
