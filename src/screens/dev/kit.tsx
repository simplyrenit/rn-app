/**
 * DevKit (ENG-426, dev builds only): one variant of one 2.1 kit component, drawn with the real component and the
 * kit's sample content, so a simulator screenshot can be diffed against its slot in `figma/00/<id>.png`.
 *
 * Opened by `renit-qa://dev/kit/<id>?variant=<name>&x=<scroll>` (src/dev/links.ts). The screen shows nothing but the
 * variant on the kit's canvas, and logs a `KITBOX` line with the two boxes `tools/visual_diff.py` takes, so the
 * app box is measured rather than guessed. See docs/renit-2.1-build/README.md, "DevKit".
 *
 * Reached only through `__DEV__ ? require(...) : null` in nav.tsx: release bundles never contain it.
 */
import { MoneyLine, Notice } from "@/components/booking/parts";
import { Timeline } from "@/components/booking/timeline";
import {
  BottomBar,
  Card,
  Chip,
  EmptyState,
  ListRow,
  MapPlaceholder,
  SectionHeader,
  SheetFooter,
  SheetHeader,
  StatusPill,
  StepProgress,
  SubpageHeader,
  Text,
  TextField,
} from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { KIT, KitItem, KitVariant } from "@/dev/kit-table";
import { ColorTokens, density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { RouteProps } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import React, { useEffect, useRef } from "react";
import { Image, ScrollView, View, useWindowDimensions } from "react-native";
import { ClipboardDocumentIcon, CubeIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_KIT_MARKER = "RENIT_DEV_KIT_MARKER";

const noop = () => {};
// The kit's sample photo (figma/00/images), bundled so the card needs no network.
const CAMERA = Image.resolveAssetSource(require("../../dev/assets/kit-listing-camera.png")).uri;
// Wait for fonts, the photo and the scroll to settle before measuring.
const SETTLE_MS = 600;
// Components that hug their content (kit HUG width): the slot must not hand them the kit width, or a pill drawn too
// wide or too narrow would still measure as the kit's box and the diff's size check could not catch it.
const HUG = new Set(["2073:14326", "2073:14380", "2073:14388", "2100:29942"]);

/** The kit item for `2073:14380` or `2073-14380`, and its variant by name ("Tone=Info"), value ("Info") or id. */
export function findKitVariant(item: string, variant?: string): { kit: KitItem; v: KitVariant } | null {
  const id = item.replace("-", ":");
  const kit = KIT.find((k) => k.id === id);
  if (!kit) return null;
  if (!variant) return { kit, v: kit.variants[0] };
  const want = variant.toLowerCase();
  const v = kit.variants.find(
    (x) =>
      x.name.toLowerCase() === want ||
      x.name.split("=").pop()?.toLowerCase() === want ||
      x.id === want.replace("-", ":")
  );
  return v ? { kit, v } : null;
}

/** The real component for one kit variant, with the kit's sample texts. `trimBottom` is layout outside its box. */
function slotFor(kit: KitItem, v: KitVariant, color: ColorTokens): { node: React.ReactNode; trimBottom?: number } | null {
  const value = v.name.split("=").pop();
  switch (kit.id) {
    case "2071:14418": // Top bar
      return {
        node:
          value === "Back+Title" ? (
            <SubpageHeader title="Booking details" onBack={noop} />
          ) : value === "Tab title" ? (
            <SubpageHeader variant="tab-title" title="Rentals" />
          ) : (
            <SubpageHeader variant="back-only" onBack={noop} />
          ),
      };
    case "2071:14467": // Bottom bar
      return {
        node:
          value === "Summary+CTA" ? (
            <BottomBar
              layout="summary-cta"
              value="₹1,200"
              unit="/day"
              subLine="Deposit ₹2,000"
              primary={{ label: "Book now", onPress: noop }}
            />
          ) : value === "Secondary+Primary" ? (
            <BottomBar
              layout="secondary-primary"
              secondary={{ label: "Add to cart", onPress: noop }}
              primary={{ label: "Book now", onPress: noop }}
            />
          ) : value === "CTA+Text" ? (
            <BottomBar
              layout="cta-text"
              primary={{ label: "Continue", onPress: noop }}
              secondary={{ label: "Not now", onPress: noop }}
            />
          ) : (
            <BottomBar layout="full-cta" primary={{ label: "Continue", onPress: noop }} />
          ),
      };
    case "2071:14471": // Sheet header
      return { node: <SheetHeader title="Delivery address" onClose={noop} /> };
    case "2071:14481": // Sheet footer (its Secondary link is hidden in the kit)
      return { node: <SheetFooter primary={{ label: "Save address", onPress: noop }} /> };
    case "2071:14501": // Sheet · usage example
      return {
        node: (
          <View>
            <SheetHeader title="Delivery address" onClose={noop} />
            <View style={{ paddingTop: 8, paddingHorizontal: 24, paddingBottom: 24 }}>
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                Sheet content goes here, padded 24 left and right.
              </Text>
            </View>
            <SheetFooter primary={{ label: "Save address", onPress: noop }} />
          </View>
        ),
      };
    case "2073:14326": // Listing card
      return {
        node: (
          <Card
            id="devkit-listing"
            image={CAMERA}
            title="Sony A7 IV camera"
            price="1200"
            location="Bandra West, Mumbai"
            width={162}
          />
        ),
      };
    case "2073:14341": // Section header
      return { node: <SectionHeader title="Popular near you" onSeeAll={noop} gutter={false} flush /> };
    case "2073:14364": // List row
      return {
        node: (
          <ListRow
            label="Saved addresses"
            subLabel={value === "Two-line" ? "Home is your default" : undefined}
            value="2"
            leadingIcon={CubeIcon}
            onPress={noop}
          />
        ),
      };
    case "2073:14380": {
      const label = { Neutral: "Completed", Success: "Ready", Warning: "Asking the owner", Danger: "Cancelled", Info: "In review" };
      const tone = value?.toLowerCase() as "neutral" | "success" | "warning" | "danger" | "info";
      return { node: <StatusPill label={label[value as keyof typeof label]} tone={tone} /> };
    }
    case "2073:14388": // Chip
      return { node: <Chip label="Good" selected={value === "Selected"} onPress={noop} /> };
    case "2073:14413": // Form field. TextField's root carries the form's gap under it, outside the kit box.
      return {
        trimBottom: density.fieldGap,
        node: (
          <TextField
            label="Full name"
            placeholder="Enter your full name"
            hint="As on your PAN card"
            defaultValue={value === "Filled" ? "Riya Sharma" : value === "Focused" ? "Riya Sh" : undefined}
            autoFocus={value === "Focused"}
            error={value === "Error" ? "Enter your full name as on your PAN" : undefined}
          />
        ),
      };
    case "2074:14356": {
      // Timeline step: a second row after it, clipped to the kit's 58, so the rail runs on below the step as the kit
      // draws it. The clip means a step taller than 58 would not show in the box; the text rows would.
      const state = value === "Done" ? "done" : value === "Current" ? "next" : "todo";
      const words = {
        done: { label: "Paid ₹99", when: "Today, 4:50 pm" },
        next: { label: "Asking Lens House", when: "The owner has up to 10 minutes to answer." },
        todo: { label: "Pay rent", when: "After the owner accepts" },
      }[state];
      return {
        node: (
          <View style={{ height: v.h, overflow: "hidden" }}>
            <Timeline rows={[{ ...words, state }, { label: "", when: "", state: "todo" }]} />
          </View>
        ),
      };
    }
    case "2074:14388": {
      const notice = {
        Info: ["info", "Live booking", "The owner is rung and has up to 10 minutes to answer."],
        Warning: ["warning", "Not taking bookings right now", "This shop opens at 9:00 am. You can book for the morning."],
        Success: ["success", "Booking confirmed", "Lens House accepted. Pick a 1-hour arrival window."],
        Danger: ["danger", "Payments are not working for a moment", "Nothing was booked. Try again."],
      }[value as "Info" | "Warning" | "Success" | "Danger"];
      return {
        node: (
          <Notice tone={notice[0] as "info" | "warning" | "success" | "danger"} title={notice[1]}>
            {notice[2]}
          </Notice>
        ),
      };
    }
    case "2074:14392": // Empty state
      return {
        node: (
          <EmptyState
            icon={<ClipboardDocumentIcon color={color.brandText} />}
            title="No rentals yet"
            body="Items you book will show up here."
            actionLabel="Browse items"
            onAction={noop}
          />
        ),
      };
    case "2074:14416": // Price row
      return {
        node:
          value === "Total" ? (
            <MoneyLine label="Total" amount="₹4,170" total />
          ) : (
            <MoneyLine label="Rent · 3 days" amount="₹3,600" />
          ),
      };
    case "2074:14448": // Stepper
      return { node: <StepProgress step={Number(value)} total={4} /> };
    case "2100:29942": // Map placeholder
      return { node: <MapPlaceholder style={{ width: v.w, height: v.h }} /> };
    case "2110:30387": // Sheet · Confirm destructive: presented, so it measures itself (ConfirmSlot).
      return { node: null };
    default:
      return null;
  }
}

const pt = (n: number) => `${+(Math.round(n * 3) / 3).toFixed(2)}`;

/** One `KITBOX` line: both boxes clipped to the window and without the drawn home-indicator strip. */
function logBox(kit: KitItem, v: KitVariant, box: { x: number; y: number; w: number; h: number }, windowWidth: number, note?: string) {
  const left = Math.max(0, box.x);
  const right = Math.min(windowWidth, box.x + box.w);
  // The reference keeps the kit's own size (clipped like the app box), never the app's: a component that is wider or
  // taller than its kit frame must fail the diff tool's size check instead of being compared against a stretched box.
  const clipLeft = left - box.x;
  const clipRight = box.x + box.w - right;
  const refBox = [kit.refDx + v.x + clipLeft, kit.refDy + v.y, v.w - clipLeft - clipRight, v.h - v.homeIndicator].map(pt).join(",");
  const appBox = [left, box.y, right - left, box.h].map(pt).join(",");
  const file = `../figma/00/${kit.id.replace(":", "-")}.png`;
  console.log(
    "KITBOX",
    JSON.stringify({
      item: kit.id,
      variant: v.name,
      ref_box: refBox,
      app_box: appBox,
      ref_bg: kit.canvas,
      args: `--ref ${file} --ref-box ${refBox} --app-box ${appBox} --ref-bg '${kit.canvas}'`,
      ...(note ? { note } : {}),
    })
  );
}

/**
 * The confirm sheet is a gorhom modal whose box cannot be measured from outside it. It sizes itself from its measured
 * line counts, so it is presented from `onReady`, which hands over that height, and the box is computed from it.
 */
function ConfirmSlot({ kit, v }: { kit: KitItem; v: KitVariant }) {
  const ref = useRef<BottomSheetModal>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const onReady = (sheetHeight: number) => {
    ref.current?.present();
    timer.current = setTimeout(() => {
      const top = height - sheetHeight - insets.bottom;
      logBox(kit, v, { x: 0, y: top, w: width, h: v.h - v.homeIndicator }, width, "computed from the sheet's snap height, not measured");
    }, SETTLE_MS * 2);
  };
  useEffect(() => {
    // Captured here: React clears ref.current before this effect's cleanup runs.
    const sheet = ref.current;
    // A gorhom modal outlives the screen that presented it; without this it covers the next DevKit item.
    return () => {
      clearTimeout(timer.current);
      sheet?.dismiss();
    };
  }, []);
  return (
    <ConfirmSheet
      ref={ref}
      onReady={onReady}
      tone="danger"
      title="Archive this product?"
      body="Customers can no longer find or book it. You can bring it back from Archived."
      confirmLabel="Archive product"
      onConfirm={noop}
    />
  );
}

export default function DevKitScreen() {
  const { params } = useRoute<RouteProps<"DevKit">>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const found = findKitVariant(params.item, params.variant);
  const slot = found ? slotFor(found.kit, found.v, color) : null;
  const box = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const measured = useRef(false);

  useEffect(() => {
    if (!slot) console.warn("KITBOX", `no kit variant for item=${params.item} variant=${params.variant ?? ""}`);
  }, [slot]);

  if (!found || !slot) return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  const { kit, v } = found;
  // A 390-wide variant fills the phone from x=0; a narrower one sits where the set has it (or on the 24 gutter when
  // it is a standalone component). One past the screen's edge is scrolled into view unless `x` says otherwise.
  const left = v.w >= 390 ? 0 : kit.set ? v.x : 24;
  const scrollX = params.x ?? (left > 0 ? Math.max(0, left + v.w - width) : 0);
  // Bars pad their bottom by the home indicator, which the kit draws as its own strip: left out of the box.
  const insetBottom = v.homeIndicator ? insets.bottom : 0;

  const measure = () => {
    if (measured.current) return;
    measured.current = true;
    setTimeout(() => {
      box.current?.measureInWindow((x, y, w, h) =>
        logBox(kit, v, { x, y, w, h: h - insetBottom - (slot.trimBottom ?? 0) }, width)
      );
    }, SETTLE_MS);
  };

  return (
    <View style={{ flex: 1, backgroundColor: kit.canvas, paddingTop: insets.top + 24 }}>
      {kit.id === "2110:30387" ? (
        <ConfirmSlot kit={kit} v={v} />
      ) : (
        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: left + v.w }}
          onContentSizeChange={() => scroll.current?.scrollTo({ x: scrollX, animated: false })}
        >
          <View
            ref={box}
            collapsable={false}
            onLayout={measure}
            // Drawn for a screenshot only: a live slot (the Listing card's heart, a card press) would write to QA.
            pointerEvents="none"
            style={{
              marginLeft: left,
              width: HUG.has(kit.id) ? undefined : v.w,
              alignSelf: "flex-start",
              backgroundColor: v.fill ?? undefined,
            }}
          >
            {slot.node}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
