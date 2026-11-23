import { useRefreshDetailsOnFocus } from "@/backend/use-refresh-details";
import { useGlobalContext } from "@/context/global-context";
import { Avatar, Text } from "@/components/core";
import { IconButton } from "@/components/core/icon-button";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { photoUrlOf } from "@/lib/image-url";
import { useTheme } from "@/lib/theme";
import Skeleton from "@/components/core/skeleton";
import React from "react";
import { View } from "react-native";
import { PencilSquareIcon } from "react-native-heroicons/outline";

// The account block (Profile 2095:25572 "Account block", 390x80): padding 16 24, gap 12, items centred; a 48 avatar,
// name 16/24 SemiBold over email 14/20 at 70% (gap 2), and a 24 pencil-square at 60%.
const AVATAR_SIZE = 48;
const BLOCK_GAP = 12;
const EDIT_ICON_SIZE = 24;

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface ProfileImgContainerProps {
  isDarkMode: boolean;
  handlePersonalDetailsSheetPress: () => void;
}

const ProfileImgContainer: React.FC<ProfileImgContainerProps> = ({
  isDarkMode,
  handlePersonalDetailsSheetPress,
}) => {
  const { userDetails } = useGlobalContext();
  const { color } = useTheme();
  const loading = !userDetails;
  const name = userDetails?.name.trim() ?? "";

  // The status card and the Post gate read the context's copy, so Profile refreshes that one.
  useRefreshDetailsOnFocus();

  return (
    <View
      style={{
        paddingVertical: 16,
        paddingHorizontal: SCREEN_GUTTER,
        flexDirection: "row",
        alignItems: "center",
        gap: BLOCK_GAP,
      }}
    >
      {loading ? (
        <Skeleton height={AVATAR_SIZE} width={AVATAR_SIZE} borderRadius={999} />
      ) : photoUrlOf(userDetails.image) ? (
        <Avatar uri={userDetails.image} name={name} size={AVATAR_SIZE} />
      ) : (
        // ponytail: the kit Avatar's monogram is a hued disc with white initials; this frame draws the brand tint
        // with brand SemiBold 16/24 initials, so the no-photo disc is drawn here until the kit Avatar matches.
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={name ? `${name}'s profile photo` : "Profile photo"}
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: color.line,
            backgroundColor: color.brandPanel,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fontSize="text-md" fontWeight="font-semibold" tone="brand">
            {initialsOf(name)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1, gap: 2 }}>
        {loading ? (
          <Skeleton height={14} width={140} borderRadius={4} />
        ) : (
          <Text fontSize="text-md" fontWeight="font-semibold" numberOfLines={1}>
            {name}
          </Text>
        )}
        {loading ? (
          <Skeleton height={14} width={180} borderRadius={4} />
        ) : (
          <Text fontSize="text-sm" tone="body" numberOfLines={1}>
            {userDetails?.email}
          </Text>
        )}
      </View>

      {!loading && (
        <IconButton
          onPress={handlePersonalDetailsSheetPress}
          accessibilityLabel="Edit your details"
          // The glyph's own box; IconButton hit-slops the target back out to 44.
          size={EDIT_ICON_SIZE}
        >
          <PencilSquareIcon size={EDIT_ICON_SIZE} color={color.textDim} strokeWidth={1.5} />
        </IconButton>
      )}
    </View>
  );
};

export default ProfileImgContainer;
