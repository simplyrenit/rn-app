import { openDigiLocker, useKycBadgeSync, useKycStatus, useResumeKyc, useWithdrawKyc } from "@/backend/kyc";
import { Button, EmptyState, Skeleton, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { KycChip } from "@/components/kyc/kyc-chip";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { track } from "@/lib/events";
import { successFeedback } from "@/lib/haptics";
import { hasVerificationData, kycError, kycStateCopy } from "@/lib/kyc";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useFocusEffect, useIsFocused, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STEPS = [
  "We check your details with our verification partner.",
  "Our team reviews your case.",
  "We notify you of the result.",
];

// After DigiLocker the status moves on by itself within seconds, so it is read every 3 seconds
// for this long. A status that waits on a reviewer is never polled: a push announces it.
const POLL_FOR = 30_000;
const movesOn = (status: string | undefined) => status === "pending" || status === "action_required";

/**
 * One screen for every verification state: where the Profile card and the status push lead,
 * and where the merchant continues, starts over or removes their data.
 *
 * It renders only what the status endpoint returns. An answer served from the server's cache
 * (`stale`) looks exactly like a fresh one; nothing a link or a push claims is ever shown.
 * Coming back from DigiLocker (`justReturned`) only starts a short spell of polling.
 */
export default function KycStatusScreen() {
  const navigation = useTypedNavigation();
  const insets = useSafeAreaInsets();
  const { userDetails } = useGlobalContext();
  const route = useRoute<RouteProps<"KycStatus">>();
  const justReturned = route.params?.justReturned === true;
  // When the current polling window opened; null outside one.
  const [pollingSince, setPollingSince] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const { data, error, isLoading, refetch } = useKycStatus(pollingSince !== null);
  const focused = useIsFocused();
  const resume = useResumeKyc();
  const withdraw = useWithdrawKyc();
  const [refreshing, setRefreshing] = useState(false);
  // From the request until the DigiLocker session has closed, so a second tap does nothing.
  const [resuming, setResuming] = useState(false);
  useKycBadgeSync(data);

  const status = data?.kyc_status;
  const reason = data?.reason_code ?? null;
  const latestStatus = useRef(status);
  latestStatus.current = status;

  const startPolling = useCallback(() => {
    setTimedOut(false);
    setPollingSince(Date.now());
  }, []);

  // The status may have moved while the merchant was elsewhere (a reviewer decided). Leaving
  // the screen closes any polling window.
  useFocusEffect(
    useCallback(() => {
      void refetch();
      return () => setPollingSince(null);
    }, [refetch])
  );

  // Back from DigiLocker. The flag is cleared so that the next return opens a new window.
  useEffect(() => {
    if (!justReturned) return;
    startPolling();
    navigation.setParams({ justReturned: false });
  }, [justReturned, navigation, startPolling]);

  // Leaving the app closes the window too; coming back to checks still running opens one.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") setPollingSince(null);
      else if (latestStatus.current === "pending" && navigation.isFocused()) startPolling();
    });
    return () => subscription.remove();
  }, [navigation, startPolling]);

  // While the automated checks run the status is about to move again, so `pending` in view
  // opens a window, however it was learned (on arriving, or from a refresh). The window ends
  // when the status stops being one that moves on by itself, or after 30 s.
  useEffect(() => {
    setTimedOut(false);
    if (status === "pending" && focused) startPolling();
    else if (status && !movesOn(status)) setPollingSince(null);
  }, [status, focused, startPolling]);
  useEffect(() => {
    if (pollingSince === null) return;
    const timer = setTimeout(() => {
      setPollingSince(null);
      if (movesOn(latestStatus.current)) {
        track("kyc_poll_timeout");
        setTimedOut(true);
      }
    }, POLL_FOR);
    return () => clearTimeout(timer);
  }, [pollingSince]);
  const previous = useRef<string | undefined>();
  // Counted each time the screen comes into view, and again when the status changes under it.
  useEffect(() => {
    if (!status || !focused) return;
    track("kyc_status_viewed", reason ? { status, reason_code: reason } : { status });
    if (status === "verified" && previous.current && previous.current !== "verified") successFeedback();
    previous.current = status;
  }, [status, reason, focused]);

  const toProfile = () => navigation.navigate("MainTabs", { screen: "Profile" });
  const support = () => navigation.navigate("contactUs");

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const onResume = async () => {
    if (resuming) return;
    setResuming(true);
    setPollingSince(null); // a window still open belongs to the previous attempt
    try {
      const answer = await resume();
      track("kyc_resumed");
      if (answer.next_action?.type === "digilocker") {
        if (await openDigiLocker(answer.next_action)) startPolling();
      } else {
        // No link means the consent has already reached us: the status will move on by itself.
        startPolling();
      }
    } catch (failure) {
      const { status: http, code } = kycError(failure);
      if (code === "invalid_state" || code === "not_merchant") {
        toast.info("This verification has moved on");
        void refetch();
      } else if (code === "provider_unavailable") {
        toast.error("We couldn't reach our verification partner", { message: "Try again in a few minutes." });
      } else if (http === 0) {
        toast.error("No connection", { message: "Check your internet and try again." });
      } else if (http !== 401) {
        toast.error("Verification is unavailable right now", { message: "Please try again later." });
      }
    } finally {
      setResuming(false);
    }
  };

  const onStartOver = () =>
    Alert.alert(
      "Start over?",
      "We'll cancel this verification and you'll enter your details again. Your details aren't kept, so you'll type them again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start over",
          onPress: () => {
            track("kyc_start_over");
            navigation.navigate("KycIntro", { source: "profile", supersede: true });
          },
        },
      ]
    );

  const onWithdraw = () =>
    Alert.alert(
      "Remove your verification data?",
      "We'll delete the details we hold for your verification, including your Aadhaar record. Your Verified business badge will be removed. You can verify again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await withdraw.mutateAsync();
              track("kyc_withdrawn");
              toast.success("Verification data removed", { message: "Your badge has been removed." });
            } catch {
              // Nothing is shown as removed unless the server said so.
              toast.error("We couldn't remove your data", { message: "Check your connection and try again." });
            }
          },
        },
      ]
    );

  const header = <SubpageHeader title="Business verification" onBack={toProfile} backLabel="Back to Profile" />;

  if (!data) {
    const http = error ? kycError(error).status : null;
    return (
      <NonScrollableContainer>
        {header}
        {isLoading || http === null ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.xl, gap: space.md }}>
            <Skeleton width={56} height={56} borderRadius={28} />
            <Skeleton width="70%" height={26} />
            <Skeleton width="100%" height={18} />
            <Skeleton width="85%" height={18} />
          </View>
        ) : http === 403 ? (
          <EmptyState
            variant="error"
            title="Verification is for business accounts"
            body="Your account isn't set up as a business account."
          />
        ) : http === 404 ? (
          <EmptyState title="Verification isn't available yet" body="Please check back soon." />
        ) : (
          <EmptyState
            variant="error"
            title="We couldn't load your verification status"
            body="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void refetch()}
          />
        )}
      </NonScrollableContainer>
    );
  }

  const copy = kycStateCopy(data.kyc_status, reason);
  const primary =
    copy.ctaKind === "resume"
      ? onResume
      : copy.ctaKind === "start"
      ? () => navigation.navigate("KycIntro", { source: "profile" })
      : copy.ctaKind === "profile"
      ? () => userDetails && navigation.navigate("UserDetail", { id: userDetails.username })
      : copy.ctaKind === "support"
      ? support
      : undefined;
  // 1: automated checks, 2: a person reviews, 3: the result.
  const step = data.kyc_status === "pending" ? 0 : data.kyc_status === "in_review" ? 1 : null;

  return (
    <NonScrollableContainer>
      {header}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.xl,
          paddingBottom: insets.bottom + space.lg,
          gap: space.lg,
        }}
      >
        <View style={{ gap: space.md }}>
          <KycChip icon={copy.icon} tone={copy.tone} size={56} />
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
          >
            {copy.title}
          </Text>
          <Text tone="body">{copy.body}</Text>
          {pollingSince !== null && movesOn(status) ? (
            <Text tone="dim" accessibilityLiveRegion="polite">
              Checking where things stand…
            </Text>
          ) : timedOut ? (
            <Text tone="dim" accessibilityLiveRegion="polite">
              {status === "pending"
                ? "We're still working on it. We'll notify you when it's done. You can also check here any time."
                : "If you've just finished DigiLocker, it can take a minute to show up. Pull down to refresh."}
            </Text>
          ) : null}
        </View>

        {step !== null ? (
          <View style={{ gap: space.sm }}>
            <Text fontWeight="font-bold" accessibilityRole="header">
              What happens next
            </Text>
            {STEPS.map((text, index) => (
              <Text
                key={text}
                tone={index === step ? "default" : "dim"}
                fontWeight={index === step ? "font-semibold" : "font-normal"}
                accessibilityLabel={index === step ? `Now: ${text}` : text}
              >
                {index + 1}. {text}
              </Text>
            ))}
          </View>
        ) : null}

        {primary && copy.cta ? (
          <View style={{ gap: space.sm }}>
            <Button onPress={primary} loading={copy.ctaKind === "resume" && resuming} disabled={resuming}>
              {copy.cta}
            </Button>
            {copy.secondary === "start_over" ? (
              <Button variant="outline" onPress={onStartOver} disabled={resuming}>
                Start over
              </Button>
            ) : null}
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <View style={{ gap: space.xs }}>
          {copy.ctaKind !== "support" ? (
            <Button variant="ghost" onPress={support}>
              Questions? Contact support
            </Button>
          ) : null}
          {hasVerificationData(data) ? (
            <Button
              variant="ghost"
              onPress={onWithdraw}
              loading={withdraw.isLoading}
              disabled={withdraw.isLoading}
              accessibilityHint="Deletes the details we hold for your verification"
            >
              Remove my verification data
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
}
