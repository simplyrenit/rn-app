import { AuthUser } from "@/lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  user: AuthUser | null;
  saveUser: (user: any) => void;
  getUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const saveUser = async (user: AuthUser) => {
    setUser((prev) => ({ ...prev, ...user }));
    await saveToAsync(user);
  };

  const saveToAsync = async (newUserData: Partial<AuthUser>) => {
    try {
      // const { email_verified, password, ...filteredData } = newUserData; // Exclude emailVerified and password

      const existingUserData = await AsyncStorage.getItem("user");
      const userData = existingUserData ? JSON.parse(existingUserData) : {};

      const updatedUserData = {
        ...userData,
        ...newUserData,
      };

      setUser(updatedUserData);

      await AsyncStorage.setItem("user", JSON.stringify(updatedUserData));
    } catch (error) {
      console.error("Error saving user data to AsyncStorage", error);
    }
  };

  const getUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error retrieving user data from AsyncStorage", error);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  const value = {
    user,
    saveUser,
    getUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
