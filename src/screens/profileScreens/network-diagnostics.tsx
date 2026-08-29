import { Button, StaticContainer, Text } from "@/components/core";
import { DEV_MODE, GET_CATEGORIES, SERVERURL } from "@/lib/config";
import { fetchWithRetry } from "@/lib/networkUtils";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";

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

  const getStateColor = (state: TestState) => {
    if (state === "success") return "text-green-500";
    if (state === "error") return "text-danger";
    if (state === "loading") return "text-yellow-500";
    return "text-muted-light";
  };

  return (
    <StaticContainer width={100}>
      <ScrollView className="px-gutter pt-5">
        <Text fontSize="text-2xl" fontWeight="font-bold">
          Network Diagnostics
        </Text>
        <Text className="mt-1 text-muted-light">
          Validate runtime API connectivity on this device.
        </Text>

        <View className="mt-6 rounded-card border border-line-light p-4">
          <Text fontWeight="font-bold">Environment</Text>
          <Text className="mt-2">APP_ENV: {DEV_MODE}</Text>
          <Text className="mt-2">SERVERURL: {SERVERURL}</Text>
        </View>

        <View className="mt-6 rounded-card border border-line-light p-4">
          <Text fontWeight="font-bold">REST Check</Text>
          <Text className="mt-2">Endpoint: {GET_CATEGORIES}</Text>
          <Button className="mt-3" onPress={runRestTest}>
            Test REST
          </Button>
          <Text className={`mt-2 ${getStateColor(restResult.state)}`}>
            {restResult.message || "No test run yet"}
          </Text>
        </View>
      </ScrollView>
    </StaticContainer>
  );
}
