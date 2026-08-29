import { usePost } from "@/backend/post";
import { Text } from "@/components/core";
import { ConditionRenderer } from "@/components/core/condition-renderer";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PostProductHeader } from "@/components/post/header";
import { ProductImage } from "@/components/product/product-image";
import { ProductMap } from "@/components/product/product-map";
import { AboutOwner } from "@/components/product/product-owner";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { BackendProduct, PublicOwner, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ShareIcon,
} from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Dimensions } from "react-native";
import useOwner from "@/backend/owner";
import { useEffect, useState } from "react";
import { SvgUri } from "react-native-svg";
import { ink } from "@/lib/design-tokens";

const { height } = Dimensions.get("window");

export default function ReviewProduct() {
  const navigation = useTypedNavigation();
  const { theme, userDetails } = useGlobalContext();
  const { getOwnerProducts, getOwnerDetails } = useOwner();
  const { product } = useProductContext();
  const { loading } = usePost();

  useEffect(() => {
    fetchMyDetails();
  }, []);

  const [ownerDetails, setOwnerDetails] = useState<PublicOwner | null>(null);
  const [ownerProducts, setOwnerProducts] = useState<BackendProduct[]>([]);

  const isDark = theme === "dark";
  const hasProductLocation =
    product.location.lat !== 0 || product.location.long !== 0;

  const handlePostProduct = () => {
    navigation.navigate("HangTight");
  };

  const fetchMyDetails = async () => {
    const products = (await getOwnerProducts(
      userDetails?.username!
    )) as BackendProduct[];
    const owner = await getOwnerDetails(userDetails?.username!);
    setOwnerDetails(owner);
    setOwnerProducts(products);
  };

  const productCategoryIcon = product.category[isDark ? "darkIcon" : "lightIcon"];

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View className="px-gutter flex-row items-center">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          className="w-[10%]"
        >
          <ArrowLeftIcon size={24} color={ink.text(isDark)} />
        </TouchableOpacity>
        <View className="w-[80%]">
          <PostProductHeader heading="Review your post" step={7} />
        </View>
        <View className="w-[10%]" />
      </View>

      <ScrollView
        // className="flex-1"
        contentContainerStyle={{
          // paddingBottom: hp("10%"),
          flexGrow: 1,
        }}
      >
        <View style={{ width: "100%", aspectRatio: 1 }}>
          <ProductImage
            images={product.images?.map((img) => img.image)}
            mode="post"
          />
        </View>

        <View
          className={`px-gutter py-6 border-b ${isDark ? "border-b-line-dark" : "border-b-line-light"
            }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text fontSize="text-xl" fontWeight="font-bold">
              {product.name}
            </Text>
          </View>
        </View>

        <View
          className={`px-8 w-full py-8 border-b ${isDark ? "border-b-line-dark" : "border-b-line-light"
            } flex flex-row items-center justify-between`}
        >
          {/* Custom Category Icon */}
          <View className="flex items-center">
            {productCategoryIcon?.slice(-3)?.toLowerCase() === 'svg' ? <SvgUri uri={productCategoryIcon} height={30} width={30} /> : <Image
              source={{
                uri: isDark
                  ? product.category.darkIcon
                  : product.category.lightIcon,
              }}
              className="w-5 h-5"
            />}
            <Text fontWeight="font-bold" className="mt-2">
              {product.category.title}
            </Text>
            <Text
              className={`mt-1 font-light ${isDark ? "text-subtle-dark" : "text-subtle-light"
                }`}
            >
              Category
            </Text>
          </View>

          <View className="flex items-center">
            <BanknotesIcon
              color={ink.text(isDark)}
              size={22}
            />
            <Text fontWeight="font-bold" className="mt-2">
              ₹{product.securityDeposit}
            </Text>
            <Text
              className={`mt-1 font-light ${isDark ? "text-subtle-dark" : "text-subtle-light"
                }`}
            >
              Deposit
            </Text>
          </View>

          {/* Custom Icon */}
          <View className="flex items-center">
            {/* <LightBulbIcon
              color={ink.text(isDark)}
              size={22}
            /> */}
            <ConditionRenderer
              condition={product.condition}
              size={22}
              color={ink.text(isDark)}
            />
            <Text fontWeight="font-bold" className="mt-2">
              {product?.condition?.[0]?.toUpperCase()}{product?.condition?.slice(1)?.toLowerCase()}
            </Text>
            <Text
              className={`mt-1 font-light ${isDark ? "text-subtle-dark" : "text-subtle-light"
                }`}
            >
              Condition
            </Text>
          </View>
        </View>

        <View
          className={`px-gutter py-6 border-b ${isDark ? "border-b-line-dark" : "border-b-line-light"
            }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text fontWeight="font-bold" fontSize="text-xl">
              About the product
            </Text>
          </View>
          <Text className="mt-2">{product.productDescription}</Text>
        </View>

        <View
          className={`px-gutter py-6 border-b ${isDark ? "border-b-line-dark" : "border-b-line-light"
            }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text fontWeight="font-bold" fontSize="text-xl">
              Product's location
            </Text>
          </View>
          {hasProductLocation ? (
            <View className="mt-2">
              <ProductMap
                latitude={product.location.lat}
                longitude={product.location.long}
                isDarkMode={isDark}
              />
            </View>
          ) : (
            <Text
              className={`mt-2 ${isDark ? "text-subtle-dark" : "text-subtle-light"}`}
            >
              Location was skipped for this draft.
            </Text>
          )}
        </View>

        {/* <View
          className={`px-gutter py-6 border-b ${
            isDark ? "border-b-line-dark" : "border-b-line-light"
          }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text fontWeight="font-bold" fontSize="text-xl">
              About the owner
            </Text>
          </View>
          <View className="flex flex-row items-center my-2">
            <AboutOwner
              id={ownerDetails?.username!}
              name={`${ownerDetails?.first_name} ${ownerDetails?.last_name}`}
              profilePic={ownerDetails?.image?.image_url || ""}
              rating={0}
              products={ownerProducts.length}
              isDark={isDark}
            />
          </View>
        </View> */}
      </ScrollView>

      <View
        className={` w-full px-gutter  border-t ${isDark ? "bg-canvas-dark border-t-line-dark" : "bg-surface-light border-t-line-light"
          } flex-row justify-between items-center h-[10%]`}
      >
        <View className="flex flex-row items-end w-1/2" style={{ flexWrap: "wrap" }}>
          <Text fontWeight="font-bold" fontSize="text-xl" className="mr-1">
            ₹{product.pricePerDay}
          </Text>
          <Text fontSize="text-md" className="my-1">per day</Text>
        </View>
        <TouchableOpacity
          onPress={handlePostProduct}
          className="bg-brand flex items-center justify-center rounded-button w-1/2 p-3"
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text
              fontWeight="font-bold"
              fontSize="text-base"
              className="text-white"
            >
              Post product
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </NonScrollableContainer>
  );
}
