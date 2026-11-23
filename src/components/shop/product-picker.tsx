import { fetchPickerProducts } from "@/backend/shop-today";
import { EmptyState, Skeleton, Text } from "@/components/core";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, fontFamily, space } from "@/lib/design-tokens";
import { PickerProduct, filterPicker } from "@/lib/shop-today";
import { useTheme } from "@/lib/theme";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, TextInput, TouchableOpacity, View } from "react-native";
import { ExclamationTriangleIcon, MagnifyingGlassIcon, XMarkIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "react-query";

/**
 * One of the shop's items, by search. For the quick block: live and paused products only.
 * 2094:21970 / 22017: an 80 search header (a 48 field, r12, edged in brand while it has focus, and a 44 Close), then
 * 74 rows split by hairlines.
 */
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
  const [focused, setFocused] = useState(false);
  // The owner's listings are read once, and searched here as they type.
  const query = useQuery(["picker-products"], fetchPickerProducts, { staleTime: 30_000, retry: 1 });
  const shown = useMemo(() => filterPicker(query.data ?? [], text), [query.data, text]);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onCancel}
      // Drawn under the Android status bar, as the app is: the padding below is the app's
      // status-bar inset, which the modal's own window would otherwise add a second time.
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: color.canvas, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16, paddingHorizontal: SCREEN_GUTTER }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 48,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: focused ? color.brand : color.line,
            }}
          >
            <MagnifyingGlassIcon size={20} color={color.textDim} strokeWidth={1.5} />
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search your items"
              placeholderTextColor={color.placeholder}
              accessibilityLabel="Search your items"
              returnKeyType="search"
              // The core Text's cap, and the family by name: Android picks no face from a weight.
              maxFontSizeMultiplier={1.4}
              style={{ flex: 1, color: color.text, fontFamily: fontFamily.regular, fontSize: 16, paddingVertical: 12 }}
            />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onCancel}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center" }}
          >
            <XMarkIcon size={24} color={color.text} strokeWidth={1.5} />
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
            contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: insets.bottom + 24 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: color.line }} />}
            ListEmptyComponent={
              // 2094:22017: 120 under the header; the empty state pads its own gutter, so it takes the list's back.
              <View style={{ paddingTop: 120, marginHorizontal: -SCREEN_GUTTER }}>
                <EmptyState
                  icon={<MagnifyingGlassIcon size={32} color={color.brandText} strokeWidth={1.5} />}
                  title={text.trim() ? "No item matches that" : "You have no items to block yet"}
                  body={text.trim() ? "Try the name or the code you gave it." : "Items that are live or paused can be blocked."}
                />
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.quantity} in stock`}
                activeOpacity={0.7}
                onPress={() => onPick(item)}
                style={{ justifyContent: "center", gap: 2, paddingVertical: 14 }}
              >
                <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text fontSize="text-sm" lineHeight={20} tone="body">
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
