import { BackButton } from "@/components/core/back-button";
import { FavouriteButton } from "@/components/core/favourite-button";
import { IconButton } from "@/components/core/icon-button";
import { Text } from "@/components/core/text";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Carousel from "pinar";
import React, { useEffect, useState } from "react";
import { Dimensions, Modal, Pressable, View } from "react-native";
import { PhotoIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  images?: string[];
  coverImage?: string | null;
  mode?: string;
  name?: string;
  isFavorite?: boolean;
  /** Names the listing in the favourite control's spoken label. */
  title?: string;
  /**
   * Set false when the screen pins its own back control above the hero. A
   * button that lives inside the scroll leaves the customer with no way back
   * the moment the photo scrolls off.
   */
  showBack?: boolean;
  /**
   * Opt-in: the product detail frame's contained photo — the whole picture
   * fitted inside a box on the canvas with a drop shadow under it, rather than
   * a full-bleed crop. It also hands the floating controls and the page
   * indicator back to the caller, because in that layout they are part of the
   * screen's own hero block and not of the photograph.
   *
   * Requires `frameWidth`/`frameHeight`: the carousel has to know its page size
   * up front or the first frame lays its slides out at window width and then
   * snaps.
   */
  contained?: boolean;
  frameWidth?: number;
  frameHeight?: number;
  /** Lets a contained caller draw its own indicator. */
  onGalleryStateChange?: (state: { index: number; count: number }) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * The drop shadow the design puts under the contained photo: black at 31%,
 * offset 8/6, blur 20 — and a Figma blur is twice a Core Animation radius, so
 * 10. Light only; the dark frame floats the photo with no shadow at all.
 */
const CONTAINED_SHADOW = {
  shadowOpacity: 0.31,
  shadowRadius: 10,
  shadowOffset: { width: 8, height: 6 },
  elevation: 8,
} as const;

/** The largest box of `natural`'s shape that fits inside the frame. */
function fitInside(
  natural: { width: number; height: number },
  frameWidth: number,
  frameHeight: number
) {
  if (!natural.width || !natural.height) {
    return { width: frameWidth, height: frameHeight };
  }
  const scale = Math.min(
    frameWidth / natural.width,
    frameHeight / natural.height
  );
  return { width: natural.width * scale, height: natural.height * scale };
}

export function ProductImage({
  images,
  coverImage,
  mode,
  name,
  isFavorite,
  title,
  showBack = true,
  contained = false,
  frameWidth = SCREEN_WIDTH,
  frameHeight,
  onGalleryStateChange,
}: Props) {
  const { color, isDark } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  /**
   * Each photo's intrinsic size, so the contained slide can be exactly the size
   * of the picture inside it. A box that is merely `contain`-fitted still casts
   * its shadow from the box, which would hang the shadow in the empty space
   * beside a portrait shot.
   */
  const [naturalSizes, setNaturalSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const galleryImages = Array.from(
    new Set([coverImage, ...(images ?? [])].filter(Boolean))
  ).filter((image) => !failedImages.includes(image as string)) as string[];

  const count = galleryImages.length;
  // Only the primitives are watched: the callback is typically an inline
  // arrow, and depending on it would re-run this every time the parent
  // re-renders in response to it.
  useEffect(() => {
    onGalleryStateChange?.({ index: photoIndex, count });
  }, [photoIndex, count]);

  // Square unless the caller says otherwise, so a contained caller that gives
  // only a width still gets a defined box rather than a zero-height carousel.
  const boxHeight = frameHeight ?? frameWidth;

  return (
    <View
      style={
        contained
          ? { width: frameWidth, height: boxHeight }
          : { width: "100%", height: "100%", backgroundColor: color.canvas }
      }
    >
      {galleryImages.length ? (
        <Carousel
          style={
            contained
              ? { height: boxHeight, width: frameWidth }
              : { height: "100%", width: SCREEN_WIDTH }
          }
          {...(contained ? { width: frameWidth, height: boxHeight } : null)}
          renderPrev={() => <></>}
          renderNext={() => <></>}
          onIndexChanged={({ index }) => setPhotoIndex(index)}
          // A page indicator that draws one dot for one photo is noise, not an
          // affordance — and on a light photograph the single 6pt white dot was
          // invisible anyway. With one image there is nothing to indicate.
          // Contained, the caller draws the design's segmented track instead.
          showsDots={!contained && galleryImages.length > 1}
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
          {galleryImages.map((image, index) => {
            // Until the picture reports its own size there is nothing to hang a
            // shadow on: a full-frame white box with a shadow under it would
            // flash in the empty space before the photo arrived.
            const measured = contained ? naturalSizes[image] : undefined;
            const fitted = measured
              ? fitInside(measured, frameWidth, boxHeight)
              : null;

            const photo = (
              <Image
                source={{ uri: image }}
                style={{ width: "100%", height: "100%" }}
                contentFit={contained ? "contain" : "cover"}
                transition={150}
                onLoad={
                  contained
                    ? ({ source }) =>
                        setNaturalSizes((current) =>
                          current[image]
                            ? current
                            : {
                                ...current,
                                [image]: {
                                  width: source.width,
                                  height: source.height,
                                },
                              }
                        )
                    : undefined
                }
                onError={() =>
                  setFailedImages((current) =>
                    current.includes(image) ? current : [...current, image]
                  )
                }
              />
            );

            return (
              <Pressable
                key={image}
                style={
                  contained
                    ? { flex: 1, alignItems: "center", justifyContent: "center" }
                    : { flex: 1 }
                }
                accessibilityRole="imagebutton"
                accessibilityLabel={`Photo ${index + 1} of ${galleryImages.length}. Tap to view full screen.`}
                onPress={() => setFullImage(image)}
              >
                {fitted ? (
                  // The shadow is cast by this wrapper, which is exactly the
                  // size of the picture. It carries the canvas as a fill
                  // because iOS derives a shadow from the layer, and a view
                  // with no background of its own casts nothing.
                  <View
                    style={[
                      {
                        width: fitted.width,
                        height: fitted.height,
                        backgroundColor: color.canvas,
                      },
                      isDark
                        ? null
                        : { ...CONTAINED_SHADOW, shadowColor: color.text },
                    ]}
                  >
                    {photo}
                  </View>
                ) : (
                  photo
                )}
              </Pressable>
            );
          })}
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

      {mode !== "post" && !contained && (
        // Floats over the photo, 8 below its top edge (the hero starts below the
        // status bar, so the inset is not this component's to add). Contained,
        // the photo no longer runs under the status bar and the controls are
        // the screen's own — see the detail screen's hero block.
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: 8,
            // The page gutter, so the favourite lines up with the back control the
            // detail screen pins on the left.
            left: SCREEN_GUTTER,
            right: SCREEN_GUTTER,
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
              title={title}
            />
          ) : null}
        </View>
      )}

      {/* How many photos there are, which the customer previously had no way
          to know. Scrimmed, so it holds over any photograph. Contained, the
          caller's segmented indicator says the same thing in the design's
          own terms, so this would be a second answer to one question. */}
      {mode !== "post" && !contained && galleryImages.length > 1 ? (
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
