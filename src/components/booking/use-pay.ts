import { useGlobalContext } from "@/context/global-context";
import { PayPhase } from "@/lib/booking";
import { PayResult, PaymentHandoff, forgetPayment, notePayment, startPayment } from "@/lib/payments";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One payment button's state around `startPayment`: the ₹99 and the rent use it,
 * and the deposit will.
 *
 * `pay(getPayment)` asks the screen for the payment to take: the booking's own
 * open payment (`pay_now.payment`), or a fresh answer from rn-api. Returning
 * null means "do not open a page" (the screen has something to show first).
 * A second tap while one is running does nothing, so the page is never opened
 * twice.
 *
 * `onResult` only means "read the booking again": its stage on the server is
 * what the screen draws, not this hook's answer.
 */
export function usePay(
  booking: string,
  { onResult, onError }: { onResult: (result: PayResult) => void; onError: (error: unknown) => void }
) {
  const { userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const [phase, setPhase] = useState<PayPhase>("idle");
  const busy = useRef(false);
  // A payment settles minutes after the tap; it must reach the screen's current callbacks.
  const callbacks = useRef({ onResult, onError });
  callbacks.current = { onResult, onError };
  // Android can drop the app's screens while the customer is in the UPI app ("Don't keep
  // activities", low memory) and build them again on return, with this payment still being
  // asked about. The new start resumes the payment's note to open its booking, and forgets it
  // there; forgetting it here first could leave that start nothing to open, or the wrong card.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const pay = useCallback(
    async (getPayment: () => Promise<PaymentHandoff | null>) => {
      if (busy.current) return;
      busy.current = true;
      setPhase("working");
      try {
        const payment = await getPayment();
        if (!payment) {
          setPhase("idle");
          return;
        }
        // So a restarted app can ask about it. The pay page itself is never read back from the phone.
        if (username) await notePayment(username, booking, payment.payment_id);
        const result = await startPayment(payment);
        if (result === "failed" || result === "pending") {
          setPhase(result);
        } else {
          // Paid, or rn-api says the page is over: this payment is not in flight any more.
          if (mounted.current) await forgetPayment(payment.payment_id);
          setPhase(result === "paid" ? "idle" : "ended");
        }
        callbacks.current.onResult(result);
      } catch (error) {
        setPhase("idle");
        callbacks.current.onError(error);
      } finally {
        busy.current = false;
      }
    },
    [booking, username]
  );

  return { phase, pay };
}
