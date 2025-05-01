import useHome from "@/backend/useHome";
import useSaved from "@/backend/useSaved";
import { Card, Text } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import { useGlobalContext } from "@/context/global-context";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import * as Location from "expo-location";

interface Category {
  title: string;
  parent?: {
    title: string;
  };
  main_icon: string | null;
  light_icon: string | null;
  dark_icon: string | null;
}

interface Coordinates {
  lat: number;
  long: number;
}

interface TopPick {
  id: string;
  average_rating: number;
  booked: any[];
  brand_name: string;
  category: Category;
  condition: string;
  contact_name: string;
  contact_number: string;
  coordinates: Coordinates;
  cover_image: string | null;
  currency: string;
  description: string;
  distance: number;
  images: string[] | null;
  location: string;
  model_name: string;
  name: string;
  rate: string;
  review_count: number;
  security_deposit: string;
  title: string;
  total_rating: string;
  usage_description: string;
}

const itemWidth = wp(40);
const itemMargin = wp(5.7);

export function Experiences() {
  const { fetchTopExperiences } = useHome();
  const [loading, setLoading] = useState(false);
  const [experiences, setExperiences] = useState<TopPick[]>([]);
  const { favorites } = useSaved();
  const { isAuthenticated } = useGlobalContext();

  const [coordinates, setCoordinates] = useState<Coordinates>({
    lat: 19,
    long: 72,
  });

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        let location = await Location.getCurrentPositionAsync({});
        setCoordinates({
          lat: location.coords.latitude,
          long: location.coords.longitude,
        });
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchTopExperiences(
          coordinates.lat,
          coordinates.long
        );
        setExperiences(data.results);
      } catch (error) {
        console.error("Failed to fetch experiences:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, coordinates]);

  return (
    <View className="mt-5">
      <Text
        className="pl-5 mb-5"
        fontSize="text-xl"
        fontWeight="font-bold"
      >
        Top experiences
      </Text>
      {loading ? (
        <View className="flex-row">
          {[0, 1, 2].map((item, index) => (
            <View
              key={item}
              style={{
                width: itemWidth,
                marginRight: index === experiences.length - 1 ? 0 : itemMargin,
                marginLeft: index === 0 ? wp(5.7) : 0,
              }}
            >
              <Skeleton
                style={{
                  width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
                  borderRadius: 8,
                  height: wp("44.5%"),
                }}
              />
              <Skeleton
                style={{
                  width: wp(30),
                  borderRadius: 8,
                  marginTop: 5,
                  height: 10,
                }}
              />
              <Skeleton
                style={{
                  width: wp(20),
                  borderRadius: 8,
                  marginTop: 5,
                  height: 10,
                }}
              />
              <View className="flex-row mt-2 items-center space-x-2">
                <Skeleton
                  style={{
                    width: wp(10),
                    borderRadius: 8,
                    height: 10,
                  }}
                />
                <Skeleton
                  style={{
                    width: wp(5),
                    borderRadius: 8,
                    height: 10,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingRight: itemMargin,
          }}
        >
          {experiences.map((item, index) => (
            <View
              key={item.name}
              // style={{ marginRight: index === experiences.length - 1 ? 16 : 12 }}
              style={{
                width: itemWidth,
                marginRight: index === experiences.length - 1 ? 0 : itemMargin,
                marginLeft: index === 0 ? wp(5.7) : 0,
              }}
            >
              <Card
                id={item.name}
                image={item.cover_image ?? null}
                title={item.title}
                location={item.location}
                price={item.rate}
                isFavorite={favorites.some((fav) => fav.name === item.name)}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
