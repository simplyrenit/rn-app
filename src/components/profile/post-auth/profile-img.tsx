import { MyDetails, useProfile } from "@/backend/profile";
import { Avatar, Text } from "@/components/core";
import { IconButton } from "@/components/core/icon-button";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import Skeleton from "@/components/core/skeleton";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { PencilSquareIcon } from "react-native-heroicons/outline";

/** Measured off the signed-in Profile frame. */
const AVATAR_SIZE = 48;
const NAME_GAP = 8;
const EDIT_ICON_SIZE = 20;

interface ProfileImgContainerProps {
  isDarkMode: boolean;
  handlePersonalDetailsSheetPress: () => void;
}

const ProfileImgContainer: React.FC<ProfileImgContainerProps> = ({
  isDarkMode,
  handlePersonalDetailsSheetPress,
}) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Partial<MyDetails>>({
    first_name: "",
    last_name: "",
    email: "",
    image: { image_url: "", name: "" },
  });
  const { getMyDetails } = useProfile();
  const { color } = useTheme();

  const fetchDetails = async () => {
    const details = await getMyDetails();
    setDetails(details);
    setLoading(false);
  };

  // The dependency was `handlePersonalDetailsSheetPress`, which the parent
  // rebuilds on every render — so this refetched, set state, re-rendered and
  // refetched again, polling /users/me in a loop for as long as the screen was
  // focused. Fetch once per focus.
  useFocusEffect(
    useCallback(() => {
      void fetchDetails();
    }, [])
  );

  return (
    <View
      style={{
        // 24 on every edge around a 48pt avatar is what makes the design's
        // profile block exactly 96pt tall.
        padding: SCREEN_GUTTER,
        flexDirection: "row",
        alignItems: "center",
        gap: NAME_GAP,
      }}
    >
      {/* Avatar carries a hairline ring. It was correctly circular but had no
          border, so a light profile photo bled into the light background and
          the silhouette disappeared. */}
      {loading ? (
        <Skeleton height={AVATAR_SIZE} width={AVATAR_SIZE} borderRadius={999} />
      ) : (
        <Avatar
          uri={details.image?.image_url}
          name={`${details.first_name ?? ""} ${details.last_name ?? ""}`.trim()}
          size={AVATAR_SIZE}
        />
      )}

      <View style={{ flex: 1, gap: 4 }}>
        {loading ? (
          <Skeleton height={14} width={140} borderRadius={4} />
        ) : (
          <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1}>
            {`${details.first_name ?? ""} ${details.last_name ?? ""}`.trim()}
          </Text>
        )}
        {loading ? (
          <Skeleton height={14} width={180} borderRadius={4} />
        ) : (
          <Text fontSize="text-sm" tone="body" numberOfLines={1}>
            {details.email}
          </Text>
        )}
      </View>

      {!loading && (
        <IconButton
          onPress={handlePersonalDetailsSheetPress}
          accessibilityLabel="Edit your details"
          // The design tops the pencil out against the block's own 24pt
          // padding rather than centring it on the avatar. Sizing the button to
          // the glyph is what puts it there; IconButton still hit-slops the
          // target back out to 44.
          size={EDIT_ICON_SIZE}
          style={{ alignSelf: "flex-start" }}
        >
          <PencilSquareIcon
            size={EDIT_ICON_SIZE}
            color={color.brandText}
            strokeWidth={1.5}
          />
        </IconButton>
      )}
    </View>
  );
};

export default ProfileImgContainer;
