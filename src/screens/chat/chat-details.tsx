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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { ScrollView } from "react-native-gesture-handler";
import {
  CalendarIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "react-native-heroicons/outline";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { ChatSkeleton } from "./chat-skeleton";
import { useChat } from "@/backend/chat";
import useOwner from "@/backend/owner";
import {
  ink,
  colors,
  radius,
  MIN_TOUCH_TARGET,
  SCREEN_GUTTER,
  fontFamily,
  fontSize,
} from "@/lib/design-tokens";
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

// Measured off the Figma Check Availability and Make Offer sheets: a 44pt title
// row, a 72pt product thumbnail, 48pt fields at the button radius on the hairline.
const OFFER_FIELD_HEIGHT = 48;
/** The Block & Report frame's reason box. */
const BLOCK_REASON_HEIGHT = 200;
const OFFER_THUMB = 72;

function SheetTitle({ title }: { title: string }) {
  return (
    <View
      style={{
        height: MIN_TOUCH_TARGET,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text accessibilityRole="header" fontSize="text-base" fontWeight="font-bold">
        {title}
      </Text>
    </View>
  );
}

function OfferProduct({
  product,
  getImageSource,
}: {
  product?: BackendProduct | null;
  getImageSource: (uri?: string | null) => any;
}) {
  return (
    <View
      style={{
        marginTop: 16,
        paddingHorizontal: SCREEN_GUTTER,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
      }}
    >
      <Image
        source={getImageSource(product?.cover_image)}
        style={{
          width: OFFER_THUMB,
          height: OFFER_THUMB,
          borderRadius: radius.button,
        }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1}>
          {product?.title}
        </Text>
        <Text fontSize="text-sm" tone="body" numberOfLines={1}>
          {product?.location}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {Number.isFinite(Number(product?.rate))
              ? `₹${Number(product?.rate).toFixed(0)}`
              : "—"}
          </Text>
          <Text fontSize="text-sm" tone="dim">
            per day
          </Text>
        </View>
      </View>
    </View>
  );
}

function OfferAmount({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { color } = useTheme();
  return (
    <View style={{ marginTop: 48, paddingHorizontal: SCREEN_GUTTER, gap: 16 }}>
      <Text fontSize="text-md" fontWeight="font-bold">
        {label}
      </Text>
      <View
        style={{
          height: OFFER_FIELD_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          borderRadius: radius.button,
          borderWidth: 1,
          // On the sheet's own surface a hairline vanishes in dark (1.3:1).
          borderColor: color.inputLine,
          backgroundColor: color.surface,
        }}
      >
        <Text fontSize="text-md">₹</Text>
        <TextInput
          keyboardType="number-pad"
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={color.placeholder}
          value={value}
          onChangeText={onChangeText}
          style={{
            flex: 1,
            padding: 0,
            fontFamily: fontFamily.regular,
            fontSize: fontSize.md,
            color: color.text,
          }}
        />
      </View>
    </View>
  );
}

/** The frame's inactive action is bare tertiary text; it becomes the primary button once it can be used. */
function SheetAction({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <View style={{ marginTop: 32, paddingHorizontal: SCREEN_GUTTER }}>
      {disabled ? (
        <View
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={label}
          style={{
            height: MIN_TOUCH_TARGET,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fontSize="text-sm" fontWeight="font-bold" style={{ color: color.textDim }}>
            {label}
          </Text>
        </View>
      ) : (
        <Button onPress={onPress}>{label}</Button>
      )}
    </View>
  );
}

export default function ChatDetailsScreen() {
  const router = useRoute<RouteProps<"ChatDetails">>();
  const { id: conversationId } = router.params;
  const bottomSheetRef = useRef<any>(null);
  const { theme, userDetails, authTokens } = useGlobalContext();
  const isDark = theme === "dark";
  const { color, shadow } = useTheme();
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
  // Covers the beat before the participant's name/photo resolve — the header
  // used to show an anonymous glyph with no name and nothing masking the gap.
  const [headerLoading, setHeaderLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
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
    try {
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
    } finally {
      setHeaderLoading(false);
    }
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
            backgroundColor: color.brandWash,
            borderRadius: radius.group, // Circular shape
          },
          text: {
            // brandText, not the brand fill: the fill is 3.3:1 on the dark sheet.
            color: color.brandText,
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
    setBlocking(true);
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
      setBlocking(false);
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
          loading={headerLoading}
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
          // The frame's rhythm: 16 above the first message and below the last,
          // 16 between every pair. It is a `gap` and not a per-bubble margin
          // because a day chip counts as a message for spacing purposes.
          contentContainerStyle={{
            flexGrow: 1,
            paddingVertical: 16,
            gap: 16,
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
            // sender within the same minute keeps its time. The run no longer
            // tightens the gap as well: the Figma thread draws a flat 16
            // between every pair of bubbles, whoever sent them.
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
                  // No padding of its own — the list's 16pt gap already sits on
                  // both sides of the chip.
                  <View style={{ alignItems: "center" }}>
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
        snapPoints={["52%"]}
        frame
        isDark={isDark}
        onDismiss={() => setBlockReason("")}
      >
        <SheetTitle title="Block & Report" />

        {/* The frame's 200pt box: radius 16, hairline, 16 padding, placeholder
            "Share your thoughts...". The value is controlled now (it was not, so
            the reason typed before a Cancel came back on the next open). */}
        <TextInput
          value={blockReason}
          onChangeText={setBlockReason}
          placeholder="Share your thoughts..."
          placeholderTextColor={color.placeholder}
          multiline
          accessibilityLabel="Reason for blocking and reporting"
          style={{
            height: BLOCK_REASON_HEIGHT,
            marginTop: 16,
            marginHorizontal: SCREEN_GUTTER,
            padding: 16,
            textAlignVertical: "top",
            borderWidth: 1,
            borderColor: color.line,
            borderRadius: radius.card,
            color: color.text,
            fontFamily: fontFamily.regular,
            fontSize: fontSize.md,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 32,
            marginBottom: 16,
            paddingHorizontal: SCREEN_GUTTER,
          }}
        >
          <View style={{ flex: 1 }}>
            <Button
              variant="outline"
              onPress={() => {
                setBlockReason("");
                bottomSheetRef.current?.close();
              }}
            >
              Cancel
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="warning"
              onPress={handleBlockPress}
              disabled={!blockReason.trim()}
              loading={blocking}
            >
              Block & Report
            </Button>
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
                style={shadow}
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
        frame
        isDark={isDark}
      >
        <SheetTitle title="Check Availability" />
        <OfferProduct product={selectedProduct} getImageSource={getImageSource} />

        {/* The frame draws the calendar as a hairline card with its month row
            closed by a rule. */}
        <View
          style={{
            marginTop: 24,
            marginHorizontal: SCREEN_GUTTER,
            borderWidth: 1,
            borderColor: color.line,
            borderRadius: radius.card,
            overflow: "hidden",
          }}
        >
          <Calendar
            theme={{
              calendarBackground: color.surface,
              textSectionTitleColor: color.textBody,
              dayTextColor: color.text,
              todayTextColor: color.brandText,
              textDisabledColor: color.textDim,
              monthTextColor: color.text,
              arrowColor: color.text,
              textDayFontFamily: fontFamily.regular,
              textMonthFontFamily: fontFamily.bold,
              textDayHeaderFontFamily: fontFamily.regular,
              textDayFontSize: fontSize.md,
              textMonthFontSize: fontSize.md,
              textDayHeaderFontSize: fontSize.xs,
              // @ts-ignore — the library's stylesheet override key
              "stylesheet.calendar.header": {
                header: {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingBottom: 12,
                  marginBottom: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: color.line,
                },
              },
            }}
            markingType="custom"
            // Local today, not UTC: an availability check for a past date is
            // meaningless (the shared range picker guards this the same way).
            minDate={moment().format("YYYY-MM-DD")}
            markedDates={{
              [selectedRange.startDate]: {
                customStyles: {
                  container: {
                    backgroundColor: color.brand,
                    borderRadius: radius.group,
                  },
                  text: { color: color.onBrand },
                },
              },
              [selectedRange.endDate]: {
                customStyles: {
                  container: {
                    backgroundColor: color.brand,
                    borderRadius: radius.group,
                  },
                  text: { color: color.onBrand },
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

        <SheetAction
          label="Confirm"
          disabled={!selectedRange.startDate || !selectedRange.endDate}
          onPress={onDateSelect}
        />
      </CustomBottomSheetModal>

      <CustomBottomSheetModal
        ref={makeOfferBottomSheetRef}
        snapPoints={["90%"]}
        frame
        isDark={isDark}
      >
        <KeyboardAwareScrollView>
          <SheetTitle title="Make Offer" />
          <OfferProduct product={selectedProduct} getImageSource={getImageSource} />

          <View
            style={{
              marginTop: 40,
              paddingHorizontal: SCREEN_GUTTER,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text fontWeight="font-bold" fontSize="text-md">
              Duration
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit dates"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => {
                makeOfferBottomSheetRef.current?.close();
                checkAvailabilityBottomSheetRef.current?.present();
              }}
            >
              <PencilSquareIcon size={20} color={color.brandText} />
            </TouchableOpacity>
          </View>

          <View
            style={{
              marginTop: 16,
              paddingHorizontal: SCREEN_GUTTER,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {[selectedRange.startDate, selectedRange.endDate].map((day, index) => (
              <React.Fragment key={index}>
                {index === 1 ? (
                  <Text fontSize="text-base" tone="dim">
                    --
                  </Text>
                ) : null}
                <View
                  style={{
                    flex: 1,
                    height: OFFER_FIELD_HEIGHT,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    borderRadius: radius.button,
                    borderWidth: 1,
                    borderColor: color.inputLine,
                    backgroundColor: color.surface,
                  }}
                >
                  <CalendarIcon size={24} color={color.text} />
                  <Text fontSize="text-md">{formatDate(new Date(day))}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <View
            style={{
              marginTop: 12,
              paddingHorizontal: SCREEN_GUTTER,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <InformationCircleIcon size={20} color={color.textDim} />
            <Text fontSize="text-sm" tone="dim">
              Booking for{" "}
              {getDaysBetweenDates(
                selectedRange.startDate,
                selectedRange.endDate
              )}{" "}
              days
            </Text>
          </View>

          <OfferAmount
            label="Amount"
            placeholder="e.g. 900"
            value={makeOfferDetails.amount}
            onChangeText={(value) => handleTextChange("amount", value)}
          />
          <OfferAmount
            label="Security Deposit"
            placeholder="e.g. 4000"
            value={makeOfferDetails.securityDeposit}
            onChangeText={(value) => handleTextChange("securityDeposit", value)}
          />

          <SheetAction
            label="Make an offer"
            onPress={onSubmit}
            disabled={
              !makeOfferDetails.amount || !makeOfferDetails.securityDeposit
            }
          />
        </KeyboardAwareScrollView>
      </CustomBottomSheetModal>

    </StaticContainer>
  );
}
