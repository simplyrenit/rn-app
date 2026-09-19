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

1. (Reversed in the next commit: the "exact address shared once a booking is agreed" line is back under the map.) The location block lost its two text lines ("exact address shared once a booking is
   agreed", and the distance) to reach the frame's 304pt; the place name and distance
   moved into the map's caption chip, "approximate area" stays.
2. The 500m geographic circle is replaced by the frame's fixed-size ring marker, so the
   area no longer scales with zoom.
3. `ProductMap` is restyled for both callers, so the post wizard's review step changes too.
4. The review card's "Show more" opens the reviews screen (a fixed 185pt card in a rail
   cannot expand); an extra "See all N reviews" button that the frame lacks is kept so
   short reviews still lead somewhere.
5. The owner row says "3 products" in this variant only; the rest of the app says "listings".

## Auth: email (signed out) — audited 2026-09-20, not changed

Figma light `1:9745`, dark `1:9720` · app `src/screens/auth/email.tsx`.

Light spec: a 44pt back row (12 left inset, arrow-left outline 24, stroke at 70%), a title
block (16/24 padding) with "Welcome to Renit" 24 bold at 120% line height, a field block
(14/24 padding) holding the label "Enter your email" (14 bold) 12pt above a 48pt field
(radius 12, white fill, `#E6E6E6` hairline, 8/16 padding, 16pt placeholder "Enter email"
at 50% black), and a 76pt bottom wrapper (16 padding) with one 358×44 "Continue"
button (radius 12, disabled style: no fill, label at 50%).

| Element | App | Figma |
| --- | --- | --- |
| Top of screen | A progress `HeaderIndicator` | A back arrow row, no progress bar |
| Field | 48pt, `rounded-button` (11), `surface-raised` in dark, control-edge border, 8pt padding | 48pt, radius 12, `surface` in dark (`#0F0F0F`), hairline border, 16pt padding |
| Label | `mt-6 mb-2` plus the field's `mt-2` | 12pt gap, 14 bold |
| Footer | Three buttons: "Email me a code", "Use my password", "Use my phone number instead" | One "Continue" |

**Not a pixel fix.** The footer is the sign-in method choice: the app asks for the email,
then lets the customer pick a code or a password on this same screen, and offers phone
as an alternative. The frames model a different flow (email, then a "Welcome back to
Renit" step for existing accounts, then password or OTP). Matching the frame means
changing the auth flow, which is a product decision with backend implications (does
the API tell the client whether an email is registered before asking for a
credential?), not a restyle. The field, label, title and header could be matched
without touching the flow, but the screen would still not equal the frame.

Decision needed: keep the app's method-choice footer and match everything above it, or
move to the frames' single "Continue" and a second step. Until that is decided the seven
auth screens are parked.

## Profile, signed in (light + dark) — 2026-09-20

Figma light `1:10017`, dark `1:9953` · app `src/screens/tabs/profile.tsx`,
`src/components/profile/post-auth/{profile-post-auth,profile-img,profile-row}.tsx` ·
captures `design/app/profile.{light,dark}.iphone16e.png`, side by side in
`design/app/profile.compare.{light,dark}.png`.

Mismatches resolved: group headers were small grey ALL-CAPS, now Title Case 16 bold;
rows were separated and tighter, now 56pt with 20pt icons and no separators; the profile
block's avatar was 60pt with a centred pencil, now 48pt with a top-aligned brand pencil;
"My listings", "Send feedback", "Request an item" and "Log out" now read as the frame
("My products", "Feedback & review", "Unavailability form", "Logout"); Logout is the
frame's secondary button in the danger tone; the topbar matches (61pt, H2, 44pt bell box).

Result (light, 2× grid): title, bell, avatar, pencil, divider, section headers, row icon,
row label and chevron, and the hairlines are within 1px (0.5pt) of the frame. The name's
vertical extent differs by 3px only because the frame's sample name ("Garvit Babel") has
no descenders. Dark: page, row ground and dividers match exactly.

Deliberate differences: the frame's **Currency** row is not added (the app has no
currency setting); the **Appearance** row keeps its label where the frame says "Dark
mode" (it opens a three-way choice) and takes the frame's phone icon; the frame's
logout red `#E50914` and radius 12 use the danger token and `radius.button` (11); the
logout border uses the hairline as the frame does, which the token file says a control
edge should not (WCAG 1.4.11): needs a ruling; the loading placeholder still has the old
rhythm. Not verified: the signed-out state (frame `1:10110`, not yet restyled beyond the
shared topbar).

## Saved, signed in (light + dark) — 2026-09-20

Figma light `1:8859`, dark `1:8760` · app `src/screens/tabs/saved.tsx` · captures
`design/app/saved.{light,dark}.iphone16e.png`, side by side in
`design/app/saved.compare.{light,dark}.png`.

The screen was already a two-column grid; it is now the frame's: the Home tile (`Card tile`,
163pt wide, no hairline, bare corner heart) with 16 between columns and 24 between rows, and a
61pt topbar whose title is the `screenTitle` role (it was `text-2xl`, which drew 43px tall
against the frame's 37px). Measured on the 2× grid the title, both photo rows, the card titles
and the prices are within 1px (0.5pt); dark page and text colours match exactly.

Not copied: the frame's heart is `#E50914`; the app draws it in its danger tone on a photo
(`#EB6F62`), the same as Home. Widths of the price and location lines differ only because
the listings differ. Not verified: the empty state and loading skeleton against a frame
(none exists).

## Appearance sheet (light; dark partly) — 2026-09-20

Figma light `1:19482` (overlay `1:19544`), dark `1:19346` · app
`src/components/profile/post-auth/sheets/AppearanceSheet.tsx`, opt-in `frame` on
`src/components/core/custom-bottom-sheet-modal.tsx` · captures
`design/app/appearance.{light,dark}.iphone16e.png`.

Changed: the title is centred at 18 bold in a 44pt header (it was left-aligned at 20); the
rows are 56pt with bold 16pt labels and 24pt side padding, no rules between them (they were
regular weight with hairlines); the copy and order follow the frame ("Use my device
settings", "Dark mode", "Light mode", was "Match my device", "Light", "Dark"); the sheet is
249pt plus the safe-area inset, with a 44×5 grabber in the hairline tone on a 37pt row and
a 60% scrim, all behind `frame` so the app's other sheets keep the 40×4 grabber and 50%
scrim.

Result (light): measured from the sheet's own top edge, the grabber, title and all three
row labels are within 1px (0.5pt) of the frame. The sheet's top edge itself sits ~13pt
higher on device than in the frame because the frame draws the home indicator on a black
strip 21pt tall while the device's bottom inset is 34pt and belongs to the sheet.

Dark: the frame's sheet is `#000000` with an `#E6E6E6` grabber, which are the light
sheet's stroke colours left in the dark frame; the app keeps its raised `#0F0F0F` sheet and
its dark grabber (the design system's elevation), so dark is deliberately not matched
there.

Not done: **Notifications** (`1:18332`) is not restyled: opening the screen calls
`markAllAsRead` on the signed-in account, which changes real data. It needs an
`AGENT_QA_<run-id>` account or a read-only capture path first.
