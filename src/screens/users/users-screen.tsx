import { useChat } from "@/backend/chat";
import useOwner from "@/backend/owner";
import useReviews from "@/backend/reviews";
import { Avatar, Button, Card, Container, Text } from "@/components/core";
import { ReviewCard } from "@/components/product/review-card";
import { useGlobalContext } from "@/context/global-context";
import {
  BackendProduct,
  OwnerReview,
  PublicOwner,
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
  Squares2X2Icon,
} from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

import { toast } from "@/lib/toast";
import { ink } from "@/lib/design-tokens";
import { describeRating } from "@/lib/rating";
import { useTheme } from "@/lib/theme";

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
  const [owner, setOwner] = useState<PublicOwner | null>(null);
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
      toast.error("Sign in to Renit to message owners");
      return;
    }

    const { success, content } = await startChat(
      {
        userId: userDetails?.username!,
        firebaseUid: userDetails?.firebase_uid!,
        username: userDetails?.name!,
        profilePicture: userDetails?.image
          ? userDetails?.image
          : "",
      },
      {
        userId: owner?.username!,
        firebaseUid: owner?.firebase_uid!,
        username: owner?.first_name! + " " + owner?.last_name!,
        profilePicture: owner?.image?.image_url
          ? owner?.image?.image_url
          : "",
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

  const { color } = useTheme();
  const ownerRating = owner?.average_rating ?? 0;
  const ratingDisplay = describeRating(ownerRating);
  // Was "Jul 22, '26" — an apostrophe year and day-level precision on a
  // "member since" fact, in en-US on a rupee marketplace. The month and year
  // are the only part anyone reads.
  const joinedDateLabel = owner?.date_joined
    ? new Date(owner.date_joined).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
      })
    : "—";
  const productLabel = `${products.length} ${
    products.length === 1 ? "product" : "products"
  }`;

  return (
    <Container>
      <View className="p-5 flex flex-row items-center">
        <View className="w-[10%]">
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()}>
            <ArrowLeftIcon
              color={ink.text(isDark)}
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
        <Avatar
          uri={owner?.image?.image_url}
          name={`${owner?.first_name ?? ""} ${owner?.last_name ?? ""}`.trim()}
          size={96}
        />
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
          {/* "0.0" under the word "Rating" told every unrated host they were
              scored zero out of five. A host with no reviews is New. */}
          <StarIcon
            color={ratingDisplay.rated ? color.warning : color.textDim}
            size={22}
          />
          <Text fontSize="text-md" fontWeight="font-bold" className="mt-2">
            {ratingDisplay.label}
          </Text>
          <Text fontSize="text-xs" tone="body" className="mt-1">
            {ratingDisplay.rated ? "Rating" : "Host"}
          </Text>
        </View>
        <View className="items-center w-1/3">
          <Squares2X2Icon color={color.textBody} size={22} />
          <Text fontSize="text-md" fontWeight="font-bold" className="mt-2">
            {products.length}
          </Text>
          <Text fontSize="text-xs" tone="body" className="mt-1">
            {products.length === 1 ? "Listing" : "Listings"}
          </Text>
        </View>
        <View className="items-center w-1/3">
          <CalendarIcon color={color.textBody} size={22} />
          <Text fontSize="text-md" fontWeight="font-bold" className="mt-2">
            {joinedDateLabel}
          </Text>
          <Text fontSize="text-xs" tone="body" className="mt-1">
            Member since
          </Text>
        </View>
      </View>

      {!isOwner && (
        <View className="px-gutter">
          <Button onPress={handleStartChat}>
            {`Message ${owner?.first_name ?? "the owner"}`}
          </Button>
        </View>
      )}

      <View
        className={`my-5 border-b-[0.5px] ${isDark ? "border-b-line-dark" : "border-b-line-light"
          }`}
      ></View>

      <View className="">
        <View className="">
          <View className="px-gutter">
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

        {products.length > 2 && <View className="px-gutter">
          <Button
            variant="outline"
            className="mt-4 border rounded-card"
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

      {/* <View className="border-b-[1px] border-line-dark my-5"></View> */}

      <View
        className={`my-5 border-b-[0.5px] ${isDark ? "border-b-line-dark" : "border-b-line-light"
          }`}
      ></View>

      <View className=" mb-16">
        <View className="">
          <View className="px-gutter">
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
              className={`mt-0 ml-6 text-subtle-light ${isDark ? "text-subtle-dark" : "text-subtle-light"
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

        {ownerReviews.length > 1 ? <View className="px-gutter">
          <Button
            onPress={() =>
              navigation.navigate("OwnersReviewScreen", {
                owner: owner!,
                reviews: ownerReviews,
              })
            }
            variant="outline"
            className="mt-4 border rounded-card"
          >
            <Text fontWeight="font-bold">View all reviews</Text>
          </Button>
        </View> : null}
      </View>
    </Container>
  );
}
