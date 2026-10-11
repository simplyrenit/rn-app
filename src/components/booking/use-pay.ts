import { PayPhase } from "@/lib/booking";
import { PaymentHandoff, forgetPayment, rememberPayment, startPayment } from "@/lib/payments";
import { useCallback, useRef, useState } from "react";

/**
 * One payment button's state around `startPayment`: the ₹99 and the rent use it,
 * and the deposit will.
 *
 * `pay(getPayment)` asks for the payment to take (a fresh call to rn-api, or the
 * one this phone remembers), keeps it on the phone in case the app is closed
 * while the customer is away paying, and hands over to `startPayment`. A second
 * tap while one is running does nothing, so the page is never opened twice.
 *
 * `onPaid` only means "ask the server again": the booking's stage there is what
 * the screen draws, not this hook's answer.
 */
export function usePay(
  booking: string,
  { onPaid, onError }: { onPaid: () => void; onError: (error: unknown) => void }
) {
  const [phase, setPhase] = useState<PayPhase>("idle");
  const busy = useRef(false);
  // A payment settles minutes after the tap; it must reach the screen's current callbacks.
  const callbacks = useRef({ onPaid, onError });
  callbacks.current = { onPaid, onError };

  const pay = useCallback(
    async (getPayment: () => Promise<PaymentHandoff | null>) => {
      if (busy.current) return;
      busy.current = true;
      setPhase("working");
      try {
        const payment = await getPayment();
        if (!payment) {
          setPhase("ended");
          return;
        }
        await rememberPayment(booking, payment);
        const result = await startPayment(payment);
        if (result === "paid") {
          await forgetPayment();
          setPhase("idle");
          callbacks.current.onPaid();
        } else if (result === "failed" || result === "pending") {
          // Kept on the phone: "Try again" opens the same pay page.
          setPhase(result);
        } else {
          await forgetPayment();
          setPhase("ended");
        }
      } catch (error) {
        setPhase("idle");
        callbacks.current.onError(error);
      } finally {
        busy.current = false;
      }
    },
    [booking]
  );

  return { phase, pay };
}
