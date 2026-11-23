import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { BottomBar, NonScrollableContainer, ScrollContainer, Text, TextField } from "@/components/core";
import { useAuthContext } from "@/context/auth-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";

import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { PasswordEye } from "./password";

/** Dev-only design seed (ENG-428 plan §1): only DevFixture passes it. A display string, never submitted. */
type ConfirmPasswordDesign = { password: string; error?: string };

export default function ConfirmPassword() {
  const router = useTypedNavigation();
  const route = useRoute<RouteProps<"ConfirmPassword">>();
  const design = __DEV__ ? (route.params as { design?: ConfirmPasswordDesign }).design : undefined;

  const [password, setPassword] = useState(design?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(design?.error ?? "");

  const { enteredPassword } = route.params;

  const { saveUser } = useAuthContext();

  const validatePassword = useCallback(() => {
    if (!password) {
      setError("Please enter your password.");
      return false;
    }
    if (password !== enteredPassword) {
      setError("The passwords don’t match. Please try again.");
      return false;
    }
    return true;
  }, [password, enteredPassword]);

  const onSubmit = useCallback(() => {
    // A design seed never saves its display password.
    if (design) return;
    if (validatePassword()) {
      console.log("Password confirmed successfully!");
      setError("");

      saveUser({ password });

      router.navigate("Location");
    }
  }, [design, validatePassword]);

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (error) setError("");
    },
    [error]
  );

  return (
    <NonScrollableContainer>
      <HeaderIndicator percentage={50} />

      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24 }}>
        <Text role="screenTitle">Re-enter password</Text>

        <View style={{ marginTop: 24 }}>
          <TextField
            placeholder="Enter password"
            keyboardType="default"
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={handlePasswordChange}
            error={error || undefined}
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="new-password"
            accessibilityLabel="Confirm password"
            maxFontSizeMultiplier={1.4}
            style={{ paddingRight: 48 }}
          />
          <PasswordEye shown={showPassword} onPress={() => setShowPassword(!showPassword)} top={12} />
        </View>
      </ScrollContainer>

      <BottomBar primary={{ label: "Continue", onPress: onSubmit, disabled: !password }} />
    </NonScrollableContainer>
  );
}
