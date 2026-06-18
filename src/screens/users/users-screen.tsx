import { useChat } from "@/backend/chat";
import useOwner from "@/backend/owner";
import useReviews from "@/backend/reviews";
import { Button, Card, Container, Text } from "@/components/core";
import { ReviewCard } from "@/components/product/review-card";
import { useGlobalContext } from "@/context/global-context";
import {
  BackendProduct,
  Owner,
  OwnerReview,
  RouteProps,
  useTypedNavigation,
} from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CubeIcon,
  StarIcon,
  UserCircleIcon,
} from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import Toast from "react-native-toast-message";

const StyledImage = styled(Image);

const itemWidth = wp(40);
const itemMargin = wp(6);

export default function UsersDetails() {
  const route = useRoute<RouteProps<"UserDetail">>();
  const { isAuthenticated, userDetails } = useGlobalContext();

  const navigation = useTypedNavigation();
  const { id } = route.params;
  const { startChat } = useChat();
  const { getReviews } = useReviews();
  const { theme } = useGlobalContext();
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [ownerReviews, setOwnerReviews] = useState<OwnerReview[]>([]);

  const isDark = theme === "dark";

  const isOwner = userDetails?.username === owner?.username;

  const { getOwnerDetails, getOwnerProducts } = useOwner();

  const fetchOwnerDetails = async () => {
    const data = await getOwnerDetails(id);
    const products = (await getOwnerProducts(id)) as BackendProduct[];
    const owner_reviews = await getReviews(id);

    setOwner(data);
    setProducts(products);
    setOwnerReviews(owner_reviews || []);
  };

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
        userId: owner?.username!,
        username: owner?.first_name! + " " + owner?.last_name!,
        profilePicture: owner?.image?.image_url
          ? owner?.image?.image_url
          : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
      },
      {
        title: "",
        location: "",
        image: "",
        rate: "",
        type: "",
        text: "Hello, I am interested in your products!",
      }
    );

    if (success) {
      navigation.navigate("ChatDetails", { id: content });
    }
  };

  React.useEffect(() => {
    fetchOwnerDetails();
  }, [id]);

  const ownerRating = owner?.average_rating ?? 0;
  const joinedDateLabel = owner?.date_joined
    ? new Date(owner.date_joined)
        .toLocaleDateString("en-US", {
          year: "2-digit",
          month: "short",
          day: "2-digit",
        })
        .replace(/(\d{2})$/, " '$1")
    : "-";
  const productLabel = `${products.length} ${
    products.length === 1 ? "product" : "products"
  }`;

  return (
    <Container>
      <View className="p-5 flex flex-row items-center">
        <View className="w-[10%]">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeftIcon
              color={isDark ? "white" : "black"}
              size={24}
            />
          </TouchableOpacity>
        </View>
        <View className="w-[80%] h-full items-center">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            About the owner
          </Text>
        </View>
        <View className="w-[10%]"></View>
      </View>

      <View className="items-center justify-center">
        {owner?.image?.image_url ? (
          <StyledImage
            source={{
              uri: owner?.image?.image_url || "",
            }}
            className="h-24 w-24 rounded-full"
          />
        ) : (
          <UserCircleIcon
            color={"#635BE8"}
            size={wp("14%")}
          />
        )}
        <Text
          fontSize="text-md"
          fontWeight="font-bold"
          className="mt-3"
        >
          {owner?.first_name} {owner?.last_name}
        </Text>
      </View>

      <View className="p-5 items-center justify-evenly flex flex-row">
        <View className="items-center w-1/3">
          <StarIcon
            color={isDark ? "white" : "black"}
            size={24}
          />
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
            className="mt-2"
          >
            {ownerRating.toFixed(1)}
          </Text>
          <Text
            fontSize="text-sm"
            className={`mt-1 text-black/50 ${isDark ? "text-white/50" : "text-black/50"
              }`}
          >
            Rating
          </Text>
        </View>
        <View className="items-center w-1/3">
          <CubeIcon
            color={isDark ? "white" : "black"}
            size={24}
          />
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
            className="mt-2"
          >
            {products.length}
          </Text>
          <Text
            fontSize="text-sm"
            className={`mt-1 text-black/50 ${isDark ? "text-white/50" : "text-black/50"
              }`}
          >
            Products
          </Text>
        </View>
        <View className="items-center w-1/3">
          <CalendarIcon
            color={isDark ? "white" : "black"}
            size={24}
          />
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
            className="mt-2"
          >
            {joinedDateLabel}
          </Text>
          <Text
            fontSize="text-sm"
            className={`mt-1 text-black/50 ${isDark ? "text-white/50" : "text-black/50"
              }`}
          >
            User since
          </Text>
        </View>
      </View>

      {!isOwner && (
        <View className="px-5">
          <Button
            variant="outline"
            onPress={handleStartChat}
            className="border rounded-xl"
          >
            <Text fontWeight="font-bold">Chat with {owner?.first_name}</Text>
          </Button>
        </View>
      )}

      <View
        className={`my-5 border-b-[0.5px] ${isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
      ></View>

      <View className="">
        <View className="">
          <View className="px-5">
            <Text
              fontSize="text-lg"
              fontWeight="font-bold"
              className="mb-5  "
            >
              {productLabel}
            </Text>
          </View>

          <ScrollView
            className=""
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {products.slice(0, 4).map((item, index) => (
              <View
                key={item.name}
                // style={{ marginRight: index === experiences.length - 1 ? 16 : 12 }}
                style={{
                  width: itemWidth,
                  marginRight: itemMargin,
                  marginLeft: index === 0 ? wp(5.5) : 0,
                }}
              >
                <Card
                  id={item.name}
                  image={item.cover_image}
                  title={item.title}
                  location={item.location}
                  price={item.rate.toString()}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {products.length > 2 && <View className="px-5">
          <Button
            variant="outline"
            className="mt-4 border rounded-xl"
            onPress={() =>
              navigation.navigate("OwnersProducts", {
                products: products,
                name: owner?.first_name!,
              })
            }
          >
            <Text fontWeight="font-bold">View all products</Text>
          </Button>
        </View>}
      </View>

      {/* <View className="border-b-[1px] border-[#292929] my-5"></View> */}

      <View
        className={`my-5 border-b-[0.5px] ${isDark ? "border-b-[#292929]" : "border-b-[#E6E6E6]"
          }`}
      ></View>

      <View className=" mb-16">
        <View className="">
          <View className="px-5">
            <Text
              fontSize="text-lg"
              fontWeight="font-bold"
              className="mb-5"
            >
              {owner?.first_name}'s reviews
            </Text>
          </View>
          {!ownerReviews.length && (
            <Text fontSize="text-sm"
              className={`mt-0 ml-6 text-black/50 ${isDark ? "text-white/50" : "text-black/50"
                }`}>No reviews yet</Text>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {ownerReviews.map((item, index) => (
              <View
                key={item.id}
                // style={{ marginRight: index === experiences.length - 1 ? 16 : 12 }}
                // style={{
                //   marginRight: itemMargin,
                //   marginLeft: index === 0 ? wp(5.5) : 0,
                // }}
                style={{
                  marginRight: itemMargin,
                  marginLeft: index === 0 ? wp(5.5) : 0,
                }}
              >
                <ReviewCard
                  reviewText={item.comment}
                  reviewerName={`${item.reviewer.first_name} ${item.reviewer.last_name}`}
                  reviewDate={item.created_at}
                  reviewerImage={item.reviewer.image}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {ownerReviews.length > 1 ? <View className="px-5">
          <Button
            onPress={() =>
              navigation.navigate("OwnersReviewScreen", {
                owner: owner!,
                reviews: ownerReviews,
              })
            }
            variant="outline"
            className="mt-4 border rounded-xl"
          >
            <Text fontWeight="font-bold">View all reviews</Text>
          </Button>
        </View> : null}
      </View>
    </Container>
  );
}
