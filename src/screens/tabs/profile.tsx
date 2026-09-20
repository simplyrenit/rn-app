import { CrossFade, IconButton, PinnedHeader, StaticContainer, Text } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import ProfilePostAuth from "@/components/profile/post-auth/profile-post-auth";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { RootStackParamList } from "@/lib/types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, View } from "react-native";
import { BellIcon } from "react-native-heroicons/outline";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, lineHeight } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Welcome"
>;

/** The design's topbar padding: 24 in from the title side, 16 on the bell's. */
const TOPBAR_PADDING_Y = 16;
const TOPBAR_PADDING_RIGHT = 16;
const BELL_SIZE = 24;
/**
 * The topbar is 61pt: 16 + the H2's 29pt line box + 16. A 44pt hit target is
 * 15pt taller than that line box, so half the difference is pulled back above
 * and below — the bell keeps a full target and its 44pt box still ends 16 from
 * the screen edge, without the bar growing to 76.
 */
const BELL_OVERHANG = (MIN_TOUCH_TARGET - lineHeight.xl) / 2;

export default function Profile() {
  const { logout, authTokens, isAuthenticated, theme, loading } = useGlobalContext();

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
    <StaticContainer width={100}>
      {/* Solid rather than blurred, and with no rule: the design draws the
          topbar as part of the page. The material still has to be opaque —
          rows used to scroll under a header with no fill at all and were cut
          through the middle of the letterforms. */}
      <PinnedHeader
        gutter={false}
        separator={false}
        material="solid"
        style={{
          paddingTop: TOPBAR_PADDING_Y,
          paddingBottom: TOPBAR_PADDING_Y,
          paddingLeft: SCREEN_GUTTER,
          paddingRight: TOPBAR_PADDING_RIGHT,
        }}
      >
        <View className="flex-row justify-between items-center">
          <Text accessibilityRole="header" role="screenTitle">
            My Profile
          </Text>
          {authTokens && isAuthenticated && (
            <IconButton
              accessibilityLabel="Notifications"
              onPress={() => {
                navigation.navigate("notification");
              }}
              style={{ marginVertical: -BELL_OVERHANG }}
            >
              <BellIcon size={BELL_SIZE} color={color.text} strokeWidth={1.5} />
            </IconButton>
          )}
        </View>
      </PinnedHeader>

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
