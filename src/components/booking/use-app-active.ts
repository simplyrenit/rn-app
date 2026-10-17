import { useEffect, useState } from "react";
import { AppState } from "react-native";

/** True while the app is in front. A screen that asks the server on a timer stops when it is not. */
export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState !== "background");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => subscription.remove();
  }, []);
  return active;
}
