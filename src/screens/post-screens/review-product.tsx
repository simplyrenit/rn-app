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
import { BackendProduct, Owner, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { ScrollView, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ShareIcon,
} from "react-native-heroicons/outline";
import * as Progress from "react-native-progress";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Dimensions } from "react-native";
import useOwner from "@/backend/owner";
import { useEffect, useState } from "react";

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

  const [ownerDetails, setOwnerDetails] = useState<Owner | null>(null);
  const [ownerProducts, setOwnerProducts] = useState<BackendProduct[]>([]);

  const isDark = theme === "dark";

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

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View className="px-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-[10%]"
        >
          <ArrowLeftIcon size={24} color={isDark ? "#ffffff" : "#000000"} />
        </TouchableOpacity>
        <View className="w-[80%]">
          <PostProductHeader heading="Review your post" percentage={90} />
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
            images={product.images.map((img) => img.image)}
            mode="post"
          />
        </View>

        <View
          className={`px-4 py-6 border-b ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text fontSize="text-xl" fontWeight="font-bold">
              {product.name}
            </Text>
            <TouchableOpacity>
              <ShareIcon color={isDark ? "white" : "black"} size={wp("5%")} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className={`px-8 w-full py-8 border-b ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          } flex flex-row items-center justify-between`}
        >
          {/* Custom Category Icon */}
          <View className="flex items-center">
            <Image
              source={{
                uri: isDark
                  ? product.category.darkIcon
                  : product.category.lightIcon,
              }}
              className="w-5 h-5"
            />
            <Text fontWeight="font-bold" className="mt-2">
              {product.category.title}
            </Text>
            <Text
              className={`mt-1 font-light ${
                isDark ? "text-white/50" : "text-black/50"
              }`}
            >
              Category
            </Text>
          </View>

          <View className="flex items-center">
            <BanknotesIcon
              color={isDark ? "white" : "black"}
              size={wp("5.5%")}
            />
            <Text fontWeight="font-bold" className="mt-2">
              ₹{product.securityDeposit}
            </Text>
            <Text
              className={`mt-1 font-light ${
                isDark ? "text-white/50" : "text-black/50"
              }`}
            >
              Deposit
            </Text>
          </View>

          {/* Custom Icon */}
          <View className="flex items-center">
            {/* <LightBulbIcon
              color={isDark ? "white" : "black"}
              size={wp("5.5%")}
            /> */}
            <ConditionRenderer
              condition={product.condition}
              size={wp("5.5%")}
              color={isDark ? "white" : "black"}
            />
            <Text fontWeight="font-bold" className="mt-2">
              {product.condition}
            </Text>
            <Text
              className={`mt-1 font-light ${
                isDark ? "text-white/50" : "text-black/50"
              }`}
            >
              Condition
            </Text>
          </View>
        </View>

        <View
          className={`px-4 py-6 border-b ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
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
          className={`px-4 py-6 border-b ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text fontWeight="font-bold" fontSize="text-xl">
              Product's location
            </Text>
          </View>
          <View className="mt-2">
            <ProductMap
              latitude={product.location.lat}
              longitude={product.location.long}
              isDarkMode={isDark}
            />
          </View>
        </View>

        <View
          className={`px-4 py-6 border-b ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
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
        </View>
      </ScrollView>

      <View
        className={` w-full px-4  border-t ${
          isDark ? "bg-black border-t-[#292929]" : "bg-white border-t-[#E6E6E6]"
        } flex-row justify-between items-center h-[10%]`}
      >
        <View className="flex flex-row items-end w-1/2">
          <Text fontWeight="font-bold" fontSize="text-xl" className="mr-1">
            ₹{product.pricePerDay}
          </Text>
          <Text fontSize="text-md">per day</Text>
        </View>
        <TouchableOpacity
          onPress={handlePostProduct}
          className="bg-brand-blue flex items-center justify-center rounded-lg w-1/2 p-3"
        >
          {loading ? (
            <Progress.CircleSnail color={"white"} size={22} />
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
