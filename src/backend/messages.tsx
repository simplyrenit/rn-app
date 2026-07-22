import { useEffect, useState } from "react";
import { useGlobalContext } from "@/context/global-context";
import {
  authenticateFirebase,
  getFirestoreDb,
  getFirestoreModule,
} from "@/lib/firebase";
import { Message } from "@/lib/types";

export function useSubscribeToMessages(conversationId: string) {
  const { authTokens } = useGlobalContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const accessToken = authTokens?.access_token;
    const firestore = getFirestoreDb();
    if (!firestore || !accessToken) {
      setError("Chat is unavailable right now.");
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};
    let active = true;

    authenticateFirebase(accessToken)
      .then(() => {
        const { collection, query, where, onSnapshot, orderBy } =
          getFirestoreModule();
        const q = query(
          collection(firestore, "messages"),
          where("conversationId", "==", conversationId),
          orderBy("timestamp", "asc")
        );

        unsubscribe = onSnapshot(
          q,
          (querySnapshot: any) => {
            const updatedMessages: Message[] = querySnapshot.docs.map(
              (doc: any) => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp.toDate(),
              })) as Message[];
            if (active) {
              setMessages(updatedMessages);
              setLoading(false);
            }
          },
          (subscriptionError: Error) => {
            if (active) {
              setError(subscriptionError.message);
              setLoading(false);
            }
          }
        );
      })
      .catch((authenticationError: Error) => {
        if (active) {
          setError(authenticationError.message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authTokens?.access_token, conversationId]);

  return { messages, loading, error };
}
