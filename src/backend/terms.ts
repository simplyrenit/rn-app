import { useGlobalContext } from "@/context/global-context";
import { TERMS_ACCEPT_ENDPOINT, TERMS_ENDPOINT } from "@/lib/config";
import { apiError } from "@/lib/api-error";
import axiosInstance from "@/lib/networkUtils";
import axios from "axios";
import { useQuery } from "react-query";

/** API-CONTRACT OE-A, `GET /api/terms/`. */
export interface TermsKind {
  version: string;
  /** The page the terms are written on; the link on every tick opens it. */
  url: string;
  /** `null` when the read was made signed out: the answer says nothing about a person. */
  accepted: boolean | null;
}

export interface Terms {
  owner: TermsKind;
  customer: TermsKind;
}

/**
 * Keyed on the username because the React Query cache outlives a logout: the
 * next person to sign in on this phone must not see the last one's answer.
 */
export const termsQueryKey = (username: string | undefined) => ["terms", username];

/** A token passed in is for a call made before the stored one is in place (sign-up). */
const withToken = (accessToken?: string) =>
  accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined;

export async function fetchTerms(accessToken?: string): Promise<Terms> {
  return (await axiosInstance.get<Terms>(TERMS_ENDPOINT, withToken(accessToken))).data;
}

/**
 * The terms read with no sign-in (API-CONTRACT, `GET /api/terms/` is open to anyone):
 * merchant sign-up needs the owner terms' address and version before any token
 * exists. A plain call, so no stale header of an earlier account goes with it.
 */
export async function fetchPublicTerms(): Promise<Terms> {
  return (await axios.get<Terms>(TERMS_ENDPOINT)).data;
}

/**
 * Send the owner's tick with the version the person was shown.
 *
 * `409 terms_version_old` means that version is not the current one. It is not
 * repeated with the newer version: the person ticked the page they saw, and an
 * acceptance of a page they have not seen is not theirs. The caller asks the terms
 * again and shows the tick again, with the new page.
 */
export async function acceptOwnerTerms(version: string, accessToken?: string): Promise<Terms> {
  return (
    await axiosInstance.post<Terms>(
      TERMS_ACCEPT_ENDPOINT,
      { kind: "owner", version },
      withToken(accessToken)
    )
  ).data;
}

/** True for the 409 that says the version sent is no longer the current one. */
export function isTermsVersionOld(error: unknown): boolean {
  return apiError(error)?.code === "terms_version_old";
}

/** The signed-in person's terms state. Disabled while signed out. */
export function useTerms() {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);
  return useQuery(termsQueryKey(username), () => fetchTerms(), {
    enabled: signedIn && Boolean(username),
    staleTime: 60_000,
  });
}

/**
 * The owner terms as merchant sign-up shows them, read before there is an account.
 * The page's address and its version are kept with the tick: the version recorded
 * once the account exists is the one this read gave.
 */
export function usePublicTerms() {
  return useQuery(["terms", "public"], fetchPublicTerms, { staleTime: 60_000 });
}
