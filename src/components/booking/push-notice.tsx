import { useRingPermission } from "@/backend/ring-permission";
import { Notice } from "@/components/booking/parts";
import { customerDeadlineNotice, customerPushNotice } from "@/lib/ring-permission";
import React, { useEffect, useState } from "react";
import { Pressable } from "react-native";

/**
 * One line for a customer whose phone cannot show a push, with the way to the settings
 * (review before merge, R-1). With `ask`, the first time it opens it also asks the
 * system, here, where the reason is on screen: right after Book now, while the owner is
 * rung. It is the same ask and the same key as the shop's (the permission is one per
 * install), and it never blocks the booking. Without `ask` (the screens with a deadline)
 * it only says so: no second system prompt.
 */
export function PushNotice({ ask = false, deadline = false }: { ask?: boolean; deadline?: boolean }) {
  const { state, askOnce, openSettings } = useRingPermission();
  // Until the system's prompt has been answered the line would sit behind it saying the wrong thing.
  const [asking, setAsking] = useState(ask);

  useEffect(() => {
    if (!ask || state !== "ask") return;
    void askOnce().finally(() => setAsking(false));
  }, [ask, state, askOnce]);

  // A phone that is already allowed (or cannot be asked) never reaches "ask" to clear this.
  useEffect(() => {
    if (state && state !== "ask") setAsking(false);
  }, [state]);

  const line = asking ? null : deadline ? customerDeadlineNotice(state) : customerPushNotice(state);
  if (!line) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Opens the phone's settings" onPress={openSettings}>
      <Notice tone="warning" icon="warning">
        {line}
      </Notice>
    </Pressable>
  );
}
