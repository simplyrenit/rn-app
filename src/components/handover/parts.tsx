import { Panel } from "@/components/booking/parts";
import { Button, Text } from "@/components/core";
import { DayStatus } from "@/lib/booking";
import { CallCopy, StatusButton, telUrl } from "@/lib/day-of";
import { MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Linking, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { PhoneIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";

/**
 * One stage-changing tap at a time (the brief: "blocks double taps"). `run` does
 * nothing while another is going; `running` names the one in flight, for its spinner.
 */
export function useGuardedTap() {
  const busy = useRef(false);
  const [running, setRunning] = useState<string | null>(null);
  const run = async (key: string, work: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setRunning(key);
    try {
      await work();
    } finally {
      busy.current = false;
      setRunning(null);
    }
  };
  return { running, run };
}

/** The preset buttons: two or three in a row, the one last tapped filled in. No free text. */
export function StatusButtons({
  buttons,
  mine,
  disabled,
  sending,
  onTap,
}: {
  buttons: StatusButton[];
  mine: DayStatus;
  disabled: boolean;
  /** The status being sent now. */
  sending: string | null;
  onTap: (status: StatusButton["status"]) => void;
}) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      {buttons.map((button) => {
        const chosen = mine === button.status;
        const off = disabled || sending !== null;
        return (
          <TouchableOpacity
            key={button.status}
            accessibilityRole="button"
            accessibilityLabel={button.label}
            accessibilityState={{ selected: chosen, disabled: off }}
            disabled={off}
            activeOpacity={0.7}
            onPress={() => onTap(button.status)}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: space.xs,
              borderRadius: radius.button,
              borderWidth: 1,
              borderColor: chosen ? color.brand : color.inputLine,
              backgroundColor: chosen ? color.brandPanel : color.surface,
              alignItems: "center",
              justifyContent: "center",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {sending === button.status ? (
              <ActivityIndicator size="small" color={color.brandText} />
            ) : (
              <Text fontSize="text-sm" fontWeight="font-bold" tone={chosen ? "brand" : "default"} style={{ textAlign: "center" }}>
                {button.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Call: a direct dial from the phone, with the line that says when calls are open. */
export function CallButton({ copy }: { copy: CallCopy }) {
  const { color } = useTheme();
  const dial = () => {
    if (!copy.number) return;
    void Linking.openURL(telUrl(copy.number)).catch(() =>
      toast.error("The call could not be started", { message: "Check that this phone can make calls." })
    );
  };
  return (
    <View style={{ gap: space.xs }}>
      <Button variant="outline" disabled={!copy.number} onPress={dial} accessibilityLabel={copy.label}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <PhoneIcon size={20} color={copy.number ? color.text : color.textDim} />
          <Text fontSize="text-md" fontWeight="font-bold" tone={copy.number ? "default" : "dim"}>
            {copy.label}
          </Text>
        </View>
      </Button>
      <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
        {copy.note}
      </Text>
    </View>
  );
}

/** A words-and-chevron row: "The shop isn't here?", "Extend this rental". Dimmed and still while `disabled`. */
export function LinkRow({
  title,
  sub,
  onPress,
  disabled = false,
  first = true,
}: {
  title: string;
  sub?: string | null;
  onPress: () => void;
  disabled?: boolean;
  first?: boolean;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title} ${sub}` : title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        minHeight: MIN_TOUCH_TARGET + 12,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        padding: space.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: color.line,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-bold" tone={disabled ? "body" : "default"}>
          {title}
        </Text>
        {sub ? (
          <Text fontSize="text-sm" tone="body">
            {sub}
          </Text>
        ) : null}
      </View>
      {disabled ? null : <ChevronRightIcon size={20} color={color.textBody} />}
    </TouchableOpacity>
  );
}

export interface StepRow {
  label: string;
  sub?: string;
  state: "done" | "next" | "todo";
}

/** The steps of a handover or a return: a tick for what is done, a ring for what is next. */
export function StepList({ steps }: { steps: StepRow[] }) {
  const { color } = useTheme();
  return (
    <View>
      {steps.map((step, index) => {
        const done = step.state === "done";
        const next = step.state === "next";
        const last = index === steps.length - 1;
        return (
          <View
            key={step.label}
            accessible
            accessibilityLabel={`${step.label}${step.sub ? `. ${step.sub}` : ""}${done ? ", done" : next ? ", next" : ""}`}
            style={{ flexDirection: "row", gap: space.md }}
          >
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: radius.full,
                  borderWidth: done ? 0 : 2,
                  borderColor: next ? color.brand : color.inputLine,
                  backgroundColor: done ? color.successWash : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? (
                  <CheckIcon size={14} color={color.success} />
                ) : next ? (
                  <View style={{ width: 10, height: 10, borderRadius: radius.full, backgroundColor: color.brand }} />
                ) : null}
              </View>
              {last ? null : <View style={{ width: 1, flex: 1, minHeight: space.md, backgroundColor: color.inputLine }} />}
            </View>
            <View style={{ flex: 1, gap: 2, paddingBottom: last ? 0 : space.md }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                {step.label}
              </Text>
              {step.sub ? (
                <Text fontSize="text-sm" tone={done ? "success" : "body"}>
                  {step.sub}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A card with a small heading, for a block of a day-of screen. */
export function Block({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Panel style={{ padding: space.md, gap: space.md }}>
      {title ? (
        <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </Panel>
  );
}
