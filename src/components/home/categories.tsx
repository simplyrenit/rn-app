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

export function Categories() {
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
            <TouchableOpacity key={index} style={{ marginBottom: 5 }}>
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
