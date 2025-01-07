import { usePost } from "@/backend/post";
import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { DarkIcon, LightIcon } from "@/icons/logo";
import { useTypedNavigation } from "@/lib/types";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import { Dimensions } from "react-native";

const { height } = Dimensions.get("window");

export default function HangTight() {
  const navigation = useTypedNavigation();
  const { clearDetails } = useProductContext();
  const { postProduct, loading } = usePost();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const [isPosting, setIsPosting] = useState(true);

  const handlePostProduct = async () => {
    try {
      const { status, data } = await postProduct();
      if (status === 201) {
        Toast.show({
          type: "customToast",
          position: "bottom",
          text1: "Your product will go live & shown to others in 24 hours.",
          text2: "success",
          visibilityTime: 4000,
          autoHide: true,
          bottomOffset: 20,
          onPress: () => {
            Toast.hide();
          },
        });
        clearDetails();

        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screenName: 'Profile' } }, { name: "myProducts" }],
        });
      } else {
        Toast.show({
          type: "customToast",
          position: "bottom",
          text1: "There was an error posting your product",
          text2: "error",
          visibilityTime: 4000,
          autoHide: true,
          bottomOffset: 20,
          onPress: () => {
            Toast.hide();
          },
        });
        navigation.goBack()
      }
      setIsPosting(false);
    } catch (e) {
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "There was an error posting your product",
        text2: "error",
        visibilityTime: 4000,
        autoHide: true,
        bottomOffset: 20,
        onPress: () => {
          Toast.hide();
        },
      });
      navigation.goBack();
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    handlePostProduct();
  }, []);

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View className="flex-1 items-center justify-center">
        {isDark ? (
          <DarkIcon size={60} color="#FFFFFF80" />
        ) : (
          <LightIcon size={60} color="#00000080" />
        )}
        <View className="mt-3 items-center justify-center">
          <Text fontSize="text-lg" fontWeight="font-bold">
            Hang tight, we are
          </Text>
          <Text fontSize="text-lg" fontWeight="font-bold">
            reviewing your product!
          </Text>
        </View>

        <Text
          fontSize="text-md"
          className={`mt-3 text-center ${isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
            }`}
        >
          This may take a few minutes...
        </Text>
      </View>
    </NonScrollableContainer>
  );
}
