import { useKycStatus } from "@/backend/kyc";
import { Button, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { radius } from "@/lib/design-tokens";
import { track } from "@/lib/events";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { KycChip } from "./kyc-chip";

/**
 * A one-time suggestion, after a business account's first listing on this device, to get the
 * Verified business badge. Shown only to a merchant with nothing on file (a timed-out case
 * gets its own card on Profile instead).
 *
 * The seen flag is set the first time the card renders, not when it is dismissed, so it shows
 * once per account per device. If the flag cannot be read the card may show again; that is all.
 *
 * `design` (dev-only, a design fixture's seed): show it whenever eligible, without the flag or any event, and make
 * both actions inert.
 *
 * 2096:29335: 1px `line` r12, padding 16, gap 16; the 40 chip 16 from the 16/24 SemiBold title and 14/20 body; the
 * tonal 44 "Verify my business" (the footer stays the one primary), then "Not now" 14/20 SemiBold in a 28 row.
 */
export function KycNudge({ design }: { design?: boolean } = {}) {
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
    if (design) {
      setVisible(true);
      return;
    }
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
  }, [eligible, username, design]);

  if (!visible) return null;

  return (
    <View style={{ gap: 16, padding: 16, borderRadius: radius.button, borderWidth: 1, borderColor: color.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <KycChip icon="shield" tone="brand" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-semibold">
            Get a Verified business badge
          </Text>
          <Text tone="body" fontSize="text-sm">
            Show renters your business is real. It takes a few minutes.
          </Text>
        </View>
      </View>
      <Button
        variant="outline"
        tone="tonal"
        size="compact"
        onPress={() => {
          if (design) return;
          track("kyc_nudge", { action: "opened" });
          navigation.navigate("KycIntro", { source: "post_listing" });
        }}
      >
        Verify my business
      </Button>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (design) return;
          track("kyc_nudge", { action: "dismissed" });
          setVisible(false);
        }}
        hitSlop={8}
        style={{ alignItems: "center", paddingVertical: 4 }}
      >
        <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
          Not now
        </Text>
      </Pressable>
    </View>
  );
}
