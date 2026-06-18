import useHome from "@/backend/useHome";
import useSaved from "@/backend/useSaved";
import { Card, Text } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import { useGlobalContext } from "@/context/global-context";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import {
  DEFAULT_DISCOVERY_COORDINATES,
  getDiscoveryCoordinates,
} from "@/lib/location";

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

export function Popular() {
  const itemWidth = wp(40);
  const itemMargin = wp(5.7);

  const { fetchPopularProductsNearYou } = useHome();
  const [popular, setPopular] = useState<TopPick[]>([]);
  const { favorites } = useSaved();

  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useGlobalContext();

  const [coordinates, setCoordinates] = useState<Coordinates>(
    DEFAULT_DISCOVERY_COORDINATES
  );

  useEffect(() => {
    const getLocation = async () => {
      const location = await getDiscoveryCoordinates();

      if (location) {
        setCoordinates(location);
      }
    };

    void getLocation();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchPopularProductsNearYou(
          coordinates.lat,
          coordinates.long
        );

        setPopular(data.results);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, coordinates]);

  return (
    <View className="mt-5">
      <Text className="pl-5 mb-5" fontSize="text-xl" fontWeight="font-bold">
        Popular near you
      </Text>
      {loading ? (
        <View className="flex-row">
          {[0, 1, 2].map((item, index) => (
            <View
              key={item}
              style={{
                width: itemWidth,
                marginRight: index === popular.length - 1 ? 0 : itemMargin,
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
          // contentContainerStyle={{ paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingRight: itemMargin }}
        >
          {popular.map((item, index) => (
            <View
              key={item.name}
              // style={{ marginRight: index === popular.length - 1 ? 16 : 12 }}
              style={{
                width: itemWidth,
                marginRight: index === popular.length - 1 ? 0 : itemMargin,
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
