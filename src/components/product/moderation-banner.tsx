import { Image, View } from "react-native";
import { Text } from "../core";
import { useGlobalContext } from "@/context/global-context";
import { DarkIcon, LightIcon } from "@/icons/logo";

interface ModerationBannerProps {
  moderationLabels: string[];
}

export function ModerationBanner({ moderationLabels }: ModerationBannerProps) {
  const { theme } = useGlobalContext();

  const icon =
    theme === "dark" ? <DarkIcon size={24} /> : <LightIcon size={24} />;
  return (
    <View className="bg-danger-wash-light p-5 border border-danger-light rounded-group mb-4">
      <Text fontSize="text-sm">
        Your product has been flagged internally by Renit because of
        in-appropriate content - {moderationLabels.join(", ")} etc.
      </Text>

      <View className="flex flex-row items-center mt-4 space-x-2">
        <View className="flex w-10 h-10 flex-row items-center justify-center bg-danger-wash-light rounded-full p-2">
          {icon}
        </View>
        <View className="flex flex-col">
          <Text fontSize="text-sm" fontWeight="font-bold">
            Renit
          </Text>
          <Text fontSize="text-sm" className="text-muted-light">
            9 hours ago
          </Text>
        </View>
      </View>
    </View>
  );
}
