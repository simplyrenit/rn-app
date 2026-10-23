import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createNavigationContainerRef,
  NavigationContainer,
  StackActions,
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
import AllCategoriesScreen from "../screens/all-categories";
import CategoryLandingScreen from "../screens/category-landing";
import ChatScreen from "../screens/tabs/chat";
import HomeScreen from "../screens/tabs/index";
import PostScreen from "../screens/tabs/post";
import ProfileScreen from "../screens/tabs/profile";
import RentalsScreen from "../screens/tabs/rentals";
import SavedScreen from "../screens/tabs/saved";
import TermsScreen from "../screens/terms";
import UserDetailScreen from "../screens/users/users-screen";

import { HomeIcon, HomeIconSolid } from "@/icons/home";
import { PlusSquareIcon } from "@/icons/plus-square";
import { CHAT_ENABLED } from "@/lib/config";
import { retryPendingSignOut } from "@/lib/sign-out";
import { RootStackParamList } from "@/lib/types";
import { bookingQueryKey } from "@/backend/bookings";
import { claimQueryKey } from "@/backend/claims";
import {
  dismissRingNotifications,
  ignoreTapsWhileSignedOut,
  ownSessionId,
  registerDeviceSession,
  setupChatNotifications,
  setupPushRouter,
  setupNotificationListeners,
  setupRingChannel,
} from "@/backend/notifications";
import { useKycRefetch, useKycRefresh, useKycReturnLinking } from "@/backend/kyc";
import { PushRoute } from "@/lib/push-routes";
import { ringEndedQueryKey } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { shouldGoToWelcome } from "@/lib/session-end";
import { endingFromPush, ringTakesScreen } from "@/lib/shop-ring";
import ShopBookingScreen from "@/screens/shop/booking";
import ShopHandoverScreen from "@/screens/shop/handover";
import ShopReturnScreen from "@/screens/shop/return";
import ShopReportProblemScreen from "@/screens/shop/report-problem";
import DraftPhotosScreen from "@/screens/shop/draft-photos";
import CaptureScreen from "@/screens/capture/capture";
import { captureQueue, useCaptureUploads } from "@/backend/capture-jobs";
import { recoverLostShot } from "@/components/capture/camera";
import { useDraftPhotoUploads } from "@/backend/draft-photo-jobs";
import { ShopTodayScreen } from "@/screens/shop/home";
import ShopRingScreen from "@/screens/shop/ring";
import ArrivalWindowScreen from "@/screens/booking/arrival-window";
import BookingScreen from "@/screens/booking/booking";
import CheckCapturesScreen from "@/screens/booking/check-captures";
import BookingDetailsScreen from "@/screens/booking/details";
import ClaimScreen from "@/screens/booking/claim";
import ExtendScreen from "@/screens/booking/extend";
import FaultReportScreen from "@/screens/booking/fault-report";
import NotAsDescribedScreen from "@/screens/booking/not-as-described";
import PayDepositScreen from "@/screens/booking/pay-deposit";
import PayPeriodScreen from "@/screens/booking/pay-period";
import ReportScreen from "@/screens/booking/report";
import ReturnScreen from "@/screens/booking/return";
import BookingDatesScreen from "@/screens/booking/choose-dates";
import ReviewAndBookScreen from "@/screens/booking/review-and-book";
import { parsePayReturn, resumePayment, screens, watchStrayReturns } from "@/lib/payments";
import BankAccountScreen from "@/screens/profileScreens/bank-account";
import ContactUsScreen from "@/screens/profileScreens/contactUs";
import EditProductScreen from "@/screens/profileScreens/edit-product";
import FAQScreen from "@/screens/profileScreens/faqs";
import FeedbackNReviewScreen from "@/screens/profileScreens/feedback-review";
import MyProductScreen from "@/screens/profileScreens/my-product";
import RentalDeliveryScreen from "@/screens/profileScreens/rental-delivery";
import DeliveryAreasScreen from "@/screens/profileScreens/delivery-areas";
import RentalHoursScreen from "@/screens/profileScreens/rental-hours";
import RentalSettingsScreen from "@/screens/profileScreens/rental-settings";
import ShopAddressScreen from "@/screens/profileScreens/shop-address";
import NotificationScreen from "@/screens/profileScreens/notification";
import WhoWeAreScreen from "@/screens/profileScreens/who-we-are";
import { AppState, BackHandler, Linking, PixelRatio, Platform, View } from "react-native";
import {
  CalendarIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  UserIcon,
} from "react-native-heroicons/outline";
import {
  CalendarIcon as CalendarIconSolid,
  ChatBubbleLeftIcon as ChatBubbleLeftIconSolid,
  HeartIcon as HeartIconSolid,
  UserIcon as UserIconSolid,
} from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";
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
import SavedAddressesScreen from "@/screens/addresses/saved-addresses";
import AddressDetailsScreen from "@/screens/addresses/address-details";
import ListAddPhotosScreen from "@/screens/list-flow/add-photos";
import ListReadingScreen from "@/screens/list-flow/reading";
import ListReviewScreen from "@/screens/list-flow/review";
import ListPreviewScreen from "@/screens/list-flow/preview";
import ListSubmittedScreen from "@/screens/list-flow/submitted";
import KycDetailsScreen from "@/screens/kyc/details";
import KycIntroScreen from "@/screens/kyc/intro";
import KycStatusScreen from "@/screens/kyc/status";
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
            case "Rentals":
              Icon = focused ? CalendarIconSolid : CalendarIcon;
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
      {/* Rentals has the place Chat had (ENG-177, decision T-01). The Chat tab
          is only switched off: its screen, the thread route and the unread
          badge above are all still here behind `CHAT_ENABLED`. */}
      <Tab.Screen
        name="Rentals"
        component={RentalsScreen}
      />
      {CHAT_ENABLED ? (
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}
const Stack = createNativeStackNavigator<RootStackParamList>();

/** The link that started the app, once its payment has been resumed (below). */
let startLinkSeen: string | null = null;

export default function Navigation() {
  const { loading, hasSeenWelcome, theme, isAuthenticated, userDetails, fetchUserDetails } = useGlobalContext();
  const username = userDetails?.username;
  // The latest one, for the push listener below, which is not set up again on every render.
  const refreshDetails = React.useRef(fetchUserDetails);
  refreshDetails.current = fetchUserDetails;
  const queryClient = useQueryClient();

  // A screen to open, from a tapped push or a payment that was in flight. On a
  // start from a closed app the answer can arrive before the navigator is
  // mounted, so it waits here and `onReady` below opens it (ENG-173).
  const toOpen = React.useRef<PushRoute | null>(null);
  const openRoute = React.useCallback((route: PushRoute) => {
    if (!navigationRef.isReady()) {
      toOpen.current = route;
      return;
    }
    switch (route.screen) {
      case "Booking":
        navigationRef.navigate("Booking", { number: route.number });
        break;
      case "BookingDeposit":
        navigationRef.navigate("BookingDeposit", { number: route.number });
        break;
      case "ShopRing":
        // Pushed, not navigated to: with the screens keyed by booking, `navigate` to a ring
        // that is already open pops every screen above it, and a newer ring on top would be
        // thrown away. `push` brings an existing one to the front and leaves the others.
        navigationRef.dispatch(StackActions.push("ShopRing", { number: route.number, ring: route.ring ?? undefined }));
        break;
      case "ShopBooking":
        navigationRef.navigate("ShopBooking", { number: route.number });
        break;
      case "ShopHandover":
        navigationRef.navigate("ShopHandover", { number: route.number });
        break;
      case "Claim":
        navigationRef.navigate("Claim", { id: route.id });
        break;
      case "ShopToday":
        navigationRef.navigate("ShopToday");
        break;
      case "BankAccount":
        navigationRef.navigate("BankAccount");
        break;
      case "myProducts":
        navigationRef.navigate("myProducts");
        break;
      case "Profile":
        navigationRef.navigate("MainTabs", { screen: "Profile" });
        break;
      case "KycStatus":
        navigationRef.navigate("KycStatus");
        break;
    }
  }, []);
  const openBooking = React.useCallback(
    (number: string) => openRoute({ screen: "Booking", number }),
    [openRoute]
  );
  const openWaiting = React.useCallback(() => {
    const route = toOpen.current;
    toOpen.current = null;
    if (route) openRoute(route);
  }, [openRoute]);

  // A sign-out that could not reach the server is repeated when the app starts and
  // each time it comes to the front, signed in or not (ENG-146). A no-op when none waits.
  React.useEffect(() => {
    void retryPendingSignOut();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void retryPendingSignOut();
    });
    return () => subscription.remove();
  }, []);

  // A sign-out the person did not choose (the session ended: another device signed this phone out, T-26) arrives from
  // whatever screen is on top, a ring or a booking in the middle of a flow. The stack is cleared to Welcome so nothing
  // of the old account stays on screen; a sign-out the person chose resets the stack itself, and this does the same.
  const wasAuthenticated = React.useRef<boolean | undefined>(undefined);
  React.useEffect(() => {
    const was = wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (!navigationRef.isReady()) return;
    if (shouldGoToWelcome(was, isAuthenticated, navigationRef.getCurrentRoute()?.name)) {
      navigationRef.reset({ index: 0, routes: [{ name: "Welcome" }] });
    }
  }, [isAuthenticated]);

  // A merchant's verification status and badge are read again whenever the app comes back to
  // the foreground: a reviewer may have decided while it was away.
  useKycRefresh();
  const refetchKyc = useKycRefetch();

  // A return link only opens the status screen, which reads the real status from the server.
  useKycReturnLinking(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("KycStatus", { justReturned: true });
    }
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      // Signed out (not merely not known yet): a tap on a notification now is dropped, and rings
      // still in the tray are cleared, so nobody who signs in next is shown a request that was not theirs.
      if (isAuthenticated === false) {
        void dismissRingNotifications();
        return ignoreTapsWhileSignedOut();
      }
      return;
    }

    setupChatNotifications();
    // The channel a ring is sent on, before the first one can arrive (Android).
    void setupRingChannel();
    // Every start, once signed in: say which phone this session is, with the push
    // token if the phone has one and without it if not (ENG-146).
    void registerDeviceSession();
    const stopChat = setupNotificationListeners((conversationId) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate("ChatDetails", { id: conversationId });
      }
    });
    // The push router: the answer came, the rent is due, a refund went out; for a
    // shop, a request is ringing. Arriving, a push makes the open screen read
    // itself again; tapped, it opens its screen, which shows whatever the server
    // says now (ENG-173, ENG-209).
    const stopPushes = setupPushRouter({
      onArrive: (route) => {
        // The merchant was approved or rejected: the status the screens show is read again (ENG-271).
        if (route.screen === "Profile") {
          void refreshDetails.current();
          return;
        }
        // Verification moved on: the status and the badge are read again, never taken from the push.
        if (route.screen === "KycStatus") {
          refetchKyc();
          return;
        }
        if (route.screen === "Booking" || route.screen === "BookingDeposit") {
          void queryClient.invalidateQueries(bookingQueryKey(route.number));
          // Both Rentals lists start with this key.
          void queryClient.invalidateQueries("bookings");
          return;
        }
        // A claim moved: the claim itself, and the booking it holds or settles, are read afresh (ENG-252, ENG-253).
        if (route.screen === "Claim") {
          void queryClient.invalidateQueries(claimQueryKey(route.id));
          if (route.role === "customer") {
            void queryClient.invalidateQueries(bookingQueryKey(route.number));
            void queryClient.invalidateQueries("bookings");
            return;
          }
        }
        // Whatever the shop's push was about, what its screens show is now out of date.
        refreshShop(queryClient);
        // A ring that arrives with the app open takes over the screen, as it does
        // from the tray. When it ends, wherever it was answered, the ring screen
        // that is open reads that and says so, and the tray forgets the ring.
        if (route.screen === "ShopRing") {
          if (route.ended) {
            void dismissRingNotifications(route.number);
            // The push says which session answered; this phone's own session says whether
            // that was this phone ("You accepted") or another device (P3-14).
            const end = route.end;
            if (end) {
              void ownSessionId().then((own) =>
                queryClient.setQueryData(ringEndedQueryKey(route.number), endingFromPush(end, own))
              );
            }
          } else {
            queryClient.removeQueries(ringEndedQueryKey(route.number));
            // A ring screen is open: the owner may be about to tap Accept on it, and Accept sits in
            // the same place on the next one. The new request waits as "1 more request" on that
            // screen (it reads the live answer) and opens when this one is answered.
            if (navigationRef.isReady()) {
              const top = navigationRef.getCurrentRoute();
              const topNumber = (top?.params as { number?: string } | undefined)?.number;
              if (!ringTakesScreen(top?.name, topNumber)) return;
            }
            openRoute(route);
          }
        }
      },
      onOpen: (route) => {
        openRoute(route);
        return true;
      },
    });
    return () => {
      stopChat();
      stopPushes();
    };
  }, [isAuthenticated, queryClient, openRoute, refetchKyc]);

  // Photos and video of a handover or a return that are not on the server yet keep
  // uploading from wherever the app is, and start again after a restart (ENG-221).
  useCaptureUploads(isAuthenticated ? username : null);
  // On Android the system may close the app while its camera is in front. The photo is
  // handed back at this start, and goes into the record that was waiting for it.
  React.useEffect(() => {
    if (isAuthenticated && username) void captureQueue.init(username).then(() => recoverLostShot());
  }, [isAuthenticated, username]);
  // Photos of drafts that are not on their drafts yet carry on from here too (ENG-192).
  useDraftPhotoUploads(isAuthenticated ? username : null);

  // A payment can finish while the app is closed (the customer was in the
  // browser or a UPI app). On start, once it is known who is signed in, ask
  // rn-api about one of theirs that was in flight and open its booking, which
  // shows where things stand (ENG-172). When "Back to Renit" is what started the
  // app, its payment's note; otherwise the newest (cart plan D30).
  React.useEffect(() => {
    if (!isAuthenticated || !username) return;
    let stale = false;
    void Linking.getInitialURL()
      .catch(() => null)
      .then((url) => {
        // A link counts once per run: Android hands the same one back each time the screen
        // is built again from recents, and a second sign-in reads it too. Seen, it is no link.
        const fresh = url !== startLinkSeen;
        startLinkSeen = url;
        return resumePayment(username, fresh ? parsePayReturn(url)?.payment_id : null);
      })
      .then((number) => {
        if (number && !stale) openBooking(number);
      });
    return () => {
      stale = true;
    };
  }, [isAuthenticated, username, openBooking]);
  // Only Android rebuilding the screens unmounts this while the JS runs on (see `screens`).
  React.useEffect(
    () => () => {
      screens.torn += 1;
    },
    []
  );
  // The pay page's "Back to Renit" can arrive when no payment is being waited on (the
  // customer came back for a moment, then paid later): ask rn-api once and open the booking.
  React.useEffect(() => {
    if (!isAuthenticated || !username) return;
    return watchStrayReturns(username, (number) => {
      void queryClient.invalidateQueries(bookingQueryKey(number));
      void queryClient.invalidateQueries("bookings");
      openBooking(number);
    });
  }, [isAuthenticated, username, openBooking, queryClient]);

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
    <NavigationContainer ref={navigationRef} onReady={openWaiting}>
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
        {/* Category browsing (ENG-80) sits on the root stack beside the
            results it leads to, so the tab bar hides as it does there. */}
        <Stack.Screen
          name="AllCategories"
          component={AllCategoriesScreen}
        />
        <Stack.Screen
          name="CategoryLanding"
          component={CategoryLandingScreen}
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
        {/* Keyed by listing: without an id, `navigate("ProductDetail")` found
            any product page in the stack, popped everything above it and
            reused it for a different listing — which threw away the results a
            product page's breadcrumb had just pushed (ENG-35). Now a listing
            already in the stack is returned to, and any other is pushed. */}
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          getId={({ params }) => params?.id}
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
        {/* Merchant verification (ENG-12): on the root stack, so the tab bar hides. */}
        <Stack.Screen name="KycIntro" component={KycIntroScreen} />
        <Stack.Screen name="KycDetails" component={KycDetailsScreen} />
        <Stack.Screen name="KycStatus" component={KycStatusScreen} />
        <Stack.Screen
          name="profile"
          component={ProfileScreen}
        />
        <Stack.Screen
          name="myProducts"
          component={MyProductScreen}
        />
        <Stack.Screen
          name="BankAccount"
          component={BankAccountScreen}
        />
        <Stack.Screen
          name="RentalSettings"
          component={RentalSettingsScreen}
        />
        <Stack.Screen
          name="RentalHours"
          component={RentalHoursScreen}
        />
        <Stack.Screen
          name="ShopAddress"
          component={ShopAddressScreen}
        />
        <Stack.Screen
          name="RentalDelivery"
          component={RentalDeliveryScreen}
        />
        <Stack.Screen
          name="DeliveryAreas"
          component={DeliveryAreasScreen}
        />
        {/* Live booking, the customer's side (ENG-99). On the root stack, so
            the tab bar is hidden from the dates to the booking itself. */}
        <Stack.Screen
          name="BookingDates"
          component={BookingDatesScreen}
        />
        <Stack.Screen
          name="ReviewAndBook"
          component={ReviewAndBookScreen}
        />
        {/* Keyed by booking, like the product page: a push for another
            booking opens its own screen instead of rewriting this one. */}
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          getId={({ params }) => params?.number}
        />
        <Stack.Screen
          name="BookingWindow"
          component={ArrivalWindowScreen}
        />
        {/* The deposit, the day of the handover and the return, the customer's
            side (ENG-222). Each is keyed by booking, like the booking itself. */}
        <Stack.Screen
          name="BookingDeposit"
          component={PayDepositScreen}
          getId={({ params }) => params?.number}
        />
        {/* A month's rent (ENG-282), keyed by the booking and the month. */}
        <Stack.Screen
          name="PayPeriod"
          component={PayPeriodScreen}
          getId={({ params }) => (params ? `${params.number}:${params.n}` : undefined)}
        />
        <Stack.Screen
          name="BookingDetails"
          component={BookingDetailsScreen}
          getId={({ params }) => params?.number}
        />
        <Stack.Screen
          name="BookingCheck"
          component={CheckCapturesScreen}
          getId={({ params }) => params?.number}
        />
        <Stack.Screen
          name="BookingRefuse"
          component={NotAsDescribedScreen}
        />
        <Stack.Screen
          name="BookingReturn"
          component={ReturnScreen}
          getId={({ params }) => params?.number}
        />
        <Stack.Screen
          name="BookingExtend"
          component={ExtendScreen}
        />
        <Stack.Screen
          name="BookingReport"
          component={ReportScreen}
        />
        {/* The customer's fault report, and one claim for either side (ENG-252, ENG-253). A claim
            is keyed by its id, so a push for it opens the one that is already open. */}
        <Stack.Screen
          name="BookingFault"
          component={FaultReportScreen}
          getId={({ params }) => params?.number}
        />
        <Stack.Screen
          name="Claim"
          component={ClaimScreen}
          getId={({ params }) => String(params?.id)}
        />
        {/* The shop's ring (ENG-209), on the root stack so the tab bar is hidden
            while a request rings. Keyed by booking, so a second push for the same
            request opens the screen that is already there. */}
        <Stack.Screen
          name="ShopRing"
          component={ShopRingScreen}
          getId={({ params }) => params?.number}
        />
        {/* The shop's Today and Bookings for an owner who is not a merchant, and one
            booking as its shop sees it (ENG-210). Keyed by booking, like the customer's. */}
        <Stack.Screen
          name="ShopToday"
          component={ShopTodayScreen}
        />
        <Stack.Screen
          name="ShopBooking"
          component={ShopBookingScreen}
          getId={({ params }) => params?.number}
        />
        {/* The shop's handover and return (ENG-223), keyed by booking. */}
        <Stack.Screen
          name="ShopHandover"
          component={ShopHandoverScreen}
          getId={({ params }) => params?.number}
        />
        <Stack.Screen
          name="ShopReturn"
          component={ShopReturnScreen}
          getId={({ params }) => params?.number}
        />
        <Stack.Screen
          name="ShopReportProblem"
          component={ShopReportProblemScreen}
          getId={({ params }) => params?.number}
        />
        {/* The photo walk-through for drafts (ENG-192), on the root stack so the tab
            bar is hidden while the camera is the point of the screen. */}
        <Stack.Screen
          name="DraftPhotos"
          component={DraftPhotosScreen}
        />
        {/* The capture at a handover or a return (ENG-221). Keyed by whose record
            it is, so one booking's two sets are two screens. */}
        <Stack.Screen
          name="Capture"
          component={CaptureScreen}
          getId={({ params }) =>
            `${params?.number}:${params?.moment}:${params?.role}:${params?.forOther ? "other" : "own"}`
          }
        />
        <Stack.Screen
          name="SavedAddresses"
          component={SavedAddressesScreen}
        />
        <Stack.Screen
          name="AddressDetails"
          component={AddressDetailsScreen}
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
