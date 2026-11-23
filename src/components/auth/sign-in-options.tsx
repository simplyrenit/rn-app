import { useOAuth } from "@/components/auth/oauth";
import { Button, Text } from "@/components/core";
import { useTypedNavigation } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import { Platform, View } from "react-native";
import { EnvelopeIcon } from "react-native-heroicons/outline";

// The 2.1 "Provider" button (02 Welcome 2089:15349, the sign-in panel 2089:15649, 10/2094:22625):
// the kit Secondary box (52 high, r12, white, the #0000000A ring) with a `line` edge instead of
// the lavender one, a 24 icon, a 4 gap and a black SemiBold 14/20 label. Buttons are 10 apart.
const ICON = 24;
const ICON_GAP = 4;
const BUTTON_GAP = 10;

/**
 * The three sign-in providers, as one component so all three stay identical.
 *
 * Each provider owns its own pending state (a single shared flag put a spinner on both
 * buttons at once), and the label stays visible while a provider is working.
 */
export function SignInOptions() {
  const router = useTypedNavigation();
  const { googleSignIn, appleSignIn, pendingProvider } = useOAuth();
  const { color, isDark } = useTheme();
  const busy = pendingProvider !== null;
  // A blocked kit Secondary keeps its box and drops the label to `textDim` (kit-api.md).
  const labelColor = busy ? color.textDim : color.text;
  const provider = { borderColor: color.line };

  const Label = ({ children }: { children: React.ReactNode }) => (
    <Text
      fontWeight="font-semibold"
      fontSize="text-sm"
      lineHeight={20}
      style={{ marginLeft: ICON_GAP, color: labelColor }}
    >
      {children}
    </Text>
  );

  return (
    <View style={{ gap: BUTTON_GAP }}>
      <Button
        variant="outline"
        style={provider}
        onPress={googleSignIn}
        loading={pendingProvider === "google"}
        disabled={busy}
        accessibilityLabel="Continue with Google"
      >
        {/* The PNGs carry their own padding: at 24 the glyph is the frame's 16. */}
        <Image
          style={{ width: ICON, height: ICON }}
          source={require("../../../assets/auth/google-icon.png")}
          contentFit="contain"
        />
        <Label>Continue with Google</Label>
      </Button>

      {Platform.OS === "ios" && (
        <Button
          variant="outline"
          style={provider}
          onPress={appleSignIn}
          loading={pendingProvider === "apple"}
          disabled={busy}
          accessibilityLabel="Continue with Apple"
        >
          <Image
            style={{ width: ICON, height: ICON }}
            source={
              isDark
                ? require("../../../assets/auth/apple-icon.png")
                : require("../../../assets/auth/apple-icon-dark.png")
            }
            contentFit="contain"
          />
          <Label>Continue with Apple</Label>
        </Button>
      )}

      <Button
        variant="outline"
        style={provider}
        onPress={() => router.navigate("Email")}
        disabled={busy}
        accessibilityLabel="Continue with email"
      >
        <EnvelopeIcon size={ICON} color={labelColor} />
        <Label>Continue with email</Label>
      </Button>
    </View>
  );
}
