import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

/**
 * How much of the screen the software keyboard currently covers.
 *
 * iOS only, by design. Android's MainActivity declares
 * `windowSoftInputMode="adjustResize"`, so the OS already shrinks the window
 * when the keyboard opens and layouts reflow on their own. Adding padding
 * there as well would double-compensate and push the bottom of the screen out
 * of view, so this returns 0 on Android and every caller becomes a no-op.
 *
 * `keyboardWillChangeFrame` is used rather than a show/hide pair so that
 * height changes — switching to the emoji keyboard, a hardware keyboard being
 * attached, autocorrect bars appearing — are tracked too.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    const onChangeFrame = Keyboard.addListener(
      "keyboardWillChangeFrame",
      (event) => {
        const screenHeight = Dimensions.get("window").height;
        const covered = screenHeight - event.endCoordinates.screenY;
        setInset(covered > 0 ? covered : 0);
      }
    );

    const onHide = Keyboard.addListener("keyboardWillHide", () => setInset(0));

    return () => {
      onChangeFrame.remove();
      onHide.remove();
    };
  }, []);

  return inset;
}
