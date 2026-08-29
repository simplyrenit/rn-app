import React from "react";
import { View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import { Text } from "@/components/core";
import { ink, colors, radius } from "@/lib/design-tokens";

interface ProductMapProps {
  latitude?: number;
  longitude?: number;
  isDarkMode: boolean;
}

export const ProductMap: React.FC<ProductMapProps> = ({
  latitude,
  longitude,
  isDarkMode,
}) => {
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
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        customMapStyle={isDarkMode ? darkModeMapStyle : []}
        scrollEnabled={true}
        zoomEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        maxZoomLevel={15}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title="Product Location"
        >
          <View
            style={{
              height: 30,
              width: 30,
              borderRadius: radius.group,
              backgroundColor: colors.dark.brand,
              borderColor: ink.canvas(isDarkMode),
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
                backgroundColor: colors.dark.brand,
              }}
            />
          </View>
        </Marker>
      </MapView>
    </View>
  );
};
