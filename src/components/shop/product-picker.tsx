import { fetchPickerProducts } from "@/backend/shop-today";
import { EmptyState, Skeleton, Text } from "@/components/core";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { PickerProduct, filterPicker } from "@/lib/shop-today";
import { useTheme } from "@/lib/theme";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, TextInput, TouchableOpacity, View } from "react-native";
import { ExclamationTriangleIcon, MagnifyingGlassIcon, XMarkIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "react-query";

/** One of the shop's items, by search. For the quick block: live and paused products only. */
export function ProductPicker({
  onPick,
  onCancel,
}: {
  onPick: (product: PickerProduct) => void;
  onCancel: () => void;
}) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  // The owner's listings are read once, and searched here as they type.
  const query = useQuery(["picker-products"], fetchPickerProducts, { staleTime: 30_000, retry: 1 });
  const shown = useMemo(() => filterPicker(query.data ?? [], text), [query.data, text]);

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: color.canvas, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: SCREEN_GUTTER }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: space.md,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor: color.inputLine,
            }}
          >
            <MagnifyingGlassIcon size={20} color={color.textDim} />
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder="Search your items"
              placeholderTextColor={color.placeholder}
              accessibilityLabel="Search your items"
              returnKeyType="search"
              style={{ flex: 1, color: color.text, fontSize: 16, paddingVertical: 8 }}
            />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onCancel}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}
          >
            <XMarkIcon size={24} color={color.text} />
          </TouchableOpacity>
        </View>

        {query.isLoading ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your items"
            style={{ paddingHorizontal: SCREEN_GUTTER, gap: space.sm }}
          >
            <Skeleton width="100%" height={56} />
            <Skeleton width="100%" height={56} />
            <Skeleton width="100%" height={56} />
          </View>
        ) : query.isError ? (
          <EmptyState
            variant="error"
            icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
            title="We couldn't load your items"
            body="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void query.refetch()}
          />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(item) => item.name}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: insets.bottom + space.lg }}
            ListEmptyComponent={
              <EmptyState
                title={text.trim() ? "No item matches that" : "You have no items to block yet"}
                body={text.trim() ? "Try the name or the code you gave it." : "Items that are live or paused can be blocked."}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.quantity} in stock`}
                activeOpacity={0.7}
                onPress={() => onPick(item)}
                style={{
                  minHeight: 56,
                  justifyContent: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: color.line,
                  paddingVertical: space.sm,
                }}
              >
                <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {[item.shop_code || null, `${item.quantity} in stock`].filter(Boolean).join(" · ")}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
