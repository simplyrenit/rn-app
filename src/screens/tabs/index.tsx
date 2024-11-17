import { useEffect } from "react";
import * as Location from "expo-location";
import { StaticContainer } from "@/components/core";
import { Categories } from "@/components/home/categories";
import { Disclaimer } from "@/components/home/disclaimer";
import { SearchBar } from "@/components/home/search-bar";
import { Experiences } from "@/components/home/sections/experiences";
import { Popular } from "@/components/home/sections/popular";
import { TopPicks } from "@/components/home/sections/top-picks";
import { View, ScrollView, Alert } from "react-native";
import { useGlobalContext } from "@/context/global-context";
import { useAuthContext } from "@/context/auth-context";
import { useNotifications } from "@/backend/useNotification";

export default function Home() {
  const { userData } = useGlobalContext();
  const { user, getUser } = useAuthContext();
  const { getNotifications } = useNotifications();

  useEffect(() => {
    getUser();
    getNotifications();
    const checkLocationPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== "granted") {
        const { status: newStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (newStatus !== "granted") {
          Alert.alert(
            "Permission needed",
            "Location permission is required to use this feature."
          );
        }
      }
    };

    checkLocationPermission();
  }, []);

  return (
    <StaticContainer width={100}>
      <SearchBar />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Categories />
        <View className="mt-2">
          <Experiences />
          <TopPicks />
          <Popular />
        </View>
        <View className="px-5">
          <Disclaimer />
        </View>
      </ScrollView>
    </StaticContainer>
  );
}
