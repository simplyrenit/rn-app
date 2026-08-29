import { usePost } from "@/backend/post";
import { Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { DarkIcon, LightIcon } from "@/icons/logo";
import { useTypedNavigation } from "@/lib/types";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Dimensions } from "react-native";
import { successFeedback } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { ink } from "@/lib/design-tokens";

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
        toast.success("Your product will go live & will be visible to others in 24 hours.");
        clearDetails();

        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screenName: 'Profile' } }, { name: "myProducts" }],
        });
      } else {
        toast.error("There was an error posting your product");
        navigation.goBack()
      }
      setIsPosting(false);
    } catch (e: any) {
      const validationError = e.response?.data?.images?.[0];
      console.error("Product post failed:", e.response?.data ?? e.message);
      toast.error(validationError ?? "There was an error posting your product");
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
          <DarkIcon size={60} color={ink.dim(true)} />
        ) : (
          <LightIcon size={60} color={ink.dim(false)} />
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
          className={`mt-3 text-center ${isDark ? "text-muted-dark" : "text-muted-light"
            }`}
        >
          This may take a few minutes...
        </Text>
      </View>
    </NonScrollableContainer>
  );
}
