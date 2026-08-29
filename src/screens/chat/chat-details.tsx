import { useSubscribeToMessages } from "@/backend/messages";
import { useTypedNavigation } from "@/lib/types";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { Button, StaticContainer, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import {
  authenticateFirebase,
  getFirestoreDb,
  getFirestoreModule,
} from "@/lib/firebase";
import { BackendProduct, Conversation, RouteProps } from "@/lib/types";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import moment from "moment";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { ScrollView } from "react-native-gesture-handler";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

import { ChatSkeleton } from "./chat-skeleton";
import { useChat } from "@/backend/chat";
import useOwner from "@/backend/owner";
import { ink, colors, radius } from "@/lib/design-tokens";
import { formatDayHeading, isSameDay } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";

const getDaysBetweenDates = (startDate: string, endDate: string): number => {
  const start = moment(startDate);
  const end = moment(endDate);
  return end.diff(start, "days") + 1;
};

const formatDate = (date: Date | undefined) => {
  if (!date) return "";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

const documentExists = (
  snapshot: { exists?: boolean | (() => boolean) } | null | undefined
) => {
  if (!snapshot) {
    return false;
  }

  return typeof snapshot.exists === "function"
    ? snapshot.exists()
    : Boolean(snapshot.exists);
};

export default function ChatDetailsScreen() {
  const router = useRoute<RouteProps<"ChatDetails">>();
  const { id: conversationId } = router.params;
  const bottomSheetRef = useRef<any>(null);
  const { theme, userDetails, authTokens } = useGlobalContext();
  const isDark = theme === "dark";
  const { color } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<BackendProduct | null>(
    null
  );
  const [ownerProducts, setOwnerProducts] = useState<BackendProduct[]>([]);

  const [filteredProducts, setFilteredProducts] =
    useState<BackendProduct[]>(ownerProducts);
  const [selectedRange, setSelectedRange] = useState({
    startDate: "",
    endDate: "",
  });
  const { getOwnerProducts } = useOwner();
  const [participantDetails, setParticipantDetails] = useState({
    profilePicture: "",
    username: "",
    userId: "",
  });
  const [myDetails, setMyDetails] = useState({
    profilePicture: "",
    username: "",
  });
  const [isBlocked, setIsBlocked] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockedBy, setBlockedBy] = useState("");
  const blockAndReportInFlight = useRef(false);

  const {
    readChat,
    getParticipantDetails,
    makeOffer,
    getMyDetails,
    blockUser,
    reportUser,
    unblockUser,
    isBlocked: isChatBlocked,
  } = useChat();

  const {
    messages: m,
    loading: l,
    error,
  } = useSubscribeToMessages(conversationId);

  const listingNavigation = useTypedNavigation();

  const getImageSource = (uri?: string | null) =>
    uri ? { uri } : undefined;

  async function fetchDetails() {
    const details = await getParticipantDetails(conversationId);
    const myDetails = await getMyDetails(conversationId);
    const blocked = await isChatBlocked(conversationId);
    const products = await getOwnerProducts(details.userId);
    

    setIsBlocked(blocked.isBlocked);
    setBlockedBy(blocked.initiatedBy);
    setParticipantDetails({
      profilePicture: details.profilePicture,
      username: details.username,
      userId: details.userId,
    });

    setOwnerProducts(products);
    setFilteredProducts(products);

    setMyDetails({
      profilePicture: myDetails.profilePicture,
      username: myDetails.username,
    });
  }

  useEffect(() => {
    const firestore = getFirestoreDb();
    const accessToken = authTokens?.access_token;
    if (!firestore || !accessToken) {
      return;
    }

    let unsubscribe = () => {};
    let active = true;

    authenticateFirebase(accessToken)
      .then(() => {
        const { doc, onSnapshot } = getFirestoreModule();
        const conversationRef = doc(firestore, "conversations", conversationId);
        unsubscribe = onSnapshot(conversationRef, (docSnapshot: any) => {
          if (active && documentExists(docSnapshot)) {
            const conversationData = docSnapshot.data() as Conversation;
            setIsBlocked(conversationData.blockStatus.isBlocked);
            setBlockedBy(conversationData.blockStatus.initiatedBy);
          }
        });
      })
      .catch((error) => console.warn("Unable to subscribe to chat:", error));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authTokens?.access_token, conversationId]);

  useEffect(() => {
    fetchDetails();
  }, []);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 500);
  };

  useEffect(() => {
    readChat(conversationId);
  }, [m]);

  useEffect(() => {
    if (m.length > 0) {
      scrollToBottom(false);
    }
  }, []);

  const [makeOfferDetails, setMakeOfferDetails] = useState({
    amount: "",
    securityDeposit: "",
  });

  const handleTextChange = (field: string, value: string) => {
    setMakeOfferDetails((prevDetails) => ({
      ...prevDetails,
      [field]: value,
    }));
  };

  const cleanup = () => {
    setSelectedProduct(null);
    setFilteredProducts(ownerProducts);

    setSearch("");
    setSelectedRange({ startDate: "", endDate: "" });
    setMakeOfferDetails({ amount: "", securityDeposit: "" });
  };

  const selectProductBottomSheetRef = useRef<any>(null);
  const checkAvailabilityBottomSheetRef = useRef<any>(null);
  const makeOfferBottomSheetRef = useRef<any>(null);

  const handleReportPress = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const onSearchChange = (text: string) => {
    setSearch(text);
    const filtered = ownerProducts.filter((product) =>
      product.title.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  if (l) {
    return <ChatSkeleton />;
  }

  const onSelectProductPress = () => {
    selectProductBottomSheetRef.current?.present();
  };

  const onProductSelect = (product: any) => {
    setSelectedProduct(product);
    checkAvailabilityBottomSheetRef.current?.present();
  };

  const onDateSelect = () => {
    makeOfferBottomSheetRef.current?.present();
  };

  const handleDayPress = (day: any) => {
    if (!selectedRange.startDate || selectedRange.endDate) {
      // If no start date is selected, or a full range has been selected, start a new range
      setSelectedRange({ startDate: day.dateString, endDate: "" });
    } else {
      // Set the end date only if it's after the start date
      if (day.dateString > selectedRange.startDate) {
        setSelectedRange((prev) => ({
          ...prev,
          endDate: day.dateString,
        }));
      } else {
        // Reset the range if the selected end date is before the start date
        setSelectedRange({ startDate: day.dateString, endDate: "" });
      }
    }
  };

  const getIntermediateDates = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return {};

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = {};

    let currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + 1);

    while (currentDate < end) {
      const dateString = currentDate.toISOString().split("T")[0];
      // @ts-ignore
      dates[dateString] = {
        customStyles: {
          container: {
            backgroundColor: ink.brandWash(isDark),
            borderRadius: radius.group, // Circular shape
          },
          text: {
            color: colors.dark.brand,
          },
        },
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const onSubmit = async () => {
    [
      selectProductBottomSheetRef,
      checkAvailabilityBottomSheetRef,
      makeOfferBottomSheetRef,
    ].forEach((ref) => ref.current?.dismiss());

    await makeOffer(conversationId, {
      item: {
        name: selectedProduct?.title!,
        image: selectedProduct?.cover_image!,
        price: makeOfferDetails.amount,
        securityDeposit: makeOfferDetails.securityDeposit,
        duration: getDaysBetweenDates(
          selectedRange.startDate,
          selectedRange.endDate
        ),
        startDate: new Date(selectedRange.startDate).toISOString(),
        endDate: new Date(selectedRange.endDate).toISOString(),
        location: selectedProduct?.location!,
        offerStatus: "pending",
      },
      name: myDetails.username,
    });

    cleanup();
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      opacity={0.8}
    />
  );

  const handleBlockPress = async () => {
    const reason = blockReason.trim();
    if (!reason) {
      toast.error("Add a reason to report this user");
      return;
    }
    if (blockAndReportInFlight.current) return;

    blockAndReportInFlight.current = true;
    try {
      await reportUser(participantDetails.userId, reason);
      await blockUser(participantDetails.userId, reason, conversationId);
      setIsBlocked(true);
      setBlockReason("");
      bottomSheetRef.current?.close();
      toast.success("User blocked and report sent");
    } catch {
      toast.error("Couldn’t block and report this user");
    } finally {
      blockAndReportInFlight.current = false;
    }
  };

  const handleUnblockPress = async () => {
    await unblockUser(conversationId);
    setIsBlocked(false);
  };

  // The listing this conversation is about, taken from the first message that
  // names one. The thread already carried it; the menu simply never offered it.
  const threadListingId = (() => {
    for (const message of m ?? []) {
      const item = (message as any)?.message?.item;
      if (item?.id) return item.id as string;
    }
    return null;
  })();

  return (
    <StaticContainer width={100}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        <ChatHeader
          name={participantDetails.username}
          profilePic={participantDetails.profilePicture}
          onReportPress={handleReportPress}
          id={participantDetails.userId}
          isBlocked={isBlocked}
          onViewListing={
            threadListingId
              ? () =>
                  listingNavigation.navigate("ProductDetail", {
                    id: threadListingId,
                  })
              : undefined
          }
        />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom(false)}
          onLayout={() => scrollToBottom(false)}
          showsVerticalScrollIndicator={false}
        >
          {m.map((message, index) => {
            // A sticky day heading whenever the calendar date changes, so a
            // negotiation can be read back in time order. There was no date
            // anywhere in a conversation, per message or per day.
            const previous = index > 0 ? m[index - 1] : null;
            const next = index < m.length - 1 ? m[index + 1] : null;
            const showDay =
              !previous || !isSameDay(previous.timestamp, message.timestamp);

            // Message grouping. Every message carried its own timestamp, so six
            // consecutive messages one minute apart produced six timestamps and
            // six full-height bubbles. Only the last message of a run from one
            // sender within the same minute keeps its time; the rest sit tight
            // against it, which is the iMessage rhythm.
            const sameSenderAsNext =
              !!next &&
              next.from === message.from &&
              isSameDay(next.timestamp, message.timestamp) &&
              Math.abs(
                new Date(next.timestamp as any).getTime() -
                  new Date(message.timestamp as any).getTime()
              ) < 60_000;

            return (
              <React.Fragment key={message.id}>
                {showDay ? (
                  <View style={{ alignItems: "center", paddingVertical: 10 }}>
                    {/* A View, not a styled Text: borderRadius and overflow on
                        a Text do not clip reliably in React Native. */}
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: radius.full,
                        backgroundColor: color.surfaceRaised,
                        borderWidth: 1,
                        borderColor: color.line,
                      }}
                    >
                      <Text
                        fontSize="text-xs"
                        fontWeight="font-semibold"
                        tone="body"
                      >
                        {formatDayHeading(message.timestamp)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <ChatBubble
                  id={message.id || ""}
                  // @ts-ignore
                  message={message.message!}
                  isSent={message.from === userDetails?.username}
                  type={message.type}
                  timestamp={sameSenderAsNext ? undefined : message.timestamp}
                  grouped={sameSenderAsNext}
                />
              </React.Fragment>
            );
          })}
        </ScrollView>

        {isBlocked && (
          <>
            {blockedBy === userDetails?.username ? (
              <View className="flex-row space-x-1 items-center justify-center mb-5">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-semibold"
                  className={`uppercase ${
                    isDark ? "text-muted-dark" : "text-muted-light"
                  }`}
                >
                  {participantDetails.username} Blocked
                </Text>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className={`uppercase ${
                    isDark ? "text-muted-dark" : "text-muted-light"
                  }`}
                >
                  -
                </Text>
                <TouchableOpacity onPress={handleUnblockPress}>
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-bold"
                    className={`text-brand`}
                  >
                    Unblock
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row space-x-1 items-center justify-center mb-5">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-semibold"
                  className={`uppercase ${
                    isDark ? "text-muted-dark" : "text-muted-light"
                  }`}
                >
                  This conversation cannot be continued
                </Text>
              </View>
            )}
          </>
        )}

        {/* The composer used to sit in a 10%-of-screen box, leaving ~52pt of
            empty ground beneath it — more than twice what the home indicator
            needs — so it read as detached from the bottom of the screen. */}
        <View>
          <ChatInput
            conversationId={conversationId}
            onMakeOfferPress={onSelectProductPress}
            isBlocked={isBlocked}
          />
        </View>
      </KeyboardAwareScrollView>

      <CustomBottomSheetModal
        ref={bottomSheetRef}
        // snapPoints={["60%"]}
        isDark={isDark}
      >
        <View className="w-[95%] mx-auto">
          <View className="flex items-center mb-4">
            <Text
              fontSize="text-xl"
              fontWeight="font-bold"
            >
              Block & Report
            </Text>
          </View>

          <TextInput
            placeholder="Share your thoughts..."
            multiline
            // value={blockReason}
            onChangeText={(text) => setBlockReason(text)}
            style={{
              textAlignVertical: "top",
            }}
            className={`h-52 w-full mt-4 border ${
              isDark
                ? "border-line-dark text-white"
                : "border-line-light text-black"
            } rounded-card p-3 text-base`}
            placeholderTextColor={ink.dim(isDark)}
          />

          <View className="flex-row justify-between mt-6 mb-0">
            <TouchableOpacity
              onPress={() => bottomSheetRef.current?.close()}
              className={`bg-surface-light border ${
                isDark
                  ? "border-line-dark text-white"
                  : "border-line-light text-black"
              } p-3 rounded-input flex-1 mr-2`}
            >
              <Text
                className="text-center text-black"
                fontWeight="font-bold"
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-danger-light p-3 rounded-input flex-1 ml-2"
              onPress={handleBlockPress}
            >
              <Text
                fontWeight="font-bold"
                className="text-center text-white"
              >
                Block & Report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomBottomSheetModal>

      <BottomSheetModal
        backgroundStyle={{ backgroundColor: ink.canvas(isDark) }}
        handleIndicatorStyle={{
          backgroundColor: ink.text(isDark),
          width: 50,
          borderRadius: radius.full,
          padding: 2,
        }}
        ref={selectProductBottomSheetRef}
        snapPoints={["90%"]}
        backdropComponent={renderBackdrop}
        handleStyle={{
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderRightWidth: 2,
          borderTopColor: ink.line(isDark),
          borderLeftColor: ink.line(isDark),
          borderRightColor: ink.line(isDark),
          borderTopRightRadius: 50,
          borderTopLeftRadius: 50,
        }}
      >
        <View className="w-[95%] mx-auto flex-1">
          <View className=" items-center mb-4 mt-4 flex-1">
            <Text
              fontWeight="font-bold"
              fontSize="text-xl"
            >
              Select a product
            </Text>

            <View className="w-full flex-1">
              <View
                className={`flex-row border items-center shadow-lg ${
                  theme === "dark"
                    ? "bg-surface-dark border-line-dark"
                    : "bg-surface-light border-line-light"
                } rounded-card p-2 mt-4 w-[90%] self-center mb-3 h-12`}
                style={styles.Shadow}
              >
                <View className="w-[10%] h-full items-center justify-center">
                  <MagnifyingGlassIcon
                    size={24}
                    color={theme === "dark" ? ink.body(true) : ink.body(false)}
                  />
                </View>
                <View className="w-[80%] flex flex-row h-full ml-2">
                  <TextInput
                    placeholder="Search this conversation"
                    placeholderTextColor={ink.dim(isDark)}
                    className={`${isDark ? "text-white" : "text-black"}`}
                    value={search}
                    onChangeText={onSearchChange}
                  />
                </View>
              </View>

              <ScrollView
                // style={{ height: 300 }}
                className="w-[90%] self-center flex-1 "
                showsVerticalScrollIndicator={false}
              >
                {filteredProducts.map((product, index) => (
                  <TouchableOpacity
                    key={index}
                    className="flex-row justify-between items-center py-4"
                    onPress={() => onProductSelect(product)}
                  >
                    <View className="flex-row items-center">
                      <Image
                        source={getImageSource(product.cover_image)}
                        style={{ width: 50, height: 50, borderRadius: radius.button }}
                      />
                      <Text className="ml-4">{product.title}</Text>
                    </View>
                    <ChevronRightIcon
                      size={18}
                      color={theme === "dark" ? ink.body(true) : ink.body(false)}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* <Button disabled={!selectedProduct} onPress={onProductSelect}>
                Next
              </Button> */}
            </View>
          </View>
        </View>
      </BottomSheetModal>

      <CustomBottomSheetModal
        ref={checkAvailabilityBottomSheetRef}
        snapPoints={["90%"]}
        isDark={isDark}
      >
        <View className="w-[95%] mx-auto">
          <View className="flex-row justify-evenly items-center mb-4 mt-4">
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
              className="w-[10%]"
              onPress={() => checkAvailabilityBottomSheetRef.current?.close()}
            >
              <ChevronLeftIcon
                size={24}
                color={theme === "dark" ? ink.body(true) : ink.body(false)}
              />
            </TouchableOpacity>
            <Text
              fontWeight="font-bold"
              fontSize="text-xl"
              className="w-[80%] text-center"
            >
              Check Availability
            </Text>
            <View className="w-[10%]"></View>
          </View>

          <View className="flex-row items-center justify-between mx-4 mt-3">
            <Image
              className="w-[20%]"
              source={getImageSource(selectedProduct?.cover_image)}
              style={{ width: wp(20), height: wp(20), borderRadius: radius.button }}
              resizeMode="cover"
            />
            <View className="w-[75%] space-y-1">
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
              >
                {selectedProduct?.title}
              </Text>
              <Text
                fontSize="text-md"
                className={`${
                  isDark ? "text-muted-dark" : "text-muted-light"
                }`}
              >
                {selectedProduct?.location}
              </Text>
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
              >
                ₹ {Number(selectedProduct?.rate).toFixed(0)}
              </Text>
            </View>
          </View>

          <View className="mt-5">
            <Calendar
              theme={{
                calendarBackground: ink.surface(isDark),
                textSectionTitleColor: isDark ? "white" : ink.dim(false),
                dayTextColor: ink.text(isDark),
                todayTextColor: ink.info(false),
                textDisabledColor: ink.line(false),
                monthTextColor: ink.body(false),
                arrowColor: ink.text(isDark),
              }}
              markingType="custom"
              markedDates={{
                [selectedRange.startDate]: {
                  customStyles: {
                    container: {
                      backgroundColor: colors.dark.brand,
                      borderRadius: radius.group,
                    },
                    text: {
                      color: "white",
                    },
                  },
                },
                [selectedRange.endDate]: {
                  customStyles: {
                    container: {
                      backgroundColor: colors.dark.brand,
                      borderRadius: radius.group,
                    },
                    text: {
                      color: "white",
                    },
                  },
                },
                ...getIntermediateDates(
                  selectedRange.startDate,
                  selectedRange.endDate
                ),
              }}
              onDayPress={handleDayPress}
            />
          </View>

          <Button
            disabled={!selectedRange.startDate || !selectedRange.endDate}
            onPress={onDateSelect}
            className="mt-4"
          >
            Confirm
          </Button>
        </View>
      </CustomBottomSheetModal>

      <CustomBottomSheetModal
        ref={makeOfferBottomSheetRef}
        snapPoints={["90%"]}
        isDark={isDark}
      >
        <KeyboardAwareScrollView>
          <View className="w-[95%] mx-auto">
            <View className="flex-row justify-evenly items-center mb-4 mt-4">
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
                className="w-[10%]"
                onPress={() => makeOfferBottomSheetRef.current?.close()}
              >
                <ChevronLeftIcon
                  size={24}
                  color={theme === "dark" ? ink.body(true) : ink.body(false)}
                />
              </TouchableOpacity>
              <Text
                fontWeight="font-bold"
                fontSize="text-xl"
                className="w-[80%] text-center"
              >
                Make Offer
              </Text>
              <View className="w-[10%]"></View>
            </View>

            <View className="flex-row items-center justify-between mx-4 mt-3">
              <Image
                className="w-[20%]"
                source={getImageSource(selectedProduct?.cover_image)}
                style={{ width: wp(20), height: wp(20), borderRadius: radius.button }}
                resizeMode="cover"
              />
              <View className="w-[75%] space-y-1">
                <Text
                  fontSize="text-md"
                  fontWeight="font-bold"
                >
                  {selectedProduct?.title}
                </Text>
                <Text
                  fontSize="text-md"
                  className={`${
                    isDark ? "text-muted-dark" : "text-muted-light"
                  }`}
                >
                  {selectedProduct?.location}
                </Text>
                <Text
                  fontSize="text-md"
                  fontWeight="font-bold"
                >
                  ₹ {Number(selectedProduct?.rate).toFixed(0)}
                </Text>
              </View>
            </View>

            <View className="mt-8 mx-4 flex-row items-center justify-between">
              <Text
                fontWeight="font-bold"
                fontSize="text-md"
              >
                Duration
              </Text>
              <TouchableOpacity
                onPress={() => {
                  makeOfferBottomSheetRef.current?.close();
                  checkAvailabilityBottomSheetRef.current?.present();
                }}
              >
                {/* <Text
                  fontWeight="font-bold"
                  fontSize="text-md"
                  className="text-brand"
                >
                  Edit
                </Text> */}
                <PencilSquareIcon
                  size={20}
                  color={colors.dark.brand}
                />
              </TouchableOpacity>
            </View>

            <View className="mt-4 mx-4 flex-row items-center justify-between">
              <View
                className={`p-3 rounded-button border flex-row w-[40%] items-center ${
                  isDark
                    ? "bg-surface-dark border-line-dark"
                    : "bg-surface-light border-line-light"
                }`}
              >
                <CalendarIcon
                  size={24}
                  color={ink.text(isDark)}
                />
                <Text
                  fontSize="text-md"
                  className="ml-4"
                >
                  {formatDate(new Date(selectedRange.startDate))}
                </Text>
              </View>
              <View className="w-[20%] items-center">
                <Text
                  fontSize="text-base"
                  className="text-subtle-dark"
                >
                  --
                </Text>
              </View>
              <View
                className={`p-3 rounded-button border flex-row w-[40%] items-center ${
                  isDark
                    ? "bg-surface-dark border-line-dark"
                    : "bg-surface-light border-line-light"
                }`}
              >
                <CalendarIcon
                  size={24}
                  color={ink.text(isDark)}
                />
                <Text
                  fontSize="text-md"
                  className="ml-4"
                >
                  {formatDate(new Date(selectedRange.endDate))}
                </Text>
              </View>
            </View>
            <View className="flex-row mx-4 items-center mt-2">
              <InformationCircleIcon
                size={20}
                color={ink.dim(isDark)}
              />
              <Text
                fontSize="text-md"
                className={`ml-2 ${
                  isDark ? "text-muted-dark" : "text-muted-light"
                }`}
              >
                Booking for{" "}
                {getDaysBetweenDates(
                  selectedRange.startDate,
                  selectedRange.endDate
                )}{" "}
                days
              </Text>
            </View>

            <View className="mx-4 mt-8">
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
              >
                Amount
              </Text>
              <View
                className={`flex-row items-center border ${
                  isDark
                    ? "border-line-dark bg-surface-dark text-white"
                    : "border-line-light bg-surface-light text-black"
                } p-3 rounded-button w-full mt-2`}
              >
                <Text
                  fontSize="text-md"
                  className="mr-2"
                >
                  ₹
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="e.g. 900"
                  placeholderTextColor={ink.dim(isDark)}
                  value={makeOfferDetails.amount}
                  onChangeText={(value) => handleTextChange("amount", value)}
                  className={`${
                    isDark ? "text-white" : "text-black"
                  } rounded-button w-full`}
                />
              </View>
            </View>

            <View className="mx-4 mt-8">
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
              >
                Security Deposit
              </Text>
              <View
                className={`flex-row items-center border ${
                  isDark
                    ? "border-line-dark bg-surface-dark text-white"
                    : "border-line-light bg-surface-light text-black"
                } p-3 rounded-button w-full mt-2`}
              >
                <Text
                  fontSize="text-md"
                  className="mr-2"
                >
                  ₹
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="e.g. 4000"
                  placeholderTextColor={ink.dim(isDark)}
                  value={makeOfferDetails.securityDeposit}
                  onChangeText={(value) =>
                    handleTextChange("securityDeposit", value)
                  }
                  className={`${
                    isDark ? "text-white" : "text-black"
                  } rounded-button w-full`}
                />
              </View>
            </View>

            <Button
              onPress={onSubmit}
              disabled={
                !makeOfferDetails.amount || !makeOfferDetails.securityDeposit
              }
              className="mt-10"
            >
              Make an offer
            </Button>
          </View>
        </KeyboardAwareScrollView>
      </CustomBottomSheetModal>

    </StaticContainer>
  );
}

const styles = StyleSheet.create({
  Shadow: {
    shadowColor: ink.line(false),
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
