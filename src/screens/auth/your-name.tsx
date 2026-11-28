import { SignUpError, useAuth } from "@/backend/auth";
import { useProfile } from "@/backend/profile";
import { BottomBar, FieldError, NonScrollableContainer, ScrollContainer, Text, TextField } from "@/components/core";
import { Pressable } from "react-native";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { goAfterSignIn } from "@/lib/return-to";
import { requestErrorFrom } from "@/lib/sign-in-proof";
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
 *   the code screen kept in the sign-up context). The code screen replaced itself with this one, so Back goes to
 *   where the number or the address was typed, never to a code that is already used.
 * - Signed in with Google or Apple, when the provider gave no whole name: the name is saved to the account. Only
 *   that sign-in passes `username`, so the mode is read from it rather than from the auth state, which a forced
 *   sign-out could change under the screen.
 *
 * Nothing else is asked any more (2026-11-28): no date of birth, no password, no location, no merchant choice.
 * Both end where every sign-in ends, back where the customer was asked to sign in.
 */
export default function YourName() {
  const route = useRoute<RouteProps<"YourName">>();
  const design = __DEV__ ? (route.params as { design?: NameDesign } | undefined)?.design : undefined;
  const router = useTypedNavigation();
  const { userDetails } = useGlobalContext();
  const username = route.params?.username;
  const { signUpUser, loading: signingUp } = useAuth();
  const { updateMyDetails, loading: saving } = useProfile();

  const [firstName, setFirstName] = useState(design?.firstName ?? route.params?.firstName ?? "");
  const [lastName, setLastName] = useState(design?.lastName ?? route.params?.lastName ?? "");
  const [error, setError] = useState("");
  // The sign-up can't be finished from here (the proof ran out, or the account is one sign-up won't finish):
  // the way out is to start the sign-in again.
  const [stuck, setStuck] = useState(false);
  const busy = signingUp || saving;
  const ready = firstName.trim() !== "" && lastName.trim() !== "";

  const handleSubmit = useCallback(async () => {
    // A design seed never makes or changes an account.
    if (design || !ready || busy) return;
    setError("");
    const name = { first_name: firstName.trim(), last_name: lastName.trim() };
    if (username) {
      try {
        // updateMyDetails reads the profile again itself, so Profile shows the new name.
        await updateMyDetails(username, name);
      } catch (failure: any) {
        setError(requestErrorFrom(failure, "We couldn't save your name. Try again.").message);
        return;
      }
      goAfterSignIn(router);
      return;
    }
    try {
      await signUpUser(name);
    } catch (failure: any) {
      const signUpError = failure as SignUpError;
      if (signUpError.code === "otp_verification_required" || signUpError.status === 403) {
        setStuck(true);
        setError("Your code has run out. Start again to get a new one.");
      } else if (signUpError.status === 409) {
        setStuck(true);
        setError("This account already exists. Sign in the way you first did, with Google or Apple.");
      } else {
        setError(signUpError.message || "We couldn't create your account. Try again.");
      }
      return;
    }
    goAfterSignIn(router);
  }, [busy, design, firstName, lastName, ready, router, signUpUser, updateMyDetails, username]);

  return (
    <NonScrollableContainer>
      {/* No back control in the frame; the system Back goes to where the number or address was typed (code sign-up)
          or to the tabs (Google/Apple). */}
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
          {stuck ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.reset({ index: 1, routes: [{ name: "MainTabs" }, { name: "Welcome" }] })}
              style={{ marginTop: 16, alignSelf: "flex-start" }}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
                Start again
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollContainer>

      <BottomBar primary={{ label: "Continue", onPress: handleSubmit, loading: busy, disabled: !ready || busy }} />
    </NonScrollableContainer>
  );
}
