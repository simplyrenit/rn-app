import { Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import moment from "moment";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

interface ReviewCardProps {
  reviewText: string;
  reviewerName: string;
  reviewDate: string;
  reviewerImage: string;
  size?: number;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  reviewText,
  reviewerName,
  reviewDate,
  reviewerImage,
  size,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <View
      style={styles.Shadow}
      className={`mb-4 p-4  border ${
        isDarkMode ? "bg-black border-[#292929]" : "bg-white border-[#E6E6E6]"
      } rounded-[16px] shadow-sm ${
        size ? `w-[${size}%]` : "w-[285px]"
      } h-52 justify-between`}
    >
      <View className="flex-1 ">
        <Text fontSize="text-sm" className="b-2 ">
          {isExpanded ? reviewText : `${reviewText.slice(0, 100)}...`}
        </Text>
        {reviewText.length > 100 && (
          <TouchableOpacity onPress={toggleExpand}>
            <Text fontWeight="font-bold" className="mt-2 underline">
              {isExpanded ? "Show less" : "Show more"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="flex-row items-center h-1/4">
        <Image
          source={{
            uri:
              reviewerImage ||
              "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
          }}
          className="w-12 h-12 rounded-full mr-2"
        />
        <View>
          <Text fontWeight="font-bold">{reviewerName}</Text>
          <Text
            className={`${
              isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
            }`}
          >
            {moment(reviewDate).fromNow()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  Shadow: {
    shadowColor: "#808080",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
