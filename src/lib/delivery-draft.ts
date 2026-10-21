import { useSyncExternalStore } from "react";
import { DeliveryDraft } from "./shop";

/**
 * The Delivery screen's unsaved changes, shared with All areas (ENG-291). A store rather than route params: All areas edits
 * the same draft the Delivery screen shows, and its hardware back must keep the edits. Null means no edits, so the screens
 * show the saved shop. Reset on save, on discard, and when the Delivery screen is removed (not on blur: pushing All areas
 * keeps it).
 */
let draft: DeliveryDraft | null = null;
const listeners = new Set<() => void>();

export const deliveryDraft = {
  get: (): DeliveryDraft | null => draft,
  set(next: DeliveryDraft | null) {
    draft = next;
    listeners.forEach((listener) => listener());
  },
  reset() {
    deliveryDraft.set(null);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** The draft, or null when nothing is changed. */
export function useDeliveryDraft(): DeliveryDraft | null {
  return useSyncExternalStore(deliveryDraft.subscribe, deliveryDraft.get);
}
