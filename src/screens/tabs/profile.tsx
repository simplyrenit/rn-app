import { StaticContainer, Text } from "@/components/core";
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
  const { logout, authTokens, isAuthenticated, theme } = useGlobalContext();

  const isDarkMode = theme === "dark";
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  console.log(authTokens, isAuthenticated);

  const handleLogout = async () => {
    await logout();

    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  };

  return (
    <StaticContainer width={100}>
      <View className="px-5 pb-4 mt-4 w-full">
        <View className="flex-row justify-between items-center">
          <View>
            <Text fontWeight="font-bold" fontSize="text-2xl">
              My Profile
            </Text>
          </View>
          {authTokens && isAuthenticated && (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate("notification");
              }}
            >
              <BellIcon size={24} color={isDarkMode ? "#FFF" : "#000"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
    </StaticContainer>
  );
}
