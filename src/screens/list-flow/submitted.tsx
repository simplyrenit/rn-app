import { Button, Text, useReduceMotion } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { FLOW_SPRING } from "@/components/list-flow/motion";
import { ListingStatusPill } from "@/components/product/listing-status";
import { useListDraft } from "@/context/list-draft-context";
import { SCREEN_GUTTER, duration, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { CheckIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MARK = 72;
const THUMB = 56;

/** L-17 Submitted, IMPLEMENTATION.md §8.6. */
export default function ListSubmittedScreen() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"ListSubmitted">>();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const flow = useListDraft();

  const cover = route.params?.coverUrl ?? null;

  // §8.6: the draft is cleared on arrival. Preview already cleared it the
  // moment the create call succeeded; this only covers any other way here.
  useEffect(() => {
    if (flow.draft) flow.clearSubmitted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewListings = () =>
    navigation.reset({
      index: 1,
      routes: [{ name: "MainTabs", params: { screen: "Profile" } }, { name: "myProducts" }],
    });

  const listAnother = () =>
    navigation.reset({ index: 1, routes: [{ name: "MainTabs" }, { name: "ListAddPhotos" }] });

  return (
    <NonScrollableContainer>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space["2xl"],
          gap: space.lg,
        }}
      >
        <Animated.View
          entering={
            reduceMotion
              ? FadeIn.duration(duration.fast)
              : ZoomIn.springify().damping(FLOW_SPRING.damping).stiffness(FLOW_SPRING.stiffness)
          }
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: MARK,
            height: MARK,
            borderRadius: radius.full,
            backgroundColor: color.brand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckIcon size={36} color={color.onBrand} strokeWidth={2.5} />
        </Animated.View>

        <View style={{ gap: space.sm }}>
          <Text fontSize="text-xl" fontWeight="font-bold" accessibilityRole="header">
            {"Submitted.\nIt's with our team now."}
          </Text>
          <Text tone="body" fontSize="text-md">
            We check every new listing before renters can see it. Until then it sits in My listings as{" "}
            <Text fontSize="text-md" fontWeight="font-bold">
              Pending review
            </Text>
            , and you can still edit it.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            padding: space.md,
            borderRadius: radius.group,
            borderWidth: 1,
            borderColor: color.line,
            backgroundColor: color.surface,
          }}
        >
          <View
            style={{ width: THUMB, height: THUMB, borderRadius: radius.input, overflow: "hidden", backgroundColor: color.skeleton }}
          >
            {cover ? <Image source={{ uri: cover }} style={{ width: THUMB, height: THUMB }} contentFit="cover" /> : null}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={2}>
              {route.params?.productName}
            </Text>
            <ListingStatusPill status="pending" />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.sm,
          gap: space.sm,
        }}
      >
        <Button onPress={viewListings}>View my listings</Button>
        <Button variant="outline" onPress={listAnother}>
          List another item
        </Button>
      </View>
    </NonScrollableContainer>
  );
}
