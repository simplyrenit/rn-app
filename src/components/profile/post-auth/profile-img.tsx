import { MyDetails, useProfile } from "@/backend/profile";
import { Avatar, Text } from "@/components/core";
import { IconButton } from "@/components/core/icon-button";
import { useTheme } from "@/lib/theme";
import Skeleton from "@/components/core/skeleton";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { PencilSquareIcon } from "react-native-heroicons/outline";

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
        paddingVertical: 22,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Avatar carries a hairline ring. It was correctly circular but had no
          border, so a light profile photo bled into the light background and
          the silhouette disappeared. */}
      {loading ? (
        <Skeleton height={52} width={52} borderRadius={999} />
      ) : (
        <Avatar
          uri={details.image?.image_url}
          name={`${details.first_name ?? ""} ${details.last_name ?? ""}`.trim()}
          size={52}
        />
      )}

      <View style={{ flex: 1, gap: 3 }}>
        {loading ? (
          <Skeleton height={14} width={140} borderRadius={4} />
        ) : (
          <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
            {`${details.first_name ?? ""} ${details.last_name ?? ""}`.trim()}
          </Text>
        )}
        {loading ? (
          <Skeleton height={12} width={180} borderRadius={4} />
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
        >
          <PencilSquareIcon size={20} color={color.brandText} />
        </IconButton>
      )}
    </View>
  );
};

export default ProfileImgContainer;
