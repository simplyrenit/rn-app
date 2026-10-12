import { BackButton, Button, EmptyState, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import IconButton from "@/components/profile/post-auth/profile-icon-button";
import { HeldChange, ListingPrompts, ListingStatusPill } from "@/components/product/listing-status";
import { ownerView, readPendingEdit } from "@/lib/listing-edit";
import { apiError } from "@/lib/api-error";
import { blockedDatesOf, hasPrice, openBookingMessage, resolveListingStatus } from "@/lib/listing-status";
import { BackendProduct, RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ArchiveBoxIcon } from "react-native-heroicons/outline";
import * as React from "react";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useProfile } from "@/backend/profile";
import { useFocusEffect } from "@react-navigation/native";

import { useGetMyDetails } from "@/services/userQueries";
import { MIN_TOUCH_TARGET, ink } from "@/lib/design-tokens";
import { toast } from "@/lib/toast";


const EditProductScreen: React.FC = () => {
  const route = useRoute<RouteProps<"editProduct">>();
  const { theme } = useGlobalContext();
  const navigation = useTypedNavigation();

  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();
  const { id } = route.params;
  const { width: winW } = useWindowDimensions();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const openBottomSheet = () => {
    setArchiveError(null);
    bottomSheetRef.current?.present();
  };
  const [product, setProduct] = useState<BackendProduct | null>(null);
  // Why the last archive attempt failed, shown in the sheet it was made from.
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const { getMyProductDetails, archiveMyProduct, loading } = useProfile();
  const { data: userData } = useGetMyDetails()
  const getProductDetails = async () => {
    const product = await getMyProductDetails(id);
    setProduct(product);
  };

  useFocusEffect(
    React.useCallback(() => {
      getProductDetails();
    }, [])
  );

  // Archiving keeps the product on record but takes it off search and off My
  // products. The server refuses while a booking on it is still open, and says
  // which ones.
  const handleArchive = async () => {
    setArchiveError(null);
    try {
      await archiveMyProduct(id);
    } catch (error) {
      const failure = apiError(error);
      setArchiveError(
        failure?.code === "open_booking"
          ? openBookingMessage(failure.details?.bookings as string[] | undefined)
          : failure?.message ??
              "We couldn't archive this product. Check your connection and try again."
      );
      return;
    }
    bottomSheetRef.current?.dismiss();
    toast.success("Your product was archived.");
    navigation.navigate("myProducts");
  };

  const status = resolveListingStatus(product?.status);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NonScrollableContainer>
        <View className="flex-row items-center justify-between px-gutter py-2 pt-4">
          <View style={{ width: MIN_TOUCH_TARGET }}>
            <BackButton onPress={() => router.goBack()} />
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text role="screenTitle">Edit product</Text>
          </View>
          <View style={{ width: MIN_TOUCH_TARGET }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* The product fetch used to leave this screen either blank or
              reading "Product not found" while it was still in flight — a
              network wait with no acknowledgement reads as a dead screen. */}
          {loading && !product ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color={ink.brandText(isDarkMode)} />
            </View>
          ) : product ? (
            <>
              <View
                className={`flex-row px-gutter space-x-5 py-4 border-b-[0.2px]  ${isDarkMode ? "border-b-line-dark" : "border-b-line-light"
                  }`}
              >
                <View className="py-0 flex-1 ">
                  <Image
                    className="rounded-group"
                    source={{ uri: product.cover_image }}
                    style={{ width: winW * 0.4, height: winW * 0.4 }}
                  />
                </View>

                <View className="py-0 justify-between flex-1">
                  <View style={{ gap: 2 }}>
                    <Text
                      fontSize="text-lg"
                      fontWeight="font-bold"
                    >
                      {product.title}
                    </Text>
                    <Text tone="body"
                      fontSize="text-sm"
                    >
                      {product.location}
                    </Text>
                    {hasPrice(product.rate) ? (
                      <View className="flex-row space-x-1">
                        <Text
                          fontSize="text-sm"
                          fontWeight="font-bold"
                        >
                          ₹{Number(product.rate).toFixed(0)}
                        </Text>
                        <Text tone="body">per day</Text>
                      </View>
                    ) : (
                      <Text tone="body" fontSize="text-sm">No price yet</Text>
                    )}
                    {/* A flagged owner opens this screen to fix the listing, so
                        the reason is shown where they will fix it. */}
                    {status ? (
                      <View style={{ marginTop: 4 }}>
                        <ListingStatusPill status={status} reasons={product.flag_reasons} waitsText={product.waits_for_text} fullReason />
                      </View>
                    ) : null}
                    {/* A change of theirs that waits: which fields, and what to change. */}
                    {product.pending_edit ? (
                      <View style={{ marginTop: 6 }}>
                        <HeldChange pending={readPendingEdit(product.pending_edit)} />
                      </View>
                    ) : null}
                    <View style={{ marginTop: 4 }}>
                      <ListingPrompts product={product} />
                    </View>
                  </View>
                  <View>
                    <TouchableOpacity
                      onPress={openBottomSheet}
                      className={`flex-row justify-center space-x-1 items-center border rounded-group h-11 mt-2 ${isDarkMode
                        ? "border-line-dark bg-surface-dark"
                        : "border-line-light bg-surface-light"
                        }`}
                    >
                      <ArchiveBoxIcon
                        size={20}
                        color={ink.danger(isDarkMode)}
                      />
                      <Text fontSize="text-sm" fontWeight="font-bold">
                        Archive
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View className="px-gutter py-0">
                <IconButton
                  onPress={() =>
                    navigation.navigate("EditCategory", {
                      name: product.name,
                      categoryId: product.category?.id ?? null,
                      pending: readPendingEdit(product.pending_edit),
                    })
                  }
                  leftIcon="ClipboardDocumentIcon"
                  text="Category"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() =>
                    navigation.navigate("EditAboutProduct", {
                      // The listing as the server has it (the screen lays a waiting change over it, `ownerView`); the owner is
                      // the contact when the contact the owner sees is theirs.
                      data: (() => {
                        const view = ownerView(product);
                        return { ...product, isOwnerContact: `${userData?.first_name} ${userData?.last_name}` === view.contact_name && userData?.phone === view.contact_number };
                      })(),
                    })
                  }
                  leftIcon="DocumentTextIcon"
                  text="Product Details"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() => {
                    // The photos as their owner sees them: waiting ones, if a change of photos waits.
                    const view = ownerView(product);
                    navigation.navigate("EditProductImages", {
                      images: view.images,
                      name: product.name,
                      coverImage: view.cover_image,
                    })
                  }
                  }
                  leftIcon="AdjustmentsHorizontalIcon"
                  text="Product Images"
                  isDarkMode={isDarkMode}
                />
                <IconButton
                  onPress={() => {
                    // `blocked_dates`, never `booked`: the contract keeps `booked`
                    // for the old meaning and the editor writes `blocked_dates`.
                    const dates = blockedDatesOf(product);
                    if (!dates) {
                      // Update sends the whole list and replaces the server's, so an
                      // answer without the field must not open the editor as "none".
                      toast.error("We couldn't load your unavailable dates", {
                        message: "Check your connection and try again.",
                      });
                      void getProductDetails();
                      return;
                    }
                    navigation.navigate("EditProductAvailability", {
                      dates_blocked: dates,
                      name: product.name,
                    });
                  }}
                  leftIcon="CalendarIcon"
                  text="Unavailability"
                  isDarkMode={isDarkMode}
                />
              </View>
            </>
          ) : (
            <EmptyState variant="error" title="Product not found" />
          )}
        </ScrollView>
      </NonScrollableContainer>

      <CustomBottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["55%"]}
        isDark={isDarkMode}
      >
        <View className="flex items-center mb-4">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            Archive product
          </Text>
        </View>
        {product && (
          <>
            <View className="flex-row px-gutter space-x-5 ">
              <View className="py-4 ">
                <Image
                  className="rounded-group"
                  source={{ uri: product.cover_image }}
                  style={{ width: winW * 0.2, height: winW * 0.2 }}
                />
              </View>

              <View className="py-4 justify-between items-center">
                <View>
                  <Text
                    fontSize="text-lg"
                    fontWeight="font-bold"
                  >
                    {product.title}
                  </Text>
                  <Text tone="body"
                    fontSize="text-sm"
                  >
                    {product.location}
                  </Text>
                  {hasPrice(product.rate) ? (
                    <View className="flex-row items-center mt-1 space-x-1">
                      <Text
                        fontSize="text-base"
                        fontWeight="font-bold"
                      >
                        ₹{Number(product.rate).toFixed(0)}
                      </Text>
                      <Text tone="body">per day</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </>
        )}
        <View className="px-gutter" style={{ gap: 8, marginTop: 8 }}>
          <Text tone="body" fontSize="text-md">
            Archiving takes this product out of search and out of My products.
            We keep it on record. You can’t archive a product while a booking
            on it is still open.
          </Text>
          {archiveError ? (
            <Text
              tone="danger"
              fontSize="text-sm"
              accessibilityLiveRegion="polite"
            >
              {archiveError}
            </Text>
          ) : null}
        </View>
        <View className="flex-row justify-between mt-6 space-x-2 px-2">
          <View style={{ flex: 1 }}>
            <Button
              variant="outline"
              disabled={loading}
              onPress={() => bottomSheetRef.current?.close()}
            >
              Cancel
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="warning" loading={loading} onPress={handleArchive}>
              Archive
            </Button>
          </View>
        </View>
      </CustomBottomSheetModal>
    </GestureHandlerRootView>
  );
};

export default EditProductScreen;
