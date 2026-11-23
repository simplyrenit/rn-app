import { HeaderIndicator } from "@/components/auth/headerIndicator";
import {
  BottomBar,
  NonScrollableContainer,
  ScrollContainer,
  Text,
  TextField,
  useFieldSurfaceStyle,
} from "@/components/core";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";

/** Dev-only design seed (ENG-428 plan §1): only DevFixture passes it. A display string, never submitted. */
type PasswordDesign = { password: string; focused?: boolean };

/**
 * The eye over the kit field (25483): 24 at x326, centred on the 48 input. `TextField` has no trailing slot, so
 * it is laid over the field by `top` (40 under a label, 12 without), and the input keeps 48 clear on its right.
 */
export function PasswordEye({ shown, onPress, top }: { shown: boolean; onPress: () => void; top: number }) {
  const { color } = useTheme();
  const Icon = shown ? EyeSlashIcon : EyeIcon;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Show or hide password"
      onPress={onPress}
      hitSlop={10}
      style={{ position: "absolute", right: 16, top }}
    >
      <Icon size={24} color={color.textDim} />
    </TouchableOpacity>
  );
}

export default function SetPassword() {
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: PasswordDesign } | undefined)?.design : undefined;
  const [password, setPassword] = useState(design?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const router = useTypedNavigation();
  const { color } = useTheme();
  // 25483/25541 draw the field focused with no keyboard: a seed borrows the kit's focused box without focusing.
  const focusedBox = useFieldSurfaceStyle({ focused: true });

  const passwordValidations = useMemo(
    () => ({
      hasMinChars: password.length >= 8,
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasNumber: /\d/.test(password),
    }),
    [password]
  );

  const onSubmit = () => {
    // A design seed never moves on with its display password.
    if (design) return;
    router.navigate("ConfirmPassword", {
      enteredPassword: password,
    });
  };

  const allValid = Object.values(passwordValidations).every(Boolean);

  return (
    <NonScrollableContainer>
      <HeaderIndicator percentage={50} />

      <ScrollContainer containerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24 }}>
        <Text role="screenTitle">Set a password for your new account</Text>

        <View style={{ marginTop: 24 }}>
          <TextField
            label="Create password"
            keyboardType="default"
            autoCapitalize="none"
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="new-password"
            accessibilityLabel="Password"
            maxFontSizeMultiplier={1.4}
            style={[design?.focused ? focusedBox : null, { paddingRight: 48 }]}
          />
          <PasswordEye shown={showPassword} onPress={() => setShowPassword(!showPassword)} top={40} />
        </View>

        {/* Rules (25483): 24 under the field (TextField keeps 18), a SemiBold heading, rows 28 apart. A met rule is
            a success check with its label in `text`; an unmet one a dim info circle with `textBody`. */}
        <View style={{ marginTop: 6, gap: 8 }}>
          <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
            Your password must include:
          </Text>

          {[
            { label: "Minimum 8 characters", valid: passwordValidations.hasMinChars },
            { label: "At least 1 special character", valid: passwordValidations.hasSpecialChar },
            { label: "At least 1 number", valid: passwordValidations.hasNumber },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {item.valid ? (
                <CheckCircleIcon size={20} color={color.success} />
              ) : (
                <InformationCircleIcon size={20} color={color.textDim} />
              )}
              <Text fontSize="text-sm" lineHeight={20} tone={item.valid ? "default" : "body"}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollContainer>

      <BottomBar primary={{ label: "Continue", onPress: onSubmit, disabled: !allValid }} />
    </NonScrollableContainer>
  );
}
