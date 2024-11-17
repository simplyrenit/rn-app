import { Container, StaticContainer } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import { View } from "react-native";

export function ChatSkeleton() {
  return (
    <StaticContainer width={100}>
      <View className="h-full w-full">
        <Skeleton className="h-[8%] w-full rounded-none" />
        <View className="mt-1">
          <Skeleton className="h-5/6 w-full rounded-none" />
        </View>
      </View>
    </StaticContainer>
  );
}
