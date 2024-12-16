import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

type Props = {};

const Rating = (props: Props) => {
  const [rating, setRating] = useState(0);

  const handleStarClick = (index: number) => {
    const newRating = index + 1;
    if (rating === newRating) {
      setRating(newRating - 0.5);
    } else if (rating === newRating - 0.5) {
      setRating(newRating - 1);
    } else {
      setRating(newRating);
    }
  };

  const getStarColor = (index: number) => {
    if (rating >= index + 1) {
      return "#FFD700"; // Full star
    } else if (rating >= index + 0.5) {
      return "#FFD70080"; // Half star
    } else {
      return "#e4e5e9"; // Empty star
    }
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {[...Array(5)].map((_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleStarClick(index)}
        >
          <Text
            style={{
              fontSize: 32,
              color: getStarColor(index),
            }}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={{ marginLeft: 10 }}>Rating: {rating}</Text>
    </View>
  );
};

export default Rating;
