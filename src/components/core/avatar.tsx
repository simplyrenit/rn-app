import { radius } from "@/lib/design-tokens";
import { photoUrlOf } from "@/lib/image-url";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";
import { Text } from "./text";

interface Props {
  /**
   * The photo: a URL, or what a nested user carries (`{ image_url }`); anything else, `null` too, draws the monogram. Read by
   * `photoUrlOf`, which never throws on a value that is not a string.
   */
  uri?: string | { image_url?: string | null } | null;
  /** Used for the initials fallback and the VoiceOver label. */
  name?: string | null;
  size?: number;
}

function initialsOf(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The frames' size-keyed initials (03 2089:36248 / 36523 72pt, 2089:24740 40pt; 01 and 04 draw the same "Avatar
 * (initials)" at 40 and 48): 72 and up is SemiBold 20/28 in brand, anything smaller SemiBold 14/20 at 70% black.
 */
const LARGE_AVATAR = 72;

/**
 * A circular avatar that always holds its silhouette.
 *
 * A photo keeps a hairline ring: without it a light-coloured photo bleeds into a light background and the circle
 * simply disappears. With no photo it draws the 2.1 frames' "Avatar (initials)": the brand tint (#EDEDFC) disc with
 * no ring and the initials above (ENG-427 D3; it was a per-person hued disc with white initials).
 */
export function Avatar({ uri, name, size = 40 }: Props) {
  const { color } = useTheme();
  const initials = initialsOf(name);
  const photo = photoUrlOf(uri);
  const showPhoto = photo !== null;
  const large = size >= LARGE_AVATAR;

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
        borderWidth: showPhoto ? 1 : 0,
        borderColor: color.line,
        backgroundColor: showPhoto ? color.brandWash : color.brandPanel,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showPhoto ? (
        <Image
          source={{ uri: photo! }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        // The disc is a fixed size, so the initials do not scale with the text size (the label is on the disc).
        <Text
          fontSize={large ? "text-lg" : "text-sm"}
          fontWeight="font-semibold"
          tone={large ? "brand" : "body"}
          allowFontScaling={false}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
