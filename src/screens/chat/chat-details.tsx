import { useSubscribeToMessages } from "@/backend/messages";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { Button, StaticContainer, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { BackendProduct, Conversation, RouteProps } from "@/lib/types";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import moment from "moment";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
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
import { doc, onSnapshot } from "@react-native-firebase/firestore";
import { firestore } from "@/lib/config";
import useOwner from "@/backend/owner";
import { useSocket } from "@/services/socket";

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

export default function ChatDetailsScreen() {
  const router = useRoute<RouteProps<"ChatDetails">>();
  const { id: conversationId } = router.params;
  const bottomSheetRef = useRef<any>(null);
  const { theme, userDetails } = useGlobalContext();
  const isDark = theme === "dark";
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

  const {
    readChat,
    getParticipantDetails,
    makeOffer,
    getMyDetails,
    blockUser,
    unblockUser,
    isBlocked: isChatBlocked,
  } = useChat();

  const {
    messages: m,
    loading: l,
    error,
  } = useSubscribeToMessages(conversationId);

  const { connect, joinRoom, leaveRoom, onNewMessage, onTyping } = useSocket();
  const [isTyping, setIsTyping] = useState(false);

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
    const conversationRef = doc(firestore, "conversations", conversationId);

    const unsubscribe = onSnapshot(conversationRef, (docSnapshot) => {
      if (docSnapshot.exists) {
        const conversationData = docSnapshot.data() as Conversation;

        setIsBlocked(conversationData.blockStatus.isBlocked);
        setBlockedBy(conversationData.blockStatus.initiatedBy);
      }
    });

    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    fetchDetails();
  }, []);

  useEffect(() => {
    const socket = connect(participantDetails.userId);

    if (socket && conversationId) {
      joinRoom(conversationId);

      // Listen for new messages
      onNewMessage((newMessage) => {
        // Update messages state
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });

      // Listen for typing status
      onTyping(({ userId, isTyping }) => {
        if (userId !== userDetails?.username) {
          setIsTyping(isTyping);
        }
      });
    }

    return () => {
      if (conversationId) {
        leaveRoom(conversationId);
      }
    };
  }, [conversationId, userDetails?.username, participantDetails.userId]);

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
            backgroundColor: isDark ? "#201E4D" : "#EDEDFC",
            borderRadius: 15, // Circular shape
          },
          text: {
            color: "#635be8",
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
    await blockUser(participantDetails.userId, blockReason, conversationId);
    setIsBlocked(true);
    setBlockReason("");
    bottomSheetRef.current?.close();
  };

  const handleUnblockPress = async () => {
    await unblockUser(conversationId);
    setIsBlocked(false);
  };

  return (
    <StaticContainer width={100}>
      <KeyboardAwareScrollView
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
        />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-end',
          }}
          keyboardShouldPersistTaps="handled"
          // onContentSizeChange={() => scrollToBottom(false)}
          // onLayout={() => scrollToBottom(false)}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={(contentWidth, contentHeight) => {	
            requestAnimationFrame(() => {	
              scrollViewRef.current?.scrollTo({	
                y: contentHeight,	
                animated: false,	
              });	
            });	
          }}
        >
          {m?.map((message) => (
            <ChatBubble
              id={message.id || ""}
              key={message.id}
              // message={message.message}
              // @ts-ignore
              message={message.message!}
              isSent={message.from === userDetails?.username}
              type={message.type}
            />
          ))}
        </ScrollView>

        {isBlocked && (
          <>
            {blockedBy === userDetails?.username ? (
              <View className="flex-row space-x-1 items-center justify-center mb-5">
                <Text
                  fontSize="text-sm"
                  fontWeight="font-semibold"
                  className={`uppercase ${
                    isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                  }`}
                >
                  {participantDetails.username} Blocked
                </Text>
                <Text
                  fontSize="text-sm"
                  fontWeight="font-bold"
                  className={`uppercase ${
                    isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                  }`}
                >
                  -
                </Text>
                <TouchableOpacity onPress={handleUnblockPress}>
                  <Text
                    fontSize="text-sm"
                    fontWeight="font-bold"
                    className={`text-brand-blue`}
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
                    isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                  }`}
                >
                  This conversation cannot be continued
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: "10%" }}>
          <ChatInput
            conversationId={conversationId}
            onMakeOfferPress={onSelectProductPress}
            isBlocked={isBlocked}
            participantDetails={participantDetails}
          />
        </View>
      </KeyboardAwareScrollView>

      <CustomBottomSheetModal
        ref={bottomSheetRef}
        snapPoints={Platform.OS === 'ios' ? ["60%"] : undefined}
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
                ? "border-[#292929] text-white"
                : "border-[#e6e6e6] text-black"
            } rounded-xl p-3 text-base`}
            placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
          />

          <View className="flex-row justify-between mt-6 mb-0">
            <TouchableOpacity
              onPress={() => bottomSheetRef.current?.close()}
              className={`bg-white border ${
                isDark
                  ? "border-[#292929] text-white"
                  : "border-[#e6e6e6] text-black"
              } p-3 rounded-[11px] flex-1 mr-2`}
            >
              <Text
                className="text-center text-black"
                fontWeight="font-bold"
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-[#E50914] p-3 rounded-[11px] flex-1 ml-2"
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
    //  className="rounded-xl"
       backgroundStyle={{
         backgroundColor: isDark ? "black" : "white",
        //  borderTopLeftRadius: 26,
        //  borderTopRightRadius: 26,
         //overflow: "hidden", // Ensures proper rounded edges
       }}
       handleIndicatorStyle={{
         backgroundColor: isDark ? "#fff" : "#000",
         width: 50,
         borderRadius: 50,
         padding: 2,
       }}
       ref={selectProductBottomSheetRef}
       snapPoints={["90%"]}
       backdropComponent={renderBackdrop}
       handleStyle={{
         borderTopWidth: 2,
         borderLeftWidth: 2,
         borderRightWidth: 2,
         borderTopColor: isDark ? "#292929" : "#fff",
         borderLeftColor: isDark ? "#292929" : "#fff",
         borderRightColor: isDark ? "#292929" : "#fff",
         borderTopLeftRadius: 50,
         borderTopRightRadius: 50,
//          shadowColor: "#A9A9A9", // Grey shadow
//            shadowOffset: { width: 10, height: 12 },
//             // elevation: 5, // Adds depth effect
//              shadowOpacity: 0.5, // Shadow visibility
//                shadowRadius: 4, // Shadow blur effect

       }}
     >
       <View className="w-[95%] flex-1 rounded-lg p-4 shadow-md">
         <View className="items-center mb-4 mt-4 flex-1">
           <Text
             fontWeight="font-bold"
             fontSize="text-xl"
            //  fontColor="black"
           >
             Select a Product
           </Text>

           <View className="w-full flex-1">
             <View
               className={`flex-row border items-center shadow-lg ${
                 theme === "dark"
                   ? "bg-[#0F0F0F] border-[#292929]"
                   : "bg-white border-[#E6E6E6]"
               } rounded-xl p-2 mt-4 w-[90%] self-center mb-3 h-12`}
               style={styles.Shadow}
             >
               <View className="w-[10%] h-full items-center justify-center">
                 <MagnifyingGlassIcon
                   size={24}
                   color={theme === "dark" ? "#ffffff70" : "#00000070"}
                 />
               </View>
               <View className="w-[80%] flex flex-row h-full ml-2">
                 <TextInput
                   placeholder="Search "
                   placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
                   className={`${isDark ? "text-white" : "text-black"}`}
                   value={search}
                   onChangeText={onSearchChange}
                 />
               </View>
             </View>

             <ScrollView
               className="w-[90%] self-center flex-1"
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
                       source={{ uri: product.cover_image }}
                       style={{ width: 50, height: 50, borderRadius: 8 }}
                     />
                     <Text className="ml-4">{product.title}</Text>
                   </View>
                   <ChevronRightIcon
                     size={18}
                     color={theme === "dark" ? "#ffffff70" : "#00000070"}
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
            <TouchableOpacity
              className="w-[10%]"
              onPress={() => checkAvailabilityBottomSheetRef.current?.close()}
            >
              <ChevronLeftIcon
                size={24}
                color={theme === "dark" ? "#ffffff70" : "#00000070"}
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
              source={{ uri: selectedProduct?.cover_image }}
              style={{ width: wp(20), height: wp(20), borderRadius: 8 }}
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
                  isDark ? "text-[#ffffffB2]" : "text-[#000000B2]"
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
                calendarBackground: isDark ? "#0F0F0F" : "white",
                textSectionTitleColor: isDark ? "white" : "#00000080",
                dayTextColor: isDark ? "#ffffff" : "#000",
                todayTextColor: "#00adf5",
                textDisabledColor: "#d9e1e8",
                monthTextColor: "#828282",
                arrowColor: isDark ? "#fff" : "#000",
              }}
              markingType="custom"
              markedDates={{
                [selectedRange.startDate]: {
                  customStyles: {
                    container: {
                      backgroundColor: "#635be8",
                      borderRadius: 15,
                    },
                    text: {
                      color: "white",
                    },
                  },
                },
                [selectedRange.endDate]: {
                  customStyles: {
                    container: {
                      backgroundColor: "#635be8",
                      borderRadius: 15,
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
              <TouchableOpacity
                className="w-[10%]"
                onPress={() => makeOfferBottomSheetRef.current?.close()}
              >
                <ChevronLeftIcon
                  size={24}
                  color={theme === "dark" ? "#ffffff70" : "#00000070"}
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
                source={{ uri: selectedProduct?.cover_image }}
                style={{ width: wp(20), height: wp(20), borderRadius: 8 }}
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
                    isDark ? "text-[#ffffffB2]" : "text-[#000000B2]"
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
                  className="text-[#635be8]"
                >
                  Edit
                </Text> */}
                <PencilSquareIcon
                  size={20}
                  color={"#635be8"}
                />
              </TouchableOpacity>
            </View>

            <View className="mt-4 mx-4 flex-row items-center justify-between">
              <View
                className={`p-3 h-12 rounded-[12px] border flex-row w-[40%] items-center ${
                  isDark
                    ? "bg-[#0F0F0F] border-[#292929]"
                    : "bg-white border-[#e6e6e6]"
                }`}
              >
                <CalendarIcon
                  size={24}
                  color={theme === "dark" ? "#fff" : "#000"}
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
                  className="text-[#C4C4C4]"
                >
                  --
                </Text>
              </View>
              <View
                className={`p-3 rounded-[12px] border flex-row w-[40%] items-center ${
                  isDark
                    ? "bg-[#0F0F0F] border-[#292929]"
                    : "bg-white border-[#e6e6e6]"
                }`}
              >
                <CalendarIcon
                  size={24}
                  color={theme === "dark" ? "#fff" : "#000"}
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
                color={theme === "dark" ? "#ffffff80" : "#00000080"}
              />
              <Text
                fontSize="text-md"
                className={`ml-2 ${
                  isDark ? "text-[#ffffffB2]" : "text-[#000000B2]"
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
                    ? "border-[#292929] bg-[#0F0F0F] text-white"
                    : "border-[#e6e6e6] bg-white text-black"
                } p-3 rounded-lg w-full mt-2`}
              >
                <Text
                  fontSize="text-md"
                  className="mr-2"
                >
                  ₹
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder={`"900"`}
                  placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}

                  value={makeOfferDetails.amount}
                  onChangeText={(value) => handleTextChange("amount", value)}
                  className={`${
                                      isDark ? "text-white" : "text-black"
                                    } rounded-lg w-full`}


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
                    ? "border-[#292929] bg-[#0F0F0F] text-white"
                    : "border-[#e6e6e6] bg-white text-black"
                } p-3 rounded-lg w-full mt-2`}
              >
                <Text
                  fontSize="text-md"
                  className="mr-2"
                >
                  ₹
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  placeholder={`"4000"`}
                  placeholderTextColor={isDark ? "#ffffff80" : "#00000080"}
                  value={makeOfferDetails.securityDeposit}
                  onChangeText={(value) =>
                    handleTextChange("securityDeposit", value)
                  }
                  className={`${
                    isDark ? "text-white" : "text-black"
                  } rounded-lg w-full`}
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

      <View>
        {isTyping && (
          <Text className="text-gray-500 text-sm px-4 py-2">
            {participantDetails?.username} is typing...
          </Text>
        )}
      </View>
    </StaticContainer>
  );
}

const styles = StyleSheet.create({
  Shadow: {
    shadowColor: "#808080",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
