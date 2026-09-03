import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import {
  AboutProductForm,
  AboutProductValues,
  ContactPerson,
} from "@/components/post/about-product-form";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { useGlobalContext } from "@/context/global-context";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { View } from "react-native";
import { toast } from "@/lib/toast";

/**
 * Edit an existing listing's details.
 *
 * The form is the same one the post flow uses at step 3; this screen owns the
 * pre-fill, the PATCH and the way back.
 */
export default function EditAboutProduct() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditAboutProduct">>();
  const { data } = route.params;

  const { updateMyProductDetails } = useProfile();
  const { userDetails } = useGlobalContext();

  // 0/0 is the backend's "unset", not a pin in the Gulf of Guinea.
  const savedCoordinates =
    data.coordinates && (data.coordinates.lat || data.coordinates.long)
      ? { lat: data.coordinates.lat, long: data.coordinates.long }
      : null;

  /**
   * The stored contact number, and the last ten digits of it that the form
   * edits.
   *
   * The form shows a country picker but nothing sends the dialling code, so a
   * saved "+919876543210" was read in as "9876543210" and written straight back
   * out — destroying the prefix on every save, whether or not the owner touched
   * the field. Whether the code should be sent at all is a backend question I
   * am not going to answer by guessing a format. What is fixable here without
   * guessing anything: if the number comes back unchanged, send back the exact
   * string that was stored rather than the ten digits we happened to show.
   */
  const savedContactNumber = data.contact_number || "";
  const savedLocalNumber = savedContactNumber.slice(-10);

  const contactNumberToSend = (edited: string) =>
    edited === savedLocalNumber ? savedContactNumber : edited;

  /**
   * `isOwnerContact` is optional on the product. The previous version read a
   * missing flag as "Other" and pre-selected a branch the owner never chose,
   * with two empty required fields under it; an absent flag with no contact
   * name now selects nothing, which is what the create flow starts from.
   */
  const initialContactPerson: ContactPerson | null = data.isOwnerContact
    ? "Owner"
    : data.contact_name
    ? "Other"
    : null;

  const handleSubmit = async (values: AboutProductValues) => {
    try {
      await updateMyProductDetails(data.name, {
        title: values.productName,
        brand_name: values.brandName,
        model_name: values.modelName,
        condition: values.condition,
        description: values.productDescription,
        location: values.address,
        usage_description: values.usageDescription,
        rate: `${parseFloat(values.pricePerDay)}`,
        security_deposit: `${parseFloat(values.securityDeposit)}`,
        coordinates: {
          lat: values.coordinates?.lat ?? 0,
          long: values.coordinates?.long ?? 0,
        },
        contact_name:
          values.contactPerson === "Other" ? values.otherName : userDetails?.name,
        contact_number:
          values.contactPerson === "Other"
            ? contactNumberToSend(values.otherPhoneNumber)
            : userDetails?.phone,
      });

      toast.success("Your product was updated!");
      navigation.goBack();
    } catch (error) {
      console.error("Error updating product details:", error);
      // The previous version swallowed this: the spinner stopped, the screen
      // stayed put and nothing said the save had failed.
      toast.error("We couldn't update your product", {
        message: "Check your connection and try again.",
      });
    }
  };

  return (
    <NonScrollableContainer>
      {/* The shared edit-screen row. This screen hand-rolled it inside a 40pt
          centred box, which clipped the back button below the 44pt target and
          shrink-wrapped the row so the button sat inboard of the screen edge
          instead of at it. */}
      <EditStepHeader title="Edit Product Details" />

      {/* Same defect as the create flow: the iOS branch dropped flex-1 and
          reserved a percentage of screen width, so the scroll container never
          made room for the home indicator and the CTA was clipped. */}
      <View className="flex-1 justify-between">
        <AboutProductForm
          initialValues={{
            productName: data.title || "",
            brandName: data.brand_name || "",
            modelName: data.model_name || "",
            // Stored capitalised on some rows; the select's values are lower
            // case, and a mismatch showed the placeholder over a real answer.
            condition: data.condition?.toLowerCase() || "",
            productDescription: data.description || "",
            usageDescription: data.usage_description || "",
            pricePerDay: data.rate?.toString() || "",
            securityDeposit: data.security_deposit?.toString() || "",
            address: data.location || "",
            coordinates: savedCoordinates,
            contactPerson: initialContactPerson,
            otherName: data.contact_name || "",
            otherPhoneNumber: savedLocalNumber,
          }}
          submitLabel="Update product"
          onSubmit={handleSubmit}
        />
      </View>
    </NonScrollableContainer>
  );
}
