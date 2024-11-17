import React from "react";
import { Image } from "expo-image";
import { TouchableOpacity, View, ScrollView } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { Text } from "../core";
import { Category } from "@/lib/types";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (option: string) => void;
  closeSheet: () => void;
  isDark: boolean;
  isLoading: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelect,
  closeSheet,
  isDark,
  isLoading,
}) => (
  <View className="mt-1 flex-1">
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ marginBottom: 30 }}
    >
      {categories.map((item, index) => (
        <TouchableOpacity
          key={index}
          className="p-3 mb-1"
          onPress={() => onSelect(item.title)}
        >
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center">
              <Image
                source={{
                  uri: isDark ? item.dark_icon || "" : item.light_icon || "",
                }}
                style={{ width: 20, height: 20 }}
              />
              <Text fontSize="text-base" className="ml-3">
                {item.title}
              </Text>
            </View>
            <ChevronRightIcon size={18} color={isDark ? "white" : "black"} />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);
