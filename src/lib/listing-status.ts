/**
 * The six statuses a listing can have (API-CONTRACT, ShopProduct; ARCHITECTURE
 * 2.3). Kept free of React so the wording can be tested.
 *
 * The app used to work the state out from `admin_approved` and
 * `moderation_labels`. The server now says it outright, and the app and the API
 * changed together, so the guess is gone: no `status` in the payload means no
 * pill, never a wrong one.
 */
export type ListingStatus =
  | "draft"
  | "checking"
  | "live"
  | "paused"
  | "flagged"
  | "archived";

export const LISTING_STATUSES: readonly ListingStatus[] = [
  "draft",
  "checking",
  "live",
  "paused",
  "flagged",
  "archived",
];

/** `[{"code": "deposit_zero", "text": "The deposit is zero"}]` on a flagged listing. */
export interface FlagReason {
  code: string;
  text: string;
}

/** The status the server sent, or null when it is missing or one this app does not know. */
export function resolveListingStatus(value: string | null | undefined): ListingStatus | null {
  return (LISTING_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as ListingStatus)
    : null;
}

export const STATUS_COPY: Record<ListingStatus, { label: string; detail: string }> = {
  draft: { label: "Draft", detail: "Not published yet" },
  checking: { label: "Checking", detail: "Not visible to renters yet · usually takes seconds" },
  live: { label: "Live", detail: "Visible to renters" },
  paused: { label: "Paused", detail: "Hidden from renters · bookings you already have carry on" },
  flagged: { label: "Flagged", detail: "Hidden until this is resolved" },
  archived: { label: "Archived", detail: "Removed from your list" },
};

/** What the owner reads beside "Flagged": the reasons the check gave, in its words. */
export function flagReasonText(reasons: FlagReason[] | null | undefined): string | null {
  const texts = (reasons ?? []).map((r) => r.text?.trim()).filter(Boolean);
  return texts.length > 0 ? texts.join(" · ") : null;
}

/** The pill's explanation line: the reason for a flagged listing, else the status's own words. */
export function statusDetail(
  status: ListingStatus,
  reasons?: FlagReason[] | null
): string {
  return (status === "flagged" ? flagReasonText(reasons) : null) ?? STATUS_COPY[status].detail;
}

/**
 * Why a listing cannot be archived yet (`409 open_booking`, details.bookings).
 * The owner archives it once those bookings are over.
 */
export function openBookingMessage(bookings: string[] | null | undefined): string {
  const list = (bookings ?? []).filter(Boolean);
  if (list.length === 0) return "This product still has an open booking. Archive it once that booking is over.";
  if (list.length === 1) return `Booking ${list[0]} is still open. Archive this product once it is over.`;
  return `Bookings ${list.join(", ")} are still open. Archive this product once they are over.`;
}
