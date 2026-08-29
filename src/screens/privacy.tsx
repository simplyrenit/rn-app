import { StaticContainer, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { PRIVACY_CONTENT } from "@/lib/content";
import { useNavigation } from "@react-navigation/native";

import { styled } from "nativewind";
import {
  ScrollView,
  TouchableOpacity,
  View,
  Text as RNT,
  Platform,
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ink } from "@/lib/design-tokens";

const StyledScroll = styled(ScrollView);

export default function Privacy() {
  const { theme } = useGlobalContext();
  const insets = useSafeAreaInsets();

  const isDarkMode = theme === "dark";

  const router = useNavigation();

  return (
    <NonScrollableContainer>
      <View className="flex-row items-center justify-between px-gutter pb-2 mt-2 ">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => router.goBack()}
          className="flex-1 items-start w-[10%]"
        >
          <ArrowLeftIcon
            size={26}
            color={ink.text(isDarkMode)}
          />
        </TouchableOpacity>
        <View className="items-center justify-center w-[80%]">
          <Text
            fontSize="text-xl"
            fontWeight="font-bold"
          >
            Privacy Policy
          </Text>
        </View>

        <View className="w-[10%]"></View>
      </View>

      <View
        className="flex-1 justify-between"
        style={{ paddingBottom: insets.bottom }}
      >
        {/* <StaticContainer> */}
        <StyledScroll
          className="space-y-5 h-[100%] mx-4 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <RNT
            style={{
              fontStyle: "italic",
              fontWeight: "600",
              color: ink.text(isDarkMode),
            }}
          >
            {PRIVACY_CONTENT.effectiveDate}
          </RNT>
          <Text className="">{PRIVACY_CONTENT.intro}</Text>

          <View>
            <Text fontWeight="font-bold">1. Information We Collect</Text>
            <Text className="">
              {PRIVACY_CONTENT.informationWeCollect.personalData}
            </Text>
            <Text className="">
              {PRIVACY_CONTENT.informationWeCollect.nonPersonalInformation}
            </Text>
          </View>

          <View>
            <Text fontWeight="font-bold">2. Use of Information</Text>
            <Text className="">
              {PRIVACY_CONTENT.useOfInformation.personalData}
            </Text>
            <Text className="">
              {PRIVACY_CONTENT.useOfInformation.nonPersonalInformation}
            </Text>
          </View>

          <View>
            <Text fontWeight="font-bold">3. Sharing of Information</Text>
            <Text className="">
              {PRIVACY_CONTENT.sharingOfInformation.serviceProviders}
            </Text>
            <Text className="">
              {PRIVACY_CONTENT.sharingOfInformation.legalRequirements}
            </Text>
            <Text className="">
              {PRIVACY_CONTENT.sharingOfInformation.affiliates}
            </Text>
            <Text className="">
              {PRIVACY_CONTENT.sharingOfInformation.businessTransfers}
            </Text>
          </View>

          <View>
            <Text fontWeight="font-bold">4. Data Security</Text>
            <Text className="">{PRIVACY_CONTENT.dataSecurity}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">5. Your Rights</Text>
            <Text className="">{PRIVACY_CONTENT.otherGeneralRights}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">6. Children's Privacy</Text>
            <Text className="">{PRIVACY_CONTENT.childrensPrivacy}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">7. Changes to the Privacy Policy</Text>
            <Text className="">{PRIVACY_CONTENT.changesToPolicy}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">8. Contact Us</Text>
            <Text className="">{PRIVACY_CONTENT.contactUs}</Text>
          </View>

          <View>
            <Text fontWeight="font-bold">9. Grievance Redressal Officer</Text>
            <Text className="">
              Name: {PRIVACY_CONTENT.grievanceRedressalOfficer.name}
            </Text>
            <Text className="">
              Email: {PRIVACY_CONTENT.grievanceRedressalOfficer.email}
            </Text>
            <Text className="">
              Address: {PRIVACY_CONTENT.grievanceRedressalOfficer.address}
            </Text>
            <Text></Text>
          </View>
        </StyledScroll>
      </View>
    </NonScrollableContainer>
  );
}
