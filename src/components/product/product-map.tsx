import React from "react";
import { View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import { Text } from "@/components/core";

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
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text className={isDarkMode ? "text-white/50" : "text-black/50"}>
          Location unavailable
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, height: 200, overflow: "hidden", borderRadius: 20 }}
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
              borderRadius: 15,
              backgroundColor: "#635BE8",
              borderColor: isDarkMode ? "#000" : "#fff",
              borderWidth: 5,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                height: 15,
                width: 15,
                borderRadius: 7.5,
                backgroundColor: "#635BE8",
              }}
            />
          </View>
        </Marker>
      </MapView>
    </View>
  );
};
