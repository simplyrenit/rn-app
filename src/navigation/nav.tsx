import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createNavigationContainerRef,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import OnboardingScreen from "@/screens/welcome";
import AboutScreen from "../screens/auth/about";
import ConfirmPasswordScreen from "../screens/auth/confirm-password";
import EmailScreen from "../screens/auth/email";
import LocationScreen from "../screens/auth/location";
import PasswordScreen from "../screens/auth/password";
import PhoneScreen from "../screens/auth/phone";
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
import { PlusSquareIcon } from "@/icons/plus-square";
import { RootStackParamList } from "@/lib/types";
import {
  setupChatNotifications,
  setupNotificationListeners,
} from "@/backend/notifications";
import ContactUsScreen from "@/screens/profileScreens/contactUs";
import EditProductScreen from "@/screens/profileScreens/edit-product";
import FAQScreen from "@/screens/profileScreens/faqs";
import FeedbackNReviewScreen from "@/screens/profileScreens/feedback-review";
import MyProductScreen from "@/screens/profileScreens/my-product";
import NotificationScreen from "@/screens/profileScreens/notification";
import WhoWeAreScreen from "@/screens/profileScreens/who-we-are";
import { BackHandler, PixelRatio, Platform, View } from "react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { darkColors, lightColors, radius } from "@/lib/design-tokens";
import { fontFamily, fontSize, lineHeight } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { selectionFeedback } from "@/lib/haptics";
import { useUnreadCount } from "@/backend/chat";

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
import NetworkDiagnosticsScreen from "@/screens/profileScreens/network-diagnostics";
import OwnersReviewScreen from "@/screens/users/owners-review";
import LocationModal from "@/screens/post-screens/location-modal";
import ListAddPhotosScreen from "@/screens/list-flow/add-photos";
import ListReadingScreen from "@/screens/list-flow/reading";
import ListReviewScreen from "@/screens/list-flow/review";
import ListPreviewScreen from "@/screens/list-flow/preview";
import ListSubmittedScreen from "@/screens/list-flow/submitted";
import OwnersProductsScreen from "@/screens/users/owners-products";
import UnavailabilitySubCatScreen from "@/screens/profileScreens/unavailability_subCat";

const Tab = createBottomTabNavigator();
const PostStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
        name="NetworkDiagnostics"
        component={NetworkDiagnosticsScreen}
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

/**
 * The tab bar follows the design's navbar rather than the HIG default: 24pt
 * icons over a 14pt label, 4pt apart, inside 8pt of navbar padding plus 8pt of
 * tab padding top and bottom — 81pt of bar above the home-indicator inset. The
 * active tab is drawn in the primary text tone and the rest in the tertiary
 * one; the brand purple no longer marks the current tab.
 */
const TAB_BAR_PADDING = 16;
const TAB_ICON_SIZE = 24;
const TAB_LABEL_GAP = 4;
const TAB_BAR_CONTENT_HEIGHT =
  TAB_BAR_PADDING * 2 + TAB_ICON_SIZE + TAB_LABEL_GAP + lineHeight.sm;

/**
 * Beyond this Dynamic Type scale a five-slot tab bar cannot hold five labels.
 * At AX-Large they ran edge to edge with no gap and "Profile" was clipped by
 * the screen. iOS caps tab-label growth for exactly this reason and falls back
 * to the large-content HUD; the icons and the VoiceOver labels still carry the
 * meaning, so dropping the text is the correct degradation.
 */
const TAB_LABEL_SCALE_LIMIT = 1.25;

