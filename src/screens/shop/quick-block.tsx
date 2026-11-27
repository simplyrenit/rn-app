import { fetchFree, makeBlock, refreshShop } from "@/backend/shop-today";
import { Chip, SheetFooter, SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { ProductPicker } from "@/components/shop/product-picker";
import { apiError } from "@/lib/api-error";
import { todayIst } from "@/lib/booking";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
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
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { CalendarIcon, ChevronRightIcon, MinusIcon, PlusIcon } from "react-native-heroicons/mini";
import { InformationCircleIcon, MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

// 2094:21684 / 21828: the kit Sheet header (21 grabber + 44 title row + 8), the content, and the kit Sheet footer
// (a hairline, 16, the 52 Primary, 16), less the frame's 21pt home-indicator strip, which `insets.bottom` stands in for.
const SHEET_HEADER = 73;
const SHEET_FOOTER = 85;
// The content of 21684 (the two-line walk-in note) until it is measured.
const CONTENT_FIRST_GUESS = 456;

/** The frame's 44 square stepper, r12, a hairline; 38% when it can't be pressed. */
function CountButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color.line,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.38 : 1,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

/** A field of the sheet: its SemiBold 14/20 label, 8 above what it holds. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text role="fieldLabel">{label}</Text>
      {children}
    </View>
  );
}

/**
 * SH-05, "Rented at the counter": the item, how many, until when and why. It
 * takes no customer details. A walk-in of one unit is the server's one-tap
 * call (`blocks/counter/`); more units, a repair or another reason is the
 * general block. Both start today, and the server refuses units that are
 * already in use (`only_n_free`), so the phone says how many are free first.
 *
 * `today` (`YYYY-MM-DD`) is the day it runs on; without it, the phone's own day in India. Only a design fixture
 * passes it (dev builds), so a frame's days are pickable whatever the phone's clock says.
 */
export const QuickBlockSheet = forwardRef<BottomSheetModal, { onBlocked?: (block: Block) => void; today?: string }>(
  ({ onBlocked, today: fixedToday }, ref) => {
    const { color, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const queryClient = useQueryClient();
    // Every "now" below (the start of the form, the earliest day, which call to make) is this one day.
    const anchor = fixedToday ? new Date(`${fixedToday}T12:00:00+05:30`) : undefined;
    const [form, setForm] = useState<QuickBlockForm>(() => startForm(anchor));
    const [picking, setPicking] = useState(false);
    const [pickingDay, setPickingDay] = useState(false);
    const [saving, setSaving] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [contentHeight, setContentHeight] = useState(CONTENT_FIRST_GUESS);
    // A second tap before the first is answered is dropped here: state is not fast enough.
    const sending = useRef(false);
    const today = fixedToday ?? todayIst();

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
      setForm(startForm(anchor));
      setNote(null);
    };

    const hold = blockHold(form, freeCount, anchor);
    const submit = async () => {
      const call = blockCall(form, anchor);
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

    const line = freeText(freeCount, inStock);
    const row = {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: color.line,
      backgroundColor: color.surface,
    } as const;

    return (
      <>
        <CustomBottomSheetModal
          ref={ref}
          isDark={isDark}
          // Sized to what it holds (635 with the two-line walk-in note, 615 with a one-line one), never taller than
          // the window below the status bar: the sheet scrolls, so the rest is a scroll away.
          snapPoints={[Math.min(SHEET_HEADER + contentHeight + SHEET_FOOTER + insets.bottom, height - insets.top)]}
          frame
          onDismiss={reset}
        >
          <SheetHeader title="Rented at the counter" grabber={false} />
          <View
            onLayout={(event) => setContentHeight(Math.ceil(event.nativeEvent.layout.height))}
            style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24, gap: 20 }}
          >
            <Field label="Product">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={product ? `Item: ${product.title}. Change it.` : "Pick the item"}
                activeOpacity={0.7}
                onPress={() => setPicking(true)}
                style={row}
              >
                <MagnifyingGlassIcon size={20} color={color.textDim} strokeWidth={1.5} />
                <Text
                  fontSize="text-md"
                  lineHeight={24}
                  fontWeight={product ? "font-semibold" : "font-normal"}
                  tone={product ? "default" : "dim"}
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {product?.title ?? "Search your items"}
                </Text>
                {product ? (
                  <Text fontSize="text-sm" lineHeight={20} tone="body">
                    {product.quantity} in stock
                  </Text>
                ) : null}
              </TouchableOpacity>
            </Field>

            <Field label="How many">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <CountButton
                  label="One fewer"
                  disabled={form.quantity <= 1}
                  onPress={() => setForm((f) => ({ ...f, quantity: clampQuantity(f.quantity - 1, freeCount) }))}
                >
                  <MinusIcon size={20} color={color.text} />
                </CountButton>
                <Text fontSize="text-lg" fontWeight="font-bold" lineHeight={28} accessibilityLabel={`${form.quantity} units`}>
                  {form.quantity}
                </Text>
                <CountButton
                  label="One more"
                  disabled={!product || freeCount === undefined || form.quantity >= Math.max(freeCount, 1)}
                  onPress={() => setForm((f) => ({ ...f, quantity: clampQuantity(f.quantity + 1, freeCount) }))}
                >
                  <PlusIcon size={20} color={color.text} />
                </CountButton>
                <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1 }}>
                  {product ? (line ?? "Checking…") : ""}
                </Text>
              </View>
            </Field>

            <Field label="Until">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Until ${untilLabel(form.lastDay)}. Change the day.`}
                activeOpacity={0.7}
                onPress={() => setPickingDay(true)}
                style={row}
              >
                <CalendarIcon size={20} color={color.text} />
                <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} style={{ flex: 1 }}>
                  {untilLabel(form.lastDay)}
                </Text>
                <ChevronRightIcon size={20} color={color.textDim} />
              </TouchableOpacity>
            </Field>

            <Field label="Reason">
              <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {BLOCK_REASONS.map(({ key, label }) => {
                  const selected = form.reason === key;
                  return (
                    <Chip
                      key={key}
                      label={label}
                      selected={selected}
                      onPress={() => setForm((f) => ({ ...f, reason: key }))}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ selected }}
                      hitSlop={{ top: 2, bottom: 2 }}
                    />
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, backgroundColor: color.surfaceMuted }}>
                <InformationCircleIcon size={20} color={color.textBody} strokeWidth={1.5} />
                <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1 }}>
                  {reasonNote(form.reason)}
                </Text>
              </View>
            </Field>

            {note ? (
              <Text fontSize="text-sm" lineHeight={20} accessibilityRole="alert" style={{ color: color.danger }}>
                {note}
              </Text>
            ) : hold && product ? (
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                {hold}
              </Text>
            ) : null}
          </View>
          <SheetFooter
            primary={{
              label: blockLabel(form.quantity),
              onPress: () => void submit(),
              loading: saving,
              disabled: saving || Boolean(hold),
            }}
          />
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
