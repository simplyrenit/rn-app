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

## Product Details, top of page (light + dark) — 2026-09-20

Figma light `1:9120`, dark `1:8958` · app `src/screens/products/products-screen.tsx`,
`src/components/product/{product-hero,product-image,spec-strip,stars}.tsx` ·
captures `design/app/product-detail.{light,dark}.iphone16e.png`, side by side in
`design/app/product-detail.compare.{light,dark}.png`.

Scope: hero, title and rating, the facts row, the bottom bar. The sections below
(About, location, reviews, owner, similar products) are **not done** and still carry
the old styling ("Description" where the frame says "About the product").

### Mismatches found and resolved

| Element | Was | Figma | Resolution |
| --- | --- | --- | --- |
| Hero | Full-bleed photo under the status bar, ~470pt, scrim chips, sheet rising over it | Photo contained in a 270pt box on the page, 44pt circle controls, page indicator | New `ProductHero`; carousel kept, contained photo with a light-only drop shadow |
| Title row | 26pt, boxed share-up tile | 20pt, bare three-node share glyph | Matched |
| Rating | "Not yet rated" only | Five ink stars and "(24)" | Ink stars via opt-in `Stars tone="ink"`; copy kept when unrated |
| Facts row | Value above label, category icon missing on long values | Icon, value, label; three equal columns | Matched; icon now always drawn (the API's icon URL was the cause) |
| Bottom bar | 12pt padding, boxed | 76pt: 16 padding, 44pt button radius 12, faint upward shadow in light | Matched |
| Dark ground | canvas black throughout | hero on `#0F0F0F`, circles `#1A1A1A` with a `#4E4E4E` edge | New tokens `controlFill`, `controlLine`; hero on `surface` |

### Result

Light, measured on the 2× grid: back and heart circles, share glyph, both dividers,
spec icons and labels, the title and the bottom bar's rule, price and button are
within 1px (0.5pt) of the frame. The heart glyph, first 1pt small, was closed with
opt-in `ink` on `FavouriteButton` (20pt, stroke 1.5, primary text). Dark: hero ground
`#0F0F0F`, circle fill `#1A1A1A`, edge `#4E4E4E`, page `#000000` and the dividers match
the frame to within 1/255; the hero's lower edge is 1px off.

### Where the design and the data disagree (not bugs)

- The frame's price block is a fixed 132pt, so the button starts at 172. The app
  lets it grow with the price ("₹3,000 per day"), so the button starts ~2.5pt earlier
  on this listing. A fixed width would truncate real prices.
- The frame shows a four-segment page indicator; this listing has one photo, so the
  indicator is hidden and its 4pt slot kept.
- The frame's photo is a transparent cut-out with a shadow that follows its outline;
  listing photos are rectangles, so the shadow follows the photo's box.
- The condition glyph draws ~1.8pt stroke against the frame's 1.25: the shared
  `ConditionRenderer` hard-codes it. Left, not worth a core change for a 0.5pt line.

### Decisions taken

Share glyph switched from the iOS share-up to the frame's three-node glyph, and stars
from gold to ink in the title row, both because the frame asks for it. The pinned
back band was kept so a 44pt back control is always reachable while scrolling.

## Product Details, lower sections (light) — 2026-09-20, partly verified

Figma `1:9165` (about), `1:9174` (location), `1:9182` (reviews), `1:9217` (owner),
`1:9232` (similar) · exports in `design/figma-images/saved-product/light/sections/` ·
app `products-screen.tsx` and `src/components/product/{detail-section,expandable-text,
product-map,review-card,product-owner,stars}.tsx`, `core/section-header.tsx` (opt-in `flush`).

Every block now comes from one `DetailSection` (32/24 padding, 16 gap, H3 heading,
1px hairline below) and the headings use the frame's copy. Measured on the simulator
against a listing with no reviews: the About/Location/Reviews/Owner block boundaries land
where the frame's do (location block 305pt against the frame's 304+1), the map card is
200pt tall with radius 16, the owner row is a 48pt avatar, bold name, a tertiary line
and a right chevron, and Similar products reuses the Home `tile` rail.

**Not verified:** dark mode; the review rail (the QA catalogue has no reviews, so only
the empty state rendered); the description's 3-line clamp and "Show more" (this listing's
description is one line); the 120pt map marker on first layout. The frame's 462pt
similar-products block cannot be reproduced with the Home tile (~354pt); that number
should be re-measured in Figma before it is trusted.

### Decisions taken by the delivery agent, to confirm

1. The location block lost its two text lines ("exact address shared once a booking is
   agreed", and the distance) to reach the frame's 304pt; the place name and distance
   moved into the map's caption chip, "approximate area" stays.
2. The 500m geographic circle is replaced by the frame's fixed-size ring marker, so the
   area no longer scales with zoom.
3. `ProductMap` is restyled for both callers, so the post wizard's review step changes too.
4. The review card's "Show more" opens the reviews screen (a fixed 185pt card in a rail
   cannot expand); an extra "See all N reviews" button that the frame lacks is kept so
   short reviews still lead somewhere.
5. The owner row says "3 products" in this variant only; the rest of the app says "listings".
