import { ACCESS_UNLOCK_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { UnlockState } from "@/lib/unlock";

/** Whether this phone's session is unlocked, and where a code would go. */
export async function fetchUnlock(): Promise<UnlockState> {
  return (await axiosInstance.get<UnlockState>(ACCESS_UNLOCK_ENDPOINT)).data;
}

/**
 * Unlocks this session for the shop's bank account. `idToken` is a Firebase phone
 * ID token made just now for the account's own number; the server refuses a
 * token older than five minutes (`code_invalid`) or for another number
 * (`wrong_phone`).
 */
export async function postUnlock(idToken: string): Promise<UnlockState> {
  return (await axiosInstance.post<UnlockState>(ACCESS_UNLOCK_ENDPOINT, { id_token: idToken })).data;
}
