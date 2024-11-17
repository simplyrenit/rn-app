import { Product } from "@/lib/types";
import React, { createContext, useContext, useState } from "react";

interface ProductContextType {
  product: Product;
  saveDetails: (product: any) => void;
  clearDetails: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [product, setProduct] = useState<Product | null>(null);

  const saveDetails = (product: any) => {
    setProduct((prev) => ({ ...prev, ...product }));
  };

  const clearDetails = () => {
    setProduct({
      category: {
        darkIcon: "",
        lightIcon: "",
        name: "",
        title: "",
      },
      subcategory: {
        title: "",
        darkIcon: "",
        lightIcon: "",
        name: "",
      },
      name: "",
      brandName: "",
      modelName: "",
      condition: "",
      productDescription: "",
      usageDescription: "",
      location: {
        lat: 0,
        long: 0,
      },
      pricePerDay: "",
      securityDeposit: "",
      personOfContact: {
        name: "",
      },
      images: [],
      coverImage: { image: "", file_type: "" },
      productAvailability: [],
      address: "",
      blockedDates: [],
    });
  };

  const value = {
    product: product!,
    saveDetails,
    clearDetails,
  };

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
};

export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProductContext must be used within a ProductProvider");
  }
  return context;
};
