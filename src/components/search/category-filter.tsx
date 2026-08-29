import { categoryDisplayName } from "@/lib/category-icons";
import React from "react";
import { Image } from "expo-image";
import { TouchableOpacity, View, ScrollView } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { Text } from "../core";
import { Category } from "@/lib/types";
import { FlatList } from "react-native-gesture-handler";
import { ink } from "@/lib/design-tokens";

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
  <View className="flex-1 px-1">
    <FlatList showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30, paddingTop: 12 }}
      data={categories} renderItem={({ item, index }) => (<TouchableOpacity
        key={index}
        className={`p-3 px-1 mb-1 ${index === 0 ? 'pt-0' : ''}`}
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
              {categoryDisplayName(item.title)}
            </Text>
          </View>
          <ChevronRightIcon size={18} color={ink.text(isDark)} />
        </View>
      </TouchableOpacity>)} />
  </View>
);
