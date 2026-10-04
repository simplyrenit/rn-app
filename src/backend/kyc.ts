/**
 * Merchant verification: the status query and the three mutations (ENG-12).
 *
 * The status endpoint is live: rn-api asks the KYC service and answers with what it found, or
 * with its cached fields and `stale: true` when that service is down. A stale answer is shown
 * exactly like a fresh one. Every mutation answers with the new status, which goes straight
 * into the query cache so no screen waits on a refetch.
 */
import { useGlobalContext } from "@/context/global-context";
import {
  KYC_RESUME_ENDPOINT,
  KYC_RETURN_URL,
  KYC_START_ENDPOINT,
  KYC_STATUS_ENDPOINT,
  KYC_WITHDRAW_ENDPOINT,
} from "@/lib/config";
import { track } from "@/lib/events";
import { kycError, parseKycReturn, sessionClaim } from "@/lib/kyc";
import axiosInstance from "@/lib/networkUtils";
import { toast } from "@/lib/toast";
import type { KycNextAction, KycStatusResponse, StartKycBody } from "@/lib/types";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "react-query";

/**
 * Keyed by username, so a second account on the same install never reads the first one's
 * cached status (nothing clears the query cache on logout).
 */
export const KYC_STATUS_KEY = (username: string | undefined) => ["kyc", "status", username ?? ""];

const fetchStatus = () =>
  axiosInstance.get<KycStatusResponse>(KYC_STATUS_ENDPOINT).then((response) => response.data);

function useStatusKey() {
  const { userDetails } = useGlobalContext();
  return KYC_STATUS_KEY(userDetails?.username);
}

/**
 * The merchant's verification status. Disabled for everyone who is not a signed-in business
 * account. A 403 (not a business account) or 404 (an API from before verification) is an
 * answer, not a failure, so it is not retried.
 *
 * With `poll`, the status is read again every 3 seconds for as long as it is one that moves on
 * by itself (`pending`, or `action_required` just after DigiLocker). The caller decides when
 * polling is allowed at all; a state that waits on a person is never polled.
 */
export function useKycStatus(poll = false) {
  const { isAuthenticated, userDetails } = useGlobalContext();
  return useQuery<KycStatusResponse, unknown>(KYC_STATUS_KEY(userDetails?.username), fetchStatus, {
    enabled: Boolean(isAuthenticated && userDetails?.account_type === "merchant"),
    staleTime: 30_000,
    refetchInterval: (data) =>
      poll && (data?.kyc_status === "pending" || data?.kyc_status === "action_required") ? 3000 : false,
    retry: (failures, error) => {
      const { status } = kycError(error);
      return status !== 403 && status !== 404 && failures < 2;
    },
  });
}

/**
 * Writes an answer from the server into the status cache. A status read still in flight is
 * older than this answer, so it is cancelled rather than left to overwrite it.
 */
function useStoreStatus() {
  const queryClient = useQueryClient();
  const key = useStatusKey();
  return async (data: KycStatusResponse) => {
    await queryClient.cancelQueries(key);
    queryClient.setQueryData(key, withoutLink(data));
  };
}

/**
 * `start/`: checks the PAN and GSTIN, then answers with the verification link.
 *
 * Deliberately not a React Query mutation, and neither is resume: the mutation cache keeps a
 * request's body and its answer for the life of the app, and these carry the PAN, the GSTIN
 * and the link.
 */
export function useStartKyc() {
  const store = useStoreStatus();
  return async (body: StartKycBody) => {
    const { data } = await axiosInstance.post<KycStatusResponse>(KYC_START_ENDPOINT, body);
    await store(data);
    return data;
  };
}

/** `resume/`: a fresh verification link for a case that is waiting for the merchant. */
export function useResumeKyc() {
  const store = useStoreStatus();
  return async () => {
    const { data } = await axiosInstance.post<KycStatusResponse>(KYC_RESUME_ENDPOINT);
    await store(data);
    return data;
  };
}

/** `withdraw/`: removes the verification data. The badge is gone as soon as this answers. */
export function useWithdrawKyc() {
  const store = useStoreStatus();
  const { fetchUserDetails } = useGlobalContext();
  return useMutation<KycStatusResponse, unknown, void>(
    () => axiosInstance.post<KycStatusResponse>(KYC_WITHDRAW_ENDPOINT).then((r) => r.data),
    {
      onSuccess: async (data) => {
        await store(data);
        void fetchUserDetails(); // so `business_verified` drops everywhere
      },
    }
  );
}

/**
 * The status cache never holds the verification link: it is a one-time capability, used once
 * and dropped. What is cached is what `status/` itself would say for this state.
 */
