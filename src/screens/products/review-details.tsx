import React from "react";
import {
  ScrollView,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Text, Button } from "@/components/core";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import moment from "moment";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { useGlobalContext } from "@/context/global-context";

type ReviewDetailsRouteParams = {
  reviewText: string;
  reviewerName: string;
  reviewDate: string;
  reviewerImage: string;
};

type ReviewDetailsRouteProp = RouteProp<
  { params: ReviewDetailsRouteParams },
  "params"
>;

const ReviewDetails: React.FC = () => {
  const route = useRoute<ReviewDetailsRouteProp>();
  const navigation = useNavigation();
  const { reviewText, reviewerName, reviewDate, reviewerImage } = route.params;
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  return (
    <View
      style={[
        styles.outerContainer,
        { backgroundColor: isDark ? "#000" : "#fff" },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconWrapper}
        >
          <ArrowLeftIcon color={isDark ? "white" : "black"} size={18} />
        </TouchableOpacity>
        <Image
          source={{
            uri:
              reviewerImage ||
              "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
          }}
          style={styles.profileImage}
        />
        <View style={styles.headerText}>
          <Text fontWeight="font-bold" fontSize="text-xl">
            {reviewerName}
          </Text>
          <Text
            fontSize="text-sm"
            style={{ color: isDark ? "#A1A1AA" : "#6B7280" }}
          >
            {moment(reviewDate).format("MMMM Do, YYYY")} (
            {moment(reviewDate).fromNow()})
          </Text>
        </View>
      </View>

      {/* Review Content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.content}>
          <Text>{reviewText}</Text>
        </View>
      </ScrollView>

      {/* Footer with Back Button */}
      <View style={styles.footer}>
        <Button variant="primary" onPress={() => navigation.goBack()}>
          Back
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: "#e6e6e6",
  },
  iconWrapper: {
    marginRight: 10,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    marginBottom: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#e6e6e6",
    backgroundColor: "transparent",
  },
});

export default ReviewDetails;
