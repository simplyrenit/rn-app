import { HELP_ENDPOINT } from "@/lib/config";
import { Desk, HelpAnswer, HelpRequest, parseHelp, parseSent } from "@/lib/help";
import axiosInstance from "@/lib/networkUtils";
import { useQuery } from "react-query";

/** API-CONTRACT OE-L: Get help. Signed in; with a booking, the caller must be its customer or its owner. */
export const helpQueryKey = (booking: string | null) => ["help", booking];

/** The desk's hours and the caller's own requests, for one booking. */
export async function fetchHelp(booking: string | null): Promise<HelpAnswer> {
  const { data } = await axiosInstance.get<unknown>(HELP_ENDPOINT, { params: booking ? { booking } : undefined });
  return parseHelp(data);
}

/** Makes a request. The note is 1 to 1,000 characters; the desk answers by phone. */
export async function sendHelp(booking: string | null, note: string): Promise<{ request: HelpRequest | null; desk: Desk | null }> {
  const { data } = await axiosInstance.post<unknown>(HELP_ENDPOINT, { booking, note: note.trim() });
  return parseSent(data);
}

/**
 * The desk's hours and this booking's requests. One read per booking screen, kept for
 * a minute: the hours rarely change, and the sheet reads again when it opens.
 */
export function useHelp(booking: string, enabled = true) {
  return useQuery(helpQueryKey(booking), () => fetchHelp(booking), { enabled, staleTime: 60_000, retry: 1 });
}
