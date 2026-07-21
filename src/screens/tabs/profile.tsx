import { StaticContainer, Text } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import ProfilePostAuth from "@/components/profile/post-auth/profile-post-auth";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import { RootStackParamList } from "@/lib/types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { BellIcon } from "react-native-heroicons/outline";

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Welcome"
>;

export default function Profile() {
  const { logout, authTokens, isAuthenticated, theme, loading } = useGlobalContext();

  const isDarkMode = theme === "dark";
  const navigation = useNavigation<ProfileScreenNavigationProp>();


  const handleLogout = async () => {
    await logout();

    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  return (
    <StaticContainer width={100}>
      <View className="px-5 pb-2 mt-4 w-full">
        <View className="flex-row justify-between items-center">
          <View>
            <Text
              fontWeight="font-bold"
              fontSize="text-2xl"
            >
              My Profile
            </Text>
          </View>
          {authTokens && isAuthenticated && (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate("notification");
              }}
            >
              <BellIcon
                size={24}
                color={isDarkMode ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? <View className="p-6">
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
        <View className="gap-4 flex-row items-center mt-4">
          <Skeleton height={16} width={16} />
          <Skeleton height={12} width={'80%'} />
          <Skeleton height={8} width={16} />
        </View>
        <Skeleton height={12} width={80} className="mt-12" />
        {Array.from({ length: 8 }).map((_, i) => (
          <View className="gap-4 flex-row items-center mt-4" key={i}>
            <Skeleton height={16} width={16} />
            <Skeleton height={12} width={`${80 - Math.floor(Math.random() * 41)}%`} />
            <Skeleton height={8} width={16} />
          </View>
        ))}

      </View> : <ScrollView
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
      </ScrollView>}
    </StaticContainer>
  );
}
