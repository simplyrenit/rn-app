import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon, ChevronLeftIcon } from "react-native-heroicons/outline";
import { Image } from "expo-image";
import { Button, Text } from "@/components/core";
import { Subcategory } from "@/lib/types";
import { FlatList } from "react-native-gesture-handler";

interface SubCategoryFilterProps {
  selectedCategory: string;
  selectedSubCategory: string;
  onSelect: (subCategory: string) => void;
  onClose: () => void;
  isDark: boolean;
  subcategories: Subcategory[];
  isLoading: boolean;
  closeSheet: () => void;
}

const SubCategoryFilter: React.FC<SubCategoryFilterProps> = ({
  selectedCategory,
  selectedSubCategory,
  onSelect,
  onClose,
  isDark,
  subcategories,
  isLoading,
  closeSheet,
}) => (
  <View style={{ flex: 1, }}>
    <TouchableOpacity onPress={onClose}>
      <View
        className={`flex-row items-center space-x-2 border-b p-3 mb-0 ${isDark ? "border-[#292929]" : "border-[#e6e6e6]"
          }`}
      >
        <ChevronLeftIcon
          size={24}
          color={isDark ? "white" : "black"}
        />
        <Text
          fontSize="text-sm"
          fontWeight="font-bold"
        >
          {selectedCategory}
        </Text>
      </View>
    </TouchableOpacity>
    <FlatList showsVerticalScrollIndicator={false} data={subcategories} style={{ flex: 1, }} renderItem={({ item, index }) => (<TouchableOpacity
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
          <Text
            fontSize="text-base"
            className="ml-3"
          >
            {item.title}
          </Text>
        </View>

        {selectedSubCategory === item.title && (
          <CheckIcon
            size={24}
            color="#635be8"
          />
        )}
      </View>
    </TouchableOpacity>)} />

    {selectedSubCategory && (
      <View className="p-3">
        <Button
          onPress={closeSheet}
          className="mt-5"
        >
          {isLoading ? "Loading..." : "Show products"}
        </Button>
      </View>
    )}
  </View>
);

export default SubCategoryFilter;
