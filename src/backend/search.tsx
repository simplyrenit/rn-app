import { SEARCH_PRODUCTS } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import moment from "moment-timezone";

export function useSearch() {
  async function searchProducts(
    item: string,
    coordinates: { lat: number; lng: number },
    when: { start_date: string | undefined; end_date: string | undefined },
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
      const params: Record<string, string | number> = {
        lat: coordinates.lat,
        long: coordinates.lng,
        title: item ?? "",
      };

      if (when.start_date) {
        params.start_date = moment(when.start_date)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ");
      }

      if (when.end_date) {
        params.end_date = moment(when.end_date)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DDTHH:mm:ssZ");
      }

      if (filters?.sort) params.sort = filters.sort;
      if (filters?.category) params.category = filters.category;
      if (filters?.subcategory) params.subcategory = filters.subcategory;
      if (filters?.min_price) params.min_price = filters.min_price;
      if (filters?.max_price) params.max_price = filters.max_price;
      if (filters?.product_rating) {
        params.product_rating = filters.product_rating;
      }
      if (filters?.owner_rating) {
        params.owner_rating = filters.owner_rating;
      }
      if (filters?.condition) params.condition = filters.condition;

      const response = await axiosInstance.get<BackendProduct[]>(SEARCH_PRODUCTS, {
        params,
      });

      return (response.data || []).filter(prod => !prod.moderation_labels?.length);
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
