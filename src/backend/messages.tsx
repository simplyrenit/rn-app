import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { firestore } from "@/lib/config";
import { Message } from "@/lib/types";

export function useSubscribeToMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Create the query
    const messagesRef = collection(firestore, "messages");
    const q = query(
      messagesRef,
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "asc") // Add this to sort messages by timestamp
    );

    // Set up the subscription
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const updatedMessages: Message[] = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp.toDate(), // Convert Firestore Timestamp to JS Date
            } as Message)
        );

        setMessages(updatedMessages);
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to messages:", error);
        setError(error.message);
        setLoading(false);
      }
    );

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [conversationId]);

  return { messages, loading, error };
}
