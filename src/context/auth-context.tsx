import { useGlobalContext } from "@/context/global-context";
import { AuthUser } from "@/lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface AuthContextType {
  /** The sign-up in progress, held in memory only. */
  user: AuthUser | null;
  /** Adds what the sign-up has learned so far (the email, the name, the password, the proof token). */
  saveUser: (user: Partial<AuthUser>) => void;
  /** Forgets the sign-up: it finished, was abandoned, or the person signed in or out. */
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The key the sign-up details were once written to. They are not written any more: the record held the password in
 * plain text and, since the sign-in proofs, the proof token, and it was never removed. A sign-up cannot be picked up
 * after the app is closed (it starts again at the email or the phone and gets a new proof), so nothing was gained.
 */
const LEGACY_KEY = "user";

/**
 * The sign-up details between its screens: in memory, never in storage (review app-6 r1 #1). They go when the sign-up
 * ends (the account is made and the person is signed in), when the person signs in or out some other way, and with the
 * app. A record an older build left in storage is removed at start, which also takes its password off the disk.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { isAuthenticated } = useGlobalContext();

  const saveUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => ({ ...(prev ?? {}), ...patch }) as AuthUser);
  }, []);

  const clearUser = useCallback(() => setUser(null), []);

  useEffect(() => {
    void AsyncStorage.removeItem(LEGACY_KEY).catch(() => undefined);
  }, []);

  // Signed in (the sign-up finished, or an existing account signed in) or signed out: no sign-up is in progress.
  useEffect(() => {
    setUser(null);
  }, [isAuthenticated]);

  const value = { user, saveUser, clearUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