function withoutLink(data: KycStatusResponse): KycStatusResponse {
  if (data.next_action?.type !== "digilocker") return data;
  return { ...data, next_action: { type: "resume" } };
}

/**
 * Hands the merchant to DigiLocker in an in-app browser session, which closes by itself when
 * the verification page sends them back to `renit://kyc/return`.
 *
 * What the session reports is only that page's claim, and anyone can forge it, so it goes into
 * one analytics event and nowhere else: the caller reads the real status from the server
 * whatever happened. Answers true when a session ran and closed, false when none opened (no
 * link, no browser, or another session already open). The link is never logged or kept.
 */
export async function openDigiLocker(action: KycNextAction | null): Promise<boolean> {
  if (action?.type !== "digilocker") return false;
  let session: WebBrowser.WebBrowserAuthSessionResult;
  track("kyc_digilocker_opened");
  sessionOpen = true;
  try {
    session = await WebBrowser.openAuthSessionAsync(action.url, KYC_RETURN_URL, {
      preferEphemeralSession: true, // iOS: no shared Safari cookies
    });
  } catch {
    toast.error("We couldn't open DigiLocker", { message: "Try again in a moment." });
    return false;
  } finally {
    sessionOpen = false;
  }
  track("kyc_digilocker_returned", { result: sessionClaim(session), via: "session" });
  if (session.type === "locked") {
    toast.info("Finish the open DigiLocker window first");
    return false;
  }
  return true;
}

// While a session is open its own result reports the return; the link listener stays out of it.
let sessionOpen = false;
// The link that opened the app is looked at once per launch, not again at a later sign-in.
let initialLinkHandled = false;

/**
 * Catches `renit://kyc/return` when the OS delivers it to the app itself: Android after the
 * browser tab was closed, or a merchant who finished in an external browser. Mounted once, at
 * the navigation root.
 *
 * The link is only a nudge to look at the status screen, which reads the real status from the
 * server. Nothing but the claimed result is read from it, and that only for analytics.
 */
export function useKycReturnLinking(onReturn: () => void) {
  const { isAuthenticated } = useGlobalContext();
  const latest = useRef(onReturn);
  latest.current = onReturn;

  useEffect(() => {
    if (isAuthenticated === undefined) return; // still finding out who is signed in
    const first = !initialLinkHandled;
    initialLinkHandled = true;
    if (!isAuthenticated) return;
    const handle = (url: string | null) => {
      if (!url?.startsWith(KYC_RETURN_URL) || sessionOpen) return;
      track("kyc_digilocker_returned", { result: parseKycReturn(url).result, via: "link" });
      latest.current();
    };
    if (first) void Linking.getInitialURL().then(handle, () => undefined);
    const subscription = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => subscription.remove();
  }, [isAuthenticated]);
}

/**
 * Reads the verification status and the profile's badge again. The answer to anything that
 * says the status may have changed: a push, a return to the foreground.
 */
export function useKycRefetch() {
  const { fetchUserDetails } = useGlobalContext();
  const queryClient = useQueryClient();
  // The context makes a new fetchUserDetails each render; a ref keeps the callback stable.
  const refreshDetails = useRef(fetchUserDetails);
  refreshDetails.current = fetchUserDetails;
  return useCallback(() => {
    void queryClient.invalidateQueries(["kyc", "status"]);
    void refreshDetails.current();
  }, [queryClient]);
}

/**
 * Keeps verification state fresh without a refetch on every render: when the app returns to
 * the foreground, a signed-in merchant's status and badge are read again. Mounted once, at the
 * navigation root. (React Query's own focus refetch is not wired up for React Native.)
 */
export function useKycRefresh() {
  const { isAuthenticated, userDetails } = useGlobalContext();
  const merchant = Boolean(isAuthenticated && userDetails?.account_type === "merchant");
  const refetch = useKycRefetch();

  useEffect(() => {
    if (!merchant) return;
    let last = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if (last !== "active" && next === "active") refetch();
      last = next;
    });
    return () => subscription.remove();
  }, [merchant, refetch]);
}

/**
 * The status answer is the first to know the badge changed (an approval, a withdrawal). When
 * it disagrees with the profile's copy, the profile is read again, once per disagreement.
 */
export function useKycBadgeSync(status: KycStatusResponse | undefined) {
  const { userDetails, fetchUserDetails } = useGlobalContext();
  const verified = status?.business_verified;
  const known = userDetails?.business_verified;
  const asked = useRef<boolean | null>(null);
  useEffect(() => {
    if (verified === undefined || known === undefined || verified === known) {
      asked.current = null;
      return;
    }
    if (asked.current === verified) return;
    asked.current = verified;
    void fetchUserDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, known]);
}
