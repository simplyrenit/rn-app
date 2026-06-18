import * as Location from "expo-location";

export interface DiscoveryCoordinates {
  lat: number;
  long: number;
}

export interface DiscoveryLocationData {
  address: string;
  coordinates: DiscoveryCoordinates;
}

export const DEFAULT_DISCOVERY_COORDINATES: DiscoveryCoordinates = {
  lat: 19,
  long: 72,
};

let discoveryCoordinatesPromise: Promise<DiscoveryCoordinates | null> | null =
  null;

const formatAddress = (
  reverseGeocode: Location.LocationGeocodedAddress[]
): string => {
  if (!reverseGeocode.length) {
    return "";
  }

  const primaryResult = reverseGeocode[0];

  if (primaryResult.formattedAddress) {
    return primaryResult.formattedAddress;
  }

  return [
    primaryResult.name,
    primaryResult.street,
    primaryResult.city,
    primaryResult.region,
    primaryResult.country,
  ]
    .filter(Boolean)
    .join(", ");
};

const resolveForegroundPermission = async () => {
  const existingPermission = await Location.getForegroundPermissionsAsync();

  if (existingPermission.status === "granted") {
    return existingPermission;
  }

  if (!existingPermission.canAskAgain) {
    return existingPermission;
  }

  if (existingPermission.status === "undetermined") {
    return Location.requestForegroundPermissionsAsync();
  }

  return existingPermission;
};

const resolveDiscoveryCoordinates = async (): Promise<DiscoveryCoordinates | null> => {
  try {
    const permission = await resolveForegroundPermission();

    if (permission.status !== "granted") {
      return null;
    }

    const lastKnownLocation = await Location.getLastKnownPositionAsync();

    if (lastKnownLocation?.coords) {
      return {
        lat: lastKnownLocation.coords.latitude,
        long: lastKnownLocation.coords.longitude,
      };
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: currentLocation.coords.latitude,
      long: currentLocation.coords.longitude,
    };
  } catch {
    return null;
  }
};

export const getDiscoveryCoordinates = async () => {
  if (!discoveryCoordinatesPromise) {
    discoveryCoordinatesPromise = resolveDiscoveryCoordinates();
  }

  return discoveryCoordinatesPromise;
};

export const getDiscoveryLocationData = async (): Promise<DiscoveryLocationData | null> => {
  const coordinates = await getDiscoveryCoordinates();

  if (!coordinates) {
    return null;
  }

  try {
    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude: coordinates.lat,
      longitude: coordinates.long,
    });

    return {
      address: formatAddress(reverseGeocode),
      coordinates,
    };
  } catch {
    return {
      address: "",
      coordinates,
    };
  }
};
