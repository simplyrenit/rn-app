import { Container, StaticContainer } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import { View } from "react-native";

export function ProductsSkeleton() {
  return (
    <StaticContainer width={100}>
      <View className="h-full w-full px-4">
        <Skeleton className="h-[52%] w-[100%] rounded-lg mx-auto" />
        <View className="mt-2 space-y-3">
          <Skeleton className="h-5 w-[35%] rounded-lg " />
          <Skeleton className="h-5 w-[43%] rounded-lg " />
        </View>
      </View>
    </StaticContainer>
  );
}
