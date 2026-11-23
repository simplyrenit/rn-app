# Renit 2.1 kit: component API (ENG-426)

This is the shared contract for the ENG-426 group builders and the flow stories ENG-427..439. The foundation commit sets these props. A group builder may add props, but must not rename or remove any. Kit references are in `figma/00/<id>.png|json`; every number comes from the JSON.

Import from the barrel (`@/components/core`). The exception is `booking/parts.tsx`, which imports by path because tests mock the barrel.

## Foundation (implemented)

### Tokens (`src/lib/design-tokens.ts`, mirrored in `tailwind.config.js`)

| Kit variable | Token (`useTheme().color`) | Tailwind |
|---|---|---|
| brand/primary #635BE8 | `brand` (fill), `brandText` (text) | `bg-brand`, `text-brand-text-{light,dark}` |
| brand/tint #EDEDFC | `brandPanel` | `bg-brand-panel-*` |
| brand/tint-strong #CAC8F7 | `brandPanelLine` | `border-brand-panel-line-*` |
| border/default #E6E6E6 | `line` | `border-line-*` |
| surface/muted #F2F2F2 | `surfaceMuted` (new). `surfaceRaised` #F5F5F5 is kept for legacy screens. | `bg-surface-muted-*` |
| text primary / secondary / tertiary | `text` / `textBody` (70%) / `textDim` (60%). `placeholder` is 60%. | `text-text-*`, `text-text-body-*`, `text-text-dim-*` |
| status success / warning / danger / info: text · bg | `success`·`successWash`, `warning`·`warningWash`, `danger`·`dangerWash`, `info`·`infoWash` | `text-success-*`, `bg-success-wash-*`, … |
| status/danger/strong #D92D20 | `dangerStrong` (new) | `text-danger-strong-*` |

Other tokens:
- **Type scale** (`fontSize`/`lineHeight`): xs 12/16, sm 14/20, md 16/24, base 18/24, lg 20/28. xl, 2xl and 3xl are unchanged, for legacy screens only.
- **Radius:** `button` 12, `buttonPrimary` 11 (new), `input` 12, `sheet` 24, `card` 16 (unchanged).
- **Density:** `row` 56, `chip` 40. A two-line List row is 72, which is in the List row JSON, not in a token.
- **`buttonShadow.light|dark`:** the kit's ring of #0000000A at 0/0, blur 4, spread 2. iOS only; dark has none.

### `Text` (`core/text.tsx`)

- **Weights:** `fontWeight` `font-normal|font-medium|font-semibold|font-bold` → Regular / Medium / SemiBold / Bold faces. `font-light` → Regular.
- **Roles (`role`):**

  | Role | Style |
  |---|---|
  | `screenTitle` | 20/28 Bold |
  | `sectionTitle` | 18/24 Bold |
  | `groupHeader` | 14/20 SemiBold, 60%, sentence case |
  | `fieldLabel` | 14/20 SemiBold, 100% |
  | `fieldHint` | 12/16 Regular, 60% |

- **Leading:** `lineHeight` prop > `fontSize` prop > role > className `text-*` > base 24.
- **Testing:** `resolveTextMetrics()` is exported for tests.

### `Button` (`core/button.tsx`)

Props are unchanged, plus `tone?: "tonal" | "brand" | "muted"`. `resolveButtonStyle()` is exported for tests.

Every height below is a `minHeight` with no vertical padding: a one-line label at the default text size draws exactly that box, and a large accessibility text size or a two-line label grows it.

| Kit instance (frame) | Use | Box | Label |
|---|---|---|---|
| Primary (Bottom bar, Sheet footer) | `<Button>` | 52 high, r11, #635BE8 | 16/24 SemiBold white |
| Primary compact (Empty state with no other fill) | `size="compact"` | 44 | 14/20 SemiBold white |
| Primary disabled | `disabled` | #CAC8F7 (dark #292929) | white (dark `textDim`, so it does not read as live) |
| Secondary (Bottom bar Secondary+Primary) | `variant="outline"` | 52, r12, white, 1px #CAC8F7, ring | 14/21 SemiBold purple |
| Secondary tonal (Empty state Action) | `variant="outline" tone="tonal" size="compact"` | 44, r12, #EDEDFC, ring, padding 20 | 14/20 SemiBold purple |
| Text link (Bottom bar CTA+Text "Not now") | `variant="ghost"` | 44 high whatever the `size`, no box, no padding | 14/21 **Bold** purple |
| Cancel (Sheet · Confirm destructive) | `variant="ghost" tone="muted"` | as above | 14/21 Bold, 70% black |
| Destructive | `variant="warning"` | 52 (44 compact), r12, white, 1px #E6E6E6, ring. `ConfirmSheet` passes `minHeight: 56` for Sheet · Confirm destructive (2110:30387); elsewhere it sits beside a 52 Secondary | 14/21 Bold #D92D20 |
| Any non-primary, disabled | `disabled` | box unchanged | `textDim` |

