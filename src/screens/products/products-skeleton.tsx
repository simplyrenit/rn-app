import Skeleton from "@/components/core/skeleton";
import { SCREEN_GUTTER, density, radius } from "@/lib/design-tokens";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The shape of a product page, not a generic pair of bars.
 *
 * It used to render its own `StaticContainer` — a second SafeAreaView and a
 * second `<StatusBar>` competing for the bar — plus a 52%-height block that
 * matched nothing on the screen it stood in for, so the swap to real content
 * moved everything. It is now a plain block inside the detail screen's own
 * scroll view, standing in for the same contained hero and the same section
 * rhythm, so the cross-fade lands rather than jumps.
 */
export function ProductsSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ width: "100%" }}>
      {/* The hero's own geometry: its controls row and the photo box inside a
          382pt block below the status bar. */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingHorizontal: SCREEN_GUTTER,
          gap: 16,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Skeleton width={44} height={44} borderRadius={radius.full} />
          <Skeleton width={44} height={44} borderRadius={radius.full} />
        </View>
        <Skeleton width="62%" height={270} borderRadius={radius.card} />
        <Skeleton width={132} height={4} borderRadius={radius.full} />
      </View>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingVertical: density.section,
          gap: 10,
        }}
      >
        <Skeleton width="62%" height={26} borderRadius={radius.button} />
        <Skeleton width="34%" height={16} borderRadius={radius.button} />
      </View>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: density.section,
          gap: 10,
        }}
      >
        <Skeleton width="88%" height={16} borderRadius={radius.button} />
        <Skeleton width="76%" height={16} borderRadius={radius.button} />
        <Skeleton width="54%" height={16} borderRadius={radius.button} />
      </View>
    </View>
  );
}
