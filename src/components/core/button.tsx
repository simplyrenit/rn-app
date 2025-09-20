import { useGlobalContext } from "@/context/global-context";
import { styled } from "nativewind";
import React from "react";
import {
  TouchableOpacity as RNButton,
  TouchableOpacityProps,
} from "react-native";
import { Text } from "./text";

const StyledButton = styled(RNButton);

type ButtonVariant = "primary" | "disabled" | "outline" | "warning" | "ghost";

interface Props extends TouchableOpacityProps {
  className?: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className = "",
  style,
  variant = "primary",
  disabled,
  ...props
}: Props) {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";

  const getVariantClasses = (): string => {
    if (disabled) {
      return isDarkMode
        ? "bg-[#0F0F0F] text-gray-300"
        : "bg-white text-[#292929]";
    }

    switch (variant) {
      case "primary":
        return "bg-brand-blue";
      case "outline":
        return isDarkMode
          ? "bg-[#0F0F0F] border-2 border-[#292929]"
          : "border-2 border-[#e6e6e6] bg-white";
      case "warning":
        return "bg-red-500";
      case "ghost":
        return isDarkMode ? "bg-transparent" : "bg-transparent text-black";
      default:
        return "bg-brand-blue";
    }
  };

  const variantClasses = getVariantClasses();

  return (
    <StyledButton
      className={`p-3 rounded-lg ${variantClasses} ${className}`}
      style={[{ justifyContent: 'center', alignItems: 'center' }, style]}
      disabled={disabled}
      {...props}
    >
      <Text
        fontWeight="font-bold"
        className={`text-center ${
          variantClasses.includes("text-") ? variantClasses : "text-white"
        }`}
      >
        {children}
      </Text>
    </StyledButton>
  );
}