Two kit links are not the Text button, so build them as plain text, not with `Button`:
- The Sheet footer "Secondary link" is SemiBold 14/20, hugging (about 20 high).
- Section header "See all" is SemiBold 14/20.

`useButtonLabelColor(variant?, tone?)` returns the label colour above. Inside a `Button` it returns the live (disabled-aware) colour.

## New components (stubs in the foundation commit; the group builders write the bodies)

| Component | File | Owner | Kit node | Props |
|---|---|---|---|---|
| `BottomBar` | `core/bottom-bar.tsx` | A | 2071:14467, CTA+Text 2109:30149 | see below |
| `SheetHeader` | `core/sheet-header.tsx` | A | 2071:14471 | `title?: string`, `onClose?: () => void` (shows the close X), `grabber?: boolean` (default true) |
| `SheetFooter` | `core/sheet-footer.tsx` | A | 2071:14481, example 2071:14501 | `primary: BarAction`, `secondary?: BarAction` (text link **below** the primary) |
| `ListRow` | `core/list-row.tsx` | B | 2073:14364 | see below |
| `StatusPill` | `core/status-pill.tsx` | B | 2073:14380 | `label: string`, `tone: StatusTone` |
| `Chip` | `core/chip.tsx` | B | 2073:14388 | `label: string`, `selected?: boolean`, `onPress?: () => void`, `leading?: ReactNode` |
| `StepProgress` | `core/step-progress.tsx` | C | 2074:14448 | `step: number` (1-based), `total: number`, `label?: string` (default "Step N of M"), `showLabel?: boolean` (default true), `fill?: number` (0..total, partial fill per segment), `gap?: number` (default 4; fill drawn r2, ENG-428) |
| `MapPlaceholder` | `core/map-placeholder.tsx` | C | 2100:29942 | `style?: StyleProp<ViewStyle>` (fills the box it is given) |

Shared types:
- `BarAction = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; accessibilityLabel?: string }`, exported from `bottom-bar.tsx`.
- `StatusTone = "neutral" | "success" | "warning" | "danger" | "info"`. There is no brand tone; the fix pass removed it.
- `ListRowIcon`: a heroicons component type.

`BottomBar` props:
- `layout?: "summary-cta" | "full-cta" | "secondary-primary" | "cta-text"` (default `full-cta`).
- `primary?: BarAction`.
- `secondary?: BarAction`: the outline button on the left in `secondary-primary`; the text link below the primary in `cta-text`.
- `value?`, `unit?`, `subLine?`: strings, for `summary-cta`.
- `children?: ReactNode`: legacy passthrough for `booking/parts` `BottomBar`. It renders in the content strip in place of a layout.
- `style?`.

`ListRow` props:
- `label: string`.
- `subLabel?: string`: makes the row the 72-high two-line size.
- `value?: string`.
- `leadingIcon?: ListRowIcon`.
- `chevron?: boolean` (default true).
- `tone?: "default" | "danger"`: `danger` uses `dangerStrong` on the label and icon.
- `onPress?`, `accessibilityLabel?` (defaults to `label`).

## Group B (implemented)

Props added; nothing renamed or removed.

- **`StatusPill`:**
  - Added `style?: StyleProp<ViewStyle>`, for placement only.
  - The pill sets no `alignSelf`, because in a row with `alignItems: "center"` that would pin it to the top. A column parent passes `{ alignSelf: "flex-start" }`.
  - Added the export `statusPillColors(tone, color)`, which returns `{ fg, bg }` for tests.
  - Neutral is `surfaceMuted` with `textBody`.
