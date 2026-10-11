import type { BookingExit, BookingStage, DeliveryMode, RingState, TimeWindow } from "@/lib/booking";

/**
 * A booking as its shop sees it (API-CONTRACT, Shared objects, BookingShop).
 * Only the fields the phone reads are typed; a client ignores the rest.
 */
export type AnsweredVia = "phone" | "dashboard" | "admin" | "system";

export interface ShopMoney {
  rate: string;
  rent: string;
  delivery_fee: string;
  fee_shown: string;
  fee_charged: string;
  you_earn: string;
  rent_paid: boolean;
  deposit: string;
  /** `none`, `not_due`, `due`, `paid`, `carried`, `settled`, `forfeited`. */
  deposit_state: string;
  deposit_ask_at: string | null;
  deposit_due_at: string | null;
  payout: {
    status: string;
    status_reason: string | null;
    /** Ready to show: "Sent on the day of handover". */
    text: string;
    amount: string;
    due_at: string | null;
    paid_at: string | null;
    more: number;
  } | null;
}

export interface ShopTimelineEntry {
  event: string;
  label: string;
  at: string;
  by: "customer" | "owner" | "system" | "staff";
  text?: string;
}

export interface ShopWindowRequest {
  by: "customer" | "owner";
  start: string;
  end: string;
  asked_at: string;
}

export interface BookingShop {
  number: string;
  stage: BookingStage;
  ring_state: RingState;
  exit: BookingExit;
  exit_reason: string;
  is_open: boolean;
  product: { name: string; title: string; shop_code: string; cover_image: string | null; quantity: number };
  customer: {
    first_name: string;
    last_initial: string;
    id_checked: boolean;
    rentals_completed: number;
    area: string;
    distance_km: string | null;
    /** One line of text; null until the stage is `ready`. Owner delivery only. */
    address: string | null;
  };
  first_day: string;
  last_day: string;
  days: number;
  delivery_mode: DeliveryMode;
  units: { in_use: number; quantity: number };
  money: ShopMoney;
  /** Null while ringing. */
  answered: { at: string; via: AnsweredVia; device_name: string | null; seconds: number } | null;
  window: TimeWindow | null;
  window_request: ShopWindowRequest | null;
  return_by: string | null;
  can: string[];
  timeline: ShopTimelineEntry[];
  created_at: string;
}
