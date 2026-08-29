import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";
import { Text } from "./text";

interface Props {
  uri?: string | null;
  /** Used for the initials fallback and the VoiceOver label. */
  name?: string | null;
  size?: number;
}

/**
 * Backends commonly hand back a generic silhouette PNG rather than null. Four
 * of six rows in the inbox were the same grey figure, so the list carried no
 * information beyond order — a monogram is strictly better than that.
 */
const PLACEHOLDER_PATTERNS = [
  "default",
  "placeholder",
  "avatar-default",
  "no-image",
  "noimage",
  "anonymous",
  "user.png",
  "profile.png",
];

function isPlaceholder(uri?: string | null) {
  if (!uri) return true;
  const lower = uri.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((token) => lower.includes(token));
}

/**
 * A stable colour per person, so a screen full of monograms is scannable
 * instead of being one repeated shape. Hues are spaced around the wheel and
 * held at a saturation/lightness that clears AA against white text.
 */
const MONOGRAM_HUES = [262, 210, 172, 145, 32, 350, 288, 196];

function hueFor(name?: string | null) {
  const key = (name ?? "").trim().toLowerCase();
  if (!key) return MONOGRAM_HUES[0];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  return MONOGRAM_HUES[hash % MONOGRAM_HUES.length];
}

function initialsOf(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * A circular avatar that always holds its silhouette.
 *
 * The hairline ring is the point: without it a light-coloured photo bleeds into
 * a light background and the circle simply disappears. When there is no photo it
 * falls back to initials on a brand wash rather than an anonymous grey disc.
 */
export function Avatar({ uri, name, size = 40 }: Props) {
  const { color, isDark } = useTheme();
  const initials = initialsOf(name);
  const showPhoto = !isPlaceholder(uri);
  const hue = hueFor(name);
  const monogramFill = `hsl(${hue}, 46%, ${isDark ? 30 : 42}%)`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s profile photo` : "Profile photo"}
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: showPhoto ? color.brandWash : monogramFill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showPhoto ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text
          fontWeight="font-bold"
          style={{ color: "#FFFFFF", fontSize: size * 0.38 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
