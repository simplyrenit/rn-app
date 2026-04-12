import { Button, StaticContainer, Text } from "@/components/core";
import { DEV_MODE, GET_CATEGORIES, SERVERURL, SOCKET_URL } from "@/lib/config";
import { fetchWithRetry } from "@/lib/networkUtils";
import React, { useEffect, useRef, useState } from "react";
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

const testRoom = "__network_diagnostics__";

export default function NetworkDiagnosticsScreen() {
  const [restResult, setRestResult] = useState<TestResult>(initialResult);
  const [wsResult, setWsResult] = useState<TestResult>(initialResult);

  const wsRef = useRef<WebSocket | null>(null);
  const wsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wsTestUrl = `${SOCKET_URL}${testRoom}/`;

  const clearWsSession = () => {
    if (wsTimerRef.current) {
      clearTimeout(wsTimerRef.current);
      wsTimerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (error) {}
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearWsSession();
    };
  }, []);

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

  const runWsTest = () => {
    clearWsSession();
    setWsResult({
      state: "loading",
      message: "Testing websocket connection...",
    });

    let opened = false;

    try {
      const socket = new WebSocket(wsTestUrl);
      wsRef.current = socket;

      wsTimerRef.current = setTimeout(() => {
        if (!opened) {
          setWsResult({
            state: "error",
            message: "WS failed (timeout waiting for handshake)",
          });
          clearWsSession();
        }
      }, 7000);

      socket.onopen = () => {
        opened = true;
        setWsResult({
          state: "success",
          message: "WS OK (handshake successful)",
        });
        clearWsSession();
      };

      socket.onerror = () => {
        setWsResult({
          state: "error",
          message: "WS failed (handshake/network error)",
        });
        clearWsSession();
      };

      socket.onclose = (event) => {
        if (!opened) {
          setWsResult({
            state: "error",
            message: `WS closed before open (code ${event.code})`,
          });
        }
        clearWsSession();
      };
    } catch (error: any) {
      setWsResult({
        state: "error",
        message: "WS failed (invalid URL or connection setup error)",
      });
      clearWsSession();
    }
  };

  const getStateColor = (state: TestState) => {
    if (state === "success") return "text-green-500";
    if (state === "error") return "text-red-500";
    if (state === "loading") return "text-yellow-500";
    return "text-gray-500";
  };

  return (
    <StaticContainer width={100}>
      <ScrollView className="px-5 pt-5">
        <Text fontSize="text-2xl" fontWeight="font-bold">
          Network Diagnostics
        </Text>
        <Text className="mt-1 text-[#777]">
          Validate runtime API and websocket connectivity on this device.
        </Text>

        <View className="mt-6 rounded-xl border border-[#E6E6E6] p-4">
          <Text fontWeight="font-bold">Environment</Text>
          <Text className="mt-2">APP_ENV: {DEV_MODE}</Text>
          <Text className="mt-2">SERVERURL: {SERVERURL}</Text>
          <Text className="mt-2">SOCKET_URL: {SOCKET_URL}</Text>
        </View>

        <View className="mt-6 rounded-xl border border-[#E6E6E6] p-4">
          <Text fontWeight="font-bold">REST Check</Text>
          <Text className="mt-2">Endpoint: {GET_CATEGORIES}</Text>
          <Button className="mt-3" onPress={runRestTest}>
            Test REST
          </Button>
          <Text className={`mt-2 ${getStateColor(restResult.state)}`}>
            {restResult.message || "No test run yet"}
          </Text>
        </View>

        <View className="mt-4 mb-10 rounded-xl border border-[#E6E6E6] p-4">
          <Text fontWeight="font-bold">WebSocket Check</Text>
          <Text className="mt-2">Endpoint: {wsTestUrl}</Text>
          <Button className="mt-3" onPress={runWsTest}>
            Test WS
          </Button>
          <Text className={`mt-2 ${getStateColor(wsResult.state)}`}>
            {wsResult.message || "No test run yet"}
          </Text>
        </View>
      </ScrollView>
    </StaticContainer>
  );
}
