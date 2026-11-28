import { useKycStatus } from "@/backend/kyc";
import { useRefreshDetailsOnFocus } from "@/backend/use-refresh-details";
import { useGlobalContext } from "@/context/global-context";
import { Avatar, Text } from "@/components/core";
import { IconButton } from "@/components/core/icon-button";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { photoUrlOf } from "@/lib/image-url";
import { kycVerified } from "@/lib/kyc";
import { useTheme } from "@/lib/theme";
import Skeleton from "@/components/core/skeleton";
import React from "react";
import { View } from "react-native";
import { PencilSquareIcon } from "react-native-heroicons/outline";
import { ShieldCheckIcon } from "react-native-heroicons/solid";

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

/**
 * The 48 account avatar (2095:25572, 2096:27684): the photo through kit `Avatar`, else the brand tint with brand
 * SemiBold 16/24 initials. Shared by the Profile block and the Personal details sheet, so both draw the person alike.
 */
export function ProfileAvatar({ uri, name }: { uri?: React.ComponentProps<typeof Avatar>["uri"]; name: string }) {
  const { color } = useTheme();
  if (photoUrlOf(uri)) return <Avatar uri={uri} name={name} size={AVATAR_SIZE} />;
  // ponytail: the kit Avatar's monogram is a hued disc with white initials; section 13 draws the brand tint with brand
  // SemiBold initials, so the no-photo disc is drawn here until the kit Avatar matches (ENG-426).
  return (
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
  );
}

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
  // ENG-446: the person's own "KYC verified" badge, while their check is in force.
  // A business keeps its own Verified business badge.
  const kyc = useKycStatus().data;
  const verified = userDetails?.account_type !== "merchant" && kycVerified(kyc);

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
      ) : (
        <ProfileAvatar uri={userDetails.image} name={name} />
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
        {verified ? (
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: color.brandWash,
            }}
          >
            <ShieldCheckIcon size={14} color={color.brandText} />
            <Text fontSize="text-xs" fontWeight="font-semibold" tone="brand">
              KYC verified
            </Text>
          </View>
        ) : null}
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
