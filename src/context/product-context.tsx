import { useGlobalContext } from "@/context/global-context";
import { Product } from "@/lib/types";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  const { isAuthenticated } = useGlobalContext();

  const saveDetails = (product: any) => {
    setProduct((prev) => ({ ...prev, ...product }));
  };

  const clearDetails = useCallback(() => {
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
      // "Not chosen yet". `Product.condition` now only admits the three API
      // values; this context goes with the old create flow in ENG-10 WP5.
      condition: "" as unknown as Product["condition"],
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
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      clearDetails();
    }
  }, [clearDetails, isAuthenticated]);

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