- **`SectionHeader`:**
  - Added `onSeeAll?: () => void` and `seeAllLabel?: string` (default "See all"). This is the kit link, 14/20 SemiBold `brandText`, plain text with a 12pt hitSlop.
  - `accessory`, `subtitle`, `gutter` and `flush` are kept.
  - The title is `role="sectionTitle"`, one line.
- **`ListRow`:** API as above.
  - It has no fill. The kit's #FFFFFF is the light canvas; in dark mode a `surface` fill would band on the #000 canvas. A DevKit slot that diffs it needs a white backing.
  - `minHeight` is 56/72 with no vertical padding.
- **`ProfileRow`:** same props, drawn by `ListRow`.
  - `ProfileSection` keeps its Body Bold header. The kit's `groupHeader` is left for the Profile story.
- **`Card`:**
  - It always draws the kit Listing card. `tile` is kept but does nothing.
  - Added the export `LISTING_IMAGE = { aspectRatio: 162/176, radius: 8 }`, which `MyProductCard` also uses.
  - The delivery or distance line takes the location slot (12/16 at 60%) below the price.
  - The Verified chip stays on the photo, bottom-left.
- **`FavouriteButton`:**
  - `tile` now draws the kit heart: a 32 disc of #FFFFFFEB with a 0/1 blur-3 shadow of #0000002E (Android uses `elevation: 1`) in a 44 box, holding a black 24 outline heart at stroke 1.5. It looks the same in both themes.
  - The saved heart keeps `darkColors.danger`.

## ENG-428 additions

