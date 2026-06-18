import { useEffect } from "react";
import { StaticContainer } from "@/components/core";
import { Categories } from "@/components/home/categories";
import { Disclaimer } from "@/components/home/disclaimer";
import { SearchBar } from "@/components/home/search-bar";
import { Experiences } from "@/components/home/sections/experiences";
import { Popular } from "@/components/home/sections/popular";
import { RecentlyAdded } from "@/components/home/sections/top-picks";
import { View, ScrollView } from "react-native";
import { useGlobalContext } from "@/context/global-context";
import { useAuthContext } from "@/context/auth-context";
import { useNotifications } from "@/backend/useNotification";

export default function Home() {
  const { isAuthenticated } = useGlobalContext();
  const { getUser } = useAuthContext();
  const { getNotifications } = useNotifications();

  useEffect(() => {
    void getUser();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void getNotifications();
  }, [isAuthenticated]);

  return (
    <StaticContainer width={100}>
      <SearchBar />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Categories />
        <View className="mt-2">
          <Experiences />
          <Popular />
          <RecentlyAdded />
        </View>
        <View className="px-5">
          <Disclaimer />
        </View>
      </ScrollView>
    </StaticContainer>
  );
}
