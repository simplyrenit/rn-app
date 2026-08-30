import Skeleton from "@/components/core/skeleton";
import { SCREEN_GUTTER, density, radius } from "@/lib/design-tokens";
import { View } from "react-native";

/**
 * The shape of a product page, not a generic pair of bars.
 *
 * It used to render its own `StaticContainer` — a second SafeAreaView and a
 * second `<StatusBar>` competing for the bar — plus a 52%-height block that
 * matched nothing on the screen it stood in for, so the swap to real content
 * moved everything. It is now a plain block inside the detail screen's own
 * scroll view, on the same square hero and the same section rhythm, so the
 * cross-fade lands rather than jumps.
 */
export function ProductsSkeleton() {
  return (
    <View style={{ width: "100%" }}>
      <View style={{ width: "100%", aspectRatio: 1 }}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
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
