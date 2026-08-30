import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { StatusBar, StatusBarStyle } from "react-native";

/**
 * Gives the focused screen ownership of the status bar.
 *
 * `expo-status-bar`'s `<StatusBar>` is React Native's `<StatusBar>`, whose props
 * live in a stack that is merged last-entry-wins, and an entry's position in
 * that stack is fixed at mount: `componentDidUpdate` calls `replaceStackEntry`,
 * which writes back at the *same index*. So a re-render can never take the bar
 * back — only a later mount can.
 *
 * `Container`, `StaticContainer` and `NonScrollableContainer` each mount one
 * with the theme style, and the screen a detail view is pushed over stays
 * mounted underneath it. Which style the customer actually sees was therefore
 * decided by mount order, not by what is on screen.
 *
 * `StatusBar.setBarStyle` is not the fix either: it writes the *default* props
 * that the stack is merged on top of, so the next time anything anywhere mounts,
 * updates or unmounts a `<StatusBar>`, the stack overrides it again.
 *
 * Pushing an entry on focus and popping it on blur is the one arrangement that
 * puts this screen at the top of the stack for exactly as long as it is the
 * screen being looked at.
 */
export function useFocusedStatusBar(barStyle: StatusBarStyle) {
  useFocusEffect(
    useCallback(() => {
      const entry = StatusBar.pushStackEntry({ barStyle, animated: true });
      return () => StatusBar.popStackEntry(entry);
    }, [barStyle])
  );
}
