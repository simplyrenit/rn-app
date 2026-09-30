import { SEARCH_PRODUCTS, SEARCH_SPEC_FILTERS } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import moment from "moment-timezone";

export type SearchFilters = {
  sort: string;
  category: string;
  subcategory: string;
  min_price: string;
  max_price: string;
  product_rating: number;
  owner_rating: number;
  condition: string;
  /** Chosen options per spec key (ENG-31), e.g. `{ ac_type: ["Split"] }`. */
  specs?: Record<string, string[]>;
};

type Coordinates = { lat: number; lng: number } | undefined;
type When = { start_date: string | undefined; end_date: string | undefined };

/** One spec in the filter panel, its options counted against the results. */
export type SpecFilter = {
  key: string;
  label: string;
  type: "enum" | "multi_enum";
  /** "default" specs show first; "expanded" ones sit under "All specifications". */
  facet: "default" | "expanded" | "none";
  options: { value: string; count: number }[];
};

export type SpecFilterPanel = {
  subcategory: { id: number; slug: string; title: string; parent: string } | null;
  total: number | null;
  filters: SpecFilter[];
};

/**
 * The search query string. Built by hand rather than through axios `params`:
 * a spec with two options must go as `attr.ac_type=Split&attr.ac_type=Window`
 * (options can contain commas, e.g. "Up to 12,000"), and axios would send an
 * array as `attr.ac_type[]=…`.
 */
export function buildSearchQuery(
  item: string,
  coordinates: Coordinates,
  when: When,
  filters?: SearchFilters
): string {
  const pairs: [string, string | number][] = [["title", item ?? ""]];
  if (coordinates) {
    pairs.push(["lat", coordinates.lat], ["long", coordinates.lng]);
  }
  if (when.start_date) {
    pairs.push([
      "start_date",
      moment(when.start_date).tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm:ssZ"),
    ]);
  }
  if (when.end_date) {
    pairs.push([
      "end_date",
      moment(when.end_date).tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm:ssZ"),
    ]);
  }
  if (filters?.sort) pairs.push(["sort", filters.sort]);
  if (filters?.category) pairs.push(["category", filters.category]);
  if (filters?.subcategory) pairs.push(["subcategory", filters.subcategory]);
  if (filters?.min_price) pairs.push(["min_price", filters.min_price]);
  if (filters?.max_price) pairs.push(["max_price", filters.max_price]);
  if (filters?.product_rating) pairs.push(["product_rating", filters.product_rating]);
  if (filters?.owner_rating) pairs.push(["owner_rating", filters.owner_rating]);
  if (filters?.condition) pairs.push(["condition", filters.condition]);
  for (const [key, options] of Object.entries(filters?.specs ?? {})) {
    for (const option of options) pairs.push([`attr.${key}`, option]);
  }
  return pairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export function useSearch() {
  async function searchProducts(
    item: string,
    coordinates: Coordinates,
    when: When,
    filters?: SearchFilters
  ): Promise<BackendProduct[]> {
    try {
      const response = await axiosInstance.get<BackendProduct[]>(
        `${SEARCH_PRODUCTS}?${buildSearchQuery(item, coordinates, when, filters)}`
      );

      return (response.data || []).filter(prod => !prod.moderation_labels?.length);
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }

  /** The spec filters for the same search; empty unless it names one sub-category. */
  async function fetchSpecFilters(
    item: string,
    coordinates: Coordinates,
    when: When,
    filters: SearchFilters
  ): Promise<SpecFilterPanel> {
    const response = await axiosInstance.get<SpecFilterPanel>(
      `${SEARCH_SPEC_FILTERS}?${buildSearchQuery(item, coordinates, when, filters)}`
    );
    return response.data;
  }

  return { searchProducts, fetchSpecFilters };
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
