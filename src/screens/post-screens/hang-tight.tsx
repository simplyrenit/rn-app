import { usePost } from "@/backend/post";
import { Text, useReduceMotion } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { DarkIcon, LightIcon } from "@/icons/logo";
import { useTypedNavigation } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, View } from "react-native";

import { successFeedback } from "@/lib/haptics";
import { toast } from "@/lib/toast";
import { ink } from "@/lib/design-tokens";

const { height } = Dimensions.get("window");

/**
 * `postProduct()` resolves once at the end of a multi-step upload — it has no
 * fraction to report mid-flight — so this is honestly indeterminate rather
 * than a progress bar faking a percentage it doesn't have. A ring rather than
 * the OS `ActivityIndicator` so it can drop its own rotation under Reduce
 * Motion; the opacity pulse takes over instead, the same trade the skeleton
 * and press-feedback animations make — motion stops, the acknowledgement of
 * "still working" does not.
 */
function UploadSpinner({ color }: { color: string }) {
  const reduceMotion = useReduceMotion();
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      rotation.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, rotation]);

  useEffect(() => {
    if (!reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 3,
        borderColor: color,
        borderTopColor: "transparent",
        opacity: pulse,
        transform: reduceMotion
          ? undefined
          : [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
      }}
    />
  );
}

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

        {/* A still logo during a multi-second, unattended upload reads as a
            frozen screen — this is the only acknowledgement that anything is
            happening at all. */}
        <View className="mt-4">
          <UploadSpinner color={ink.brandText(isDark)} />
        </View>

        <Text
          fontSize="text-md"
          className={`mt-3 text-center ${isDark ? "text-muted-dark" : "text-muted-light"
            }`}
        >
          Uploading your photos and setting up the listing — this can take a
          few minutes on a slow connection.
        </Text>
      </View>
    </NonScrollableContainer>
  );
}
