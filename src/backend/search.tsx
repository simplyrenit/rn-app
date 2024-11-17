import { useGlobalContext } from "@/context/global-context";
import { SEARCH_PRODUCTS } from "@/lib/config";
import { BackendProduct } from "@/lib/types";
import axios from "axios";
import moment from "moment-timezone";

export function useSearch() {
  const { authTokens } = useGlobalContext();
  const { access_token } = authTokens || {};

  async function searchProducts(
    item: string,
    coordinates: { lat: number; lng: number },
    when: { start_date: string; end_date: string },
    filters?: {
      sort: string;
      category: string;
      subcategory: string;
      min_price: string;
      max_price: string;
      product_rating: number;
      owner_rating: number;
      condition: string;
    }
  ): Promise<BackendProduct[]> {
    try {
      const formattedDates = {
        start_date: moment(when.start_date)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
        end_date: moment(when.end_date)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ"),
      };

      let url = `${SEARCH_PRODUCTS}?lat=${coordinates.lat}&long=${coordinates.lng}&title=${item}&start_date=${formattedDates.start_date}&end_date=${formattedDates.end_date}`;

      if (filters) {
        if (filters.sort) url += `&sort=${filters.sort}`;
        if (filters.category) url += `&category=${filters.category}`;
        if (filters.subcategory) url += `&subcategory=${filters.subcategory}`;
        if (filters.min_price) url += `&min_price=${filters.min_price}`;
        if (filters.max_price) url += `&max_price=${filters.max_price}`;
        if (filters.product_rating)
          url += `&product_rating=${filters.product_rating}`;
        if (filters.owner_rating)
          url += `&owner_rating=${filters.owner_rating}`;
        if (filters.condition) url += `&condition=${filters.condition}`;
      }

      const response = await axios.get<BackendProduct[]>(url, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      return response.data || [];
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }

  return { searchProducts };
}

interface Category {
  title: string;
  parent?: string;
  main_icon?: string;
  light_icon?: string;
  dark_icon?: string;
}

interface Product {
  name: string; // slug
  title: string; // max length: 255, min length: 1
  images: string[]; // Array of strings
  description: string; // min length: 1
  total_rating?: string; // readonly, decimal
  review_count?: number; // readonly
  category?: Category;
  condition?: "excellent" | "fair" | "good"; // Enum for example values
  coordinates?: [number, number]; // Array of 3 numbers (e.g., latitude, longitude, altitude)
  booked?: boolean; // readonly
  average_rating?: string; // readonly, decimal
  security_deposit?: string; // readonly, decimal
  rate: string; // decimal
  currency?: string; // max length: 10
  location: string; // min length: 1
  brand_name?: string; // max length: 100, nullable
  model_name?: string; // max length: 100, nullable
  usage_description?: string; // nullable
  contact_number?: string; // max length: 20, nullable
  contact_name?: string; // max length: 100, nullable
  cover_image?: string; // URL string, max length: 200, nullable
  distance?: string; // readonly
}
