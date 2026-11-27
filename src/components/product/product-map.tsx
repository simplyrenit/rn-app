import React from "react";
import { ProductMapClassic } from "./product-map-classic";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import { Text } from "@/components/core";
import { MapPlaceholder } from "@/components/core/map-placeholder";
import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

export interface ProductMapProps {
  latitude?: number;
  longitude?: number;
  isDarkMode: boolean;
  /** The neighbourhood or area the pin sits in, as the listing states it. */
  placeName?: string | null;
  /**
   * How far away it is, already worked out by the caller. The detail page's
   * block is the heading and this card and nothing else, so the line that used
   * to sit above the map says its piece in the caption instead.
   */
  distanceLabel?: string | null;
}

/**
 * The map card's map: 180 high above the caption (04 2083:15806).
 */
const MAP_HEIGHT = 180;

/**
 * The approximate-area marker, in points.
 *
 * A listing's coordinates are deliberately imprecise — the exact address is
 * only shared once a booking is agreed — so the pin is drawn as an area rather
 * than a point. This used to be a 500m geographic circle with a small pin on
 * top of it; the design draws the same idea as one marker, two soft rings
 * around a dot, so there is one claim about the location on the card instead
 * of two that scale differently.
 */
const MARKER_OUTER = 120;
const MARKER_INNER = 72;
const MARKER_DISC = 24;
const MARKER_DOT = 14.4;

/**
 * The rings' lift: black at 12%, offset 0/1, blur 3 — half a Figma blur is a
 * Core Animation radius. Light only; `color.text` is black there, and on dark
 * the hairline carries the edge on its own.
 */
const MARKER_SHADOW = {
  shadowOpacity: 0.12,
  shadowRadius: 1.5,
  shadowOffset: { width: 0, height: 1 },
  elevation: 2,
} as const;

/**
 * Roughly a fifteen-minute walk across the frame. The map used to open at
 * `latitudeDelta: 0.0922`, which is about 10 km of city and answers no question
 * a renter has; at this scale the streets around the pickup are legible.
 */
const NEIGHBOURHOOD_DELTA = 0.012;

const DetailProductMap: React.FC<ProductMapProps & { placeholder?: boolean }> = ({
  latitude,
  longitude,
  isDarkMode,
  placeName,
  distanceLabel,
  placeholder = false,
}) => {
  const { color, isDark } = useTheme();

  /** One ring of the marker: a hairline circle (04 2083:15808/15809). */
  const ring = (size: number): StyleProp<ViewStyle> => ({
    width: size,
    height: size,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: "center",
    justifyContent: "center",
  });

  const marker = (
    <View style={ring(MARKER_OUTER)}>
      <View style={ring(MARKER_INNER)}>
        <View
          style={[
            {
              width: MARKER_DISC,
              height: MARKER_DISC,
              borderRadius: radius.full,
              backgroundColor: color.controlFill,
              alignItems: "center",
              justifyContent: "center",
            },
            isDark ? null : { ...MARKER_SHADOW, shadowColor: color.text },
          ]}
        >
          <View
            style={{
              width: MARKER_DOT,
              height: MARKER_DOT,
              borderRadius: radius.full,
              backgroundColor: color.brand,
            }}
          />
        </View>
      </View>
    </View>
  );

  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    // 04 2083:15805 "Map card": r12 hairline card, the 180 map, then the caption under it.
    <View
      style={{
        width: "100%",
        overflow: "hidden",
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: color.line,
      }}
    >
      <View style={{ height: MAP_HEIGHT, overflow: "hidden" }}>
        {placeholder ? (
          // NEW · neutral map: the kit tile at the frame's 687×864, its top-left corner showing.
          <>
            <MapPlaceholder style={{ position: "absolute", left: 0, top: 0, width: 687, height: 864 }} />
            <View style={{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" }}>
              {marker}
            </View>
          </>
        ) : hasCoordinates ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: latitude!,
              longitude: longitude!,
              latitudeDelta: NEIGHBOURHOOD_DELTA,
              longitudeDelta: NEIGHBOURHOOD_DELTA,
            }}
            customMapStyle={isDarkMode ? darkModeMapStyle : []}
            scrollEnabled={MAP_INTERACTIVE}
            zoomEnabled={MAP_INTERACTIVE}
            rotateEnabled={false}
            pitchEnabled={false}
            maxZoomLevel={16}
          >
            {/* The imprecision the coordinates actually carry, drawn — a bare dot
                claimed a precision the data does not have. It is anchored to the
                coordinate rather than to the middle of the card, so it still marks
                the right place once the map has been panned. */}
            <Marker
              coordinate={{ latitude: latitude!, longitude: longitude! }}
              anchor={{ x: 0.5, y: 0.5 }}
              title={placeName ?? "Approximate pickup area"}
            >
              {marker}
            </Marker>
          </MapView>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text fontSize="text-sm" tone="dim">
              Location unavailable
            </Text>
          </View>
        )}
      </View>

      {/* The place, then how far it is (2083:15811): 12/16 padding, 2 between. */}
      <View style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 2 }}>
        <Text fontSize="text-sm" fontWeight="font-semibold">
          {placeName || "Approximate area"}
        </Text>
        {distanceLabel ? (
          <Text fontSize="text-xs" tone="dim">
            {distanceLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

interface Props extends ProductMapProps {
  /**
   * `detail` only, dev seeds: the kit neutral map (`MapPlaceholder`, the frame's
   * NEW layer) instead of `MapView`, so a design fixture draws no live tiles.
   */
  placeholder?: boolean;
  /**
   * Opt-in. `detail` is the map as Figma 1:9120 draws it on Product Details: a
   * fixed ring marker and a caption chip. The default is the original 500m circle
   * and pin, which the post wizard's review step still shows.
   */
  variant?: "default" | "detail";
}

// On Android a pannable map inside the page's vertical scroll takes every swipe
// that starts on it, so the page seems stuck. The map shows an approximate area
// anyway; iOS keeps the pan and zoom.
const MAP_INTERACTIVE = Platform.select({ android: false, default: true });

export const ProductMap: React.FC<Props> = ({ variant = "default", ...props }) =>
  variant === "detail" ? (
    <DetailProductMap {...props} />
  ) : (
    <ProductMapClassic
      latitude={props.latitude}
      longitude={props.longitude}
      isDarkMode={props.isDarkMode}
      placeName={props.placeName}
    />
  );
