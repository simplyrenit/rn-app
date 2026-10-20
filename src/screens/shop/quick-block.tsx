import { fetchFree, makeBlock, refreshShop } from "@/backend/shop-today";
import { Button, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { Stepper } from "@/components/core/stepper";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { ProductPicker } from "@/components/shop/product-picker";
import { apiError } from "@/lib/api-error";
import { todayIst } from "@/lib/booking";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { dayLabel } from "@/lib/shop";
import {
  BLOCK_REASONS,
  Block,
  PickerProduct,
  QuickBlockForm,
  blockCall,
  blockErrorText,
  blockHold,
  blockLabel,
  clampQuantity,
  freeText,
  reasonNote,
  startForm,
  untilLabel,
} from "@/lib/shop-today";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CalendarIcon, InformationCircleIcon, MagnifyingGlassIcon, MinusIcon, PlusIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

/**
 * SH-05, "Rented at the counter": the item, how many, until when and why. It
 * takes no customer details. A walk-in of one unit is the server's one-tap
 * call (`blocks/counter/`); more units, a repair or another reason is the
 * general block. Both start today, and the server refuses units that are
 * already in use (`only_n_free`), so the phone says how many are free first.
 */
export const QuickBlockSheet = forwardRef<BottomSheetModal, { onBlocked?: (block: Block) => void }>(
  ({ onBlocked }, ref) => {
    const { color, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const [form, setForm] = useState<QuickBlockForm>(() => startForm());
    const [picking, setPicking] = useState(false);
    const [pickingDay, setPickingDay] = useState(false);
    const [saving, setSaving] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    // A second tap before the first is answered is dropped here: state is not fast enough.
    const sending = useRef(false);
    const today = todayIst();

    const product = form.product;
    const free = useQuery(
      ["block-free", product?.name, today, form.lastDay],
      () => fetchFree(product!.name, today, form.lastDay),
      { enabled: Boolean(product) && form.lastDay >= today, staleTime: 0, retry: 1 }
    );
    const freeCount = free.data?.free;
    const inStock = free.data?.quantity ?? product?.quantity ?? null;

    // The count can move under the stepper (another day, another item): keep the number inside it.
    useEffect(() => {
      setForm((f) => (f.quantity === clampQuantity(f.quantity, freeCount) ? f : { ...f, quantity: clampQuantity(f.quantity, freeCount) }));
    }, [freeCount]);

    const reset = () => {
      setForm(startForm());
      setNote(null);
    };

    const hold = blockHold(form, freeCount);
    const submit = async () => {
      const call = blockCall(form);
      if (!call || hold || sending.current) return;
      sending.current = true;
      setSaving(true);
      setNote(null);
      try {
        const block = await makeBlock(call);
        refreshShop(queryClient);
        toast.success("Blocked", { message: `${block.product.title} · until ${untilLabel(block.last_day)}` });
        if (ref && "current" in ref) ref.current?.dismiss();
        onBlocked?.(block);
      } catch (error) {
        const failure = apiError(error);
        setNote(blockErrorText(failure));
        // Fewer are free than the screen said: read the number again.
        if (failure?.code === "only_n_free") void free.refetch();
      } finally {
        sending.current = false;
        setSaving(false);
      }
    };

    const pick = (p: PickerProduct) => {
      setPicking(false);
      setNote(null);
      setForm((f) => ({ ...f, product: { name: p.name, title: p.title, quantity: p.quantity }, quantity: 1 }));
    };

    const section = { fontSize: "text-md", fontWeight: "font-bold" } as const;
    const line = freeText(freeCount, inStock);

    return (
      <>
        <CustomBottomSheetModal
          ref={ref}
          isDark={isDark}
          snapPoints={[640 + insets.bottom]}
          frame
          onDismiss={reset}
        >
          <View
            style={{
              paddingHorizontal: SCREEN_GUTTER,
              paddingTop: space.sm,
              paddingBottom: insets.bottom + space.sm,
              gap: space.md,
            }}
          >
            <Text role="sectionTitle" accessibilityRole="header">
              Rented at the counter
            </Text>

            <View style={{ gap: space.xs }}>
              <Text {...section}>Product</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={product ? `Item: ${product.title}. Change it.` : "Pick the item"}
                activeOpacity={0.7}
                onPress={() => setPicking(true)}
                style={{
                  minHeight: MIN_TOUCH_TARGET + 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  paddingHorizontal: space.md,
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderColor: color.inputLine,
                }}
              >
                <MagnifyingGlassIcon size={20} color={color.textDim} />
                <Text fontSize="text-md" fontWeight={product ? "font-bold" : "font-normal"} tone={product ? "default" : "dim"} numberOfLines={1} style={{ flex: 1 }}>
                  {product?.title ?? "Search your items"}
                </Text>
                {product ? (
                  <Text fontSize="text-sm" tone="body">
                    {product.quantity} in stock
                  </Text>
                ) : null}
              </TouchableOpacity>
            </View>

            <View style={{ gap: space.xs }}>
              <Text {...section}>How many</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Stepper
                  label="One fewer"
                  disabled={form.quantity <= 1}
                  onPress={() => setForm((f) => ({ ...f, quantity: clampQuantity(f.quantity - 1, freeCount) }))}
                >
                  <MinusIcon size={20} color={color.text} />
                </Stepper>
                <Text fontSize="text-xl" fontWeight="font-bold" accessibilityLabel={`${form.quantity} units`} style={{ minWidth: 28, textAlign: "center" }}>
                  {form.quantity}
                </Text>
                <Stepper
                  label="One more"
                  disabled={!product || freeCount === undefined || form.quantity >= Math.max(freeCount, 1)}
                  onPress={() => setForm((f) => ({ ...f, quantity: clampQuantity(f.quantity + 1, freeCount) }))}
                >
                  <PlusIcon size={20} color={color.text} />
                </Stepper>
                <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                  {product ? (line ?? "Checking…") : ""}
                </Text>
              </View>
            </View>

            <View style={{ gap: space.xs }}>
              <Text {...section}>Until</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Until ${untilLabel(form.lastDay)}. Change the day.`}
                activeOpacity={0.7}
                onPress={() => setPickingDay(true)}
                style={{
                  minHeight: MIN_TOUCH_TARGET + 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  paddingHorizontal: space.md,
                  borderRadius: radius.input,
                  borderWidth: 1,
                  borderColor: color.inputLine,
                }}
              >
                <CalendarIcon size={20} color={color.text} />
                <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                  {untilLabel(form.lastDay)}
                </Text>
                <ChevronRightIcon size={20} color={color.text} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: space.xs }}>
              <Text {...section}>Reason</Text>
              <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {BLOCK_REASONS.map(({ key, label }) => {
                  const selected = form.reason === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      activeOpacity={0.8}
                      onPress={() => setForm((f) => ({ ...f, reason: key }))}
                      style={{
                        minHeight: MIN_TOUCH_TARGET,
                        justifyContent: "center",
                        paddingHorizontal: space.md,
                        borderRadius: radius.full,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? color.brand : color.inputLine,
                        backgroundColor: selected ? color.brandWash : color.surface,
                      }}
                    >
                      <Text fontSize="text-md" fontWeight="font-bold" tone={selected ? "brand" : "default"}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: space.sm,
                padding: space.md,
                borderRadius: radius.button,
                backgroundColor: color.surfaceRaised,
              }}
            >
              <InformationCircleIcon size={20} color={color.textBody} />
              <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                {reasonNote(form.reason)}
              </Text>
            </View>

            {note ? (
              <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger }}>
                {note}
              </Text>
            ) : hold && product ? (
              <Text fontSize="text-sm" tone="body">
                {hold}
              </Text>
            ) : null}

            <Button loading={saving} disabled={saving || Boolean(hold)} onPress={() => void submit()}>
              {blockLabel(form.quantity)}
            </Button>
          </View>
        </CustomBottomSheetModal>

        {picking ? <ProductPicker onPick={pick} onCancel={() => setPicking(false)} /> : null}
        {pickingDay ? (
          <DayPickerModal
            title="Until"
            line={(picked) => (picked ? `Blocked through ${dayLabel(picked)}.` : "Pick the last day.")}
            value={form.lastDay}
            minDate={today}
            onCancel={() => setPickingDay(false)}
            onPick={(day) => {
              setPickingDay(false);
              setForm((f) => ({ ...f, lastDay: day }));
            }}
          />
        ) : null}
      </>
    );
  }
);
