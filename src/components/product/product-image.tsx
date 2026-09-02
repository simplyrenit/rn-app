import { BackButton } from "@/components/core/back-button";
import { FavouriteButton } from "@/components/core/favourite-button";
import { IconButton } from "@/components/core/icon-button";
import { Text } from "@/components/core/text";
import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Carousel from "pinar";
import React, { useState } from "react";
import { Dimensions, Modal, Pressable, View } from "react-native";
import { PhotoIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  images?: string[];
  coverImage?: string | null;
  mode?: string;
  name?: string;
  isFavorite?: boolean;
  /**
   * Set false when the screen pins its own back control above the hero. A
   * button that lives inside the scroll leaves the customer with no way back
   * the moment the photo scrolls off.
   */
  showBack?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ProductImage({
  images,
  coverImage,
  mode,
  name,
  isFavorite,
  showBack = true,
}: Props) {
  const { color } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const galleryImages = Array.from(
    new Set([coverImage, ...(images ?? [])].filter(Boolean))
  ).filter((image) => !failedImages.includes(image as string)) as string[];

  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: color.canvas }}>
      {galleryImages.length ? (
        <Carousel
          style={{ height: "100%", width: SCREEN_WIDTH }}
          renderPrev={() => <></>}
          renderNext={() => <></>}
          onIndexChanged={({ index }) => setPhotoIndex(index)}
          // A page indicator that draws one dot for one photo is noise, not an
          // affordance — and on a light photograph the single 6pt white dot was
          // invisible anyway. With one image there is nothing to indicate.
          showsDots={galleryImages.length > 1}
          // Both dots used to sit unscrimmed — inactive at bg-gray-100/20,
          // active plain white — so on a light product photo neither was
          // visible and carousel position was simply unavailable.
          renderDot={() => (
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: radius.full,
                marginHorizontal: 3,
                backgroundColor: "rgba(255,255,255,0.45)",
                borderWidth: 0.5,
                borderColor: color.photoScrimSoft,
              }}
            />
          )}
          renderActiveDot={() => (
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: radius.full,
                marginHorizontal: 3,
                backgroundColor: color.onPhoto,
                borderWidth: 0.5,
                borderColor: color.photoScrimSoft,
              }}
            />
          )}
        >
          {galleryImages.map((image, index) => (
            <Pressable
              key={image}
              style={{ flex: 1 }}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${index + 1} of ${galleryImages.length}. Tap to view full screen.`}
              onPress={() => setFullImage(image)}
            >
              <Image
                source={{ uri: image }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
                onError={() =>
                  setFailedImages((current) =>
                    current.includes(image) ? current : [...current, image]
                  )
                }
              />
            </Pressable>
          ))}
        </Carousel>
      ) : (
        <View
          style={{
            height: "100%",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.skeleton,
          }}
        >
          <PhotoIcon size={48} color={color.textDim} />
        </View>
      )}

      {mode !== "post" && (
        // Floats over the hero, clear of the status bar. The image now bleeds to
        // the top of the display instead of starting below a dead black band.
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: safeAreaInsets.top + 8,
            left: 12,
            right: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {showBack ? (
            <BackButton onPhoto size={20} />
          ) : (
            // Holds the favourite button on the right of the row when the
            // screen pins its own back control over this one.
            <View style={{ width: 40, height: 40 }} />
          )}

          {name ? (
            <FavouriteButton
              id={name}
              isFavorite={Boolean(isFavorite)}
              onPhoto
              photoSize={40}
            />
          ) : null}
        </View>
      )}

      {/* How many photos there are, which the customer previously had no way
          to know. Scrimmed, so it holds over any photograph. */}
      {mode !== "post" && galleryImages.length > 1 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: radius.full,
            backgroundColor: color.photoScrim,
          }}
        >
          <Text fontSize="text-xs" fontWeight="font-medium" style={{ color: color.onPhoto }}>
            {photoIndex + 1} / {galleryImages.length}
          </Text>
        </View>
      ) : null}

      {!!fullImage && (
        <Modal
          visible={!!fullImage}
          transparent
          onRequestClose={() => setFullImage(null)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.92)",
            }}
          >
            <Image
              source={{ uri: fullImage }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
            {/* Rendered after the image, not just given a zIndex. This sits over a
                full-screen sibling, and relying on zIndex alone to receive touches
                is unreliable on Android; sibling order works on both platforms. */}
            <View
              style={{
                position: "absolute",
                // A flat top: 10 put this under the status bar and the notch,
                // where it was cramped against the clock and did not reliably
                // take a tap. The modal covers the whole screen, so the inset
                // has to be added here; it is 0 on devices without one.
                top: safeAreaInsets.top + 8,
                right: safeAreaInsets.right + 12,
              }}
            >
              <IconButton
                size={40}
                scrim
                onPress={() => setFullImage(null)}
                accessibilityLabel="Close image"
              >
                <MaterialIcons name="close" size={22} color={color.onPhoto} />
              </IconButton>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