function MainTabs() {
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadCount();
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  // The same two gates the Post tab renders (sign-in, merchant approval).
  const canStartListing =
    Boolean(authTokens && isAuthenticated) &&
    !(
      userDetails?.account_type === "merchant" &&
      userDetails?.merchant_approval_status !== "approved"
    );
  const fontScale = PixelRatio.getFontScale();
  const showTabLabels = fontScale <= TAB_LABEL_SCALE_LIMIT;

  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => selectionFeedback(),
      }}
      screenOptions={({ route }) => ({
        // Primary for the current tab, tertiary for the rest, as the design
        // draws them.
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textDim,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: color.canvas,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + TAB_BAR_PADDING,
          paddingTop: showTabLabels ? TAB_BAR_PADDING : 12,
          borderTopColor: color.navLine,
          borderTopWidth: 1,
        },
        tabBarShowLabel: showTabLabels,
        tabBarIconStyle: {
          marginTop: 0,
        },
        // The label is chrome, so it holds its size rather than tracking the
        // content ramp; the cap above removes it entirely past 1.25.
        tabBarAllowFontScaling: false,
        tabBarLabelStyle: {
          fontSize: fontSize.sm,
          lineHeight: lineHeight.sm,
          fontFamily: fontFamily.regular,
          marginTop: TAB_LABEL_GAP,
        },
        tabBarAccessibilityLabel:
          route.name === "Chat" && unreadCount > 0
            ? `Chat, ${unreadCount} unread`
            : route.name,
        tabBarIcon: ({ focused, color: tintColor }) => {
          let Icon;
          switch (route.name) {
            case "Home":
              Icon = focused ? HomeIconSolid : HomeIcon;
              break;
            case "Saved":
              Icon = focused ? HeartIconSolid : HeartIcon;
              break;
            case "Post":
              Icon = PlusSquareIcon;
              break;
            case "Chat":
              Icon = focused ? ChatBubbleLeftIconSolid : ChatBubbleLeftIcon;
              break;
            case "Profile":
              Icon = focused ? UserIconSolid : UserIcon;
              break;
          }
          if (!Icon) return null;

          const showBadge = route.name === "Chat" && unreadCount > 0;

          return (
            <View>
              <Icon
                size={TAB_ICON_SIZE}
                color={tintColor}
                // The design outlines the filled house in the opposite tone.
                {...(route.name === "Home" && focused
                  ? { edge: color.canvas }
                  : null)}
                // The active Post tab is a solid square with the plus knocked out.
                {...(route.name === "Post" && focused
                  ? { filled: true, edge: color.canvas }
                  : null)}
              />
              {showBadge ? (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -5,
                    minWidth: 9,
                    height: 9,
                    borderRadius: radius.full,
                    backgroundColor: color.brand,
                    borderWidth: 1.5,
                    borderColor: color.canvas,
                  }}
                />
              ) : null}
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
      />
      <Tab.Screen
        name="Post"
        component={PostScreen}
        listeners={({ navigation }) => ({
          // The Post tab is a doorway, not a destination: when the owner may
          // list, a tap opens the listing flow on the root stack instead of
          // focusing the tab. Preventing the default also means a second tap
          // never leaves a blank tab behind. Signed-out owners and merchants
          // awaiting approval still land on the tab, which shows their gate.
          tabPress: (event) => {
            if (!canStartListing) return;
            event.preventDefault();
            navigation.navigate("ListAddPhotos");
          },
        })}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  const { loading, hasSeenWelcome, theme, isAuthenticated } = useGlobalContext();

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    setupChatNotifications();
    return setupNotificationListeners((conversationId) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate("ChatDetails", { id: conversationId });
      }
    });
  }, [isAuthenticated]);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, []);

  if (loading || isAuthenticated === undefined) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={isAuthenticated || hasSeenWelcome ? "MainTabs" : "Welcome"}
        screenOptions={{
          headerShown: false,
          navigationBarColor: theme === "dark" ? darkColors.canvas : lightColors.canvas,
        }}
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
          name="SearchResults"
          component={SearchResultsScreen}
        />
        <Stack.Screen
          name="Email"
          component={EmailScreen}
        />
        <Stack.Screen
          name="Phone"
          component={PhoneScreen}
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
        <Stack.Screen
          name="LocationModal"
          component={LocationModal}
        />
        {/* The photo-first listing flow (ENG-10). On the root stack, so the
            tab bar is hidden for the whole flow. */}
        <Stack.Screen
          name="ListAddPhotos"
          component={ListAddPhotosScreen}
        />
        <Stack.Screen
          name="ListReading"
          component={ListReadingScreen}
        />
        <Stack.Screen
          name="ListReview"
          component={ListReviewScreen}
        />
        <Stack.Screen
          name="ListPreview"
          component={ListPreviewScreen}
        />
        <Stack.Screen
          name="ListSubmitted"
          component={ListSubmittedScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="profile"
          component={ProfileScreen}
        />
        <Stack.Screen
          name="myProducts"
          component={MyProductScreen}
        />
        <Stack.Screen
          name="editProduct"
          component={EditProductScreen}
        />
        <Stack.Screen
          name="notification"
          component={NotificationScreen}
        />
        <Stack.Screen
          name="contactUs"
          component={ContactUsScreen}
        />
        <Stack.Screen
          name="feedback"
          component={FeedbackNReviewScreen}
        />
        <Stack.Screen
          name="whoWeAre"
          component={WhoWeAreScreen}
        />
        <Stack.Screen
          name="faq"
          component={FAQScreen}
        />
        <Stack.Screen
          name="unavailabilityForm"
          component={UnavailabilityFormScreen}
        />
        <Stack.Screen
          name="unavailabilityFormCategories"
          component={UnavailabilityCategories}
        />
        <Stack.Screen
          name="UnavailabilitySubCat"
          component={UnavailabilitySubCatScreen}
        />
        <Stack.Screen
          name="unavailabilityFormInputs"
          component={UnavailabilityFormInputs}
        />
        <Stack.Screen
          name="ReportAProblem"
          component={ReportAProblemScreen}
        />
        <Stack.Screen
          name="NetworkDiagnostics"
          component={NetworkDiagnosticsScreen}
        />
        <Stack.Screen
          name="EditProductAvailability"
          component={EditProductAvailability}
        />
        <Stack.Screen
          name="EditCategory"
          component={EditCategory}
        />
        <Stack.Screen
          name="EditSubCategories"
          component={EditSubCategories}
        />
        <Stack.Screen
          name="EditAboutProduct"
          component={EditAboutProduct}
        />
        <Stack.Screen
          name="EditProductImages"
          component={EditProductImages}
        />
        <Stack.Screen
          name="EditCoverImage"
          component={EditCoverImage}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
