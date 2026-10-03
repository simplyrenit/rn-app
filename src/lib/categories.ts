import { CategoryItem } from "./types";

// `slug` is the taxonomy v2 parent the tile opens (ENG-29); the name and image
// stay the design's. Real Estate went with v2: residential property is not
// rentable on Renit.
export const CATEGORIES: CategoryItem[] = [
  {
    name: "Automobiles",
    slug: "automobiles-mobility",
    image: require("assets/categories/automobile.png"),
  },
  {
    name: "Appliances",
    slug: "appliances",
    image: require("assets/categories/appliances.png"),
  },
  { name: "Electronics", slug: "electronics-computing", image: require("assets/categories/electronics.png") },
  {
    name: "Furniture",
    slug: "furniture",
    image: require("assets/categories/furniture.png"),
  },
  { name: "Machines", slug: "machines-tools-equipment", image: require("assets/categories/machinery.png") },
  { name: "Sports", slug: "fitness-sports", image: require("assets/categories/sports.png") },
  { name: "Fashion", slug: "fashion-accessories", image: require("assets/categories/clothing.png") },
  { name: "Musicals", slug: "audio-music-dj", image: require("assets/categories/musicals.png") },
  {
    name: "Art & Craft",
    slug: "art-decor-hobby",
    image: require("assets/categories/art.png"),
  },
  {
    name: "Emerging",
    slug: "gaming-vr-emerging-tech",
    image: require("assets/categories/emerging.png"),
  },
  { name: "Books", slug: "books", image: require("assets/categories/books.png") },
  // { name: "Musical Instruments", image: "/api/placeholder/200/200" },
  // { name: "Photography Equipment", image: "/api/placeholder/200/200" },
  // { name: "Formal Wear", image: "/api/placeholder/200/200" },
];
