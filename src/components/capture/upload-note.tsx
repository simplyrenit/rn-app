import { captureQueue, useCaptureDraft } from "@/backend/capture-jobs";
import { Text } from "@/components/core";
import { Moment, Side, uploadLine, uploadProgress } from "@/lib/capture";
import { radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

/** The bar under a record that is going up. */
export function UploadBar({ fraction }: { fraction: number }) {
  const { color } = useTheme();
  return (
    <View style={{ height: 6, borderRadius: radius.full, backgroundColor: color.surfaceRaised, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(fraction * 100)}%`, height: 6, backgroundColor: color.brand }} />
    </View>
  );
}

/**
 * What a day-of screen says about this phone's record while the server does not
 * have it all: how far it is, that it waits for a connection, or that it needs
 * the person. Nothing at all once it is up. The rental cannot close, and the
 * owner is not paid, until it has uploaded, so it is always in sight.
 */
export function UploadNote({ number, moment, side }: { number: string; moment: Moment; side: Side }) {
  const { color } = useTheme();
  const draft = useCaptureDraft(number, moment, side);
  const line = uploadLine(draft);
  if (!draft || !line) return null;
  const warning = line.tone === "warning";
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.button,
        backgroundColor: warning ? color.warningWash : color.surfaceRaised,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
          {line.text}
        </Text>
        {warning ? (
          <Text
            fontSize="text-sm"
            fontWeight="font-bold"
            tone="brand"
            accessibilityRole="button"
            accessibilityLabel="Try the upload again"
            onPress={() => captureQueue.retry(draft.id)}
            style={{ paddingVertical: space.xs, paddingLeft: space.sm }}
          >
            Try again
          </Text>
        ) : null}
      </View>
      <UploadBar fraction={uploadProgress(draft).fraction} />
    </View>
  );
}
