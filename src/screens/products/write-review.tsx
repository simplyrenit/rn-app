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
import { ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { Dropdown as RNEDropdown } from "react-native-element-dropdown";
import { ArrowLeftIcon } from "react-native-heroicons/outline";

import { toast } from "@/lib/toast";
import Rating from "@/components/core/rating";
import { ink, radius } from "@/lib/design-tokens";

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

  const { theme, userDetails } = useGlobalContext();
  const isDark = theme === "dark";
  const isOwner = userDetails?.username === owner?.username;

  const onSelect = (productRating: number, ownerRating: number) => {
    setRating({ product: productRating, owner: ownerRating });
  };

  const reviewValid = !isOwner && Boolean(
    productReview && ownerReview && rating.product && rating.owner
  );

  const handleSubmit = async () => {
    if (isOwner) {
      toast.error("You can’t review your own listing");
      return;
    }

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
      toast.success("Review submitted");
      navigation.goBack();
    } catch (error: any) {
    }
  };
  const options: ConditionOption[] = [
    {
      label: "Excellent",
      value: "excellent",
      icon: (
        <ExcellentCondition size={20} color={`${ink.text(isDark)}`} />
      ),
    },
    {
      label: "Good",
      value: "good",
      icon: <GoodCondition size={20} color={`${ink.text(isDark)}`} />,
    },
    {
      label: "Fair",
      value: "fair",
      icon: <BadCondition size={20} color={`${ink.text(isDark)}`} />,
    },
  ];

  return (
    <NonScrollableContainer>
      <View className="flex-1">
        <View className="py-3 px-gutter flex flex-row items-center">
          <View className="w-[10%]">
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()}>
              <ArrowLeftIcon color={ink.text(isDark)} size={24} />
            </TouchableOpacity>
          </View>
          <View className="w-[80%] h-full items-center">
            <Text fontSize="text-xl" fontWeight="font-bold">
              Write a review
            </Text>
          </View>
          <View className="w-[10%]"></View>
        </View>

        <View className="px-gutter pb-2 mt-4 flex flex-row items-center space-x-3">
          {product.cover_image ? (
            <Image
              source={{ uri: product.cover_image }}
              className="w-1/4 aspect-square rounded-card"
              contentFit="cover"
            />
          ) : (
            <View className="w-1/4 aspect-square rounded-card bg-skeleton-light" />
          )}
          <View>
            <Text fontSize="text-sm" fontWeight="font-bold" className="mb-1">
              {product.title.slice(0, 20)}...
            </Text>
            <Text
              fontSize="text-sm"
              style={{ color: ink.dim(isDark) }}
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
                style={{ color: ink.dim(isDark) }}
                className="ml-1"
              >
                per day
              </Text>
            </View>
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled">
          <View className="px-gutter mt-4">
            <Text fontSize="text-md" fontWeight="font-bold" className="mb-1">
              How was the product's condition?
            </Text>

            <RNEDropdown
              style={{
                height: 55,
                backgroundColor: ink.canvas(isDark),
                borderRadius: radius.input,
                borderWidth: 1,
                borderColor: ink.line(isDark),
                paddingHorizontal: 16,
                marginVertical: 10,
              }}
              activeColor={ink.surface(isDark)}
              containerStyle={{
                marginTop: 10,
                backgroundColor: ink.canvas(isDark),
                borderRadius: radius.group,
              }}
              itemTextStyle={{
                color: ink.text(isDark),
              }}
              itemContainerStyle={{
                borderBottomWidth: 1,
                borderBottomColor: ink.line(isDark),
              }}
              placeholderStyle={{ color: ink.placeholder(isDark), fontSize: 16 }}
              selectedTextStyle={{ color: ink.text(isDark) }}
              inputSearchStyle={{
                height: 40,
                fontSize: 16,
                borderRadius: radius.input,
                color: ink.text(isDark),
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
                    style={{ marginLeft: 8, color: ink.text(isDark) }}
                  >
                    {item.label}
                  </Text>
                </View>
              )}
              placeholder="Select Condition"
            />
          </View>
          <View className="px-gutter mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Product Review
            </Text>
            <Text className={`${isDark ? "text-muted-dark" : "text-muted-light"}`}>
              Share your thoughts about the product
            </Text>
            <TextInput
              placeholder="How did the rental go?"
              value={productReview}
              onChangeText={setProductReview}
              placeholderTextColor={ink.dim(isDark)}
              multiline
              className={`rounded-card border h-32 p-3 ${
                isDark
                  ? "border-input-line-dark text-white"
                  : "border-input-line-light text-black"
              }`}
              style={{
                textAlignVertical: "top", // Ensures text starts at the top
              }}
            />
          </View>
          <View className="px-gutter mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Owner Review
            </Text>
            <Text className={`${isDark ? "text-muted-dark" : "text-muted-light"}`}>
              Share your thoughts about the owner of the product
            </Text>
            <TextInput
              placeholder="Anything the next renter should know?"
              value={ownerReview}
              onChangeText={setOwnerReview}
              placeholderTextColor={ink.dim(isDark)}
              multiline
              className={`rounded-card border h-32 p-3 ${
                isDark
                  ? "border-input-line-dark text-white"
                  : "border-input-line-light text-black"
              }`}
              style={{
                textAlignVertical: "top", // Ensures text starts at the top
              }}
            />
          </View>
          <View className="px-gutter mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Rate the product
            </Text>
            <View
              className={`flex flex-row items-center justify-between border ${
                isDark
                  ? "bg-canvas-dark border-input-line-dark"
                  : "bg-surface-light border-input-line-light"
              } w-full h-16 rounded-group p-3`}
            >
              {/* The app's own star, so a rating looks the same here as it
                  does on a product page. */}
              <Rating
                value={rating.product}
                size={26}
                onChange={(newRating) => {
                  setRating((prev) => ({
                    ...prev,
                    product: newRating,
                  }));
                  onSelect(newRating, rating.owner);
                }}
              />
              <Text fontSize="text-lg" fontWeight="font-bold">
                {rating.product || "—"}
              </Text>
            </View>
          </View>
          <View className="px-gutter mt-4 space-y-2">
            <Text fontSize="text-md" fontWeight="font-bold">
              Rate the owner
            </Text>
            <View
              className={`flex flex-row items-center justify-between border ${
                isDark
                  ? "bg-canvas-dark border-input-line-dark"
                  : "bg-surface-light border-input-line-light"
              } w-full h-16 rounded-group p-3`}
            >
              {/* The app's own star, so a rating looks the same here as it
                  does on a product page. */}
              <Rating
                value={rating.owner}
                size={26}
                onChange={(newRating) => {
                  setRating((prev) => ({
                    ...prev,
                    owner: newRating,
                  }));
                  onSelect(rating.product, newRating);
                }}
              />
              <Text fontSize="text-lg" fontWeight="font-bold">
                {rating.owner || "—"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View className="py-2 px-gutter">
        <Button
          variant="primary"
          disabled={!reviewValid}
          loading={isLoading}
          onPress={handleSubmit}
        >
          Submit feedback
        </Button>
      </View>
    </NonScrollableContainer>
  );
}
