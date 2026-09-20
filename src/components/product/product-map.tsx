import React from "react";
import { ProductMapClassic } from "./product-map-classic";
import { StyleProp, View, ViewStyle } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import { Text } from "@/components/core";
import { darkColors, radius } from "@/lib/design-tokens";
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
 * The map card: the frame draws a 200pt card on the page's own card radius
 * with a hairline around it, clipping the map inside.
 */
const MAP_HEIGHT = 200;

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
/**
 * The Google logo Maps draws in the bottom-left corner is 66pt wide on a 10pt
 * inset, and its terms require it to stay visible. The caption sits to the right
 * of it, so it can never cover the mark.
 */
const MAP_LOGO_CLEARANCE = 84;

const DetailProductMap: React.FC<ProductMapProps> = ({
  latitude,
  longitude,
  isDarkMode,
  placeName,
  distanceLabel,
}) => {
  const { color, isDark } = useTheme();

  /** One ring of the marker: a soft disc of canvas inside a hairline. */
  const ring = (size: number): StyleProp<ViewStyle> => [
    {
      width: size,
      height: size,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: color.controlLine,
      backgroundColor: color.canvasVeil,
      alignItems: "center",
      justifyContent: "center",
    },
    isDark ? null : { ...MARKER_SHADOW, shadowColor: color.text },
  ];

  // The place, then how far it is, then the caveat that ties them together.
  const facts = [placeName, distanceLabel].filter(Boolean);
  const caption = facts.length
    ? `${facts.join(" · ")} · approximate area`
    : "Approximate area";

  const card = {
    width: "100%",
    height: MAP_HEIGHT,
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
  } as const;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return (
      <View style={[card, { justifyContent: "center", alignItems: "center" }]}>
        <Text className={isDarkMode ? "text-subtle-dark" : "text-subtle-light"}>
          Location unavailable
        </Text>
      </View>
    );
  }

  return (
    <View style={card}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: NEIGHBOURHOOD_DELTA,
          longitudeDelta: NEIGHBOURHOOD_DELTA,
        }}
        customMapStyle={isDarkMode ? darkModeMapStyle : []}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        maxZoomLevel={16}
      >
        {/* The imprecision the coordinates actually carry, drawn — a bare dot
            claimed a precision the data does not have. It is anchored to the
            coordinate rather than to the middle of the card, so it still marks
            the right place once the map has been panned. */}
        <Marker
          coordinate={{ latitude, longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          title={placeName ?? "Approximate pickup area"}
        >
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
        </Marker>
      </MapView>

      {/* Naming the area on the map itself, so the card is readable on its
          own — and so the marker is understood as an approximation rather than
          as an address. It also carries the distance, which is the first thing
          a renter wants to know and no longer has a line of its own. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: MAP_LOGO_CLEARANCE,
          bottom: 10,
          right: 10,
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: color.scrim,
            borderRadius: radius.full,
            paddingHorizontal: 10,
            paddingVertical: 5,
            maxWidth: "100%",
          }}
        >
          <Text
            fontSize="text-xs"
            fontWeight="font-medium"
            numberOfLines={2}
            style={{ color: darkColors.text }}
          >
            {caption}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface Props extends ProductMapProps {
  /**
   * Opt-in. `detail` is the map as Figma 1:9120 draws it on Product Details: a
   * fixed ring marker and a caption chip. The default is the original 500m circle
   * and pin, which the post wizard's review step still shows.
   */
  variant?: "default" | "detail";
}

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
