import { useChat } from "@/backend/chat";
import { useProduct } from "@/backend/product";
import { Button, Card, StaticContainer, Text } from "@/components/core";
import { ProductImage } from "@/components/product/product-image";
import { ProductMap } from "@/components/product/product-map";
import { AboutOwner } from "@/components/product/product-owner";
import { ReviewCard } from "@/components/product/review-card";
import { Stars } from "@/components/product/stars";
import { useGlobalContext } from "@/context/global-context";
import {
  BackendProduct,
  BackendReview,
  RouteProps,
  useTypedNavigation,
} from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import {
  BanknotesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ShareIcon,
} from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import Toast from "react-native-toast-message";
import { ProductsSkeleton } from "./products-skeleton";
import { ModerationBanner } from "@/components/product/moderation-banner";

const MAX_CHARS = 150;

export default function DetailsScreen() {
  const itemWidth = wp(40);
  const itemMargin = wp(5.7);
  const [loading, setLoading] = React.useState(true);
  const [showFullText, setShowFullText] = useState(false);
  const route = useRoute<RouteProps<"ProductDetail">>();
  const { theme, isAuthenticated, userDetails } = useGlobalContext();
  const isDark = theme === "dark";
  const navigation = useTypedNavigation();
  const { fetchProduct, fetchSimilarProducts, fetchReviews } = useProduct();
  const [product, setProduct] = useState<BackendProduct | null>(null);
  const [similarProducts, setSimilarProducts] = useState<BackendProduct[]>([]);
  const [isModerated, setIsModerated] = useState(false);
  const [reviews, setReviews] = useState<BackendReview[]>([]);
  const { id, isFavorite } = route.params;
  const { startChat } = useChat();

  React.useEffect(() => {
    fetchProductDetails();
  }, [id]);

  async function fetchProductDetails() {
    setLoading(true);
    try {
      const data = await fetchProduct(id);
      setProduct(data);
      console.log(data.category, "icon");
      const similarProducts = await fetchSimilarProducts(id);
      const reviews = await fetchReviews(id);
      setSimilarProducts(similarProducts);
      setReviews(reviews);
      setIsModerated(data?.moderation_labels?.length > 0);
    } catch (error: any) {
      console.log("Error fetching product details:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ProductsSkeleton />;
  }

  const handleEditClick = () => {
    navigation.navigate("Profile", {
      screen: "editProduct",
      params: { id: product!.name },
    });
  };

  const isOwner = userDetails?.username === product?.owner?.username;

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Sign in to Renit to message owners",
        text2: "error",
      });
      return;
    }

    const { success, content } = await startChat(
      {
        userId: userDetails?.username!,
        username: userDetails?.name!,
        profilePicture: userDetails?.image
          ? userDetails?.image
          : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      },
      {
        userId: product?.owner?.username!,
        username:
          product?.owner?.first_name! + " " + product?.owner?.last_name!,
        profilePicture: product?.owner?.image?.image_url
          ? product?.owner?.image?.image_url
          : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      },
      {
        title: product?.title!,
        location: product?.location!,
        image: product?.cover_image!,
        rate: product?.rate!,
        type: "product",
        text: "",
      }
    );
    console.log("Chat started");

    if (success) {
      navigation.navigate("ChatDetails", { id: content });
    }
  };

  const lessReviews = reviews.slice(0, 4);

  const truncateAtNearestSpace = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(" ");
    return truncated.slice(0, lastSpaceIndex) + "...";
  };

  const truncatedText = truncateAtNearestSpace(
    product?.description!,
    MAX_CHARS
  );
  const displayText = showFullText ? product?.description! : truncatedText;

  return (
    <StaticContainer width={100}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ width: "100%", aspectRatio: 1 }}>
          <ProductImage
            images={product!.images}
            name={id}
            isFavorite={isFavorite}
          />
        </View>

        {isOwner && isModerated && (
          <View className="px-4">
            <ModerationBanner moderationLabels={product?.moderation_labels!} />
          </View>
        )}

        <View
          className={`px-4 -mt-5 py-6 border-b-[1px] ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              {product?.title}
            </Text>
            <TouchableOpacity>
              <ShareIcon
                color={isDark ? "white" : "black"}
                size={wp("5%")}
              />
            </TouchableOpacity>
          </View>
          <View className="flex flex-row items-center my-2">
            <Stars
              rating={product?.average_rating!}
              isDark={isDark}
            />
            <Text
              fontSize="text-sm"
              className="text-gray-500 ml-1"
            >
              ({product?.review_count})
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View
          className={`px-2 py-8 border-b-[1px] ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          } flex flex-row items-center  `}
        >
          {/* Custom Category Icon */}
          <View className="flex items-center flex-1">
            {/* <BookOpenIcon
              color={isDark ? "white" : "black"}
              size={wp("5.5%")}
            /> */}
            <Image
              source={{
                uri:
                  theme === "dark"
                    ? product?.category?.dark_icon ||
                      "https://d1xuzik8wqiepv.cloudfront.net/assets/2024/10/03/JdXQXQHo/trucktrailer.svg"
                    : product?.category?.light_icon ||
                      "https://d1xuzik8wqiepv.cloudfront.net/assets/2024/10/04/hxvbdzSz/trucktrailer.svg",
              }}
              style={{ width: wp(5.5), height: wp(5.5) }}
            />
            <Text
              fontWeight="font-bold"
              className="mt-2"
            >
              {product?.category?.title}
            </Text>
            <Text
              className={`mt-1 font-light ${
                isDark ? "text-white/50" : "text-black/50"
              }`}
            >
              Category
            </Text>
          </View>

          <View className="flex items-center flex-1">
            <BanknotesIcon
              color={isDark ? "white" : "black"}
              size={wp("5.5%")}
            />
            <Text
              fontWeight="font-bold"
              className="mt-2"
            >
              ₹{Number(product?.security_deposit).toFixed(0)}
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
          <View className="flex items-center flex-1">
            <LightBulbIcon
              color={isDark ? "white" : "black"}
              size={wp("5.5%")}
            />
            <Text
              fontWeight="font-bold"
              className="mt-2"
            >
              {product?.condition}
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

        {/* About the product */}
        <View
          className={`px-4 py-6 border-b-[1px] ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text
              fontWeight="font-bold"
              fontSize="text-xl"
            >
              About the product
            </Text>
          </View>
          <Text className="mt-2">{displayText}</Text>
          {product?.description.length! > MAX_CHARS && (
            <TouchableOpacity onPress={() => setShowFullText(!showFullText)}>
              <View className="flex flex-row items-center  mt-2 space-x-2">
                <Text
                  fontWeight="font-bold"
                  className={isDark ? "text-white" : "text-black"}
                >
                  {showFullText ? "Show less" : "Show more"}
                </Text>
                <View className=" mt-1">
                  {showFullText ? (
                    <ChevronUpIcon
                      color={isDark ? "#fff" : "#000"}
                      size={16}
                    />
                  ) : (
                    <ChevronDownIcon
                      color={isDark ? "#fff" : "#000"}
                      size={16}
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View
          className={`px-4 py-6 border-b-[1px] ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text
              fontWeight="font-bold"
              fontSize="text-xl"
            >
              Product's location
            </Text>
          </View>
          <View className="mt-2">
            <ProductMap
              latitude={product?.coordinates?.lat!}
              longitude={product?.coordinates?.long!}
              isDarkMode={isDark}
            />
          </View>
        </View>

        {/* Product reviews` */}
        <View
          className={`py-6 border-b-[1px] ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <View className="flex flex-row items-center justify-between px-4">
            <Text
              fontWeight="font-bold"
              fontSize="text-xl"
            >
              Product reviews
            </Text>
          </View>

          <View className="flex flex-row items-center mt-1 mb-4 px-4">
            <Text
              fontWeight="font-bold"
              fontSize="text-lg"
              className={`mr-3 ${isDark ? "text-white/70" : "text-black/70"}`}
            >
              {product?.average_rating?.toFixed(1)}
            </Text>
            <Stars
              rating={product?.average_rating!}
              isDark={isDark}
            />
            <Text
              fontSize="text-md"
              className="text-gray-500 ml-1"
            >
              ({product?.review_count})
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingRight: itemMargin,
            }}
          >
            {lessReviews.map((item, index) => (
              <View
                key={item.user.username}
                style={{
                  width: itemWidth,
                  marginRight:
                    index === lessReviews.length - 1 ? 0 : itemMargin,
                  marginLeft: index === 0 ? wp(5.7) : 0,
                }}
              >
                <ReviewCard
                  reviewText={item.comment}
                  reviewerName={`${item.user.first_name} ${item.user.last_name}`}
                  reviewDate={item.created_at}
                  reviewerImage={item.user.image}
                />
              </View>
            ))}
          </ScrollView>

          <View className="px-4">
            <Button
              onPress={() =>
                navigation.navigate("ReviewsScreen", {
                  reviews,
                  product: product!,
                  owner: product!.owner!,
                })
              }
              variant="outline"
              className="mt-4"
            >
              <Text fontWeight="font-bold">View all reviews</Text>
            </Button>
          </View>
        </View>

        {/* About the owner */}
        <View
          className={`px-4 py-6 border-b-[1px] ${
            isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
        >
          <View className="flex flex-row items-center justify-between">
            <Text
              fontWeight="font-bold"
              fontSize="text-xl"
            >
              About the owner
            </Text>
          </View>
          <View className="flex flex-row items-center ">
            <AboutOwner
              id={product?.owner?.username!}
              name={`${product?.owner?.first_name} ${product?.owner?.last_name}`}
              profilePic={product?.owner?.image?.image_url || ""}
              rating={product?.owner?.average_rating!}
              products={product?.owner?.number_of_products || 0}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Similar products */}
        {similarProducts.length > 0 && (
          <View className={` py-6 `}>
            <View className="flex flex-row items-center justify-between mb-4 px-4">
              <Text
                fontWeight="font-bold"
                fontSize="text-xl"
              >
                Similar products
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {similarProducts.map((item, index) => (
                <View
                  key={item.name}
                  style={{
                    marginRight: index === similarProducts.length - 1 ? 16 : 16, // Last item gets 16px marginRight
                    marginLeft: index === 0 ? 16 : 0, // First item gets 16px marginLeft to match padding
                  }}
                >
                  <Card
                    id={`${item.name}`}
                    image={item.cover_image}
                    title={item.title}
                    location={item.location}
                    price={item.rate}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View
        className={`bottom-0 w-full p-4 border-t ${
          isDark ? "bg-black border-t-[#292929]" : "bg-white border-t-[#E6E6E6]"
        } flex-row items-center h-[10%]`}
      >
        <View className="flex flex-row items-end flex-1">
          <View className="">
            <Text
              fontWeight="font-bold"
              fontSize="text-lg"
              className="mr-1"
            >
              ₹{Number(product?.rate).toFixed(0)}
            </Text>
          </View>
          <View>
            <Text fontSize="text-md">per day</Text>
          </View>
        </View>
        <View className="flex-1">
          {isOwner ? (
            <TouchableOpacity
              onPress={handleEditClick}
              className={`border-2 ${
                isDark
                  ? "bg-[#0F0F0F] border-[#292929]"
                  : "border-[#e6e6e6] bg-white"
              } flex items-center justify-center rounded-lg h-full`}
            >
              <Text
                fontWeight="font-bold"
                fontSize="text-md"
                className="tracking-wide"
              >
                Edit product
              </Text>
            </TouchableOpacity>
          ) : (
            <Button onPress={handleStartChat}>
              <Text
                fontWeight="font-bold"
                fontSize="text-md"
                allowFontScaling
                className="text-white tracking-wide text-center"
              >
                Chat with owner
              </Text>
            </Button>
          )}
        </View>
      </View>
    </StaticContainer>
  );
}
