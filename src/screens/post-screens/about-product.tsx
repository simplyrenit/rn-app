import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import {
  AboutProductForm,
  AboutProductValues,
} from "@/components/post/about-product-form";
import { PostProductHeader } from "@/components/post/header";
import { useProductContext } from "@/context/product-context";
import { space } from "@/lib/design-tokens";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";

/**
 * Step 3 of the post flow.
 *
 * The form itself is shared with "Edit product details"; this screen owns the
 * step header, where the answers go (the product context) and where the
 * customer goes next.
 */
export default function AboutProduct() {
  const navigation = useTypedNavigation();
  const { saveDetails } = useProductContext();
  const { getMyDetails } = useProfile();

  // Only ever read when the customer answers "Me" to the contact question.
  const [owner, setOwner] = useState({ name: "", phone: "" });

  useEffect(() => {
    let cancelled = false;

    const fetchMyDetails = async () => {
      try {
        const details = await getMyDetails();
        if (cancelled) return;
        setOwner({
          name: `${details.first_name} ${details.last_name}`,
          phone: details.phone,
        });
      } catch {
        // Read only if they answer "Me" to the contact question, and they
        // cannot reach the button without answering it — not worth an error
        // in front of a half-filled form.
      }
    };

    fetchMyDetails();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (values: AboutProductValues) => {
    saveDetails({
      name: values.productName,
      brandName: values.brandName,
      modelName: values.modelName,
      condition: values.condition,
      productDescription: values.productDescription,
      usageDescription: values.usageDescription,
      location: {
        lat: values.coordinates?.lat ?? 0,
        long: values.coordinates?.long ?? 0,
      },
      pricePerDay: values.pricePerDay,
      securityDeposit: values.securityDeposit,
      personOfContact: {
        name: values.contactPerson === "Owner" ? owner.name : values.otherName,
        phoneNumber:
          values.contactPerson === "Owner"
            ? owner.phone
            : values.otherPhoneNumber,
      },
      address: values.address || values.locationName || "",
    });

    navigation.navigate("ProductImages");
  };

  return (
    <NonScrollableContainer>
      <PostProductHeader
        heading="Tell us about your product"
        step={3}
        showBackArrow
      />

      {/*
        The iOS branch used to drop flex-1 here and pin a percentage of screen
        width as bottom padding, so the scroll container never reserved room for
        the home indicator and the primary CTA was clipped through the middle of
        its label with no way to scroll it into view. flex-1 on both platforms,
        and the reserved space comes from the measured safe-area inset.
      */}
      <View className="flex-1 justify-between">
        <AboutProductForm
          submitLabel="Next"
          submitAccessory={(color) => (
            <ChevronRightIcon
              size={16}
              color={color}
              style={{ marginLeft: space.xs }}
            />
          )}
          onSubmit={handleSubmit}
        />
      </View>
    </NonScrollableContainer>
  );
}
