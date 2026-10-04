import { useKycStatus } from "@/backend/kyc";
import { Button, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { radius, space } from "@/lib/design-tokens";
import { track } from "@/lib/events";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { KycChip } from "./kyc-chip";

/**
 * A one-time suggestion, after a business account's first listing on this device, to get the
 * Verified business badge. Shown only to a merchant with nothing on file (a timed-out case
 * gets its own card on Profile instead).
 *
 * The seen flag is set the first time the card renders, not when it is dismissed, so it shows
 * once per account per device. If the flag cannot be read the card may show again; that is all.
 */
export function KycNudge() {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const { userDetails } = useGlobalContext();
  const { data } = useKycStatus();
  const [visible, setVisible] = useState(false);

  const eligible =
    userDetails?.account_type === "merchant" &&
    data?.kyc_status === "none" &&
    data.reason_code === null;
  const username = userDetails?.username;

  useEffect(() => {
    if (!eligible || !username) return;
    let cancelled = false;
    const key = `kyc_nudge_seen:${username}`;
    (async () => {
      let seen = false;
      try {
        seen = (await AsyncStorage.getItem(key)) !== null;
        if (!seen) await AsyncStorage.setItem(key, "1");
      } catch {
        // Unreadable storage: show it rather than hide it for good.
      }
      if (cancelled || seen) return;
      setVisible(true);
      track("kyc_nudge", { action: "shown" });
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, username]);

  if (!visible) return null;

  return (
    <View
      style={{
        gap: space.md,
        padding: space.md,
        borderRadius: radius.group,
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: color.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <KycChip icon="shield" tone="brand" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontWeight="font-bold">Get a Verified business badge</Text>
          <Text tone="body" fontSize="text-sm">
            Show renters your business is real. It takes a few minutes.
          </Text>
        </View>
      </View>
      <Button
        size="compact"
        onPress={() => {
          track("kyc_nudge", { action: "opened" });
          navigation.navigate("KycIntro", { source: "post_listing" });
        }}
      >
        Verify my business
      </Button>
      <Button
        size="compact"
        variant="ghost"
        onPress={() => {
          track("kyc_nudge", { action: "dismissed" });
          setVisible(false);
        }}
      >
        Not now
      </Button>
    </View>
  );
}
