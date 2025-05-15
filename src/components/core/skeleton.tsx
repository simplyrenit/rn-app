import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { styled } from "nativewind";
import { useGlobalContext } from "@/context/global-context";

// Define a styled Animated.View using NativeWind
const StyledSkeleton = styled(Animated.View);

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  color?: string;
  style?: object;
  className?: string; // NativeWind class support
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = 100,
  height = 100,
  borderRadius = 10,
  color = "#e0e0e0",
  style = {},
  className = "", // NativeWind class support
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  const interpolatedBackground = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: isDarkMode
      ? ["#2E2E2E", "#3A3A3A"] // Dark mode colors
      : ["#D4DAE3", "#F0F0F0"], // Light mode colors
  });

  return (
    <StyledSkeleton
      className={className} // Apply NativeWind classes
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: color,
        },
        {
          backgroundColor: interpolatedBackground,
        },
        style,
      ]}
    />
  );
};

export default Skeleton;
