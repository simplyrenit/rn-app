import { BackButton } from "@/components/core/back-button";
import { FavouriteButton } from "@/components/core/favourite-button";
import { IconButton } from "@/components/core/icon-button";
import { Text } from "@/components/core/text";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import Carousel from "pinar";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { PhotoIcon, XMarkIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContext } from "@react-navigation/native";

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
   * Opt-in: the 2.1 product detail gallery (01 2083:15973): each photo in a
   * 177×300 box on the canvas, 36 from the top and centred, with the page dots
   * and the "1/5" pill on the canvas below it instead of scrimmed over a
   * full-bleed crop.
   *
   * Requires `frameWidth`/`frameHeight` (the gallery's page): the carousel has
   * to know its page size up front or the first frame lays its slides out at
   * window width and then snaps.
   */
  contained?: boolean;
  frameWidth?: number;
  frameHeight?: number;
  /**
   * Opt-in: the 2.1 kit heart on its white disc (`FavouriteButton tile`, REVIEW
   * b1-02) instead of the scrimmed photo heart. The product detail hero.
   */
  tileHeart?: boolean;
  /** Dev seeds only: open the photo viewer on photo 1 at mount (04 2089:22279). */
  initialViewerOpen?: boolean;
}

/**
 * The contained gallery's geometry (01 2083:15973, 390 high): the photo box
 * (2083:15974, an image fill cropped to it, no shadow), the 6pt page dots 6
 * apart (2083:15975) and the count pill (2083:15981, 24 from the right edge).
 */
const PHOTO = { width: 177, height: 300, top: 36 } as const;
const DOT = 6;
const DOTS_TOP = 358;
const COUNT_TOP = 352;

export function ProductImage({
  images,
  coverImage,
  mode,
  name,
  isFavorite,
  title,
  showBack = true,
  contained = false,
  frameWidth: frameWidthProp,
  frameHeight,
  tileHeart = false,
  initialViewerOpen = false,
}: Props) {
  // Read per render, not once at module load: a module-scope width is frozen
  // at launch and goes stale with split-screen, foldables or a display-size
  // change on Android.
  const { width: windowWidth } = useWindowDimensions();
  const frameWidth = frameWidthProp ?? windowWidth;
  const { color } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [viewerSeeded, setViewerSeeded] = useState(false);
  // The viewer is the screen's: a screen that loses focus (a deep link, a notification) leaves it closed, so a
  // window-level Modal never stays over the next screen.
  const navigation = React.useContext(NavigationContext);
  useEffect(() => navigation?.addListener("blur", () => setFullImage(null)), [navigation]);
  const [photoIndex, setPhotoIndex] = useState(0);

  const galleryImages = Array.from(
    new Set([coverImage, ...(images ?? [])].filter(Boolean))
  ).filter((image) => !failedImages.includes(image as string)) as string[];

  const count = galleryImages.length;
  // A photo that fails to load drops out of the gallery, so the carousel's index can outrun it.
  const shownIndex = Math.min(photoIndex, Math.max(count - 1, 0));
  // The seed opens the viewer once, on the first photo, as a tap on it would.
  useEffect(() => {
    if (!initialViewerOpen || viewerSeeded || !galleryImages[0]) return;
    setViewerSeeded(true);
    setFullImage(galleryImages[0]);
  }, [initialViewerOpen, viewerSeeded, galleryImages[0]]);

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
              : { height: "100%", width: windowWidth }
          }
          {...(contained ? { width: frameWidth, height: boxHeight } : null)}
          renderPrev={() => <></>}
          renderNext={() => <></>}
          onIndexChanged={({ index }) => setPhotoIndex(index)}
          // A page indicator that draws one dot for one photo is noise, not an
          // affordance — and on a light photograph the single 6pt white dot was
          // invisible anyway. With one image there is nothing to indicate.
          // Contained, the gallery draws the design's own dots below the photo.
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
          {galleryImages.map((image, index) => (
            <Pressable
              key={image}
              style={contained ? { flex: 1, alignItems: "center" } : { flex: 1 }}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${index + 1} of ${count}. Tap to view full screen.`}
              onPress={() => setFullImage(image)}
            >
              <Image
                source={{ uri: image }}
                style={
                  contained
                    ? { width: PHOTO.width, height: PHOTO.height, marginTop: PHOTO.top }
                    : { width: "100%", height: "100%" }
                }
                // Contained: the whole listing photo fits the frame's 177×300 box (a
                // landscape shot is not cropped to a centre strip). Full-bleed fills.
                contentFit={contained ? "contain" : "cover"}
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
        // Floats over the photo, 8 below its top edge (the hero starts below the
        // status bar, so the inset is not this component's to add).
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: tileHeart ? 6 : 8, // tile: the 44 heart box at y 6 (04 2083:15678)
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
            tileHeart ? (
              <FavouriteButton id={name} isFavorite={Boolean(isFavorite)} tile title={title} />
            ) : (
              <FavouriteButton
                id={name}
                isFavorite={Boolean(isFavorite)}
                onPhoto
                photoSize={40}
                title={title}
              />
            )
          ) : null}
        </View>
      )}

      {/* Contained: the page dots and the "1/5" pill sit on the canvas below the
          photo, so they need no scrim. One photo has nothing to indicate. */}
      {contained && count > 1 ? (
        <>
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: DOTS_TOP, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: DOT }}
          >
            {galleryImages.map((image, index) => (
              <View
                key={image}
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: radius.full,
                  backgroundColor: index === shownIndex ? color.brand : color.line,
                }}
              />
            ))}
          </View>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: COUNT_TOP,
              right: SCREEN_GUTTER,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: color.line,
              backgroundColor: color.canvas,
            }}
          >
            <Text fontSize="text-xs" fontWeight="font-medium" lineHeight={16} style={{ color: color.textBody }}>
              {shownIndex + 1}/{count}
            </Text>
          </View>
        </>
      ) : null}

      {/* How many photos there are, which the customer previously had no way
          to know. Scrimmed, so it holds over any photograph. */}
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
            {shownIndex + 1} / {count}
          </Text>
        </View>
      ) : null}

      {!!fullImage && (
        <Modal
        // Android: draw under the status bar too, so the scrim covers it and
        // insets.top means the same thing as on iOS.
        statusBarTranslucent
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
              {/* 04 2089:22292: a 40 disc of white at 16% holding a 22 outline x-mark. */}
              <IconButton
                size={40}
                onPress={() => setFullImage(null)}
                accessibilityLabel="Close image"
                style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)" }}
              >
                <XMarkIcon size={22} color={color.onPhoto} strokeWidth={1.5} />
              </IconButton>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
