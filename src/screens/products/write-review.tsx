import useReviews from "@/backend/reviews";
import { Button, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import {
  BadCondition,
  ExcellentCondition,
  GoodCondition,
} from "@/icons/conditions";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useState } from "react";
import { ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import * as Progress from "react-native-progress";
import StarRating from "react-native-star-rating-widget";
import Toast from "react-native-toast-message";

type ConditionOption = {
  label: string;
  value: string;
  icon: JSX.Element;
};

export default function WriteReviewScreen() {
  const [productReview, setProductReview] = useState("");
  const [ownerReview, setOwnerReview] = useState("");
  const [rating, setRating] = useState({ product: 0, owner: 0 });
  const route = useRoute<RouteProps<"WriteReviews">>();
  const navigation = useTypedNavigation();
  const { product, owner } = route.params;
  const { writeAReview, isLoading } = useReviews();

  const [selectedValue, setSelectedValue] = useState<string>("good");

  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  const onSelect = (productRating: number, ownerRating: number) => {
    setRating({ product: productRating, owner: ownerRating });
  };

  const reviewValid = Boolean(
    productReview && ownerReview && rating.product && rating.owner
  );

  const handleSubmit = async () => {
    const reviewData = {
      productName: product.name,
      productReview,
      ownerReview,
      productRating: rating.product,
      ownerRating: rating.owner,
      condition: selectedValue,
    };

    try {
      const response = await writeAReview(reviewData);
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Review submitted",
        text2: "success",
        visibilityTime: 4000,
        autoHide: true,
        onPress: () => {
          Toast.hide();
        },
      });
      navigation.goBack();
    } catch (error: any) {
    }
  };
  const options: ConditionOption[] = [
    {
      label: "Excellent",
      value: "excellent",
      icon: (
        <ExcellentCondition size={20} color={`${isDark ? "white" : "black"}`} />
      ),
    },
    {
      label: "Good",
      value: "good",
      icon: <GoodCondition size={20} color={`${isDark ? "white" : "black"}`} />,
    },
    {
      label: "Fair",
      value: "fair",
      icon: <BadCondition size={20} color={`${isDark ? "white" : "black"}`} />,
    },
  ];

  return (
    <NonScrollableContainer>
      <View className="flex-1">
        <View className="py-3 px-5 flex flex-row items-center">
          <View className="w-[10%]">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowLeftIcon color={isDark ? "white" : "black"} size={24} />
            </TouchableOpacity>
          </View>

          <View className="w-[80%] h-full items-center">
            <Text className={`rounded-[12px] h-12 border p-3 ${isDark
                                            ? "border-[#292929] text-white"
                                            : "border-[#e6e6e6] text-black"
                                            }`}>
              Write a review
            </Text>
          </View>
          <View className="w-[10%]"></View>
        </View>

        <View className="px-5 pb-2 mt-4 flex flex-row items-center space-x-3">
          <Image
            source={{ uri: product.cover_image || "" }}
            className="w-1/4 aspect-square rounded-xl"
            contentFit="cover"
          />
          <View>
            <Text fontSize="text-sm" fontWeight="font-bold" className="mb-1">
              {product.title.slice(0, 20)}...
            </Text>
            <Text
              fontSize="text-sm"
              style={{ color: isDark ? "#FFFFFF80" : "#00000080" }}
              className="mb-1"
            >
              {product.location.slice(0, 20)}...
            </Text>
            <View className="flex flex-row items-center mt-1">
              <Text fontSize="text-md" fontWeight="font-bold">
                ₹{Number(product.rate).toFixed(0)}
              </Text>
              <Text
                fontSize="text-xs"
                style={{ color: isDark ? "#FFFFFF80" : "#00000080" }}
                className="ml-1"
              >
                per day
              </Text>
            </View>
          </View>
        </View>

        <ScrollView>
          <View className="px-5 mt-4">
            <Text fontSize="text-md" fontWeight="font-bold" className="mb-1">
              How was the product's condition?
            </Text>

            <RNEDropdown
              style={{
                height: 55,
                backgroundColor: isDark ? "#000" : "#fff",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? "#292929" : "#E6E6E6",
                paddingHorizontal: 16,
                marginVertical: 10,
              }}
              activeColor={isDark ? "#0F0F0F" : "#e6e6e6"}
              containerStyle={{
                marginTop: 10,
                backgroundColor: isDark ? "#000" : "#FFF",
                borderRadius: 14,
              }}
              itemTextStyle={{
                color: isDark ? "white" : "black",
              }}
              itemContainerStyle={{
                borderBottomWidth: 1,
                borderBottomColor: isDark ? "#292929" : "#E6E6E6",
              }}
              placeholderStyle={{ color: "gray", fontSize: 15 }}
              selectedTextStyle={{ color: isDark ? "#fff" : "#000" }}
              inputSearchStyle={{
                height: 40,
                fontSize: 16,
                borderRadius: 10,
                color: isDark ? "#fff" : "#000",
              }}
              iconStyle={{ marginRight: 10 }}
              data={options}
              labelField="label"
              valueField="value"
              value={selectedValue}
              onChange={(item) => setSelectedValue(item.value)}
              renderLeftIcon={() =>
                selectedValue ? (
                  <View style={{ marginRight: 8 }}>
                    {
                      options.find((option) => option.value === selectedValue)
                        ?.icon
                    }
                  </View>
                ) : null
              }
              renderItem={(item) => (
                <View
                  className="p-4"
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  {item.icon}
                  <Text
                    style={{ marginLeft: 8, color: isDark ? "white" : "black" }}
                  >
                    {item.label}
                  </Text>
                </View>
              )}
              placeholder="Select Condition"
            />
          </View>
          <View className="px-5 mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Product Review
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Share your thoughts about the product
            </Text>
            <TextInput
              placeholder="Type something..."
              value={productReview}
              onChangeText={setProductReview}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              multiline
              className={`rounded-[12px] border h-32 p-3 ${
                isDark
                  ? "border-[#292929] text-white"
                  : "border-[#e6e6e6] text-black"
              }`}
              style={{
                textAlignVertical: "top", // Ensures text starts at the top
              }}
            />
          </View>
          <View className="px-5 mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Owner Review
            </Text>
            <Text className={`${isDark ? "text-white/70" : "text-black/70"}`}>
              Share your thoughts about the owner of the product
            </Text>
            <TextInput
              placeholder="Type something..."
              value={ownerReview}
              onChangeText={setOwnerReview}
              placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
              multiline
              className={`rounded-[12px] border h-32 p-3 ${
                isDark
                  ? "border-[#292929] text-white"
                  : "border-[#e6e6e6] text-black"
              }`}
              style={{
                textAlignVertical: "top", // Ensures text starts at the top
              }}
            />
          </View>
          <View className="px-5 mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Rate the product
            </Text>
            <View
              className={`flex flex-row items-center justify-between border ${
                isDark
                  ? "bg-black border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } w-full h-16 rounded-[16px] p-3`}
            >
              <StarRating
                maxStars={5}
                starSize={24}
                color="#635be8"
                emptyColor={isDark ? "#292929" : "#e6e6e6"}
                rating={rating.product}
                onChange={(newRating) => {
                  setRating((prev) => ({
                    ...prev,
                    product: newRating,
                  }));
                  onSelect(newRating, rating.owner);
                }}
              />
              <Text fontSize="text-2xl">{rating.product}</Text>
            </View>
          </View>
          <View className="px-5 mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Rate the owner
            </Text>
            <View
              className={`flex flex-row items-center justify-between border ${
                isDark
                  ? "bg-black border-[#292929]"
                  : "bg-white border-[#e6e6e6]"
              } w-full h-16 rounded-[16px] p-3`}
            >
              <StarRating
                maxStars={5}
                starSize={24}
                color="#635be8"
                emptyColor={isDark ? "#292929" : "#e6e6e6"}
                rating={rating.owner}
                onChange={(newRating) => {
                  setRating((prev) => ({
                    ...prev,
                    owner: newRating,
                  }));
                  onSelect(rating.product, newRating);
                }}
              />
              <Text fontSize="text-2xl">{rating.owner}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View className="py-2 px-5">
        <Button
          variant="primary"
          disabled={!reviewValid}
          onPress={handleSubmit}
          className="flex-row items-center justify-center"
        >
          {isLoading ? (
            <Progress.CircleSnail size={22} color="#fff" />
          ) : (
            <Text
              fontWeight="font-bold"
              fontSize="text-md"
              className={`${
                !reviewValid
                  ? isDark
                    ? "text-[#FFFFFF80]"
                    : "text-[#00000080]"
                  : "text-white"
              }`}
            >
              Submit feedback
            </Text>
          )}
        </Button>
      </View>
    </NonScrollableContainer>
  );
}
