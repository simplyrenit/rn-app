import { cloudEvent, type CloudEvent } from "@google-cloud/functions-framework";
import { admin } from "./admin";

type FirestoreEventData = {
  value?: { name?: string };
};

function getDocumentPath(event: { subject?: string; data?: FirestoreEventData }) {
  const resource = event.data?.value?.name ?? event.subject;
  if (!resource) {
    return null;
  }

  const path = resource.includes("/documents/")
    ? resource.split("/documents/")[1]
    : resource.replace(/^documents\//, "");

  return path?.startsWith("messages/") ? path : null;
}

cloudEvent<FirestoreEventData>("onNewMessage", async (event: CloudEvent<FirestoreEventData>) => {
    const documentPath = getDocumentPath(event);
    if (!documentPath) {
      console.error("Unable to identify the created message document");
      return;
    }

    const messageSnapshot = await admin.firestore().doc(documentPath).get();
    const message = messageSnapshot.data();

    if (!message) {
      console.error("No message data found", { documentPath });
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
      .doc(recipient.firebaseUid)
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
      data?: { id?: string; status?: string; message?: string };
    };
    if (ticket.data?.status === "error") {
      throw new Error(`Expo push rejected: ${ticket.data.message}`);
    }

    console.info("Expo push ticket accepted", {
      conversationId: message.conversationId,
      ticketId: ticket.data?.id,
    });
  });
