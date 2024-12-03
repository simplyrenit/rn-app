import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import OnboardingScreen from "@/screens/welcome";
import AboutScreen from "../screens/auth/about";
import ConfirmPasswordScreen from "../screens/auth/confirm-password";
import EmailScreen from "../screens/auth/email";
import LocationScreen from "../screens/auth/location";
import PasswordScreen from "../screens/auth/password";
import VerifyScreen from "../screens/auth/verify";

import { useGlobalContext } from "@/context/global-context";
import ChatDetailsScreen from "@/screens/chat/chat-details";
import PrivacyScreen from "../screens/privacy";
import ProductDetailScreen from "../screens/products/products-screen";
import ReviewsScreen from "../screens/products/reviews-screen";
import WriteReviewsScreen from "../screens/products/write-review";
import SearchScreen from "../screens/search";
import SearchResultsScreen from "../screens/search-results";
import ChatScreen from "../screens/tabs/chat";
import HomeScreen from "../screens/tabs/index";
import PostScreen from "../screens/tabs/post";
import ProfileScreen from "../screens/tabs/profile";
import SavedScreen from "../screens/tabs/saved";
import TermsScreen from "../screens/terms";
import UserDetailScreen from "../screens/users/users-screen";

import { HomeIcon, HomeIconSolid } from "@/icons/home";
import { PostIcon, PostIconSolid } from "@/icons/post";
import { RootStackParamList } from "@/lib/types";
import ContactUsScreen from "@/screens/profileScreens/contactUs";
import EditProductScreen from "@/screens/profileScreens/edit-product";
import FAQScreen from "@/screens/profileScreens/faqs";
import FeedbackNReviewScreen from "@/screens/profileScreens/feedback-review";
import MyProductScreen from "@/screens/profileScreens/my-product";
import NotificationScreen from "@/screens/profileScreens/notification";
import WhoWeAreScreen from "@/screens/profileScreens/who-we-are";
import { Platform } from "react-native";
import {
  ChatBubbleLeftIcon,
  HeartIcon,
  UserIcon,
} from "react-native-heroicons/outline";
import {
  ChatBubbleLeftIcon as ChatBubbleLeftIconSolid,
  HeartIcon as HeartIconSolid,
  UserIcon as UserIconSolid,
} from "react-native-heroicons/solid";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

import PostSubCategories from "@/screens/post-screens/post-sub-categories";
import AboutProduct from "@/screens/post-screens/about-product";
import ProductImages from "@/screens/post-screens/product-images";
import ChooseCoverImage from "@/screens/post-screens/choose-cover-image";
import ProductAvailability from "@/screens/post-screens/product-availability";
import ReviewProduct from "@/screens/post-screens/review-product";
import UnavailabilityFormScreen from "@/screens/profileScreens/unavailability_form";
import UnavailabilityCategories from "@/screens/profileScreens/unavailability_categories";
import UnavailabilityFormInputs from "@/screens/profileScreens/unavailability_form_inputs";
import EditProductImages from "@/screens/profileScreens/edit/edit-product-images";
import EditSubCategories from "@/screens/profileScreens/edit/edit-sub-categories";
import EditProductAvailability from "@/screens/profileScreens/edit/edit-product-availability";
import EditCategory from "@/screens/profileScreens/edit/edit-category";
import EditAboutProduct from "@/screens/profileScreens/edit/edit-about-product";
import EditCoverImage from "@/screens/profileScreens/edit/edit-cover-image";
import ReportAProblemScreen from "@/screens/profileScreens/report-a-problem";
import OwnersReviewScreen from "@/screens/users/owners-review";
import HangTight from "@/screens/post-screens/hang-tight";
import LocationModal from "@/screens/post-screens/location-modal";
import OwnersProductsScreen from "@/screens/users/owners-products";
import UnavailabilitySubCatScreen from "@/screens/profileScreens/unavailability_subCat";

const Tab = createBottomTabNavigator();
const PostStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();

