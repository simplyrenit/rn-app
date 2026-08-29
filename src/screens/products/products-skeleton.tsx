import { Container, StaticContainer } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import { View } from "react-native";

export function ProductsSkeleton() {
  return (
    <StaticContainer width={100}>
      <View className="h-full w-full px-gutter">
        <Skeleton className="h-[52%] w-[100%] rounded-button mx-auto" />
        <View className="mt-2 space-y-3">
          <Skeleton className="h-5 w-[35%] rounded-button " />
          <Skeleton className="h-5 w-[43%] rounded-button " />
        </View>
      </View>
    </StaticContainer>
  );
}
