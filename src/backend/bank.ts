import { useGlobalContext } from "@/context/global-context";
import { BANK_ACCOUNT_ENDPOINT, BANK_ACCOUNT_VERIFY_ENDPOINT } from "@/lib/config";
import { apiError } from "@/lib/api-error";
import { BankAccount, retryBankRead } from "@/lib/bank";
import axiosInstance from "@/lib/networkUtils";
import { useQuery } from "react-query";

/** How often the screen asks again while the bank is still being checked. */
export const BANK_POLL_MS = 3000;

/** Keyed on the username: the cache outlives a logout. */
export const bankQueryKey = (username: string | undefined) => ["bank-account", username];

export async function fetchBankAccount(): Promise<BankAccount> {
  return (await axiosInstance.get<BankAccount>(BANK_ACCOUNT_ENDPOINT)).data;
}

export interface BankAccountInput {
  holderName: string;
  accountNumber: string;
  ifsc: string;
  /** A UUID made once per press of the button: the same press never pays twice. */
  submitId: string;
}

/**
 * Adds the first account or changes it. The server starts the check and answers
 * `pending`; the account number goes straight to the payments service and is
 * kept nowhere, here or on rn-api.
 */
export async function saveBankAccount(input: BankAccountInput): Promise<BankAccount> {
  const response = await axiosInstance.post<BankAccount>(BANK_ACCOUNT_ENDPOINT, {
    account_number: input.accountNumber,
    ifsc: input.ifsc,
    holder_name: input.holderName.trim(),
    submit_id: input.submitId,
  });
  return response.data;
}

/** Runs the check again on the account that is already there. */
export async function verifyBankAccount(): Promise<BankAccount> {
  return (await axiosInstance.post<BankAccount>(BANK_ACCOUNT_VERIFY_ENDPOINT, {})).data;
}

/**
 * The owner's account, asked again every three seconds while it is `pending`
 * (the result also arrives as a push, but the screen does not depend on it).
 */
export function useBankAccount() {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);
  return useQuery(bankQueryKey(username), fetchBankAccount, {
    enabled: signedIn && Boolean(username),
    // No cached answer is shown as current: money details are read fresh.
    staleTime: 0,
    // A refusal is an answer, not a bad connection: it is not asked three more times (four 403s were seen).
    retry: (failures, error) => retryBankRead(failures, apiError(error)),
    refetchInterval: (data) => (data?.status === "pending" ? BANK_POLL_MS : false),
  });
}
