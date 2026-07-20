import { useGlobalContext } from "@/context/global-context";
import { getFirestoreDb, getFirestoreModule } from "@/lib/firebase";
import { Conversation, Message, UserDetails } from "@/lib/types";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";

interface BlockedRecord {
  initiator: string;
  blocked_user: string;
  timestamp: any;
}

const requireFirestore = () => {
  const firestore = getFirestoreDb();
  if (!firestore) {
    throw new Error("Firebase Firestore is unavailable.");
  }

  return firestore;
};

const getNotificationHelpers = () =>
  require("./notifications") as typeof import("./notifications");

const documentExists = (
  snapshot: { exists?: boolean | (() => boolean) } | null | undefined
) => {
  if (!snapshot) {
    return false;
  }

  return typeof snapshot.exists === "function"
    ? snapshot.exists()
    : Boolean(snapshot.exists);
};

export function useChat() {
  const { isAuthenticated, authTokens, userDetails } = useGlobalContext();
  const { access_token } = authTokens || {};
  const navigation = useNavigation();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const { setupChatNotifications, setupNotificationListeners } =
      getNotificationHelpers();

    setupChatNotifications();

    // Set up notification response listener
    const notificationListener = setupNotificationListeners(
      (conversationId) => {
        // Navigate to the conversation when notification is tapped
        if (conversationId) {
          // @ts-ignore - Type safety is handled by the navigation library
          navigation.navigate("Chat", { conversationId });
        }
      }
    );

    return () => {
      notificationListener();
    };
  }, [isAuthenticated, navigation]);

  async function startChat(
    userDetails1: UserDetails,
    userDetails2: UserDetails,
    productDetails: {
      title: string;
      location: string;
      image: string;
      rate: string;
      type: string;
      text: string;
      id?: string;
    }
  ): Promise<{ success: boolean; content: string }> {
    const firestore = requireFirestore();
    const { getDocs, collection, addDoc } = getFirestoreModule();
    const isBlocked = await checkIfUsersAreBlocked(
      userDetails1.userId,
      userDetails2.userId
    );

    if (isBlocked) {
      return { success: false, content: "Cannot start conversation" };
    }

    let conversationDoc;

    try {
      const querySnapshot = await getDocs(
        collection(firestore, "conversations")
      );
      querySnapshot.forEach((ss: any) => {
        const pc = ss.data()?.initialParticipants;
        if ((pc?.[0]?.userId === userDetails1.userId && pc?.[1]?.userId === userDetails2.userId) || (pc?.[0]?.userId === userDetails2.userId && pc?.[1]?.userId === userDetails1.userId)) {
          conversationDoc = ss;
        }
      })
      if (!conversationDoc) {
        const conversations: Conversation[] = [];
        const initiator = userDetails1;

        const conversation: Conversation = {
          participants: [userDetails1, userDetails2],
          initialParticipants: [userDetails1, userDetails2],
          readStatus: [
            {
              userId: userDetails1.userId,
              isRead: true,
            },
            {
              userId: userDetails2.userId,
              isRead: false,
            },
          ],
          readCount: [
            {
              count: 0,
              userId: userDetails1.userId,
            },
            {
              count: 1,
              userId: userDetails2.userId,
            },
          ],
          blockStatus: {
            initiatedBy: "",
            reason: "",
            isBlocked: false,
          },
          lastMessageTime: new Date().toISOString(),
          startedBy: initiator.userId,
          lastMessage: "Chat started",
        };

        conversationDoc = await addDoc(
          collection(firestore, "conversations"),
          conversation
        );
      }

      await createInitialMessage(
        conversationDoc.id,
        userDetails1?.userId,
        productDetails
      );
      return { success: true, content: conversationDoc.id };
    } catch (error) {
      console.error("Error starting conversation:", error);
      throw error;
    }
  }

  async function createInitialMessage(
    conversationId: string,
    senderId: string,
    product: {
      title: string;
      location: string;
      image: string;
      rate: string;
      type: string;
      text: string;
      id?: string;
    }
  ): Promise<void> {
    const firestore = requireFirestore();
    const { addDoc, collection } = getFirestoreModule();
    let message: Message;
    if (product.type === "product") {
      message = {
        conversationId: conversationId,
        from: senderId,
        type: "product_post",
        timestamp: new Date(),
        message: {
          item: {
            name: product.title,
            image: product.image,
            price: product.rate,
            location: product.location,
            id: product.id,
          },
        },
      };
    } else {
      message = {
        conversationId: conversationId,
        from: senderId,
        type: "text",
        timestamp: new Date(),
        message: { text: product.text },
      };
    }

    try {
      await addDoc(collection(firestore, "messages"), message);
    } catch (error) {
      console.error("Error creating initial message:", error);
    }
  }

  async function getChats(): Promise<Conversation[]> {
    const firestore = requireFirestore();
    const { getDocs, collection } = getFirestoreModule();
    try {
      const querySnapshot = await getDocs(
        collection(firestore, "conversations")
      );
      const conversations: Conversation[] = [];

      querySnapshot.forEach((doc: any) => {
        const conversation = doc.data() as Conversation;
        if (
          conversation?.participants?.length > 0 &&
          conversation.participants.some(
            (participant) => participant?.userId === userDetails?.username
          )
        ) {
          conversations.push({ ...conversation, id: doc.id });
        }
      });

      return conversations;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }
  }

  function subscribeToChats(
    userId: string,
    callback: (chats: Conversation[]) => void
  ): () => void {
    const firestore = requireFirestore();
    const { query, collection, onSnapshot } = getFirestoreModule();
    const { registerForPushNotificationsAsync, updateUserPushToken } =
      getNotificationHelpers();

    const q = query(collection(firestore, "conversations"));

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      if (!snapshot) {
        callback([]);
        return;
      }

      const chats: Conversation[] = [];
      snapshot.forEach((doc: any) => {
        const conversation = doc.data() as Conversation;

        if (
          conversation?.participants?.length > 0 &&
          conversation.participants.some(
            (participant) => participant?.userId === userDetails?.username
          )
        ) {


          const readStatus = conversation.readStatus || [];
          const readCount = conversation.readCount || [];

          chats.push({
            ...conversation,
            id: doc.id,
            readStatus,
            readCount,
          });

        }
      });

      chats.sort((a, b) => {
        const timeA = a.lastMessageTime
          ? new Date(a.lastMessageTime).getTime()
          : 0;
        const timeB = b.lastMessageTime
          ? new Date(b.lastMessageTime).getTime()
          : 0;
        return timeB - timeA;
      });

      callback(chats);
    }, (error: unknown) => {
      console.error("Unable to load chats:", error);
      callback([]);
    });

    registerForPushNotificationsAsync().then((token) => {
      if (token) {

        updateUserPushToken(userId, token);

      } else {
      }
    });


    return unsubscribe;
  }

  async function deleteChat(conversationId: string): Promise<void> {
    const firestore = requireFirestore();
    const { doc, getDoc, updateDoc } = getFirestoreModule();
    try {
      const conversationRef = doc(firestore, "conversations", conversationId);

      const conversationSnapshot = await getDoc(conversationRef);
      if (documentExists(conversationSnapshot)) {
        const conversationData = conversationSnapshot.data() as Conversation;

        await updateDoc(conversationRef, {
          participants: conversationData.participants.filter(
            (p) => p.userId !== userDetails?.username
          ), // Remove from participants
        });

      } else {
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      throw error;
    }
  }

  async function getMessages(conversationId: string): Promise<Message[]> {
    const firestore = requireFirestore();
    const { collection, query, where, getDocs } = getFirestoreModule();
    const messagesRef = collection(firestore, "messages");
    const q = query(messagesRef, where("conversationId", "==", conversationId));

    try {
      const querySnapshot = await getDocs(q);
      const messages: Message[] = querySnapshot.docs.map(
        (doc: any) =>
        ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(), // Convert Firestore Timestamp to JS Date
        } as Message)
      );

      return messages;
    } catch (error) {
      return [];
    }
  }

  function subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    const firestore = requireFirestore();
    const { query, collection, where, orderBy, onSnapshot } =
      getFirestoreModule();
    const q = query(
      collection(firestore, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const messages: Message[] = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(), // Ensure timestamp is a Date object
      })) as Message[];

      callback(messages);
    });

    return unsubscribe;
  }

  async function sendMessage(
    text: string,
    conversationId: string
  ): Promise<void> {
    const firestore = requireFirestore();
    const { addDoc, collection, doc, getDoc, updateDoc } =
      getFirestoreModule();
    const timestamp = new Date();
    const object: Message = {
      conversationId: conversationId,
      from: userDetails?.username!,
      timestamp,
      type: "text",
      message: {
        text,
      },
    };

    try {
      await addDoc(collection(firestore, "messages"), object);

      const conversationRef = doc(firestore, "conversations", conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (documentExists(conversationDoc)) {
        const conversationData = conversationDoc.data() as Conversation;

        const updatedReadStatus = conversationData.readStatus.map((status) => {
          if (status.userId !== userDetails?.username) {
            return { ...status, isRead: false };
          }
          return status;
        });

        const updatedReadCount = conversationData.readCount.map((count) => {
          if (count.userId !== userDetails?.username) {
            return { ...count, count: count.count + 1 };
          }
          return count;
        });

        await updateDoc(conversationRef, {
          lastMessage: text,
          lastMessageTime: timestamp.toISOString(),
          readStatus: updatedReadStatus,
          readCount: updatedReadCount,
        });
      }

    } catch (error) {
    }
  }

  async function readChat(conversationId: string): Promise<void> {
    const firestore = requireFirestore();
    const { doc, getDoc, updateDoc } = getFirestoreModule();
    try {
      const chatRef = doc(firestore, "conversations", conversationId);
      const chatDoc = await getDoc(chatRef);

      if (documentExists(chatDoc)) {
        const chatData = chatDoc.data() as Conversation;

        const userReadStatus = chatData.readStatus.find(
          (status) => status.userId === userDetails?.username
        );
        const userReadCountIndex = chatData.readCount.findIndex(
          (count) => count.userId === userDetails?.username
        );

        if (userReadStatus) {
          const updatedReadStatus = [...chatData.readStatus];
          const updatedReadCount = [...chatData.readCount];

          updatedReadStatus[
            chatData.readStatus.indexOf(userReadStatus)
          ].isRead = true;
          updatedReadCount[userReadCountIndex].count = 0;

          await updateDoc(chatRef, {
            readStatus: updatedReadStatus,
            readCount: updatedReadCount,
          });
        } else {
          await updateDoc(chatRef, {
            readStatus: [
              ...chatData.readStatus,
              { userId: userDetails?.username, isRead: true },
            ],
            readCount: [
              ...chatData.readCount,
              { userId: userDetails?.username, count: 0 },
            ],
          });
        }
      }
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  }
  async function getParticipantDetails(
    conversationId: string
  ): Promise<UserDetails> {
    const firestore = requireFirestore();
    const { doc, getDoc } = getFirestoreModule();
    const conversationRef = doc(firestore, "conversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);
    if (!documentExists(conversationDoc)) {
      throw new Error("Conversation not found");
    }
    const conversation = conversationDoc.data() as Conversation;

    const otherParticipant = conversation.initialParticipants.find(
      (participant) => participant.userId !== userDetails?.username
    );

    if (!otherParticipant) {
      throw new Error("Other participant not found");
    }

    return otherParticipant;
  }

  async function getMyDetails(conversationId: string): Promise<UserDetails> {
    const firestore = requireFirestore();
    const { doc, getDoc } = getFirestoreModule();
    const conversationRef = doc(firestore, "conversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);
    if (!documentExists(conversationDoc)) {
      throw new Error("Conversation not found");
    }
    const conversation = conversationDoc.data() as Conversation;

    const myDetails: any = conversation.participants.find(
      (participant) => participant.userId === userDetails?.username
    );

    if (!myDetails) {
      throw new Error("Your details were not found");
    }

    return myDetails;
  }

  async function makeOffer(
    conversationId: string,
    message: {
      item: {
        duration: number;
        endDate: string;
        image: string;
        location: string;
        name: string;
        price: string;
        securityDeposit: string;
        startDate: string;
        offerStatus?: "accepted" | "rejected" | "pending";
      };
      name: string;
    }
  ): Promise<void> {
    const firestore = requireFirestore();
    const { addDoc, collection, doc, getDoc, updateDoc } =
      getFirestoreModule();
    const timestamp = new Date();

    const object: Message = {
      conversationId: conversationId,
      from: userDetails?.username!,
      timestamp,
      type: "make_offer",
      message: {
        ...message,
      },
    };

    try {
      await addDoc(collection(firestore, "messages"), object);

      const conversationRef = doc(firestore, "conversations", conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (documentExists(conversationDoc)) {
        const conversationData = conversationDoc.data() as Conversation;

        const updatedReadStatus = conversationData.readStatus.map((status) => {
          if (status.userId !== userDetails?.username) {
            return { ...status, isRead: false };
          }
          return status;
        });

        const updatedReadCount = conversationData.readCount.map((count) => {
          if (count.userId !== userDetails?.username) {
            return { ...count, count: count.count + 1 };
          }
          return count;
        });

        await updateDoc(conversationRef, {
          lastMessage: "An offer was made!",
          lastMessageTime: timestamp.toISOString(),
          readStatus: updatedReadStatus,
          readCount: updatedReadCount,
        });
      }

    } catch (error) {
    }
  }

  async function checkIfUsersAreBlocked(
    user1: string,
    user2: string
  ): Promise<boolean> {
    const firestore = requireFirestore();
    const { collection, query, where, getDocs } = getFirestoreModule();
    const blockedRef = collection(firestore, "blocked");
    const q1 = query(
      blockedRef,
      where("initiator", "==", user1),
      where("blocked_user", "==", user2)
    );
    const q2 = query(
      blockedRef,
      where("initiator", "==", user2),
      where("blocked_user", "==", user1)
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
    ]);

    return !snapshot1.empty || !snapshot2.empty;
  }

  async function blockUser(
    userId: string,
    reason: string,
    conversationId: string
  ): Promise<void> {
    const firestore = requireFirestore();
    const { serverTimestamp, addDoc, collection, doc, updateDoc } =
      getFirestoreModule();
    try {
      // Create record in blocked collection
      const blockedRecord: BlockedRecord = {
        initiator: userDetails?.username!,
        blocked_user: userId,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(firestore, "blocked"), blockedRecord);

      // Update conversation as before
      const conversationsRef = doc(firestore, "conversations", conversationId);
      await updateDoc(conversationsRef, {
        blockStatus: {
          initiatedBy: userDetails?.username!,
          isBlocked: true,
          reason,
        },
      });
    } catch (error) {
      console.error("Error blocking user:", error);
      throw error;
    }
  }

  async function unblockUser(conversationId: string): Promise<void> {
    const firestore = requireFirestore();
    const { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } =
      getFirestoreModule();
    try {
      // Get the blocked user's ID from the conversation
      const conversationRef = doc(firestore, "conversations", conversationId);
      const conversationDoc = await getDoc(conversationRef);
      if (!documentExists(conversationDoc)) {
        throw new Error("Conversation not found");
      }
      const conversation = conversationDoc.data() as Conversation;

      if (conversation.blockStatus.initiatedBy !== userDetails?.username) {
        throw new Error("Only the blocker can unblock the user");
      }

      const blockedUserId = conversation.initialParticipants.find(
        (p) => p.userId !== userDetails?.username
      )?.userId;

      if (!blockedUserId) throw new Error("Blocked user not found");

      // Remove record from blocked collection
      const blockedRef = collection(firestore, "blocked");
      const q = query(
        blockedRef,
        where("initiator", "==", userDetails?.username),
        where("blocked_user", "==", blockedUserId)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        await Promise.all(
          querySnapshot.docs.map((doc: any) => deleteDoc(doc.ref))
        );
      }

      // Update conversation as before
      await updateDoc(conversationRef, {
        blockStatus: { initiatedBy: "", isBlocked: false, reason: "" },
      });
    } catch (error) {
      console.error("Error unblocking user:", error);
      throw error;
    }
  }

  async function isBlocked(conversationId: string): Promise<{
    isBlocked: boolean;
    initiatedBy: string;
  }> {
    const firestore = requireFirestore();
    const { doc, getDoc } = getFirestoreModule();
    const conversationRef = doc(firestore, "conversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);
    if (!documentExists(conversationDoc)) {
      throw new Error("Conversation not found");
    }
    const conversation = conversationDoc.data() as Conversation;
    return {
      isBlocked: conversation.blockStatus.isBlocked,
      initiatedBy: conversation.blockStatus.initiatedBy,
    };
  }

  async function offerOperations(
    messageId: string,
    operation: "accepted" | "rejected"
  ): Promise<void> {
    const firestore = requireFirestore();
    const { doc, getDoc, updateDoc } = getFirestoreModule();
    try {
      const messageRef = doc(firestore, "messages", messageId);
      const messageDoc = await getDoc(messageRef);

      if (!documentExists(messageDoc)) {
        throw new Error("Message not found");
      }

      const message = messageDoc.data();
      const updatedMessage = { ...message };

      if (message?.type === "make_offer" && message?.message?.item) {
        updatedMessage.message.item.offerStatus = operation;
        await updateDoc(messageRef, {
          message: updatedMessage.message,
        });
      }
    } catch (error) {
      console.error("Error updating offer status:", error);
      throw error;
    }
  }

  return {
    startChat,
    getChats,
    subscribeToChats,
    deleteChat,
    getMessages,
    subscribeToMessages,
    sendMessage,
    readChat,
    getParticipantDetails,
    makeOffer,
    getMyDetails,
    blockUser,
    unblockUser,
    isBlocked,
    offerOperations,
  };
}
