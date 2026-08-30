import React from "react";
import { View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import { Text } from "@/components/core";
import { darkColors, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

interface ProductMapProps {
  latitude?: number;
  longitude?: number;
  isDarkMode: boolean;
  /** The neighbourhood or area the pin sits in, as the listing states it. */
  placeName?: string | null;
}

/**
 * A listing's coordinates are deliberately imprecise — the exact address is
 * only shared once a booking is agreed — so the pin is drawn as an area, not a
 * point. This is that area, in metres.
 */
const APPROXIMATE_RADIUS_M = 500;

/**
 * Roughly a fifteen-minute walk across the frame. The map used to open at
 * `latitudeDelta: 0.0922`, which is about 10 km of city and answers no question
 * a renter has; at this scale the streets around the pickup are legible.
 */
const NEIGHBOURHOOD_DELTA = 0.012;

export const ProductMap: React.FC<ProductMapProps> = ({
  latitude,
  longitude,
  isDarkMode,
  placeName,
}) => {
  const { color } = useTheme();

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return (
      <View
        style={{
          flex: 1,
          height: 200,
          borderRadius: radius.group,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text className={isDarkMode ? "text-subtle-dark" : "text-subtle-light"}>
          Location unavailable
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, height: 200, overflow: "hidden", borderRadius: radius.group }}
    >
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
        {/* The accuracy the data actually has, drawn. A bare dot claimed a
            precision the coordinates do not carry, and gave the renter nothing
            to judge "is this walkable?" against. */}
        <Circle
          center={{ latitude, longitude }}
          radius={APPROXIMATE_RADIUS_M}
          strokeWidth={1}
          strokeColor={color.brand}
          fillColor={color.brandWash}
        />
        <Marker
          coordinate={{ latitude, longitude }}
          title={placeName ?? "Approximate pickup area"}
        >
          <View
            style={{
              height: 30,
              width: 30,
              borderRadius: radius.group,
              backgroundColor: color.brand,
              borderColor: color.canvas,
              borderWidth: 5,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                height: 15,
                width: 15,
                borderRadius: radius.full,
                backgroundColor: color.brand,
              }}
            />
          </View>
        </Marker>
      </MapView>

      {/* Naming the area on the map itself, so the tile is readable without
          reading the line above it — and so the circle is understood as an
          approximation rather than as a service radius. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          right: 10,
          flexDirection: "row",
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
            numberOfLines={1}
            style={{ color: darkColors.text }}
          >
            {placeName
              ? `${placeName} · approximate area`
              : "Approximate area"}
          </Text>
        </View>
      </View>
    </View>
  );
};
