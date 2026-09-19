# Fidelity audit

One section per screen, newest last. Measurements are on the iPhone 16e simulator
(390×844) downsampled to the Figma 2× grid, content aligned −7pt at the top; a
value is "px" on that grid, so 1px is 0.5pt.

## Search (light) — 2026-09-20

Figma `1:8212` (light) · app `src/screens/search.tsx` · captures
`design/app/search.light.iphone16e.png`, `design/app/search.compare.light.png`.

### Mismatches found

| Element | Was | Figma | Resolution |
| --- | --- | --- | --- |
| Structure | Progressive disclosure: one open card, the others collapsed to summary rows; "Popular categories" chips | All three questions open at once, no chips | Flattened; category chips and step state removed |
| Sections | Boxed cards, 14pt padding | 136pt blocks: 24 padding, 24pt label, 16 gap, 48pt control, 1px hairline between | Rebuilt to that |
| Labels | "What / Where / When" (14pt bold) | "What? / Where? / When?" (16pt bold) | Copy and size matched |
| Keyword field | 61pt tall (dropdown library padding), quoted-free placeholder | 48pt, radius 12, hairline border, placeholder `"Washing machine"` | Height pinned; text inset set to 34; copy matched |
| Where / When rows | Label left, answer right; pencil only when filled | Glyph, answer, pencil always | Rebuilt; "Any dates" → "Select dates" |
| Footer | 12pt padding, 150pt minimum button, 16pt icon | 16pt padding, hugging 104×44 button, 20pt icon, 14pt bold label | Rebuilt |

### Result

All static elements are within 1px (0.5pt) of the frame: title, "What?" and "Where?"
labels, keyword field, pin, calendar, pencil, dividers and the field boxes. Residuals:
the "Anywhere" text starts 1pt left of "Mumbai" in the frame, which is the difference
between the two words' first-letter side bearing, not a layout error; label baselines
are 1px (0.5pt) high, rounding.

### Where the Figma is wrong, and what I did

- **"Clear all" is white on white** (`#FFFFFF` fill on a `#FFFFFF` bar) and set in
  Satoshi, a font the app does not ship. Rendered as the app's brand-tone bold
  underlined text (the underline is the design's).
- **The Search button's label and icon are black on `#635BE8`.** Rendered in
  `color.onBrand`, the token every other primary button uses.
- **The back arrow is `#FFFFFFB2`** (white) on the white header. Kept the app's
  `BackButton`, which takes the theme's text colour.
- **The bottom bar sits under the keyboard** in the frame (y 747, keyboard from 508).
  The app keeps it above the keyboard, so the Search button stays reachable.
- **Placeholder and "Mumbai"** are sample data. Location stays "Anywhere" until set.

### Behaviour kept

Keyword suggestions, the place bottom sheet, current-location lookup, the date-range
picker, "Clear all" only when a filter is set, and "Browse all" when none is.

### Dark — 2026-09-20

Frame `1:7571`, capture `design/app/search.dark.iphone16e.png`, side by side in
`design/app/search.compare.dark.png`. Geometry is identical to light (the Where field,
dividers, pin, pencil and labels land on the same pixels as the frame). Colours: page
`#000000` and field fill `#0F0F0F` match exactly. The hairline is 3/255 lighter in the
frame (`#292929`) than the app's `line` token (~`#262626`); left as the design
system's value rather than adding a one-screen token.

The earlier "app stays light" was not a code fault: this simulator had
`themePreference = light` saved in AsyncStorage from an earlier session, which
overrides the OS setting. Resetting that key to `device` (the app's default) fixed it;
the app follows the OS as designed.

### Not verified

- Nothing about dark: it is verified (below).
- The place sheet and the date picker (frames `1:8241`–`1:8572`) are not yet audited.

## Product Details (light) — audited 2026-09-20, not yet fixed

Figma `1:9120` · app `src/screens/products/products-screen.tsx` · captures
`design/figma-images/saved-product/light/1-9120.png`,
`design/app/product-detail.light.iphone16e.png`.

Compared by eye only; no spec has been pulled yet. The two differ in concept, not
in spacing, so this needs a decision before any code moves.

| Element | App | Figma |
| --- | --- | --- |
| Hero | Full-bleed photo under the status bar, ~470pt, the sheet rising over it | Photo contained on white, centred, ~250pt, a 4-segment page indicator below |
| Back / favourite | Translucent scrim chips over the photo | 44pt outlined circles, white fill, hairline border |
| Title row | "Lenovo laptop" 26pt with a boxed share tile (share-up glyph) | "1984 – George Orwell" 22pt with a bare three-node share glyph |
| Rating | "Not yet rated" text | Five stars and the count "(24)" |
| Facts row | Category / Deposit / Condition, value first then label; the category icon is missing when the value is long | Icon, value, label, three equal columns, 24pt icons |
| Below the fold | not captured | "About the product" and more |
| Bottom bar | Price + "Chat with owner" | Same content; needs measuring |

Open question: the app's full-bleed hero with scroll-collapsing navigation was a
deliberate redesign decision (see the `renit-product-detail` agent). Matching the
design means replacing it with the contained-photo layout. The Figma also has only
a single-image hero with a page indicator; the app's carousel behaviour needs to be
kept. Suggest going ahead, as with Search, but this one rewrites the screen's
scroll behaviour, so it wants an explicit yes.