function PostStackScreen() {
  return (
    <PostStack.Navigator screenOptions={{ headerShown: false }}>
      <PostStack.Screen
        name="Post"
        component={PostScreen}
      />
      <PostStack.Screen
        name="PostSubCategories"
        component={PostSubCategories}
      />
      <PostStack.Screen
        name="AboutProduct"
        component={AboutProduct}
      />
      <PostStack.Screen
        name="ProductImages"
        component={ProductImages}
      />
      <PostStack.Screen
        name="ChooseCoverImage"
        component={ChooseCoverImage}
      />
      <PostStack.Screen
        name="ProductAvailability"
        component={ProductAvailability}
      />
      <PostStack.Screen
        name="ReviewProduct"
        component={ReviewProduct}
      />
      <PostStack.Screen
        name="HangTight"
        component={HangTight}
      />
    </PostStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
      />
      <HomeStack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
      />
    </HomeStack.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <PostStack.Navigator screenOptions={{ headerShown: false }}>
      <PostStack.Screen
        name="profile"
        component={ProfileScreen}
      />
      <PostStack.Screen
        name="myProducts"
        component={MyProductScreen}
      />
      <PostStack.Screen
        name="editProduct"
        component={EditProductScreen}
      />
      <PostStack.Screen
        name="notification"
        component={NotificationScreen}
      />
      <PostStack.Screen
        name="contactUs"
        component={ContactUsScreen}
      />
      <PostStack.Screen
        name="feedback"
        component={FeedbackNReviewScreen}
      />
      <PostStack.Screen
        name="whoWeAre"
        component={WhoWeAreScreen}
      />
      <PostStack.Screen
        name="faq"
        component={FAQScreen}
      />
      <PostStack.Screen
        name="Privacy"
        component={PrivacyScreen}
      />
      <PostStack.Screen
        name="Terms"
        component={TermsScreen}
      />
      <PostStack.Screen
        name="unavailabilityForm"
        component={UnavailabilityFormScreen}
      />
      <PostStack.Screen
        name="unavailabilityFormCategories"
        component={UnavailabilityCategories}
      />
      <PostStack.Screen
        name="UnavailabilitySubCat"
        component={UnavailabilitySubCatScreen}
      />
      <PostStack.Screen
        name="unavailabilityFormInputs"
        component={UnavailabilityFormInputs}
      />
      <PostStack.Screen
        name="ReportAProblem"
        component={ReportAProblemScreen}
      />
      <PostStack.Screen
        name="EditProductAvailability"
        component={EditProductAvailability}
      />
      <PostStack.Screen
        name="EditCategory"
        component={EditCategory}
      />
      <PostStack.Screen
        name="EditSubCategories"
        component={EditSubCategories}
      />
      <PostStack.Screen
        name="EditAboutProduct"
        component={EditAboutProduct}
      />
      <PostStack.Screen
        name="EditProductImages"
        component={EditProductImages}
      />
      <PostStack.Screen
        name="EditCoverImage"
        component={EditCoverImage}
      />
    </PostStack.Navigator>
  );
}

function MainTabs() {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: isDarkMode ? "white" : "black",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#000" : "white",
          height: Platform.OS === "ios" ? hp("12.75%") : hp("8%"), //110
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: wp("3%"),
          paddingBottom: hp("1.3%"), //17
        },
        tabBarIcon: ({ focused, color, size }) => {
          let Icon;

          switch (route.name) {
            case "Home":
              Icon = focused ? HomeIconSolid : HomeIcon;
              break;
            case "Saved":
              Icon = focused ? HeartIconSolid : HeartIcon;
              break;
            case "Post":
              Icon = focused ? PostIconSolid : PostIcon;
              break;
            case "Chat":
              Icon = focused ? ChatBubbleLeftIconSolid : ChatBubbleLeftIcon;
              break;
            case "Profile":
              Icon = focused ? UserIconSolid : UserIcon;
              break;
          }
          return Icon ? (
            <Icon
              size={wp("6.5%")}
              color={color}
            />
          ) : null;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
      />
      {/* <Tab.Screen name="Post" component={PostScreen} /> */}
      <Tab.Screen
        name="Post"
        component={PostStackScreen}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
      />
    </Tab.Navigator>
  );
}
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  const { loading, hasSeenWelcome } = useGlobalContext();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasSeenWelcome ? "MainTabs" : "Welcome"}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="Welcome"
          component={OnboardingScreen}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />
        <Stack.Screen
          name="Email"
          component={EmailScreen}
        />
        <Stack.Screen
          name="Verify"
          component={VerifyScreen}
        />
        <Stack.Screen
          name="About"
          component={AboutScreen}
        />
        <Stack.Screen
          name="Password"
          component={PasswordScreen}
        />
        <Stack.Screen
          name="ConfirmPassword"
          component={ConfirmPasswordScreen}
        />
        <Stack.Screen
          name="Location"
          component={LocationScreen}
        />
        <Stack.Screen
          name="Privacy"
          component={PrivacyScreen}
        />
        <Stack.Screen
          name="Terms"
          component={TermsScreen}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
        />
        {/* <Stack.Screen name="SearchResults" component={SearchResultsScreen} /> */}
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
        />
        <Stack.Screen
          name="ReviewsScreen"
          component={ReviewsScreen}
        />
        <Stack.Screen
          name="OwnersReviewScreen"
          component={OwnersReviewScreen}
        />
        <Stack.Screen
          name="WriteReviews"
          component={WriteReviewsScreen}
        />
        <Stack.Screen
          name="UserDetail"
          component={UserDetailScreen}
        />
        <Stack.Screen
          name="ChatDetails"
          component={ChatDetailsScreen}
        />
        <Stack.Screen
          name="OwnersProducts"
          component={OwnersProductsScreen}
        />
        {/* <Stack.Screen name="myProducts" component={MyProductScreen} />
        <Stack.Screen name="editProduct" component={EditProductScreen} /> */}
        {/* <Stack.Screen name="notification" component={NotificationScreen} />
        <Stack.Screen name="contactUs" component={ContactUsScreen} />
        <Stack.Screen name="feedback" component={FeedbackNReviewScreen} />
        <Stack.Screen name="whoWeAre" component={WhoWeAreScreen} />
        <Stack.Screen name="faq" component={FAQScreen} /> */}
        {/* <Stack.Screen name="ReviewProduct" component={ReviewProduct} /> */}

        {/* <Stack.Screen name="PostSubCategories" component={PostSubCategories} /> */}
        <Stack.Screen
          name="LocationModal"
          component={LocationModal}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
