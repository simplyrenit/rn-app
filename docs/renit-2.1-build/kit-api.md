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

| Kit instance (frame) | Use | Box | Label |
|---|---|---|---|
| Primary (Bottom bar, Sheet footer) | `<Button>` | 52 high, r11, #635BE8 | 16/24 SemiBold white |
| Primary compact (Empty state with no other fill) | `size="compact"` | 44 | 14/20 SemiBold white |
| Primary disabled | `disabled` | #CAC8F7 | white |
| Secondary (Bottom bar Secondary+Primary) | `variant="outline"` | 52, r12, white, 1px #CAC8F7, ring | 14/21 SemiBold purple |
| Secondary tonal (Empty state Action) | `variant="outline" tone="tonal" size="compact"` | 44, r12, #EDEDFC, ring, padding 20 | 14/20 SemiBold purple |
| Text link (Bottom bar CTA+Text "Not now") | `variant="ghost"` | 44 high whatever the `size`, no box, no padding | 14/21 **Bold** purple |
| Cancel (Sheet · Confirm destructive) | `variant="ghost" tone="muted"` | as above | 14/21 Bold, 70% black |
| Destructive (Sheet · Confirm destructive) | `variant="warning"` | 56 (44 compact), r12, white, 1px #E6E6E6, ring | 14/21 Bold #D92D20 |
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
| `StepProgress` | `core/step-progress.tsx` | C | 2074:14448 | `step: number` (1-based), `total: number`, `label?: string` (default "Step N of M"), `showLabel?: boolean` (default true) |
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
