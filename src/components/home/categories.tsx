import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
  Image,
  Platform,
  StyleSheet,
} from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { CATEGORIES } from "@/lib/categories";
import { CategoryItem } from "../../lib/types";
import { Text } from "../core";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import * as Location from "expo-location";

export function Categories() {
  const navigation = useTypedNavigation();
  const itemWidth = wp(27);
  const itemMargin = wp(2);

  const splitIntoPairs = (arr: CategoryItem[]): CategoryItem[][] => {
    const result = [];
    for (let i = 0; i < arr.length; i += 2) {
      result.push(arr.slice(i, i + 2));
    }
    return result;
  };
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  const categoryPairs: CategoryItem[][] = splitIntoPairs(CATEGORIES);

  const styles = StyleSheet.create({
    shadow: {
      shadowColor: isDark ? "#00000040" : "#808080",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.75,
      shadowRadius: 3,
      elevation: 5,
    },
  });

  const getFormattedAddress = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const {
          name,
          street,
          streetNumber,
          district,
          city,
          region,
          postalCode,
          country,
        } = reverseGeocode[0];

        let formattedAddress = "";

        if (Platform.OS === "ios") {
          const addressLine1 = [streetNumber, street].filter(Boolean).join(" ");
          const addressLine2 = [district, city].filter(Boolean).join(", ");
          const addressLine3 = [region, postalCode].filter(Boolean).join(" ");

          formattedAddress = [addressLine1, addressLine2, addressLine3]
            .filter(Boolean)
            .join(", ");
        } else {
          formattedAddress = reverseGeocode[0].formattedAddress || "";
        }

        if (!formattedAddress) {
          const fallbackParts = [name, street, city, region, country].filter(
            Boolean
          );
          formattedAddress = fallbackParts.join(", ");
        }

        return {
          address: formattedAddress,
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        };
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: itemMargin }}
    >
      {categoryPairs.map((pair, pairIndex) => (
        <View
          key={pairIndex}
          style={{
            width: itemWidth,
            marginRight:
              pairIndex === categoryPairs.length - 1 ? 0 : itemMargin,
            // borderWidth: 1,
            // borderColor: "blue",
            marginLeft: pairIndex === 0 ? wp(1.5) : 0,
          }}
        >
          {pair.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={{ marginBottom: 5 }}
              onPress={async () => {
                const locationData = await getFormattedAddress();
                navigation.navigate("SearchResults", {
                  category: category.name,
                  address: locationData?.address ?? "",
                  coords: locationData?.coordinates
                    ? {
                        lat: locationData.coordinates.latitude,
                        lng: locationData.coordinates.longitude,
                      }
                    : { lat: undefined, lng: undefined },
                  range: { startDate: undefined, endDate: undefined },
                  products: [],
                  selectedItem: category.name,
                });
              }}
            >
              <View className="items-center mb-3">
                <View className="w-24 h-20 rounded-full overflow-hidden items-center justify-center">
                  <Image
                    source={category.image}
                    className={`${
                      index === 1 ? "w-[75%] h-[85%]" : "w-[80%] h-[90%]"
                    }`}
                    resizeMode="contain"
                    style={styles.shadow}
                  />
                </View>
                <Text
                  fontSize="text-xs"
                  className="text-center"
                  fontWeight="font-bold"
                >
                  {category.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
