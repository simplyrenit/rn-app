import { Text } from "@/components/core";
import Accordion from "@/components/core/accordion";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { Dimensions, ScrollView, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
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
      question: "How do I sign up for Renit?",
      answer: `You sign up for Renit by visiting our website (simplyrenit.com) or downloading our mobile application from Google Play Store or Apple App Store.
Using website: Click on the ‘Profile’ icon and then 'Sign up' at the top right corner of your screen and follow the prompts by filling in the required information to create an account using your email address.
Using mobile application: Click on the ‘Profile’ icon at the bottom right corner and then 'Sign up' at the top of your screen and follow the prompts by filling in the required information to create an account using your email address.
`,
    },
    {
      question: "How to effectively use Renit?",
      answer: `There are two ways to use Renit effectively:
Upload products as an owner:
Post all your additional resources or products that are currently being kept unused, are constantly depreciating; costing you significant income generation opportunity.
Find products you need:
Use the search bar at the top of the homepage to search anything, anywhere, anytime.
You can also browse through the categories.
Use sort & filters to narrow down your search & find the most suitable products for your rental requirement; you can sort or filter search results based on price, ratings, product condition, category, proximity etc.
Once you find a product, check its availability, read the details, and click on ‘chat with owner’ if you have any questions or want to make a rental request.
Note: Currently, Renit is a rental marketplace that directly connects the users with the product owners, so the only way to rent a product is to contact the owner directly.
`,
    },
    {
      question: "How to upload and post products?",
      answer: `Steps to post products:
Log in or sign up to your account and go to the 'Post' section from ‘Home Page’.
Provide detailed information about your product, including photos, description, rental price, availability, condition etc. Research shows that high-quality photos from multiple angles can help attract more renters.
Once you’ve added all the information click ‘Preview’ and ensure all the details are accurate by reviewing the entire post.
After carefully reviewing all the details, click on ‘Publish’ to post your product online and make it live.
`,
    },
    {
      question: "Can I set my own rental price?",
      answer:
        "Yes, as an owner, you can set your own rental price and the refundable deposit you’re looking to charge for your product. We suggest thoroughly considering the products’ condition, market demand, and competitive prices on Renit when determining your price.",
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
        "If you encounter any issues, you can report them through the 'Feedback & Review' section on our website or mobile application. You can also contact our customer support team by dropping an email at support@simplyrenit.com or calling at +91-7014230599 for assistance.",
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
      <View className="flex-row items-center justify-between px-5 pb-2 pt-2 ">
        <TouchableOpacity
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon
            size={26}
            color={isDarkMode ? "#FFF" : "#000"}
          />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            FAQs
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <ScrollView
        className="px-5 flex-1 pt-2"
        contentContainerStyle={{ paddingBottom: hp("5%") }}
      >
        <View>
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
          >
            You've got questions, we've got answers!
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
              isDarkMode ? "text-[#ffffff80]" : "text-[#00000080]"
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
              className="text-brand-blue mx-1"
            >
              support@simplyrenit.com
            </Text>
            <View className="mt-1">
              <ChevronRightIcon
                size={14}
                color="#635be8"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </NonScrollableContainer>
  );
};

export default FAQScreen;
