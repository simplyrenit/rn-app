import { ApiError, fieldErrors } from "@/lib/api-error";
import { momentLabel } from "@/lib/booking";

/**
 * Get help (ENG-238; API-CONTRACT OE-L, `GET` and `POST /api/help/`). One button
 * on every booking screen reaches Renit's desk, with its hours. There is no chat:
 * the desk answers by phone. Nothing here is drawn in Figma (ENG-230), so the words
 * are the plan's and the contract's.
 */

export interface Desk {
  open: string;
  close: string;
  is_open_now: boolean;
  /** Ready to show: "Every day, 8 am to midnight". `close` can be "24:00", so the text is what is shown. */
  text: string;
}

export interface HelpRequest {
  id: number;
  booking: string | null;
  note: string;
  /** `open` while it waits for the desk. */
  status: string;
  created_at: string;
}

export interface HelpAnswer {
  desk: Desk | null;
  /** The caller's own, newest first. */
  requests: HelpRequest[];
}

/** The longest note the desk takes (the contract: 1 to 1,000 characters). */
export const NOTE_MAX = 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readDesk(value: unknown): Desk | null {
  if (!isRecord(value) || typeof value.text !== "string" || !value.text.trim()) return null;
  return {
    open: typeof value.open === "string" ? value.open : "",
    close: typeof value.close === "string" ? value.close : "",
    is_open_now: value.is_open_now === true,
    text: value.text.trim(),
  };
}

function readRequest(value: unknown): HelpRequest | null {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.note !== "string") return null;
  return {
    id: value.id,
    booking: typeof value.booking === "string" ? value.booking : null,
    note: value.note,
    status: typeof value.status === "string" ? value.status : "open",
    created_at: typeof value.created_at === "string" ? value.created_at : "",
  };
}

/** What `GET /api/help/` answered, read the careful way: a field that is not there is left out, never guessed. */
export function parseHelp(data: unknown): HelpAnswer {
  const body = isRecord(data) ? data : {};
  const requests = Array.isArray(body.requests) ? body.requests.map(readRequest).filter((r): r is HelpRequest => r !== null) : [];
  return { desk: readDesk(body.desk), requests };
}

/** What `POST /api/help/` answered: the request it made, and the desk's hours as they are now. */
export function parseSent(data: unknown): { request: HelpRequest | null; desk: Desk | null } {
  const body = isRecord(data) ? data : {};
  return { request: readRequest(body.request), desk: readDesk(body.desk) };
}

// ---- The words -------------------------------------------------------------------------------------

/** "Renit's desk: Every day, 8 am to midnight", or null when the hours could not be read. */
export function deskLine(desk: Desk | null | undefined): string | null {
  return desk ? `Renit's desk: ${desk.text}` : null;
}

/** "Open now" or "Closed now"; null without the hours. */
export function deskState(desk: Desk | null | undefined): string | null {
  if (!desk) return null;
  return desk.is_open_now ? "Open now" : "Closed now";
}

/** What a request that has not been dealt with is called on screen; `done` and anything else say nothing. */
export function requestStatus(status: string): { label: string; tone: "brand" | "success" } | null {
  if (status === "open") return { label: "With the desk", tone: "brand" };
  if (status === "done") return { label: "Done", tone: "success" };
  return null;
}

/** The newest request that is still with the desk, for this booking when one is named. */
export function openRequest(requests: HelpRequest[], booking?: string | null): HelpRequest | null {
  return requests.find((r) => r.status === "open" && (booking == null || r.booking === booking)) ?? null;
}

/** The row's second line on a booking screen: the desk's hours, or that the desk already has a request. */
export function helpRowSub(answer: HelpAnswer | undefined, booking: string): string {
  const open = answer ? openRequest(answer.requests, booking) : null;
  const hours = deskLine(answer?.desk);
  if (open) return hours ? `The desk has your request. ${hours}` : "The desk has your request.";
  return hours ?? "Talk to Renit's desk.";
}

/** Why Send is held, or null when it can go. The note is trimmed first. */
export function noteHold(note: string): string | null {
  const text = note.trim();
  if (!text) return "Say what you need help with.";
  if (text.length > NOTE_MAX) return `Keep it under ${NOTE_MAX} characters.`;
  return null;
}

/** After the request is made: what the person is told, by whether the desk is answering now. */
export function sentCopy(desk: Desk | null | undefined): { title: string; body: string } {
  return {
    title: "Request sent",
    body:
      desk && !desk.is_open_now
        ? "Renit's desk is closed now. It will see your request when it opens, and phone you."
        : "Renit's desk has it and will phone you.",
  };
}

/**
 * Why a request did not go, in plain words. A 4xx is the server refusing it; no
 * answer at all (status 0) is the connection, and the request may or may not have
 * arrived: `requestLanded` is what finds out.
 */
export function helpErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We could not reach Renit. Check your connection and try again.";
  if (error.code === "validation_error") {
    return fieldErrors(error).note ?? "The request was not sent. Check what you wrote and try again.";
  }
  if (error.status === 404) return "We could not find that booking, so the request was not sent.";
  if (error.code === "rate_limited") return "You have sent several requests in a row. Wait a minute and try again.";
  if (error.status >= 500) return "Renit's server had a problem, so the request was not sent. Try again in a moment.";
  return error.message ?? "The request was not sent. Try again.";
}

/**
 * Did a send whose answer never came get through? Judged by the list read after it:
 * a request that was not there before the press, with the same note and booking.
 * "Before" is the ids, not the clock, so an old request with the same words is never
 * taken for this one. Without a way to read the list, the caller says so and warns
 * that the desk may get two.
 */
export function requestLanded(
  before: number[],
  after: HelpRequest[],
  sent: { booking: string | null; note: string }
): boolean {
  const note = sent.note.trim();
  return after.some((r) => !before.includes(r.id) && r.booking === sent.booking && r.note.trim() === note);
}

/** "Sent 4:50 pm" or "Sent Sat 24 Oct, 4:50 pm", for a request the desk already has. */
export function sentAt(request: HelpRequest, now: Date): string {
  const when = momentLabel(request.created_at, now);
  return when ? `Sent ${when}` : "";
}
