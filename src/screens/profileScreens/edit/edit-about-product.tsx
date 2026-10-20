import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import {
  AboutProductForm,
  AboutProductValues,
  ContactPerson,
} from "@/components/post/about-product-form";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { ListingAnswer, ownerView, readPendingEdit, saveOutcome } from "@/lib/listing-edit";
import { HeldFormNotice } from "@/components/product/listing-status";
import { toastSave } from "@/lib/save-toast";
import { WORTH_PROMPT, listingPrompts } from "@/lib/listing-status";
import { parseQuantity, quantityInUseMessage } from "@/lib/list-flow/stock";
import { draftsOf, plansOf, toPlans } from "@/lib/plans";
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
  // The form starts from the listing as its owner sees it: a waiting change laid over what customers see. The server
  // compares a save with that, so a value left alone goes back as it was, and a held one is not taken out of the change.
  const listing = route.params.data;
  const data = ownerView(listing);
  const waiting = readPendingEdit(listing.pending_edit);

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
      const body = {
        title: values.productName,
        brand_name: values.brandName,
        model_name: values.modelName,
        condition: values.condition,
        description: values.productDescription,
        location: values.address,
        usage_description: values.usageDescription,
        // The form will not submit without a price for every plan picked (ENG-281).
        plans: toPlans(values.plans) ?? [],
        security_deposit: `${parseFloat(values.securityDeposit)}`,
        // The form will not submit without a valid quantity and worth.
        quantity: parseQuantity(values.quantity) ?? 1,
        worth: `${parseFloat(values.worth)}`,
        not_delivered: values.notDelivered,
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
      };
      const answer = await updateMyProductDetails(data.name, body);

      // The save may have changed nothing the customers see (the change waits, or was already so): say which.
      toastSave(saveOutcome({ before: listing as unknown as ListingAnswer, sent: body, answer: answer as unknown as ListingAnswer }));
      navigation.goBack();
    } catch (error) {
      console.error("Error updating product details:", error);
      // The previous version swallowed this: the spinner stopped, the screen
      // stayed put and nothing said the save had failed.
      const failure = apiError(error);
      if (failure?.code === "quantity_in_use") {
        // Some units are booked or blocked: the server names the day and the bookings.
        toast.error("You can't have that few in stock", {
          message: quantityInUseMessage(failure.details),
        });
        return;
      }
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
        {/* Which of these values are waiting: they are shown here, and customers still see the earlier ones. */}
        <HeldFormNotice pending={waiting} />
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
            // A dashboard draft with no price yet starts on Daily, as a new listing does.
            plans: plansOf(data).length ? draftsOf(plansOf(data)) : [{ unit: "day", price: "", min: 1 }],
            securityDeposit: data.security_deposit?.toString() || "",
            quantity: String(data.quantity ?? 1),
            // "45000.00" from the server, "45000" in the box; empty while there is none.
            worth: data.worth ? String(Number(data.worth)) : "",
            notDelivered: Boolean(data.not_delivered),
            address: data.location || "",
            coordinates: savedCoordinates,
            contactPerson: initialContactPerson,
            otherName: data.contact_name || "",
            otherPhoneNumber: savedLocalNumber,
          }}
          prompts={{
            confirmPrice: Boolean(data.rate_needs_confirming),
            needsWorth: listingPrompts(data).includes(WORTH_PROMPT),
          }}
          submitLabel="Update product"
          onSubmit={handleSubmit}
        />
      </View>
    </NonScrollableContainer>
  );
}
