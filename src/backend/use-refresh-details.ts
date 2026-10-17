import { useGlobalContext } from "@/context/global-context";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

/**
 * Reads the signed-in person's details into the context each time the screen comes into focus
 * (ENG-271: the admin approves a merchant while the app is open on another tab). The context's
 * `fetchUserDetails` is rebuilt on every render of the provider, so the latest one is kept in a
 * ref and the focus callback stays the same: a callback that changed with it refetched on every
 * render, polling /users/me for as long as the screen was focused. Once per focus.
 */
export function useRefreshDetailsOnFocus(enabled = true) {
  const { fetchUserDetails } = useGlobalContext();
  const latest = useRef({ fetchUserDetails, enabled });
  latest.current = { fetchUserDetails, enabled };
  useFocusEffect(
    useCallback(() => {
      if (latest.current.enabled) void latest.current.fetchUserDetails();
    }, [])
  );
}
