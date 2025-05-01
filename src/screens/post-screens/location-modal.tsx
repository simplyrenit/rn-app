import { Image } from "expo-image";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { styled } from "nativewind";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaderIndicator } from "@/components/auth/headerIndicator";
import { Button, StaticContainer, Text } from "@/components/core";
import AddressChoiceModal from "@/components/modals/AddressChoiceModalProps";
import { useGlobalContext } from "@/context/global-context";
import darkModeMapStyle from "assets/mapJSON/darkModeMapStyle.json";
import BottomSheet from "@gorhom/bottom-sheet";
import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import {
  FlatList,
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { NearbyPlace, RouteProps, useTypedNavigation } from "@/lib/types";
import axios from "axios";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ViewfinderCircleIcon,
} from "react-native-heroicons/outline";
import { useAuthContext } from "@/context/auth-context";
import { useAuth } from "@/backend/auth";

const StyledImage = styled(Image);
import { Modal, View, StyleSheet } from "react-native";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useRoute } from "@react-navigation/native";

const LocationModal = ({}) => {
  const route = useRoute<RouteProps<"LocationModal">>();
  const { theme, setAuthTokens } = useGlobalContext();
  const { signUpUser, loading: signUpLoading } = useAuth();
  const navigation = useTypedNavigation();

  const isDarkMode = theme === "dark";
  const { saveUser, user } = useAuthContext();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [address, setAddress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [location2, setLocation2] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAddress = useCallback(async (loc: Location.LocationObject) => {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const {
          name,
          street,
          streetNumber,
          district,
          city,
          region,
          postalCode,
          country,
        } = reverseGeocode[0];

        let formattedAddress = "";

        // if (Platform.OS === "ios") {
        //   const addressLine1 = [streetNumber, street].filter(Boolean).join(" ");
        //   const addressLine2 = [district, city].filter(Boolean).join(", ");
        //   const addressLine3 = [region, postalCode].filter(Boolean).join(" ");

        //   formattedAddress = [addressLine1, addressLine2, addressLine3, country]
        //     .filter(Boolean)
        //     .join("\n");
        // } else {
        formattedAddress = reverseGeocode[0].formattedAddress || "";
        // }


        if (!formattedAddress) {
          const fallbackParts = [name, street, city, region, country].filter(
            Boolean
          );
          formattedAddress = fallbackParts.join(", ");
        }

        setAddress(formattedAddress);
        // console.log("Formatted Address:", formattedAddress);
      } else {
        setAddress("Address not found");
      }
    } catch (error) {
      console.error("Failed to fetch address:", error);
      setAddress("Unable to retrieve address");
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setHasPermission(false);
      Alert.alert(
        "Permission Denied",
        "Location access is required to continue. Please enable it in your device settings.",
        [
          { text: "OK", onPress: () => console.log("OK Pressed") },
          {
            text: "Open Settings",
            onPress: () =>
              Platform.OS === "ios"
                ? Linking.openURL("app-settings:")
                : Linking.openSettings(),
          },
        ]
      );
      return;
    }

    setHasPermission(true);
    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
    fetchAddress(location);
  }, [fetchAddress]);

  const fetchSelectedAddress = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (reverseGeocode.length > 0) {
          const {
            name,
            street,
            streetNumber,
            district,
            city,
            region,
            postalCode,
            country,
          } = reverseGeocode[0];

          let formattedAddress = "";

          // if (Platform.OS === "ios") {
          //   const addressLine1 = [streetNumber, street]
          //     .filter(Boolean)
          //     .join(" ");
          //   const addressLine2 = [district, city].filter(Boolean).join(", ");
          //   const addressLine3 = [region, postalCode].filter(Boolean).join(" ");

          //   formattedAddress = [
          //     addressLine1,
          //     addressLine2,
          //     addressLine3,
          //     country,
          //   ]
          //     .filter(Boolean)
          //     .join("\n");
          // } else {
          formattedAddress = reverseGeocode[0].formattedAddress || "";
          // }

          if (!formattedAddress) {
            const fallbackParts = [name, street, city, region, country].filter(
              Boolean
            );
            formattedAddress = fallbackParts.join(", ");
          }

          setSelectedAddress(formattedAddress);
          // console.log("Formatted Address:", formattedAddress);
        } else {
          setSelectedAddress("Address not found");
        }
      } catch (error) {
        console.error("Failed to fetch address:", error);
        setSelectedAddress("Unable to retrieve address");
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        setHasPermission(false);
        if (Platform.OS === "ios") {
          requestLocationPermission();
        }
      } else {
        setHasPermission(true);
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
        fetchAddress(location);
      }
    })();
  }, [requestLocationPermission, fetchAddress]);

  const handleSubmit = useCallback(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  const handleMapPress = useCallback(
    (event: any) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setSelectedLocation({ latitude, longitude });
      fetchSelectedAddress(latitude, longitude);
    },
    [fetchSelectedAddress]
  );

  const getCurrentLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync();
      setLocation2(coords);
    } catch (error) {
    }
  };

  const fetchNearbyPlaces = async () => {
    if (!location) return;

    setLoading(true);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location2.latitude},${location2.longitude}&radius=1500&type=restaurant&key=${GOOGLE_MAP_API_KEY}`;

    try {
      const response = await axios.get(url);
      setNearbyPlaces(response.data.results); // Save nearby places
    } catch (error) {
      console.error("Error fetching nearby places: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      fetchNearbyPlaces();
    }
  }, [location]);

  useEffect(() => {
    getCurrentLocation(); // Fetch current location on component mount
  }, []);

  const handleSelectNearbyPlace = (place: any) => {
    setSelectedLocation({
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    });
    setSelectedAddress(`${place.name} ${place.vicinity}`);
    mapRef.current?.animateToRegion(
      {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.01,
      },
      1000
    );
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleConfirmLocation = async (
    location: Location.LocationObject | null,
    selectedAddress: string | null,
    selectedLocation: { latitude: number; longitude: number } | null
  ) => {
    let coordinates;
    let addressToSend = null;
    let countryToSend = null;
    if (!selectedAddress && location) {
      coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      addressToSend = address;
    } else if (selectedLocation) {
      coordinates = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      };
      addressToSend = selectedAddress;
    }
    if (coordinates && route.params?.onGoBack) {
      route.params.onGoBack(coordinates, addressToSend);
      navigation.goBack();
    }
  };

  const bottomSheetRef = useRef<BottomSheet>(null);
  const googlePlacesRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

  const initialSnapPoints = useMemo(() => ["40%", "60%", "90%"], []);
  const [snapPoints, setSnapPoints] = useState(initialSnapPoints);

  const handlePlaceSelected = (data: any, details: any) => {
    const lat = details.geometry.location.lat;
    const lng = details.geometry.location.lng;
    setSelectedLocation({ latitude: lat, longitude: lng });
    setSelectedAddress(details.formatted_address);
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.01,
      },
      1000
    );
    Keyboard.dismiss();
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleCurrentLocation = () => {
    setSelectedAddress(null);
    setSelectedLocation(null);
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        bottomSheetRef.current?.snapToIndex(2);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        bottomSheetRef.current?.snapToIndex(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-[#0C0C0C]" : "bg-white"}`}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <View className="flex-1 ">
          <View className="px-4">
            {/* <HeaderIndicator percentage={85} /> */}
            <View className="flex flex-row items-center py-4">
              <TouchableOpacity
                onPress={() => {
                  navigation.goBack();
                }}
                className="w-[10%]"
              >
                <ArrowLeftIcon size={18}
                  color={isDarkMode ? "#FFF" : "#000"}
                />
              </TouchableOpacity>
              <View className="w-[80%] items-center justify-center">
                <Text
                  fontSize="text-xl"
                  fontWeight="font-bold"
                  className="tracking-wide"
                >
                  Choose Address
                </Text>
              </View>
            </View>
          </View>

          <View className="space-y-5 flex-1 ">
            {!hasPermission && (
              <>
                <StaticContainer>
                  <View className="flex">
                    <Text
                      fontSize="text-2xl"
                      fontWeight="font-semibold"
                    >
                      Allow location
                    </Text>
                    <Text
                      fontSize="text-lg"
                      className="text-gray-500"
                    >
                      This allows Renit to fetch products near you
                    </Text>
                  </View>

                  <StyledImage
                    source={
                      isDarkMode
                        ? require("assets/auth/allow-location-dark.png")
                        : require("assets/auth/allow-location-light.png")
                    }
                    className="w-full flex-1"
                  />
                </StaticContainer>
              </>
            )}

            {hasPermission && location ? (
              <>
                {/* <NonScrollableContainer> */}
                <MapView
                  ref={mapRef}
                  provider={
                    // Platform.OS === "android" ? PROVIDER_GOOGLE : undefined
                    PROVIDER_GOOGLE
                  }
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                  customMapStyle={isDarkMode ? darkModeMapStyle : []}
                  onPress={handleMapPress}
                >
                  <Marker
                    coordinate={{
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }}
                    title="You are here"
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

                  {selectedLocation && (
                    <Marker
                      coordinate={selectedLocation}
                      title="Selected location"
                    />
                  )}
                </MapView>
                {/* </NonScrollableContainer> */}

                <View
                  style={{
                    paddingVertical: wp("5%"),
                    paddingHorizontal: wp("5%"),
                  }}
                  className="rounded-t-3xl"
                ></View>

                {/* Bottom sheet */}
                <BottomSheet
                  ref={bottomSheetRef}
                  snapPoints={snapPoints}
                  enablePanDownToClose={false}
                  index={0}
                  enableHandlePanningGesture={true}
                  enableContentPanningGesture={true}
                  backgroundStyle={{
                    backgroundColor: isDarkMode ? "black" : "white",
                  }}
                  handleIndicatorStyle={{ backgroundColor: "#292929" }}
                  handleStyle={{
                    borderTopWidth: 2,
                    borderLeftWidth: 2,
                    borderRightWidth: 2,
                    borderTopColor: isDarkMode ? "#292929" : "#fff",
                    borderLeftColor: isDarkMode ? "#292929" : "#fff",
                    borderRightColor: isDarkMode ? "#292929" : "#fff",
                    borderTopRightRadius: 12,
                    borderTopLeftRadius: 12,
                  }}
                >
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                    style={{ flex: 1 }}
                  >
                    <ScrollView
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{
                        paddingVertical: wp("5%"),
                        paddingHorizontal: wp("5%"),
                        flexGrow: 1,
                      }}
                    >
                      <View className="rounded-t-3xl">
                        <Text
                          fontSize="text-md"
                          fontWeight="font-bold"
                        >
                          Your Address:
                        </Text>
                        <Text
                          fontSize="text-sm"
                          className={`${
                            isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                          }`}
                        >
                          {address ? address : "Fetching address..."}
                        </Text>

                        {selectedLocation && (
                          <>
                            <Text
                              fontSize="text-md"
                              fontWeight="font-bold"
                              className="mt-4"
                            >
                              Selected Address:
                            </Text>
                            <Text
                              fontSize="text-sm"
                              className={`${
                                isDarkMode
                                  ? "text-[#FFFFFFB2]"
                                  : "text-[#000000B2]"
                              }`}
                            >
                              {selectedAddress
                                ? selectedAddress
                                : "Fetching selected address..."}
                            </Text>
                          </>
                        )}

                        <View className="py-3 mt-2">
                          <Button
                            variant="primary"
                            onPress={() => {
                              handleConfirmLocation(
                                location,
                                selectedAddress,
                                selectedLocation
                              );
                            }}
                            className="flex-row justify-center"
                          >
                            {signUpLoading ? (
                              <ActivityIndicator
                                size="small"
                                color={"#fff"}
                              />
                            ) : (
                              "Confirm location"
                            )}
                          </Button>
                        </View>

                        <View
                          className={`flex-row pl-3 min-h-11 rounded-[12px] border ${
                            isDarkMode
                              ? "border-[#292929] bg-[#0F0F0F]"
                              : "border-[#e6e6e6] bg-white"
                          }`}
                          style={{ alignItems: 'flex-start'}}
                        >
                          <MagnifyingGlassIcon
                            color={isDarkMode ? "#FFFFFFB2" : "#000000B2"}
                            size={24}
                            style={{ marginTop: hp(1.1) }}
                          />
                          <GooglePlacesAutocomplete
                            ref={googlePlacesRef}
                            placeholder="Search area or street name"
                            query={{ key: GOOGLE_MAP_API_KEY }}
                            fetchDetails={true}
                            onPress={handlePlaceSelected}
                            onFail={(error) => console.log(error)}
                            onNotFound={() => console.log("no results")}
                            enablePoweredByContainer={false}
                            disableScroll={true}
                            styles={{
                              textInput: {
                                height: '100%',
                                backgroundColor: isDarkMode
                                  ? "#0F0F0F"
                                  : "#fff",
                                borderRadius: 12,
                                // paddingHorizontal: 8,
                                zIndex: 10,
                                color: isDarkMode ? "#fff" : "#000",
                                fontSize: 16,
                                alignContent: "center",
                              },
                              row: {
                                backgroundColor: isDarkMode
                                  ? "#0F0F0F"
                                  : "#FFF",
                              },
                              description: {
                                color: isDarkMode ? "#fff" : "#000",
                              },
                              separator: { backgroundColor: "#292929" },
                            }}
                            textInputProps={{
                              placeholderTextColor: isDarkMode
                                ? "#FFFFFFB2"
                                : "#000000B2",
                            }}
                          />
                        </View>

                        <TouchableOpacity
                          className={`h-[48px] rounded-[12px] w-full border-b ${
                            isDarkMode ? "border-[#292929]" : "border-[#e6e6e6]"
                          } px-2 mt-4`}
                          onPress={handleCurrentLocation}
                        >
                          <View className="flex flex-row h-full w-full items-center justify-between">
                            <View className="flex flex-row items-center space-x-4">
                              <ViewfinderCircleIcon
                                color="#635be8"
                                size={24}
                              />
                              <Text
                                fontWeight="font-bold"
                                className="text-brand-blue"
                              >
                                Use current location
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>

                        <ScrollView
                          style={{ maxHeight: 450 }}
                          nestedScrollEnabled={true}
                        >
                          {loading ? (
                            <Text className="mt-3">
                              Loading nearby places...
                            </Text>
                          ) : (
                            <>
                              {/* <FlatList
                              scrollEnabled={false}
                              data={nearbyPlaces}
                              keyExtractor={(item) => item.place_id}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  onPress={() => handleSelectNearbyPlace(item)}
                                  className={`pl-3 py-5 flex-row items-center space-x-3 border-b ${
                                    isDarkMode
                                      ? "border-[#292929]"
                                      : "border-[#e6e6e6]"
                                  }`}
                                >
                                  <MapPinIcon
                                    color={isDarkMode ? "white" : "black"}
                                    size={20}
                                  />
                                  <Text fontSize="text-sm">{item.name}</Text>
                                </TouchableOpacity>
                              )}
                            /> */}
                              {nearbyPlaces.map((item) => (
                                <TouchableOpacity
                                  key={item.place_id}
                                  onPress={() => handleSelectNearbyPlace(item)}
                                  className={`pl-3 py-5 flex-row items-center space-x-3 border-b ${
                                    isDarkMode
                                      ? "border-[#292929]"
                                      : "border-[#e6e6e6]"
                                  }`}
                                >
                                  <MapPinIcon
                                    color={isDarkMode ? "white" : "black"}
                                    size={20}
                                  />
                                  <Text fontSize="text-sm">{item.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </>
                          )}
                        </ScrollView>

                        {/* <AddressChoiceModal
                        isVisible={isModalVisible}
                        onClose={() => setModalVisible(false)}
                        onConfirm={confirmAddressChoice}
                      /> */}
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>
                </BottomSheet>
              </>
            ) : (
              <View className="w-[90%] mx-auto py-5">
                <Button
                  variant="primary"
                  onPress={handleSubmit}
                >
                  Provide location access
                </Button>
              </View>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default LocationModal;
