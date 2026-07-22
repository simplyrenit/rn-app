import { useGlobalContext } from "@/context/global-context";
import {
  authenticateFirebase,
  getFirestoreDb,
  getFirestoreModule,
} from "@/lib/firebase";
import { Conversation, Message, UserDetails } from "@/lib/types";
import { useEffect } from "react";

interface BlockedRecord {
  initiator: string;
  initiatorUid: string;
  blocked_user: string;
  blockedUserUid: string;
  participantIds: string[];
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

  async function requireChatAuth() {
    if (!access_token) {
      throw new Error("Sign in to use chat.");
    }

    await authenticateFirebase(access_token);
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    requireChatAuth().catch((error) =>
      console.warn("Unable to authenticate chat:", error)
    );
  }, [isAuthenticated, access_token]);

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
    await requireChatAuth();
    const firestore = requireFirestore();
    const { getDocs, collection, addDoc, query, where } = getFirestoreModule();
    const isBlocked = await checkIfUsersAreBlocked(
      userDetails1,
      userDetails2
    );

    if (isBlocked) {
      return { success: false, content: "Cannot start conversation" };
    }

    let conversationDoc;

    try {
      const querySnapshot = await getDocs(
        query(
          collection(firestore, "conversations"),
          where("participantIds", "array-contains", userDetails1.firebaseUid)
        )
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
          participantIds: [userDetails1.firebaseUid, userDetails2.firebaseUid],
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
        await createInitialMessage(
          conversationDoc.id,
          userDetails1,
          productDetails
        );
      }

      return { success: true, content: conversationDoc.id };
    } catch (error) {
      console.error("Error starting conversation:", error);
      throw error;
    }
  }

  async function createInitialMessage(
    conversationId: string,
    sender: UserDetails,
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
        from: sender.userId,
        senderUid: sender.firebaseUid,
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
        from: sender.userId,
        senderUid: sender.firebaseUid,
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
    await requireChatAuth();
    const firestore = requireFirestore();
    const { getDocs, collection, query, where } = getFirestoreModule();
    try {
      const querySnapshot = await getDocs(
        query(
          collection(firestore, "conversations"),
          where("participantIds", "array-contains", userDetails?.firebase_uid)
        )
      );
      const conversations: Conversation[] = [];

      querySnapshot.forEach((doc: any) => {
        const conversation = doc.data() as Conversation;
        if (!conversation.hiddenBy?.[userDetails?.firebase_uid || ""]) {
          conversations.push({ ...conversation, id: doc.id });
        }
      });

      return conversations;
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }
  }

  function subscribeToChats(callback: (chats: Conversation[]) => void): () => void {
    const firestore = requireFirestore();
    const { query, collection, onSnapshot, where } = getFirestoreModule();
    const { registerForPushNotificationsAsync, updateUserPushToken } =
      getNotificationHelpers();
    let unsubscribe = () => {};

    requireChatAuth()
      .then(() => {
        const q = query(
          collection(firestore, "conversations"),
          where("participantIds", "array-contains", userDetails?.firebase_uid)
        );
        unsubscribe = onSnapshot(
          q,
          (snapshot: any) => {
            const chats = snapshot.docs
              .map((doc: any) => ({
                ...doc.data(),
                id: doc.id,
                readStatus: doc.data().readStatus || [],
                readCount: doc.data().readCount || [],
              }))
              .filter(
                (conversation: Conversation) =>
                  !conversation.hiddenBy?.[userDetails?.firebase_uid || ""]
              )
              .sort(
                (a: Conversation, b: Conversation) =>
                  new Date(b.lastMessageTime || 0).getTime() -
                  new Date(a.lastMessageTime || 0).getTime()
              );
            callback(chats);
          },
          (error: unknown) => {
            console.error("Unable to load chats:", error);
            callback([]);
          }
        );

        registerForPushNotificationsAsync().then((token) => {
          if (token && userDetails?.firebase_uid) {
            updateUserPushToken(userDetails.firebase_uid, token);
          }
        });
      })
      .catch((error) => {
        console.error("Unable to authenticate chat:", error);
        callback([]);
      });

    return () => unsubscribe();
  }

  async function deleteChat(conversationId: string): Promise<void> {
    await requireChatAuth();
    const firestore = requireFirestore();
    const { doc, getDoc, updateDoc } = getFirestoreModule();
    try {
      const conversationRef = doc(firestore, "conversations", conversationId);

      const conversationSnapshot = await getDoc(conversationRef);
      if (documentExists(conversationSnapshot)) {
        const conversationData = conversationSnapshot.data() as Conversation;

        await updateDoc(conversationRef, {
          hiddenBy: {
            ...conversationData.hiddenBy,
            [userDetails?.firebase_uid || ""]: true,
          },
        });

      } else {
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      throw error;
    }
  }

  async function getMessages(conversationId: string): Promise<Message[]> {
    await requireChatAuth();
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
    let unsubscribe = () => {};

    requireChatAuth().then(() => {
      const q = query(
        collection(firestore, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("timestamp", "asc")
      );
      unsubscribe = onSnapshot(q, (snapshot: any) => {
        const messages: Message[] = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(),
        })) as Message[];

        callback(messages);
      });
    });

    return () => unsubscribe();
  }

  async function sendMessage(
    text: string,
    conversationId: string
  ): Promise<void> {
    await requireChatAuth();
    const firestore = requireFirestore();
    const { addDoc, collection, doc, getDoc, updateDoc } =
      getFirestoreModule();
    const timestamp = new Date();
    const object: Message = {
      conversationId: conversationId,
      from: userDetails?.username!,
      senderUid: userDetails?.firebase_uid!,
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
    await requireChatAuth();
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
    await requireChatAuth();
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
    await requireChatAuth();
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
    await requireChatAuth();
    const firestore = requireFirestore();
    const { addDoc, collection, doc, getDoc, updateDoc } =
      getFirestoreModule();
    const timestamp = new Date();

    const object: Message = {
      conversationId: conversationId,
      from: userDetails?.username!,
      senderUid: userDetails?.firebase_uid!,
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
    user1: UserDetails,
    user2: UserDetails
  ): Promise<boolean> {
    await requireChatAuth();
    const firestore = requireFirestore();
    const { collection, query, where, getDocs } = getFirestoreModule();
    const blockedRef = collection(firestore, "blocked");
    // Firestore rules allow a user to read only records that name them as a
    // participant. Query that authorized set first, then identify this pair.
    const snapshot = await getDocs(
      query(
        blockedRef,
        where("participantIds", "array-contains", user1.firebaseUid)
      )
    );

    return snapshot.docs.some((blockedDocument: any) => {
      const blocked = blockedDocument.data() as BlockedRecord;
      return (
        (blocked.initiatorUid === user1.firebaseUid &&
          blocked.blockedUserUid === user2.firebaseUid) ||
        (blocked.initiatorUid === user2.firebaseUid &&
          blocked.blockedUserUid === user1.firebaseUid)
      );
    });
  }

  async function blockUser(
    userId: string,
    reason: string,
    conversationId: string
  ): Promise<void> {
    await requireChatAuth();
    const firestore = requireFirestore();
    const { serverTimestamp, addDoc, collection, doc, getDoc, updateDoc } =
      getFirestoreModule();
    try {
      const conversationRef = doc(firestore, "conversations", conversationId);
      const conversationSnapshot = await getDoc(conversationRef);
      const conversation = conversationSnapshot.data() as Conversation;
      const blockedParticipant = conversation.initialParticipants.find(
        (participant) => participant.userId === userId
      );
      if (!blockedParticipant) {
        throw new Error("Blocked user not found");
      }

      // Create record in blocked collection
      const blockedRecord: BlockedRecord = {
        initiator: userDetails?.username!,
        initiatorUid: userDetails?.firebase_uid!,
        blocked_user: userId,
        blockedUserUid: blockedParticipant.firebaseUid,
        participantIds: [userDetails?.firebase_uid!, blockedParticipant.firebaseUid],
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(firestore, "blocked"), blockedRecord);

      // Update conversation as before
      await updateDoc(conversationRef, {
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
    await requireChatAuth();
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

      const blockedUser = conversation.initialParticipants.find(
        (p) => p.userId !== userDetails?.username
      );

      if (!blockedUser) throw new Error("Blocked user not found");

      // Read only the caller's authorized block records, then locate this
      // conversation's pair. The Firestore rule cannot authorize a query that
      // filters solely by the two UID fields.
      const blockedRef = collection(firestore, "blocked");
      const q = query(
        blockedRef,
        where("participantIds", "array-contains", userDetails?.firebase_uid)
      );

      const querySnapshot = await getDocs(q);
      const matchingRecords = querySnapshot.docs.filter((blockedDocument: any) => {
        const blocked = blockedDocument.data() as BlockedRecord;
        return (
          blocked.initiatorUid === userDetails?.firebase_uid &&
          blocked.blockedUserUid === blockedUser.firebaseUid
        );
      });

      if (matchingRecords.length > 0) {
        await Promise.all(
          matchingRecords.map((blockedDocument: any) =>
            deleteDoc(blockedDocument.ref)
          )
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
    await requireChatAuth();
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
    await requireChatAuth();
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
