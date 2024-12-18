import * as functions from "firebase-functions";
import { admin } from "./admin";

export const onNewMessage = functions.firestore
  .document("messages/{messageId}")
  .onWrite(async (change, context) => {
    const message = change.after.data();

    if (!message) {
      console.error("No message data found");
      return;
    }

    // Get the conversation to find the recipient
    const conversationDoc = await admin
      .firestore()
      .collection("conversations")
      .doc(message.conversationId)
      .get();

    if (!conversationDoc.exists) {
      console.error("Conversation not found");
      return;
    }

    const conversation = conversationDoc.data();

    // Find the recipient (the user who didn't send the message)
    const recipient = conversation?.participants.find(
      (p: any) => p.userId !== message.from
    );

    if (!recipient?.userId) {
      console.error("Recipient not found");
      return;
    }

    // Get recipient's push token
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(recipient.userId)
      .get();

    const recipientToken = userDoc.data()?.pushToken;

    if (!recipientToken) {
      console.error("No push token found for recipient");
      return;
    }

    // Send the notification
    await admin.messaging().send({
      token: recipientToken,
      notification: {
        title: `Message from ${
          conversation?.participants.find((p: any) => p.userId === message.from)
            ?.username || "User"
        }`,
        body:
          message.type === "text" ? message.message.text : "New offer received",
        sound: "default",
        badge: "1",
      },
      data: {
        conversationId: message.conversationId,
        messageType: message.type,
        senderId: message.from,
        type: "chat",
        channelId: "chat", // For Android
        category: "chat", // For iOS
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "chat",
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            category: "chat",
            sound: "default",
            threadId: message.conversationId,
            mutableContent: true,
            contentAvailable: true,
          },
        },
      },
    });

    console.log("Notification sent successfully");
  });
