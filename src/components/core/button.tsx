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

  // Container and label styling are kept apart on purpose. They used to share
  // one class string, so the label inherited the container's background and an
  // outline button in light mode rendered white text on a white background.
  const getVariantStyles = (): { container: string; label: string } => {
    if (disabled) {
      // A muted fill rather than the page background, so a disabled button
      // still reads as a button instead of loose text.
      return isDarkMode
        ? { container: "bg-[#292929]", label: "text-[#FFFFFF80]" }
        : { container: "bg-[#E6E6E6]", label: "text-[#00000080]" };
    }

    switch (variant) {
      case "primary":
        return { container: "bg-brand-blue", label: "text-white" };
      case "outline":
        return isDarkMode
          ? {
              container: "bg-[#0F0F0F] border-2 border-[#292929]",
              label: "text-white",
            }
          : {
              container: "border-2 border-[#e6e6e6] bg-white",
              label: "text-[#292929]",
            };
      case "warning":
        return { container: "bg-red-500", label: "text-white" };
      case "ghost":
        return isDarkMode
          ? { container: "bg-transparent", label: "text-white" }
          : { container: "bg-transparent", label: "text-black" };
      default:
        return { container: "bg-brand-blue", label: "text-white" };
    }
  };

  const { container, label } = getVariantStyles();

  return (
    <StyledButton
      className={`p-3 rounded-lg ${container} ${className}`}
      style={style}
      disabled={disabled}
      {...props}
    >
      <Text fontWeight="font-bold" className={`text-center ${label}`}>
        {children}
      </Text>
    </StyledButton>
  );
}
