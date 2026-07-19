import * as functions from "firebase-functions";
import { admin } from "./admin";

export const onNewMessage = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (snapshot: any) => {
    const message = snapshot.data();

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

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipientToken,
        title: `Message from ${
          conversation?.participants.find((p: any) => p.userId === message.from)
            ?.username || "User"
        }`,
        body:
          message.type === "text" ? message.message?.text : "New offer received",
        data: {
          conversationId: message.conversationId,
          messageType: message.type,
          senderId: message.from,
          type: "chat",
        },
        sound: "default",
        priority: "high",
        channelId: "chat",
      }),
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed: ${response.status}`);
    }

    const ticket = (await response.json()) as {
      data?: Array<{ status?: string; message?: string }>;
    };
    if (ticket.data?.[0]?.status === "error") {
      throw new Error(`Expo push rejected: ${ticket.data[0].message}`);
    }
  });
