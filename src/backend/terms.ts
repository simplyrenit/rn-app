import { useGlobalContext } from "@/context/global-context";
import { TERMS_ACCEPT_ENDPOINT, TERMS_ENDPOINT } from "@/lib/config";
import { apiError } from "@/lib/api-error";
import axiosInstance from "@/lib/networkUtils";
import { useQuery } from "react-query";

/** API-CONTRACT OE-A, `GET /api/terms/`. */
export interface TermsKind {
  version: string;
  /** The page the terms are written on; the link on every tick opens it. */
  url: string;
  accepted: boolean;
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
 * Send the owner's tick with the version they were shown.
 *
 * `409 terms_version_old` means the version moved on while the screen was open;
 * the server names the current one, and the tick is sent again once with it. The
 * owner ticked "the owner terms", whose link always opens the current page, so
 * the retry is the same acceptance, not a new question.
 */
export async function acceptOwnerTerms(version: string, accessToken?: string): Promise<Terms> {
  const send = async (v: string) =>
    (
      await axiosInstance.post<Terms>(
        TERMS_ACCEPT_ENDPOINT,
        { kind: "owner", version: v },
        withToken(accessToken)
      )
    ).data;
  try {
    return await send(version);
  } catch (error) {
    const current = apiError(error);
    const newer = current?.code === "terms_version_old" ? current.details?.version : null;
    if (typeof newer !== "string" || newer === version) throw error;
    return send(newer);
  }
}

/**
 * The tick given at merchant sign-up, sent now that the account exists. The
 * sign-up call carries no terms version, so this reads the current one first.
 */
export async function acceptOwnerTermsAtSignup(accessToken: string): Promise<Terms> {
  const terms = await fetchTerms(accessToken);
  if (terms.owner.accepted) return terms;
  return acceptOwnerTerms(terms.owner.version, accessToken);
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
