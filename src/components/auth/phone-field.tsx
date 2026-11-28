import { FieldError, FieldLabel, Text, useFieldSurfaceStyle } from "@/components/core";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { ChevronDownIcon } from "react-native-heroicons/outline";
import CountryPicker, { DARK_THEME } from "react-native-country-picker-modal";
import { flagOf, PhoneCountry } from "@/lib/phone-number";

interface Props {
  country: PhoneCountry;
  onCountryChange: (country: PhoneCountry) => void;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}

/**
 * 02b sign-in (2179:31785): the kit field box holding the country (flag, "+91", a 12 chevron, a hairline) and the
 * number. One box, not the 100-wide country box beside the field the profile sheet uses: the sign-in screen has no
 * room for two rows of controls above its providers.
 */
export function PhoneField({ country, onCountryChange, value, onChangeText, error, autoFocus, onSubmitEditing }: Props) {
  const { color, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const surface = useFieldSurfaceStyle({ focused, error: Boolean(error) });

  return (
    <View>
      <FieldLabel label="Mobile number" />
      <View style={[surface, { flexDirection: "row", alignItems: "center", paddingVertical: 0 }]}>
        <CountryPicker
          {...(isDark && { theme: DARK_THEME })}
          withFilter
          withCallingCode
          countryCode={country.cca2 as any}
          onSelect={(picked) => onCountryChange({ cca2: picked.cca2, callingCode: picked.callingCode[0] ?? "" })}
          renderFlagButton={({ onOpen }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Country code, +${country.callingCode}. Change country`}
              onPress={onOpen}
              hitSlop={{ top: 8, bottom: 8 }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 48 }}
            >
              <Text fontSize="text-md" lineHeight={24} maxFontSizeMultiplier={1.4}>
                {flagOf(country.cca2)}
              </Text>
              <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} maxFontSizeMultiplier={1.4}>
                {`+${country.callingCode}`}
              </Text>
              <ChevronDownIcon size={12} strokeWidth={2.4} color={color.textDim} />
              <View style={{ width: 1, height: 24, backgroundColor: color.line, marginLeft: 6 }} />
            </Pressable>
          )}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Enter mobile number"
          placeholderTextColor={color.placeholder}
          selectionColor={color.brand}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus={autoFocus}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          maxFontSizeMultiplier={1.4}
          accessibilityLabel="Mobile number"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, height: 46, marginLeft: 12, color: color.text, fontFamily: "PlusJakartaSans-Regular", fontSize: 16 }}
        />
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}
