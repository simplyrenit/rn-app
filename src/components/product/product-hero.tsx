import { ProductImage } from "@/components/product/product-image";
import { useTheme } from "@/lib/theme";
import React from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The gallery's fixed height below the safe-area inset (01 2083:15973, 390×390 at a 390 width). */
export const GALLERY_HEIGHT = 390;

interface Props {
  images?: string[];
  coverImage?: string | null;
  /** Product name — this API's identifier for a listing. */
  productId: string;
  title?: string;
  isFavorite?: boolean;
  /** Dev seeds only: open the photo viewer at mount (04 2089:22279). */
  initialViewerOpen?: boolean;
}

/**
 * The product detail hero, as the frames draw it (01 2083:15973): a 390-high
 * gallery on the canvas directly below the status bar, the photo fitted
 * (`contain`) in a 300-high box across the content width (the frame's portrait
 * cover lands at its 177×300), the heart on its disc (REVIEW b1-02), and the page dots and
 * "1/5" pill below the photo. Nothing here sits on a photograph, so nothing is
 * scrimmed. The back control and the cart bag are the screen's (pinned, so
 * there is always a way back).
 */
export function ProductHero({
  images,
  coverImage,
  productId,
  title,
  isFavorite,
  initialViewerOpen,
}: Props) {
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        width,
        // The gallery starts below the status bar and the Dynamic Island.
        height: insets.top + GALLERY_HEIGHT,
        paddingTop: insets.top,
        backgroundColor: color.canvas,
      }}
    >
      <ProductImage
        images={images}
        coverImage={coverImage}
        name={productId}
        title={title}
        isFavorite={isFavorite}
        showBack={false}
        tileHeart
        contained
        frameWidth={width}
        frameHeight={GALLERY_HEIGHT}
        initialViewerOpen={initialViewerOpen}
      />
    </View>
  );
}
