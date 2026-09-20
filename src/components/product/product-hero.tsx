import { ProductImage } from "@/components/product/product-image";
import { useTheme } from "@/lib/theme";
import React from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  images?: string[];
  coverImage?: string | null;
  /** Product name — this API's identifier for a listing. */
  productId: string;
  title?: string;
  isFavorite?: boolean;
}

/**
 * The product detail hero: the photo fills the width of the screen edge to
 * edge as a square directly below the status bar, with the back and favourite
 * controls, the photo count and the page dots floating over it.
 *
 * The design contains the photo inside padding on white, which suits its cut-out
 * product shots but leaves a real, uncropped listing photo swimming in empty
 * space. On the owner's device the edge-to-edge treatment is what reads as a
 * product page, so this is the one place the screen departs from the frame.
 * The controls, count and dots are `ProductImage`'s own full-bleed mode, scrimmed
 * so they hold over any photograph.
 */
export function ProductHero({
  images,
  coverImage,
  productId,
  title,
  isFavorite,
}: Props) {
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        width,
        // The photo starts below the status bar and the Dynamic Island, so the
        // product is never hidden behind them.
        height: insets.top + width,
        paddingTop: insets.top,
        backgroundColor: color.canvas,
      }}
    >
      <View style={{ width, height: width, backgroundColor: color.skeleton }}>
      <ProductImage
        images={images}
        coverImage={coverImage}
        name={productId}
        title={title}
        isFavorite={isFavorite}
        showBack={false}
      />
      </View>
    </View>
  );
}
