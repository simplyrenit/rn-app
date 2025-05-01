import axios from "axios";
import { GOOGLE_MAP_API_KEY } from "./config";

// Function to get country from coordinates using reverse geocoding
export async function getCountryFromCoords(lat: number, lng: number) {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAP_API_KEY}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const addressComponents = response.data.results[0].address_components;
      const country = addressComponents.find((component: any) =>
        component.types.includes("country")
      );
      return country ? country.short_name : null;
    }
    return null;
  } catch (error) {
    console.error("Error getting country from coordinates:", error);
    return null;
  }
}

// Common currency mappings
export function getCurrencyForCountry(countryCode: string) {
  const currencyMap: { [key: string]: { symbol: string; code: string } } = {
    IN: { symbol: "₹", code: "INR" },
    US: { symbol: "$", code: "USD" },
    GB: { symbol: "£", code: "GBP" },
    EU: { symbol: "€", code: "EUR" },
    JP: { symbol: "¥", code: "JPY" },
    // Add more countries as needed
  };

  return currencyMap[countryCode] || { symbol: "$", code: "USD" }; // Default to USD
}
