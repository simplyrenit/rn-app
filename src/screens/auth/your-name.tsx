import { SignUpError, useAuth } from "@/backend/auth";
import { useProfile } from "@/backend/profile";
import { BottomBar, FieldError, NonScrollableContainer, ScrollContainer, Text, TextField } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { goAfterSignIn } from "@/lib/return-to";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

/** Dev-only design seed: only DevFixture passes it. */
type NameDesign = { firstName?: string; lastName?: string };

/**
 * 02b name (2179:31979): the one question a new account is asked. It finishes two kinds of sign-in:
 *
 * - Signed out, after a code: the account is made here (`POST /api/signup/` with the name and the proof token
 *   the code screen kept in the sign-up context).
 * - Signed in with Google or Apple, when the provider gave no name: the name is saved to the account.
 *
 * Nothing else is asked any more (2026-11-28): no date of birth, no password, no location, no merchant choice.
 * Both end where every sign-in ends, back where the customer was asked to sign in.
 */
export default function YourName() {
  const route = useRoute<RouteProps<"YourName">>();
  const design = __DEV__ ? (route.params as { design?: NameDesign } | undefined)?.design : undefined;
  const router = useTypedNavigation();
  const { isAuthenticated, userDetails, fetchUserDetails } = useGlobalContext();
  const { signUpUser, loading: signingUp } = useAuth();
  const { updateMyDetails, loading: saving } = useProfile();

  const [firstName, setFirstName] = useState(design?.firstName ?? route.params?.firstName ?? "");
  const [lastName, setLastName] = useState(design?.lastName ?? route.params?.lastName ?? "");
  const [error, setError] = useState("");
  const busy = signingUp || saving;
  const ready = firstName.trim() !== "" && lastName.trim() !== "";

  const handleSubmit = useCallback(async () => {
    // A design seed never makes or changes an account.
    if (design || !ready || busy) return;
    setError("");
    const name = { first_name: firstName.trim(), last_name: lastName.trim() };
    try {
      if (isAuthenticated) {
        const username = route.params?.username ?? userDetails?.username;
        if (!username) throw new Error("We couldn't save your name. Try again.");
        await updateMyDetails(username, name);
        await fetchUserDetails();
      } else {
        await signUpUser(name);
      }
      goAfterSignIn(router);
    } catch (failure: any) {
      const signUpError = failure as SignUpError;
      setError(
        signUpError.code === "otp_verification_required"
          ? "Your code has run out. Go back and get a new one."
          : signUpError.message || "We couldn't save your name. Try again."
      );
    }
  }, [busy, design, fetchUserDetails, firstName, isAuthenticated, lastName, ready, route.params?.username, router, signUpUser, updateMyDetails, userDetails?.username]);

  return (
    <NonScrollableContainer>
      {/* No back control (the frame has none): behind this screen is a used code, or a finished sign-in. */}
      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 32, paddingBottom: 24 }}>
        <View style={{ gap: 4 }}>
          <Text role="screenTitle">What's your name?</Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            Shops see this on your bookings.
          </Text>
        </View>

        <View style={{ marginTop: 24 }}>
          <TextField
            label="First name"
            placeholder="First name"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setError("");
            }}
            autoFocus={!design && !firstName}
            autoCapitalize="words"
            autoComplete="name-given"
            textContentType="givenName"
            returnKeyType="next"
            maxFontSizeMultiplier={1.4}
          />
          <TextField
            label="Last name"
            placeholder="Last name"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              setError("");
            }}
            autoCapitalize="words"
            autoComplete="name-family"
            textContentType="familyName"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            maxFontSizeMultiplier={1.4}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </View>
      </ScrollContainer>

      <BottomBar primary={{ label: "Continue", onPress: handleSubmit, loading: busy, disabled: !ready || busy }} />
    </NonScrollableContainer>
  );
}
