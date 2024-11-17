import { useGlobalContext } from "@/context/global-context";
import React from "react";
import { Image, View } from "react-native";

export const SplashScreen = () => {
  const { theme } = useGlobalContext();

  if (theme === "dark")
    return <Image source={require("@/assets/splash-dark.png")} />;
  return <Image source={require("@/assets/splash-light.png")} />;
};