- **`RingSpinner`** (`core/ring-spinner.tsx`, import by path): `{ size = 40, spinning = true }`. A full `brandPanel` track plus a 270° `brand` arc (12 to 9 o'clock), stroke `size × 0.08`, native-driver rotation; `spinning={false}` draws the still pose for fixtures. From 02/2089:28209.

## Group C (implemented)

`StepProgress` and `MapPlaceholder` keep the props above unchanged. Added optional props, and changes to existing APIs:

- **`EmptyState`** (`core/empty-state.tsx`)
  - Added `actionTone?: "tonal" | "primary"`, default `tonal`. It draws the kit Secondary tonal 44; use `primary` (compact 44) on a screen with no other filled button.
  - The icon element is cloned at size 32, whatever size the call site passes; its colour is the caller's.
  - `compact` is accepted but no longer changes anything, because the kit pads 24 top and bottom.
- **`MoneyLine`** (`booking/parts.tsx`)
  - Added `total?: boolean`: the kit Total row, 16 Bold on both sides, a hairline above and 12 padding.
  - `bold` keeps its meaning (the same 16 Bold type) but draws **no** hairline, because its screens draw their own divider.
- **`Notice`** (`booking/parts.tsx`)
  - Props are unchanged. `tone="brand"` draws as `info`.
  - With no `icon`, the glyph follows the tone: info ⓘ, warning and danger ⚠, success ✓.
  - The kit's Link node is hidden in every tone, so it is not built.
- **`Pill`** (`booking/parts.tsx`) is now `<StatusPill>`, with `brand` falling back to `info`.
- **`BottomBar`** (`booking/parts.tsx`) is now `<BottomBar>` from `core/bottom-bar` in children mode.
- **`TextField`** (`core/field.tsx`)
  - Props are unchanged.
  - `hint` now renders **under** the input, as the kit's Helper does, and the error replaces it.
  - `FieldLabel hint=` still renders under the label, for group labels.
- **`FieldFrame` and `useFieldSurfaceStyle({ frame })`** are kept but are no-ops. Every field is now the kit box: 48 high, padding 16, r12, a `line` border, 1.5 purple on focus, and `dangerStrong` on error.

## Group A (implemented)

Props added; nothing renamed or removed.

- **Tab bar** (`navigation/nav.tsx` MainTabs):
  - `TAB_BAR_CONTENT_HEIGHT` is the literal 81 (it was derived from `lineHeight.sm` and drifted to 80). The bar is 81 + 1 hairline + `insets.bottom`: the kit strokes the hairline OUTSIDE the 81, an RN border sits inside. Padding 18.5 above and below 24 icon + 4 + 16 label.
  - Custom `tabBarLabel`: 12/16, SemiBold `brandText` when focused, Medium `textDim` otherwise, `allowFontScaling={false}`.
  - Icons: active tint `brandText`, inactive `textDim`. Home/Saved/Profile solid heroicons when active; Post `PlusSquareIconSolid` and Rentals `ClipboardDocumentIconSolid` (new, `src/icons/`) drawn from 2110:30274 / 2110:30278, knockout = `canvas`. Rentals inactive is heroicons outline `ClipboardDocumentIcon` (was a calendar).
- **`SubpageHeader`** (kit Top bar):
  - Added `variant?: "back-title" | "tab-title" | "back-only"` (default `back-title`) and `trailing?: ReactNode`. `title` is now optional (ignored by `back-only`).
  - 56 high, left-aligned title at x72 (back-title 18/24 Bold) or on the 24 gutter (tab-title 20/28 Bold), one line, truncating. No fill (the kit's white is the canvas the screens already paint).
- **`BottomBar`**: API as above. Strip padding 16/24, `paddingBottom` 16 + `insets.bottom` (16 with the iOS keyboard up); `cta-text` 4 + inset with a 4 gap (drawn as `full-cta` when `secondary` is missing). `children` mode is a column with gap 8 and the same insets.
- **`SheetHeader`**: API as above; `grabber` default stays true (it draws the 21pt grabber row and the sheet's top radius, for standalone/DevKit use). Inside `CustomBottomSheetModal`, pass `grabber={false}`: gorhom draws the handle. The title row is `minHeight` 44, so a long title wraps. Close X is heroicons outline `XMarkIcon` 24 at `textDim`, 10pt hitSlop.
- **`SheetFooter`**: API as above. The secondary link is plain SemiBold 14/20 `brandText` text (12pt hitSlop), not `Button`. `paddingBottom` 16 + `insets.bottom`.
- **`CustomBottomSheetModal`**: every sheet now gets the kit grabber (44×5 `line`, 8 above and below, r24 top). `frame` now only selects the 60% scrim.
- **`ConfirmSheet`**: props unchanged. Draws 2110:30387: `SheetHeader` (no X), body 14/20 `textBody`, actions column (padding 16/24/4, gap 4) with `warning` (danger, `minHeight` 56 passed by the sheet) or `primary` (default) full width and `ghost tone="muted"` Cancel below. Fixed snap height 285 + inset (four body lines).

## Adoption

Each new kit component replaces hand-rolled code that is still in the screens. The flow story that owns a screen moves its call sites; nothing here moves them early. A screen's story follows its frames' section in `figma/index.tsv` (02 auth → ENG-428, 03 home/discovery → ENG-427, 04 → ENG-429, 05 → ENG-430, 06 → ENG-431, 07 → ENG-432, 08 → ENG-433, 09 → ENG-434, 10 → ENG-435, 11 → ENG-436, 12 → ENG-437, 13 → ENG-438, 14 → ENG-439). Paths are under `src/`.

The `StatusPill`, `Chip`, `StepProgress` and `MapPlaceholder` rows were read. The `BottomBar`, `SheetHeader`, `SheetFooter` and `ListRow` rows are **candidates** from a grep (a `Button` over `insets.bottom` without `BottomBar`, a sheet without `SheetHeader`, a `ChevronRightIcon` row); the owning story confirms each one. Chat (`chat-details.tsx`, `chat/attachment-sheet.tsx`) has no frames in the index, so it has no story and stays as it is.

| Component | Replaces (hand-rolled today) | Moved by |
|---|---|---|
| `BottomBar` | Sticky CTA strips built from a `View`, `insets.bottom` and a `Button`. The booking screens already use it through `booking/parts` `BottomBar`. | ENG-427 `search-results.tsx`; ENG-429 `products-screen.tsx`, `cart/cart.tsx`, `addresses/address-details.tsx`; ENG-430 `kyc/intro`, `kyc/details`, `kyc/status`, `booking/outcome.tsx`; ENG-431 `booking/booking-details.tsx`, `booking/day-of.tsx`, `booking/courier-day-of.tsx`; ENG-432 `booking/return.tsx`, `booking/claim.tsx`; ENG-433 `shop/booking.tsx`, `shop/quick-block.tsx`; ENG-434 `shop/handover.tsx`, `shop/return.tsx`, `shop/courier.tsx`; ENG-435 `list-flow/*`, `shop/draft-photos.tsx`; ENG-437 `bank-account.tsx`, `rental-delivery.tsx`, `rental-hours.tsx`, `rental-gst.tsx`, `delivery-areas.tsx`, `shop-address.tsx`; ENG-438 `addresses/saved-addresses.tsx`; ENG-439 `unavailability_form*.tsx`, `report-a-problem.tsx`, `feedback-review.tsx` |
| `SheetHeader` | A sheet's own title row (and close X) inside `CustomBottomSheetModal`. `ConfirmSheet` already uses it. | ENG-427 `search-results.tsx`, `addresses/address-picker-sheet.tsx`; ENG-429 `products-screen.tsx`, `product/product-specs.tsx`; ENG-430 `booking/cancel-sheet.tsx`; ENG-431 `booking/day-of.tsx`, `booking/collect-items.tsx`, `booking/get-help.tsx`; ENG-432 `booking/end-early-sheet.tsx`, `booking/fault-report.tsx`, `booking/claim.tsx`; ENG-433 `shop/today.tsx`, `shop/ring.tsx`, `shop/quick-block.tsx`, `shop/*-sheet.tsx`, `shop/pick-sheets.tsx`; ENG-434 `shop/report-problem.tsx`; ENG-435 `list-flow/sheets.tsx`, `list-flow/category-sheet.tsx`, `list-flow/specs-card.tsx`, `list-flow/add-photos.tsx`, `list-flow/review.tsx`; ENG-436 `edit-product.tsx`, `post/product-image-grid.tsx`; ENG-437 `rental-settings.tsx`, `rental-delivery.tsx`, `rental-hours.tsx`, `bank/unlock-sheet.tsx`; ENG-438 `profile/post-auth/*`, `profile/pre-auth/profile-pre-auth.tsx`, `addresses/address-details.tsx` (its ConfirmSheet frame); ENG-439 `unavailability_form.tsx` |
| `SheetFooter` | The `Button` column at the bottom of those sheets. | The same stories and files as `SheetHeader` |
| `ListRow` | Rows built from a label and a `ChevronRightIcon`. `ProfileRow` already draws through it. | ENG-429 `products-screen.tsx`, `product/product-owner.tsx`, `cart/parts.tsx`; ENG-431 `booking/booking-details.tsx`; ENG-433 `shop/today.tsx`, `shop/booking.tsx`; ENG-434 `handover/parts.tsx`; ENG-435 `post/taxonomy-list.tsx`, `list-flow/review.tsx`; ENG-436 `post/unavailability-editor.tsx` (EditProductAvailability); ENG-437 `rental-settings.tsx`, `rental-delivery.tsx`, `bank-account.tsx`; ENG-438 `addresses/address-row.tsx`; ENG-439 `faqs.tsx`, `contactUs.tsx`, `who-we-are.tsx`, `report-a-problem.tsx` |
| `StatusPill` | `bank-account.tsx` `StatusChip` (a tinted label with an icon). `booking/parts` `Pill` and `ListingStatusPill` already draw through it. `booking/card-lines.tsx` `Chip` is tinted too but carries a View action, which `StatusPill` has no slot for: ENG-431 decides. | ENG-437 `bank-account.tsx`; ENG-431 decides `card-lines.tsx` |
| `Chip` | `search/results-rails.tsx` `Pill` (the search-results filter chips) and `post/plan-pricing.tsx` `Chip`. Not `list-flow/scan-panel.tsx` `Chip`: that is an animated, display-only detection chip, not a choice. | ENG-427 `results-rails.tsx`; ENG-435 `plan-pricing.tsx` |
| `StepProgress` | `auth/headerIndicator.tsx` draws it directly over `SubpageHeader variant="back-only"` (ENG-428, with `fill` and `gap={6}`, no label); `PageIndicator` is deleted. | Done (ENG-428) |
| `MapPlaceholder` | None found: no screen has a hand-rolled map stand-in. It stands in for `MapView` in state frames and design fixtures. | Where a fixture shows a map: ENG-428 `auth/location.tsx`; ENG-429 `product/product-map.tsx`, `addresses/address-details.tsx`, `post-screens/location-modal.tsx`; ENG-437 `rental-delivery.tsx` |
