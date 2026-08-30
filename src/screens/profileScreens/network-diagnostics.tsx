import { Button, StaticContainer, Text } from "@/components/core";
import { DEV_MODE, GET_CATEGORIES, SERVERURL } from "@/lib/config";
import { fetchWithRetry } from "@/lib/networkUtils";
import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { TextTone } from "@/components/core/text";

type TestState = "idle" | "loading" | "success" | "error";

interface TestResult {
  state: TestState;
  message: string;
}

const initialResult: TestResult = {
  state: "idle",
  message: "",
};

export default function NetworkDiagnosticsScreen() {
  const [restResult, setRestResult] = useState<TestResult>(initialResult);

  const runRestTest = async () => {
    setRestResult({
      state: "loading",
      message: "Testing REST endpoint...",
    });

    try {
      const response = await fetchWithRetry(GET_CATEGORIES);
      const count = Array.isArray(response) ? response.length : 0;
      setRestResult({
        state: "success",
        message: `REST OK (${count} categories returned)`,
      });
    } catch (error: any) {
      const status = error?.response?.status;
      setRestResult({
        state: "error",
        message: status
          ? `REST failed (HTTP ${status})`
          : "REST failed (network/server unreachable)",
      });
    }
  };

  const getStateTone = (state: TestState): TextTone => {
    if (state === "success") return "success";
    if (state === "error") return "danger";
    if (state === "loading") return "warning";
    return "dim";
  };

  const { color } = useTheme();

  return (
    <StaticContainer width={100}>
      <ScrollView className="px-gutter pt-5">
        <Text fontSize="text-2xl" fontWeight="font-bold">
          Network Diagnostics
        </Text>
        <Text tone="dim" style={{ marginTop: 4 }}>
          Validate runtime API connectivity on this device.
        </Text>

        <View
          style={{
            marginTop: 24,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: color.line,
            padding: 16,
          }}
        >
          <Text fontWeight="font-bold">Environment</Text>
          <Text style={{ marginTop: 8 }}>APP_ENV: {DEV_MODE}</Text>
          <Text style={{ marginTop: 8 }}>SERVERURL: {SERVERURL}</Text>
        </View>

        <View
          style={{
            marginTop: 24,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: color.line,
            padding: 16,
          }}
        >
          <Text fontWeight="font-bold">REST Check</Text>
          <Text style={{ marginTop: 8 }}>Endpoint: {GET_CATEGORIES}</Text>
          <Button className="mt-3" onPress={runRestTest}>
            Test REST
          </Button>
          <Text tone={getStateTone(restResult.state)} style={{ marginTop: 8 }}>
            {restResult.message || "No test run yet"}
          </Text>
        </View>
      </ScrollView>
    </StaticContainer>
  );
}
