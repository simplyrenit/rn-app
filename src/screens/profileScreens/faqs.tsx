import { BackButton, Text } from "@/components/core";
import Accordion from "@/components/core/accordion";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { Dimensions, ScrollView, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { ink, colors, MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const { height } = Dimensions.get("window");

interface FAQProps {}

const FAQScreen: React.FC<FAQProps> = () => {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const router = useTypedNavigation();

  const accordionData = [
    {
      // Used to open with website instructions and a "Sign up" control that
      // does not exist in the app — there are three "Continue with" buttons.
      question: "How do I sign up for Renit?",
      answer: `Open the Renit app and tap the profile icon in the bottom tab bar.

Choose ‘Continue with Google’, ‘Continue with Apple’, or ‘Continue with email’, then follow the prompts to finish creating your account.`,
    },
    {
      question: "How to effectively use Renit?",
      answer: `There are two ways to use Renit effectively.

As an owner: list any resources or products you have sitting idle instead of depreciating in a closet — it’s income you’re currently leaving on the table.

As a renter: use the search bar on the Home tab to find anything, anywhere, or browse by category. Sort and filter results by price, rating, condition, or proximity to narrow things down.

Once you find a product, check its availability, read the details, and tap ‘Chat with owner’ if you have questions or want to make a rental request.

Renit connects renters directly with owners, so contacting the owner is currently the only way to arrange a rental.`,
    },
    {
      question: "How to upload and post products?",
      answer: `Log in and go to the ‘Post’ tab.

Provide detailed information about your product, including photos, description, rental price, availability, and condition. High-quality photos from multiple angles help attract more renters.

Review your listing carefully, then publish it to make it live.`,
    },
    {
      question: "Can I set my own rental price?",
      answer:
        "Yes, as an owner, you can set your own rental price and the refundable deposit you’re looking to charge for your product. We suggest thoroughly considering the product’s condition, market demand, and competitive prices on Renit when determining your price.",
    },
    {
      question: "Can I rent products outside my local area?",
      answer:
        "Yes, you can both rent in or rent out products in other locations, pretty much anywhere.",
    },
    {
      question: "Do I need to upload my credit card/bank details?",
      answer:
        "No, currently Renit is a rental marketplace that directly connects the users with the product owners and does not facilitate any monetary transactions.",
    },
    {
      question: "How do I ensure the safety of my rental products?",
      answer:
        "In order to ensure security of your products, Renit has various ratings, reviews, and screening mechanisms in place. However, one must note that currently, Renit is a rental marketplace that directly connects the users with the product owners. So, it cannot be held liable for any grievances or damages.",
    },
    {
      question: "How do I report my issues?",
      answer:
        "If you encounter any issues, you can report them through the ‘Feedback & Review’ section of the app. You can also contact our customer support team by dropping an email at support@simplyrenit.com or calling at +91-7014230599 for assistance.",
    },
    {
      question: "Are you currently hiring?",
      answer:
        "We are always looking for exceptional dreamers, doers, operators, engineers, designers & builders. If you’re interested in joining Renit, drop us an email at garvit@simplyrenit.com",
    },
    {
      question: "Are you looking for investments?",
      answer:
        "Yes, achieving the longer vision of Renit requires significant risk capital with idea meritocracy driven capital allocation. If you deeply believe in Renit’s vision of ‘enabling everyone to access anything’ and would like to join Renit as a long-term partner, drop us an email at garvit@simplyrenit.com",
    },
  ];

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <View className="flex-row items-center px-gutter pb-2 pt-2">
        <BackButton />
        <View className="flex-1 items-center justify-center">
          <Text role="sectionTitle" fontWeight="font-bold">
            FAQs
          </Text>
        </View>
        <View style={{ width: MIN_TOUCH_TARGET }} />
      </View>

      <ScrollView
        className="px-gutter flex-1 pt-2"
        contentContainerStyle={{ paddingBottom: hp("5%") }}
      >
        <View>
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
          >
            You’ve got questions, we’ve got answers
          </Text>
        </View>
        <View className="py-5">
          {accordionData.map((item, index) => (
            <Accordion
              key={index}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </View>

        <View className="pb-3">
          <Text
            fontSize="text-sm"
            className={`${
              isDarkMode ? "text-subtle-dark" : "text-subtle-light"
            }`}
          >
            Have any more questions?
          </Text>
          <View className="flex-row items-center mt-1">
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
            >
              Email us at
            </Text>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              className="text-brand mx-1"
            >
              support@simplyrenit.com
            </Text>
            <View className="mt-1">
              <ChevronRightIcon
                size={14}
                color={colors.dark.brand}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default FAQScreen;
