import { Container, StaticContainer } from "@/components/core";
import Skeleton from "@/components/core/skeleton";
import { View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { radius } from "@/lib/design-tokens";

export function ChatSkeleton() {
  return (
    <StaticContainer>
      <View className="flex-row items-center mb-4 pt-4 space-x-4">
        <Skeleton style={{
          width: 16,
          borderRadius: radius.button,
          height: 10,
        }} />
        <Skeleton height={50} width={50} borderRadius={50} />
        <Skeleton width={'50%'} height={10} />
      </View>
      <FlatList showsVerticalScrollIndicator={false} style={{ width: '100%'}} data={Array.from({ length: 20 })} renderItem={({ item, index }) => (<View className="column w-full w-full">
        <Skeleton height={20} width={'60%'} borderRadius={20} />
        <Skeleton height={20} width={'60%'} borderRadius={20} style={{ alignSelf: 'flex-end', marginVertical: 24 }} />
      </View>)} />
    </StaticContainer>
  );
}
