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
  KYC_START_ENDPOINT,
  KYC_STATUS_ENDPOINT,
  KYC_WITHDRAW_ENDPOINT,
} from "@/lib/config";
import { kycError } from "@/lib/kyc";
import axiosInstance from "@/lib/networkUtils";
import type { KycNextAction, KycStatusResponse, StartKycBody } from "@/lib/types";
import { useEffect, useRef } from "react";
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
 */
export function useKycStatus() {
  const { isAuthenticated, userDetails } = useGlobalContext();
  return useQuery<KycStatusResponse, unknown>(KYC_STATUS_KEY(userDetails?.username), fetchStatus, {
    enabled: Boolean(isAuthenticated && userDetails?.account_type === "merchant"),
    staleTime: 30_000,
    retry: (failures, error) => {
      const { status } = kycError(error);
      return status !== 403 && status !== 404 && failures < 2;
    },
  });
}

/** `start/`: checks the PAN and GSTIN, then answers with the verification link. */
export function useStartKyc() {
  const queryClient = useQueryClient();
  const key = useStatusKey();
  return useMutation<KycStatusResponse, unknown, StartKycBody>(
    (body) => axiosInstance.post<KycStatusResponse>(KYC_START_ENDPOINT, body).then((r) => r.data),
    {
      onSuccess: (data) => {
        queryClient.setQueryData(key, withoutLink(data));
      },
    }
  );
}

/** `resume/`: a fresh verification link for a case that is waiting for the merchant. */
export function useResumeKyc() {
  const queryClient = useQueryClient();
  const key = useStatusKey();
  return useMutation<KycStatusResponse, unknown, void>(
    () => axiosInstance.post<KycStatusResponse>(KYC_RESUME_ENDPOINT).then((r) => r.data),
    {
      onSuccess: (data) => {
        queryClient.setQueryData(key, withoutLink(data));
      },
    }
  );
}

/** `withdraw/`: removes the verification data. The badge is gone as soon as this answers. */
export function useWithdrawKyc() {
  const queryClient = useQueryClient();
  const key = useStatusKey();
  const { fetchUserDetails } = useGlobalContext();
  return useMutation<KycStatusResponse, unknown, void>(
    () => axiosInstance.post<KycStatusResponse>(KYC_WITHDRAW_ENDPOINT).then((r) => r.data),
    {
      onSuccess: (data) => {
        queryClient.setQueryData(key, data);
        void fetchUserDetails(); // so `business_verified` drops everywhere
      },
    }
  );
}

/**
 * The cache never holds the verification link: it is a one-time capability, used once and
 * dropped. What is cached is what `status/` itself would say for this state.
 */
function withoutLink(data: KycStatusResponse): KycStatusResponse {
  if (data.next_action?.type !== "digilocker") return data;
  return { ...data, next_action: { type: "resume" } };
}

/**
 * Hands the merchant to DigiLocker. For now this opens the link in the system browser; the
 * in-app verification session, its return link and the polling that follows arrive with the
 * DigiLocker handoff work (ENG-72). The link is never logged or kept.
 */
export async function openDigiLocker(action: KycNextAction | null): Promise<boolean> {
  if (action?.type !== "digilocker") return false;
  try {
    await Linking.openURL(action.url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Keeps verification state fresh without a refetch on every render: when the app returns to
 * the foreground, a signed-in merchant's status and badge are read again. Mounted once, at the
 * navigation root. (React Query's own focus refetch is not wired up for React Native.)
 */
export function useKycRefresh() {
  const { isAuthenticated, userDetails, fetchUserDetails } = useGlobalContext();
  const queryClient = useQueryClient();
  const merchant = Boolean(isAuthenticated && userDetails?.account_type === "merchant");
  const username = userDetails?.username;
  // The context makes a new fetchUserDetails each render; a ref keeps the listener stable.
  const refreshDetails = useRef(fetchUserDetails);
  refreshDetails.current = fetchUserDetails;

  useEffect(() => {
    if (!merchant) return;
    let last = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if (last !== "active" && next === "active") {
        void queryClient.invalidateQueries(KYC_STATUS_KEY(username));
        void refreshDetails.current();
      }
      last = next;
    });
    return () => subscription.remove();
  }, [merchant, username, queryClient]);
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
