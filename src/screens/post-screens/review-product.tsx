import { usePost } from "@/backend/post";
import { Text } from "@/components/core";
import { ConditionRenderer } from "@/components/core/condition-renderer";
import { SpecStrip } from "@/components/product/spec-strip";
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
  BanknotesIcon,
  ShareIcon,
} from "react-native-heroicons/outline";
import useOwner from "@/backend/owner";
import { useEffect, useState } from "react";
import { SvgUri } from "react-native-svg";
import { ink } from "@/lib/design-tokens";


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
    <NonScrollableContainer>
      <PostProductHeader heading="Review your post" step={7} showBackArrow />

      <ScrollView
        contentContainerStyle={{
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

        <SpecStrip
          items={[
            {
              icon: productCategoryIcon ? (
                productCategoryIcon.slice(-3).toLowerCase() === "svg" ? (
                  <SvgUri uri={productCategoryIcon} width={22} height={22} />
                ) : (
                  <Image
                    source={{ uri: productCategoryIcon }}
                    style={{ width: 22, height: 22 }}
                    contentFit="contain"
                  />
                )
              ) : null,
              value: product.category.title,
              label: "Category",
            },
            {
              icon: <BanknotesIcon color={ink.text(isDark)} size={22} />,
              value: product.securityDeposit
                ? `₹${product.securityDeposit}`
                : null,
              label: "Deposit",
            },
            {
              icon: product.condition ? (
                <ConditionRenderer
                  condition={product.condition}
                  size={22}
                  color={ink.text(isDark)}
                />
              ) : null,
              value: product.condition
                ? product.condition[0].toUpperCase() +
                  product.condition.slice(1).toLowerCase()
                : null,
              label: "Condition",
            },
          ]}
        />

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
            <ActivityIndicator size="small" color={ink.onBrand()} />
          ) : (
            <Text
              fontWeight="font-bold"
              fontSize="text-base"
              tone="onBrand"
            >
              Post product
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </NonScrollableContainer>
  );
}
