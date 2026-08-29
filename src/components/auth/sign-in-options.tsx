import { useOAuth } from "@/components/auth/oauth";
import { Button, Text } from "@/components/core";
import { useTypedNavigation } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import { Platform, View } from "react-native";
import { EnvelopeIcon } from "react-native-heroicons/outline";

/**
 * The three sign-in providers, as one component so all three stay identical.
 *
 * What changed: each provider now owns its own pending state (a single shared
 * flag put a spinner on both buttons at once), the label stays visible while a
 * provider is working, and the three buttons sit on one baseline — they used to
 * need hand-tuned `-translate-y-0.5` offsets because Button wrapped every child
 * in a <Text>, and the Apple button was missing its offset.
 */
export function SignInOptions() {
  const router = useTypedNavigation();
  const { googleSignIn, appleSignIn, pendingProvider } = useOAuth();
  const { color, isDark } = useTheme();

  const Label = ({ children }: { children: React.ReactNode }) => (
    <Text fontWeight="font-bold" fontSize="text-md" style={{ marginLeft: 10 }}>
      {children}
    </Text>
  );

  return (
    <View style={{ gap: 10 }}>
      <Button
        variant="outline"
        onPress={googleSignIn}
        loading={pendingProvider === "google"}
        disabled={pendingProvider !== null}
        accessibilityLabel="Continue with Google"
      >
        <Image
          style={{ width: 20, height: 20 }}
          source={require("../../../assets/auth/google-icon.png")}
          contentFit="contain"
        />
        <Label>Continue with Google</Label>
      </Button>

      {Platform.OS === "ios" && (
        <Button
          variant="outline"
          onPress={appleSignIn}
          loading={pendingProvider === "apple"}
          disabled={pendingProvider !== null}
          accessibilityLabel="Continue with Apple"
        >
          <Image
            style={{ width: 20, height: 20 }}
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
        onPress={() => router.navigate("Email")}
        disabled={pendingProvider !== null}
        accessibilityLabel="Continue with email"
      >
        <EnvelopeIcon size={20} color={color.text} />
        {/* The label used to carry a literal {" "} leading space, so it started
            further right than its siblings. */}
        <Label>Continue with email</Label>
      </Button>
    </View>
  );
}
