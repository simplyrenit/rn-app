import { CrossFade, IconButton, StaticContainer, SubpageHeader } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import ProfilePostAuth from "@/components/profile/post-auth/profile-post-auth";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { RootStackParamList } from "@/lib/types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { BellIcon } from "react-native-heroicons/outline";
import { useTheme } from "@/lib/theme";

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Welcome"
>;

const BELL_SIZE = 24;

export default function Profile() {
  const { logout, authTokens, isAuthenticated, theme, loading, fetchUserDetails } = useGlobalContext();
  const [refreshing, setRefreshing] = useState(false);

  const isDarkMode = theme === "dark";
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { color } = useTheme();


  const handleLogout = async () => {
    await logout();

    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  return (
    <StaticContainer width={100} edges={["top", "left", "right"]}>
      {/* The kit Top bar, Tab title (2071:14407): "Profile" (REVIEW b4-03) and, signed in, the bell in its 44 box.
          It sits above the scroll view, so rows never pass under it. */}
      <SubpageHeader
        variant="tab-title"
        title="Profile"
        trailing={
          authTokens && isAuthenticated ? (
            <IconButton
              accessibilityLabel="Notifications"
              onPress={() => {
                navigation.navigate("notification");
              }}
            >
              <BellIcon size={BELL_SIZE} color={color.text} strokeWidth={1.5} />
            </IconButton>
          ) : undefined
        }
      />

      <CrossFade
        loading={loading}
        placeholder={
          <View className="p-6">
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', width: '100%' }}>
              <Skeleton height={50} width={50} borderRadius={50} />
              <View style={{ flexDirection: 'column', flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Skeleton height={10} width={60} borderRadius={20} />
                  <View style={{ flex: 1 }} />
                  <Skeleton height={10} width={10} borderRadius={8} />
                </View>
                <Skeleton height={10} width={160} borderRadius={20} className="mt-2" />
              </View>
              <View>
              </View>
            </View>
            <View className="space-x-4 flex-row items-center mt-4">
              <Skeleton height={16} width={16} />
              <Skeleton height={12} width={'80%'} />
              <Skeleton height={8} width={16} />
            </View>
            <Skeleton height={12} width={80} className="mt-12" />
            {Array.from({ length: 8 }).map((_, i) => (
              <View className="space-x-4 flex-row items-center mt-4" key={i}>
                <Skeleton height={16} width={16} />
                <Skeleton height={12} width={`${80 - Math.floor(Math.random() * 41)}%`} />
                <Skeleton height={8} width={16} />
              </View>
            ))}
          </View>
        }
      >
        <ScrollView
          // Pull down to read the merchant status again (ENG-271).
          refreshControl={
            authTokens && isAuthenticated ? (
              <RefreshControl
                refreshing={refreshing}
                tintColor={color.textBody}
                colors={[color.brand]}
                onRefresh={async () => {
                  setRefreshing(true);
                  await fetchUserDetails();
                  setRefreshing(false);
                }}
              />
            ) : undefined
          }
          contentContainerStyle={
            authTokens && isAuthenticated
              ? {}
              : {
                flexGrow: 1,
              }
          }
        >
          {authTokens && isAuthenticated ? (
            <ProfilePostAuth
              isDarkMode={isDarkMode}
              handleLogout={handleLogout}
            />
          ) : (
            <ProfilePreAuth isDarkMode={isDarkMode} />
          )}
        </ScrollView>
      </CrossFade>
    </StaticContainer>
  );
}
