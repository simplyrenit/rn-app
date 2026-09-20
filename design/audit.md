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

## Post flow, step 1 "Choose a category" — audited 2026-09-20

Figma light `1:13231` (section `1:13230`; frames `1:13231` category, `1:13333` sub-category,
`1:13455`/`1:13548` form, `1:13650` upload, `1:13673` images, `1:13698` cover, `1:13729`/
`1:13817`/`1:13908` availability, `1:14002` review, `1:14083`/`1:14210` My products) · app
`src/screens/post-screens/*`, `src/screens/tabs/post.tsx`.

Fixed now: the tab bar's **active Post glyph** is a solid rounded square with the plus knocked
out, as the frame draws it (it was the outline square in both states): `PlusSquareIcon` gains
opt-in `filled` and `edge`.

Not restyled: the wizard differs from the frames in **content and flow**, not only pixels.

| Element | App | Figma |
| --- | --- | --- |
| Header | Centred title, "Step 1 of 7", an X at the right | Back arrow at the left, centred title, no step caption |
| Progress | Seven segments | Five segments |
| Category list | Curated order (Automobiles, Appliances, Machines, Books, …), the app's own outline glyphs, 9 categories | Alphabetical, its own glyph set (books, gamepad, robot, forklift, guitar, building), 11 categories including "Emerging" and "Real Estate" |
| Row copy | "Arts & crafts", "Musical instruments" | "Arts & Crafts", "Musicals" |

Decisions needed before anyone restyles it: (1) is the wizard five steps or seven (the frames
show five; the app has seven screens), (2) is the category list the design's (alphabetical,
with "Emerging" and "Real Estate", "Musicals") or the app's, since it drives the backend
category names, (3) where do the design's category glyphs come from (they are illustrations,
not heroicons; no asset exists in the repo).

## Search results (light + dark) — 2026-09-20

Figma light `1:5212`, dark `1:3958` (the "Filters" section `1:5211`/`1:3957` has ten more frames
of the filter sheet in its states, `1:5325` … `1:6351`, **not yet audited**) · app
`src/screens/search-results.tsx` · captures `design/app/results.{light,dark}.iphone16e.png`,
side by side in `design/app/results.compare.{light,dark}.png`.

Changed: the screen sat inside a 90%-wide column (≈20pt gutters); it now uses the 24pt
gutter. The summary bar is the frame's: 64pt, radius 16, 4pt inset on the left where the 44pt
back target sits and 12pt on the right, a 4pt round dot between the dates and the place (it was a
bullet glyph), the filter button filled in the hairline tone it is bordered in. The count is 14
bold (it was the 22pt section title) with 24 above and below it. The grid is the Home tile
(`Card tile`) in two computed columns (163 on the 390pt frame, narrower on a smaller phone) with
16 between columns and 24 between rows; it had hairlines, chip hearts and 48.5% columns.

Result (light, 2× grid): the bar's edges, back arrow, title, filter button, the count, the second
column's left and right edges and the first card's title are within 1–2px of the frame. Dark:
page and bar fills match exactly; the bar's hairline is 6/255 darker and the filter button 8/255
lighter than the frame (`#292929` token against sampled `#222`).

Kept on purpose: the frame's back arrow is drawn at 50% (tertiary); `BackButton` keeps the primary
tone the app uses on every screen. The results screen's empty state still shows the compact
`Disclaimer`, since `Disclaimer card` is Home's until this screen has its own frame for it.
Not verified: the filter sheet and its ten states, the loading skeleton.

## About the owner (light) — 2026-09-20

Figma light `1:21984` (section `1:21983`, dark section `1:21885`) · app
`src/screens/users/users-screen.tsx`, opt-in `variant="profile"` on
`src/components/product/{detail-section,spec-strip}.tsx` · captures
`design/app/owner.light.iphone16e.png`, side by side in `design/app/owner.compare.light.png`.

Changed: a centred "About the owner" header with a mini back arrow, a 72pt avatar over a small
bold name, a three-column facts strip (rating, products, user since) 8pt under it, a 56pt outline
"Chat with {first name}" button, then hairline-separated products and reviews blocks that reuse
the Home tile rail and the detail review card, each ending in a 56pt "View all" button.

Result (light, 2× grid): header, back arrow, avatar, facts icons, values and labels, the chat
button, the hairline, the "products" heading and the first rail photo are within 1px (0.5pt).
The first pass had the facts row 8pt low (a 16pt gap where the frame has 8pt), fixed in the
same commit.

**Removed, needs your sign-off:** the old screen's verification card (email and phone
verified, "Lists in <area>") and the business-name pill, which the frame does not draw. They
came from the listing payload. If they are a trust signal you want to keep, they need a slot in
the design; the old code is in git history (`git show 25d3b0c:src/screens/users/users-screen.tsx`).

Kept away from the frame on purpose: the buttons' border is the control-edge token (`inputLine`)
not the hairline, per the token file's WCAG note; "User since" reads "Aug 2026" not "May 15, ’24"
(an earlier fix); the rating column keeps "New / Host" for an unrated owner; "View all products"
and "View all reviews" keep their existing show-only-when-there-is-more gating.

Dark (frame `1:21886`, captured scrolled so the pinned header shows): page `#000000`, the chat button's fill `#0F0F0F` and the hairline (`#282828` against the frame's `#292929`) match. Not verified: the review rail (this owner has no reviews);
the "View all" buttons (this owner has two products and no reviews); the cross-fade between the
scrolled and pinned headers beyond a static look.

## FAQs (light + dark) — 2026-09-20

Figma light `1:11770`, dark `1:11349` (sections `1:11707` / `1:11286`, which also hold Feedback
& Review ×3, Contact Us, Who we are, T&C, Privacy Policy and My Products, not yet audited) ·
app `src/screens/profileScreens/faqs.tsx`, `src/components/core/accordion.tsx` (used only here) ·
captures `design/app/faqs.{light,dark}.iphone16e.png`, side by side in `design/app/faqs.compare.*`.

Changed: the header is a 44pt row with the title centred at 18 bold (it was the 20pt section
title) and the back control 16 from the edge (24 before); the content is padded 24 with 16
between the intro, the list and the footer; the questions are 14 bold in 56pt cards, radius 12,
hairline, no shadow, 8 apart (they were 18 bold, 74pt, radius 14 with a shadow and 16 apart);
the plus is heroicons' mini glyph in tertiary; the footer link uses the mini chevron. The
intro's trailing "!" is restored to the frame's copy.

Result: the back arrow, title, intro, plus glyph and all four measured cards (including the
two-line ones) are at the same pixels as the frame in light (0px). Dark: page, card fill and
plus colour match; the card border is 5/255 darker than the frame's `#292929`.

Kept from the app, not the frame: the answers' copy (the frame's answers name the website and
`garvit.babel2000@gmail.com` for hiring, which is a freelancer value; the app's answers use the
`simplyrenit.com` addresses and app-specific instructions) and the support address
(`support@simplyrenit.com`, the frame says `support@renit.com`).

## Contact Us (light + dark) — 2026-09-20

Figma light `1:11890`, dark `1:11469` · app `src/screens/profileScreens/contactUs.tsx` · captures
`design/app/contact.{light,dark}.iphone16e.png`, side by side in `design/app/contact.compare.*`.

Changed: the header is the FAQs' 44pt row (18 bold title, back control 16 from the edge); the
screen is three blocks, each padded 32/24 with a 24pt icon and a 16 bold heading over one 44pt
outline button (radius 12, hairline, mini chevron), closed by a hairline. It was three blocks with
14pt padding, a 20pt heading-to-button gap, 48pt buttons at radius 16 and a 0.2pt divider.

Result (light): the back arrow, title, icon, heading, all three buttons and all three rules are
within 1px (0.5pt) of the frame. Dark: page and button fills match; the hairlines are 4–5/255
darker than the frame's `#292929`.

Kept from the app, not the frame: the addresses (`support@simplyrenit.com` against the frame's
`support@renit.co.in`; the phone number is the same) and the frame's unused first-frame
profile row ("Tejas Hinduja … Edit"), which sits off the visible canvas and is not part of the
screen.

## Who we are, Terms & Conditions, Privacy Policy (light) — 2026-09-20

Figma light `1:11932`, `1:11963`, `1:11981` (dark `1:11511`, `1:11542`, `1:11560`, not compared) ·
app `src/screens/profileScreens/who-we-are.tsx`, `src/screens/terms.tsx`, `src/screens/privacy.tsx`,
new `src/components/core/subpage-header.tsx` (also now used by FAQs and Contact Us) · captures
`design/app/{whoweare,terms,privacy}.light.iphone16e.png`, side by side in `design/app/*.compare.light.png`.

Changed: all three take the shared sub-page header (a 44pt row, 18 bold title, the back control 16
from the edge; Terms and Privacy had a bare 26pt arrow with no hit target, a 20pt title and 10%/80%
width columns). Who we are: the copy is body text (16/24) in the secondary tone, the FAQs block
follows it with the heading over a 44pt outline button, and it is no longer pinned to the bottom of
the screen. Terms and Privacy: the text sits on the 24 gutter (it was 16), is 14/21 (the app's default
line height was 27), the effective date is bold not italic, and the blocks are 20 apart.

Result (light, 2× grid): Who we are matches the frame line for line (0px, every text run and the
FAQs heading and button). Terms and Privacy: every line lands within 1–2px of the frame's line
pitch (42px), first lines within 1px; the block gaps differ by ~1.5pt where the frame's paragraphs
carry blank lines.

**Copy is not copied.** The frames show an older legal text (Terms "Effective Date: 16/06/2023",
"Mobile Application"; the app's is the current "Last updated: 10/11/2024" text that says
"Platform"), and the Who we are copy differs in a phrase. Legal wording is a product and legal call,
so only layout was matched.

Dark (frames `1:11511`, `1:11542`, `1:11560`): Privacy and Who we are compared; Terms not. Page `#000000`, headings and Privacy's body text `#FFFFFF` and the Who we are button fill `#0F0F0F` match the frames exactly. Who we are's body text measures 206/255 against the frame's 178 (70% white): the app's body tone reads lighter than the design's secondary tone in dark, even with the theme's `textBody` token set directly; the cause was not found (it is app-wide if it is the tone).

## Feedback & Review, empty state (light + dark) — 2026-09-20

Figma light `1:11804`, dark `1:11383` (two more frames of the flow, `1:11831` and `1:11858`, and
their dark twins are not audited: presumably a typed state and the sent state) · app
`src/screens/profileScreens/feedback-review.tsx` · captures `design/app/feedback.{light,dark}.iphone16e.png`,
side by side in `design/app/feedback.compare.*`.

Changed: the shared sub-page header; the copy sits 28 under it on the 24 gutter; the field is 200
tall with 16 padding, radius 16 and a hairline (it was 160 tall at radius 14 with the stronger
control edge); and the empty Submit is bare grey text with no fill, as the frame draws it, turning
into the primary button once there is text (it was a full-width disabled button box). The app's
"Have any more questions? Email us at …" footer is kept at the bottom although the frame does not
draw it.

Result (light, 2× grid): the header, all four lines of copy, the field (452 to 851px) and the Submit
text are within 1px (0.5pt) of the frame. Dark: page and intro text match; the field is left unfilled
like the frame's (the app's other fields fill with the surface tone); the hairline is 4/255 darker.
Not verified: the typed state with the keyboard up, the sent state.

## Personal details sheet (light + dark) — 2026-09-20

Figma light frame `1:10776` (Bottom sheet `1:10839`) · app `src/components/profile/post-auth/sheets/PersonaldetailsSheet.tsx` ·
captures `design/app/personal.{light,dark}.iphone16e.png`. Viewed only: no field was edited, saved or uploaded.

Changed: title "Personal details" 18 bold centred in a 44pt row (was 24pt "Personal Details"); picture row 80pt
(16/24 padding, 48pt round avatar, 14 bold label, purple "Upload" text replacing the pencil, hairline under);
four fields 85pt each (16/24 padding, 14 bold label, 16 value, 8 gap, pencil pinned top-right at 24) with no
rules between them; `frame` grabber/scrim; sheet snaps to its content height (37 grabber row + rows) plus the
bottom inset instead of `62%`. Pencil and Upload keep a 12pt hitSlop so the targets stay reachable. The
"Delete my account" row is ours, not the frame's; kept as a contained destructive row under the fields.

Deviation kept: the frame's avatar is an initials chip ("GB") in the hairline tone; the app shows the account photo
(the frame's hidden Image variant is the photo), so the photo stays. Frame values that are freelancer data
(name, email, phone) are not copied. Sub-sheets (edit name/email/phone/password, profile-picture chooser) are not
restyled and not opened, since they write to the account.

## My Products (parked) — 2026-09-20

Frame `1:12006`. Not implemented: the frame draws a "Share entire catalogue" row and an Edit button per listing,
while the app's "My listings" shows Live/Rejected moderation pills and no Edit buttons. Which model is wanted is a
product decision (status pills vs Edit), so the screen is parked until Yash decides.

## Review 4 (commits 1e50c45..b6dd31e) — 2026-09-20

Fixed: Personal details fields `minHeight` (Dynamic Type clipped the values), "Upload profile picture" label
(WCAG label-in-name), delete row on the 24 gutter; SubpageHeader renders the back control first (VoiceOver order);
unused imports/locals and 57 empty `className=""` removed from Terms/Privacy/FAQs/Feedback/Accordion; legal scrollers
use `flex: 1`; Feedback footer tokenised like FAQs (no hardcoded dark brand); Accordion answer on the same 16 as its
question; Contact Us bottom padding; buttons use `MIN_TOUCH_TARGET`; `subpage-header` export order.

Deferred, recorded: (1) 14 screens still hand-roll their headers at 20pt (notification, report-a-problem, my-product,
edit-product, unavailability_*, reviews-screen, write-review, products-screen, owners-review, chat-details,
edit-step-header); they move onto `SubpageHeader` as their frames are matched. (2) Frames draw buttons/accordions at
radius 12: resolved, `radius.button` is now 12 (see "Rulings taken"); the search fields on Home and Search keep local 12s next to `radius.input` 11. (3) Numeric snap point shrinks 10% while the keyboard is up (custom sheet
behaviour); the picture-update button can push past the sheet height (scrolls). (4) Who we are dark body text: the
reviewer computes `textBody` (0.70 white over #000) = 178, the frame's value, so the 206 reading is probably a capture
artefact; re-measure with the P3 to sRGB conversion before trusting it.

## All reviews (light + dark) — 2026-09-20

Figma `1:17697` (section "Writing a review", `1:17538`) · app `src/screens/products/reviews-screen.tsx`,
call-site only on `src/components/product/review-card.tsx` · captures
`design/app/reviews.{light,dark}.iphone16e.png`, side by side in `design/app/reviews.compare.*`.

Changed: the shared `SubpageHeader` replaces the hand-rolled 20pt row, titled "All reviews" (it said
"Reviews"); "Rating"/"Reviews" `SectionHeader`s are gone. The screen is now one 24pt column — a 20pt bold
"Product Reviews", 24 under it a score line (one 70%-ink star, then `4.1`, `•` and `188 reviews` as three
runs on the row's 8pt gap), 16 under that five bar rows 8 apart (digit, 20pt star, 8pt track, count column
30 wide, left-aligned), 24 under those a 44pt hairline "Write a review" row at radius 12 with a mini
chevron, 32 under that the "N reviews" heading at 16 bold, then the cards 16 apart. The cards are the
product page's `variant="detail"` card at full width (185pt, body clamped to three lines, underlined
"Show more"), not the old shadowed card; with no `onShowMore` the control expands in place.

Result (frame upscaled to the 2× grid, app shifted +7pt): the back arrow, title, "Product Reviews", the
score line's star and first run, all five bar rows' tops, every bar track and count column, the write row's
box, label and chevron, and the card's three body lines and avatar land on the frame's pixels (0px). The
rest is within 1px: the "N reviews" heading, the card's own box (my card measures 187 against the frame's
185 — RN adds the 1px stroke outside the 16pt padding, the same 2px the product page's rail already
carries), and the card gap.

**Monochrome, not gold or brand — needs your sign-off.** The frame draws both the score star and the bar
fill in ink (`#000` light) with an `#E6E6E6` track; the screen used a gold star and a purple bar. `Stars`
already carries `tone="ink" | "secondary"` for exactly this, so the change follows the product page, but
the histogram losing the brand colour is a visible call.

**The frame's own numbers do not add up.** It reads "4.0 • 180 reviews" over bars labelled 56/100/20/10/2
(sum 188) and a list headed "24 reviews", and its bar widths are not proportional to those counts (4★=100
draws shorter than it should). The app computes all three from the API, so it will not reproduce the
frame's figures; only the geometry was matched.

Measurement floor: the frame export in `design/figma-images/profile-subs/dark/1-17697.png` is 1× (390×844),
not the 2× the earlier passes used, because the Figwright MCP was not available this session (`ToolSearch`
is disabled, so the figwright tools could not be loaded). 1px there is 1pt, so "0px" here means ≤1pt, not
≤0.5pt. Re-export at 2× and re-measure when the plugin is reachable.

Dark (no dark twin found for this frame; checked against the tokens): page `#000000`, bar track `#292929`
(= `line`, exact), bar fill and bar stars `#FFFFFF`, score star and score text 70% white, card and write-row
fill `#0F0F0F`, their border reads `#242424` against the `#292929` token — the same 4–5/255 capture offset
every earlier dark entry records.

## Write a review (light + dark) — 2026-09-20

Figma `1:18034` · app `src/screens/products/write-review.tsx` · captures
`design/app/write-review.{light,dark}.iphone16e.png`, side by side in `design/app/write-review.compare.*`.

Changed: the shared `SubpageHeader`; a 24pt column 27 under it with 16 between blocks and 8 between a
heading and its control. The summary row is a 72pt thumbnail at radius 12, 16 from a column of title
(14 bold, one line, truncated), location (14, secondary) and a baseline-aligned `₹1990` (16 bold) + "per
day" (14, tertiary) 4 apart. The product review is the frame's 200pt box — radius 16, hairline, 16 padding,
no fill, placeholder "Share your thoughts..." — with no label above it. The condition control is 48pt at
radius 12 with 16/8 padding, a 20pt condition glyph 8 from a 16pt value and the app's mini chevron-down
replacing the library's filled caret. Submit is bare tertiary 14 bold in a 44pt row until the review is
complete, then the primary button — the treatment Feedback & Review already uses.

Result (frame upscaled to the 2× grid, app shifted +7pt): header, thumbnail, summary title, summary
location and the condition heading land on the frame's pixels (0px); the price line, the text area's box,
its placeholder and the condition control are 1px low. Same 1× measurement floor as All reviews above.

**Deviation, and a product decision for you.** The frame has no owner review and no star ratings, but
`write-review/` requires `productReview`, `ownerReview`, `productRating` and `ownerRating`, so they are
kept: "How was the owner?" over a second copy of the frame's text area, then "Rate the product" and "Rate
the owner" over 48pt radius-12 hairline boxes modelled on the condition control. That pushes Submit below
the fold, where the frame draws it 16 under the condition control. Either the frame is missing three
required fields or the API should stop requiring them — that is your call, not a layout one. The star boxes
are invented: the frame draws nothing for them.

Kept from the app, not the frame: the condition value (the frame shows "Fair"; the app defaults to "Good")
and the listing data. The frame's listing (Hero Xpulse 200T, Goregaon) is freelancer data and is not copied;
the captures use a QA listing.

Two frame values that are not clean tokens, both kept because they are what lands on the frame: the 27pt
top inset (All reviews measures 24 under the identical header) and the 5pt gap between the three lines of
the summary column.

Dark: page `#000000`, both fields left unfilled with a hairline as the frame's boxes are, the condition
control the same, thumbnail unchanged. No dark twin frame was found for `1:18034`.

## How these two were captured — 2026-09-20

The Simulator's window was closed on this machine and macOS Accessibility is not granted to the shell, so
neither screen could be reached by tapping (`CGWindowList` shows no Simulator window; `xcrun simctl io …
screenshot` still renders). Both were captured through a temporary harness that mounted the two screens in
a bare stack with fixture route params and an axios request interceptor that answered
`product-review-stats/` and `product-review/` from fixtures. The harness wrote nothing — only those two GETs
were stubbed, no review was submitted — and it is deleted; `App.tsx` is byte-identical to `HEAD`. A run that
can tap should still walk product detail → All reviews → Write a review to check the two transitions, the
condition picker's open state, the keyboard-up state of both text areas, and the Submit button in its live
state.

Also worth a second look next session: a macOS "wants to control this computer using accessibility
features" dialog opened while probing for a way to tap (from `osascript`/`cliclick`). It was left alone —
granting it is a permission decision for you, not for an agent — but it is sitting on the desktop.

## Change password / Change phone number / Change profile picture — no sheet drawn — 2026-09-20

Sections `1:18756`, `1:22817`, `1:22245` (labelled "Dark mode") hold 5, 5 and 2 frames that are each a copy of the
Profile tab: the first is dimmed and the rest are undimmed light; their Overlay nodes contain only a home indicator
(checked `1:18822`, and by eye `1:22919`, `1:22346`). No sheet, field, OTP step or picture chooser is drawn, so there
is nothing to match (same as the Filter sheet). The app's sub-sheets stay as they are. The frames also show a
"Dark mode / Currency" pair in the App group that the app replaces with "Appearance" and has no Currency row.

## Feedback & Review, typed and sent states — 2026-09-20

Frames `1:11831` (typed) and `1:11858` (sent), light. Typed state: the field text is the app face at 14/21
(the app's bare `TextInput` fell back to the system font at 16, so the lines wrapped differently and read as
foreign text); it now sets `fontFamily.regular`, `fontSize.sm`, `lineHeight.sm`. With that, the six line
breaks of the frame's sample text match the app's exactly, and the primary Submit button is the frame's 44pt
radius-12 fill (`design/app/feedback-typed.light.iphone16e.png`). The frame draws no "Have any more questions?"
footer in either state; the app keeps it. Typed in the simulator only, nothing submitted.

Sent state: the frame draws a "Feedback submitted!" toast above the tab bar (brand-tint fill, brand hairline,
filled brand check square, 14 bold text). That is the app-wide toast component (`src/lib/toast`), not this
screen, so it was left alone and needs its own pass. The Terms dark frame `1:11542` is a plain text page on
black like Privacy's, whose dark check passed; not compared separately.

Toast (decision, not done): the frame's only toast is a success one drawn in a brand tint (`#EDECFB`-like wash,
brand hairline, filled brand check square). `ToastBody` carries four severities on the semantic colours, which are
deliberately kept until the designer ships a set (see the redesign memory), so restyling success alone would make
it the odd one out. Waiting on that set.

## Post wizard, steps 1–4 (light + dark) — 2026-09-20

Figma light `1:13231` (category), `1:13333` (sub-category), `1:13455` (form), `1:13650` (image
upload), section `1:13230` · exports in `design/figma-images/post/light/` · app
`src/components/post/{header,page-indicator,taxonomy-list,product-image-grid}.tsx`,
`src/screens/post-screens/post-sub-categories.tsx`,
`src/screens/profileScreens/edit/edit-sub-categories.tsx` · captures
`design/app/post-{category,subcategory,form,images}.{light,dark}.iphone16e.png`.

This closes the "AUDITED (step 1), parked" entry above. The three decisions it was parked on are
settled by the goal for this pass: the wizard keeps its seven steps, its X exit with the
"Step N of 7" caption, and the app's own category list, order, names and glyphs. Everything that
maps 1:1 to the frames is matched.

### Header (all seven steps, and the edit twins that share it)

| Element | Was | Figma | Resolution |
| --- | --- | --- | --- |
| Title | 16pt semibold | 18 bold, centred, cap line 86.5pt down the screen | Matched (`text-base` / `font-bold`) — the same type `SubpageHeader` already uses |
| Back control | 44pt box 4pt from the edge | 24pt arrow in a 44pt target 16 from the edge | Matched |
| Progress | 7 segments spread over a fixed 220pt (28pt each) | 24×4 pills, 4pt gaps, brand fill on an `#E6E6E6` track | Segment geometry matched; the wizard draws its own row rather than change the `PageIndicator` the auth flow shares |
| Separator | Hairline under the header | None | Removed |
| Material | Blur | Header is part of the page | `material="solid"` — the blur measured 8/255 over true black, a grey band the frame does not draw |

Result (light, 2× grid, app aligned +12px on the status-bar baseline): the title's cap line, all
seven segments' x positions, their 24pt width and 4pt gaps land on the frame's pixels (0px). The
bar is 1px (0.5pt) low.

**The one place the kept structure and the design disagree.** The frames draw no step caption, and
they leave 16pt between the title's line box and the bar. "Step N of 7" needs 18 of it, so the
caption's leading is tightened to 16 and the gap to the bar is 0. That buys the frame's title
position and the frame's bar position at the same time, to within 1px, at the cost of the caption
sitting in air the frame leaves empty.

### Step 1, "Choose a category" (frame `1:13231`)

Rows were a 22pt glyph with 20pt of space after it and an 18pt label, so every label sat 12pt right
of the frame and every row was 59pt instead of 56. Now: a fixed 20pt glyph box on the 24 gutter,
8pt, a 16pt label, and the mini (not outline) chevron at 20pt right-aligned to the gutter — the
outline one drew 14pt tall against the frame's 10.

Result: the first row's chevron centre, the 112px row pitch, the glyph box, the label's start (104px)
and its 12pt cap height are within 1px (0.5pt) of the frame. Residual: the chevron's right edge is
1pt inside the frame's.

### Step 2, "Choose a subcategory" (frame `1:13333`)

The branch was a 14pt grey caption reading "In Electronics" with 14pt under it. The frame draws a
56pt row — a 24pt back chevron on the gutter, the branch name in 14 bold, a full-bleed hairline
under it — so the label and the way out of the branch are one control. `TaxonomyList` gains an
opt-in `onContextPress`; without it the row still draws, inert, which is what a caller with no
branch to return to wants. Both callers (the wizard step and `EditSubCategories`) now pass
`categoryDisplayName(category)` and `goBack`.

Result: the chevron (63–80px), the label's start (106px), its cap height, the hairline (396–397px)
and the first four list rows land on the frame's pixels (0px).

### Step 3, "Tell us about your product" (frame `1:13455`) — header only

The header matches. **The field ramp is not restyled, and needs your ruling.** Measured, the frame
wants 16pt bold labels over 16pt helper text, 48pt fields with an `#E6E6E6` hairline edge, and 39pt
between field groups. The app is at 14pt bold labels, 14pt hints, 44pt fields with the `inputLine`
control edge, and an 18pt `fieldGap` — every one of those is a deliberate, commented decision in
`src/components/core/field.tsx` and `design-tokens.ts` ("a label must not outrank the value the
customer types into the field below it… a single field group came to cost 146pt"; "control borders
use `inputLine`, not the hairline: a 1.13:1 border fails WCAG 1.4.11"). Matching the frame means
reverting both, in `core/`, for every form in the app. That is a design-system call, not a
screen-level restyle, so the screen is left as it is and the difference recorded. The same ruling
is already open for the hairline-bordered controls on Logout, the results filter and the owner
buttons.

Not copied either way: the frame's title-case labels ("Product Name") against the app's sentence
case, and its placeholder sample data (`"Macbook AIr"`, with the typo).

### Step 4, "Show us how it looks" (frame `1:13650`)

The empty state was a dashed box 20% of the window tall — so it grew on a tall phone and shrank on a
short one — under a full-width disabled button. Now: one dashed box on the 24 gutter, 160pt tall at
the field radius, a 28pt plus centred in it (Heroicons' `PlusIcon` reaches the frame's 18.5pt drawn
width at 28, not at 24), 24pt under the header, and a bare tertiary "Next ›" in a 44pt row — the
treatment Feedback & Review and Write a review already use for an incomplete form — which becomes
the primary button once there is a photo.

Result: the box's left and right edges (48/731px), its top edge, the plus's x and y, the "Next"
label's width and its 20px cap are within 1px (0.5pt); the box's lower edge and the chevron are 1pt
out. The frame's "Next" is `#7F7F7F` (50% black); the app draws `textDim` (0.58), which is the
smallest step that clears AA on white.

**Structural difference, deliberate:** the frames draw the tab bar under every wizard step and put
"Next" 42pt above it. Entering Post hides the tab bar in the app, so "Next" is pinned above the home
indicator instead; matching the frame's absolute y would leave it floating in the middle of empty
space.

### Dark

No dark frame exists for section `1:13230` in the exports available this session, so dark was
checked against the tokens, not against a frame: page `#000000`, header band `#000000` (after the
material change), hairline and bar track `#292929` (= `line`, exact), bar fill `#635BE8` (= `brand`,
exact), labels `#FFFFFF`, the upload plus `#808080` (= `textDim`, exact).

### Steps 5, 6 and 7 — not audited

`ChooseCoverImage`, `ProductAvailability` and `ReviewProduct` inherit the new header and nothing
else. Their frames (`1:13673` images-filled, `1:13698` cover, `1:13729`/`1:13817`/`1:13908`
availability, `1:14002` review) could not be exported this session: `ToolSearch` is disabled so the
Figwright MCP could not be loaded, and Figma's REST API answered 429 (the ~4.5-day quota lockout the
`renit-figma-access` memory records). Re-export at 2× and measure when either is reachable.

### How these were captured, and what that does not prove

Same constraint as the All reviews / Write a review pass: the Simulator's window is closed on this
machine and macOS Accessibility is not granted to the shell (`System Events` reports no window and
no menu bar for the Simulator process), so the wizard cannot be reached by tapping. All eight
captures were taken through a temporary harness that mounted one post screen at a time in a bare
stack, with the sub-category step's route params taken from the signed-in account's own category
list. The harness wrote nothing — no listing was published, no photo picked, no permission prompt
accepted, no submit pressed — and it is deleted; `App.tsx` is byte-identical to `HEAD`.

Not verified on device, and worth a run that can tap: the transitions between steps, the
sub-category row's new back chevron actually going back, the image grid with photos in it (the
picker needs a permission prompt, which is an approval gate), the condition dropdown's open state,
and steps 5–7 in any state. Step 1's capture also lacks the tab bar, which the real Post tab draws —
the harness does not mount the tab navigator, so only the top of that screen is evidence.

## Review 5 (Post wizard steps 1-4, All reviews, Write review, Feedback typed) — 2026-09-20

Fixed: star rating targets (`Rating` horizontal hitSlop now reaches the 44pt floor without overlapping the
neighbour, which repairs the 20pt stars on Write review), the image-grid "Next" chevron (mini, 20), the
one-line clamp on category labels (rows absorb two lines), the inert back chevron when a taxonomy row has no
handler, and two stale comments (taxonomy geometry, edit header).

Deferred: (1) the edit twins (`EditCategory`, `EditSubCategories`, `EditProductImages`) keep the old 4pt/20pt
header and were never captured; (2) sub-category step draws both a header back arrow and a context-row chevron
(the frame draws both; VoiceOver reads two Backs); (3) three "inactive submit" colour APIs (`ink.dim`,
`tone="dim"`, `color.textDim`) and `text-white` on Feedback's active label; (4) Feedback sets `lineHeight.sm` on
its field while Write review omits it, on the frames' 2pt difference; (5) All reviews histogram hand-rolls
`StarIcon` instead of `Stars`; (6) fixed-height boxes around scaling text in the review screens; (7) steps 5-7
of the wizard (frames exported this session to `design/figma-images/post/light/`, not yet audited) and the
walk-through on device; (8) `write-review.tsx` swallows a failed submit in an empty `catch`, so a network failure
shows nothing (pre-existing).

## Rulings taken 2026-09-20 (user approved the defaults) — radius, Post form fields, success toast

- **`radius.button` is 12** (was 11). The Figma Button component (`1:141`, `1:145`) has `cornerRadius: 12`; the 11 was a
  mis-measure. `tailwind.config.js` `borderRadius.button` follows. The local `12` constants in Contact Us, Who we
  are, Accordion, About the owner, Product Details' CTA, All reviews and Write review now read `radius.button`
  (`radius.input` stays 11 until a frame shows a single-line input at another value).
- **Post form fields:** the shared field gains an opt-in `FieldFrame` (context) and a `frame` option on
  `useFieldSurfaceStyle`: 48pt, 16 padding, radius 12, hairline edge. Only `about-product-form.tsx` wraps its
  content in it; Search, price filter and the auth screens keep the default 44pt box with the stronger control edge.
  The hairline is below the 3:1 control-edge rule (WCAG 1.4.11); accepted for this form only. Step 3 capture:
  `design/app/post-form.light.iphone16e.png` (fields 48pt, radius 12). Not matched: the app's labels/hints
  (smaller, grey, with required marks and different copy) and the 18pt group gap against the frame's 32; the frame
  also has fewer fields than the app.
- **Success toast:** `ToastBody` draws the frame's brand-tint pill (Purple/50 fill, Purple/100 line via
  `brandPanel`/`brandPanelLine`, 24 gutter, 8 padding, 16 radius, 36pt brand check tile, 16 bold text) for a
  success toast without a second line; other severities and success-with-message keep the semantic palette.
  Not seen on device yet (needs a success event; the only ones write data).

## Chat list (light + dark) — 2026-09-20

Figma light frame `1:15742` (section `1:15542`; the other four frames are the thread, its menu and the Block &
Report sheet) · app `src/screens/tabs/chat.tsx`, `src/components/chat/chat-card.tsx`. Viewed only: the list is read
from the real QA account's own conversations and nothing was opened, so no read receipt was written. The captures
(`design/app/chat.{light,dark}.iphone16e.png`) show third-party names from that account and are NOT committed.

Changed: title padded 16 above/below with the search block padded 8 (the field 48 tall, radius 12, hairline, 20pt
icon, 16 padding); rows 80 tall (16/24 padding, 8 from the 48pt avatar to the text), no rules between rows (the frame
draws none), the time pinned top right and the unread badge a 24pt circle below it, neither taking width from the
text. Measured on the 2x grid: title, search field, row pitch (80pt), avatar, text column (x 80) and the time's right
edge are within 1px of the frame in light; dark spot-checked by eye.

Deviations kept: the app's copy ("Chat", "Search conversations", dates instead of "7:19 pm"); read previews stay on
the body tone, since the frame's 50% black is 3.95:1 on white and fails AA for 14pt text; semibold names when read
(the frame draws them bold). Not verified: the unread badge and the tinted time (no unread conversation exists), the
swipe-to-delete action, and the thread, menu and Block & Report frames, which need a thread opened (read receipts).

## Chat thread (light) — 2026-09-20

Figma light `1:15651` (thread), `1:15543` (⋯ menu open), `1:15593` (Block & Report sheet), section `1:15542`; the dark
section `1:15316` was not sampled · app `src/screens/chat/chat-details.tsx`, `src/components/chat/chat-header.tsx`,
`chat-bubble.tsx`, `chat-input.tsx` · restyled from a measured spec plus the 2× exports in
`design/figma-images/chat/frames/`. **Nothing here was run.** No conversation was opened, no message sent and nothing
marked read, so every value below is static: the only check performed is `npx tsc --noEmit` (clean apart from the two
known `functions/` module errors). Sample names and message text in the frames are freelancer data and are not copied.

Changed:

- **Header.** A 60pt row (8 padding, 16 inset, 1pt `line` under it) replacing the 24-gutter `border-b` row. Back arrow
  24 in the secondary tone inside a 44pt `IconButton` — not `BackButton`, which has no tone prop and lives in `core/`,
  which this area does not edit. Avatar 32 (was 40), 8 to the name (was 12), name 14 bold (was 18 bold); the loading
  skeleton follows the new sizes. The name is width-bounded now, so a long one truncates instead of running under the
  ⋯ control. Menu, Block & Report, "View listing", the blocked state and the tap through to `UserDetail` are untouched.
- **Message list.** 16 above the first message and below the last, and a flat 16 between every pair — drawn as a `gap`
  on the scroller so a day chip is spaced by the same rule (it lost its own 10pt padding). Bubbles keep the 24 gutter.
  `ChatBubble`'s `grouped` prop is gone: the frame draws no tighter spacing for a run from one sender. The run itself
  survives — it still suppresses the repeated timestamp, which is computed in the screen.
- **Text bubbles.** Radius 16 (was 14), 8 vertical / 12 horizontal padding, text 14 **bold** (was 16 regular), max width
  220 (was 80%). Received is filled with `line` and has no edge (was `surface` + an `inputLine` edge); sent is `brand`
  with `onBrand` text. Link messages keep the underline and the brand text colour.
- **Timestamp.** Kept, at 12pt with its leading pulled to 14 so it costs the bubble ~14pt, right-aligned inside the
  bubble's own padding. The frame draws no timestamp at all.
- **Composer.** A 16/24 row on the canvas with no rule above it and no raised ground under it (the frame draws
  neither). The pill is exactly 44 — the two 1pt edges are subtracted from the field's floor, because React Native lays
  borders inside the box and a 44pt field in a 1pt edge drew a 46pt pill. Radius full, `line` hairline, canvas fill, 16
  left inset. Typed text and placeholder are 14 regular with `fontFamily.regular` set explicitly on the bare
  `TextInput`. Clip and offer glyphs are 20 in the tertiary tone. Send is unchanged: a 44pt brand circle with a 20pt
  airplane, dimmed while the field is empty. Offers, attachments, the preview modal and the upload path are untouched.

Deviations, and what needs a ruling:

- **The pill's edge is `line`, not `inputLine`.** `design-tokens.ts` states that a control's edge must be `inputLine`
  (WCAG 1.4.11, ≥3:1); the frame draws `#E6E6E6`, which is 1.2:1 on white. This is the same trade already accepted for
  the Post form fields (see "Rulings taken"). If the rule is meant to hold everywhere, this is the place it matters
  most — it is the app's most-used control.
- **Received bubbles lost their 3:1 edge** for the same reason: the fill is the boundary now. A bubble is not an
  interactive control, so 1.4.11 does not strictly govern it, but the bubble/canvas separation is weak on light.
- **The two glyphs in the pill get 28×44 targets, not 44×44.** The frame puts 8 between the glyphs; 44-wide boxes would
  make the two hit areas overlap, which is a worse failure than a narrow target. 28 is the widest the drawing allows.
- **220 is taken as the bubble width** although the frame's first sent bubble is 300 and the other three are 220. It is
  a fixed width, not a fraction, so bubbles stay 220 on a larger phone — as the design has it.
- **The sent timestamp keeps solid white**, not the 70% secondary the spec suggests: 70% white on the brand fill is
  3.27:1, under what a 12pt string needs.
- **Every message is 14pt bold.** That is what both frames draw, and it is unusually heavy for body copy at any length
  beyond a line or two. Worth a designer confirmation before it ships.

Found on the way (pre-existing, fixed here): a message whose body happens to be valid JSON without being an attachment
envelope — a bare number, `true`, `null` — parsed successfully, matched neither the image nor the file branch, and fell
out of the renderer as `null`, i.e. an empty bubble. Parsing now happens once, and anything that is not an image or
file envelope is treated as prose.

Not verified: all of it on device — the screen was never opened, so the keyboard path with the taller composer, the
auto-grow floor, the scroll-to-bottom behaviour and VoiceOver order are unchecked. Dark is by token only (the dark
section was never sampled, and `line` is `#292929` there, one step off true black). Not touched and not measured: the
offer card, the `product_post` card, the image and file bubbles (colours only), the ⋯ menu, the Block & Report sheet
(frame `1:15593`), the blocked/unblock footer, and frames `1:15695` and `1:15742`.

Chat thread, device check (light, fixture thread `QA_CHAT_E2E_20260723`, opened once, nothing sent): header row and its
hairline sit within 1pt of the frame on the 2x grid, the 32pt avatar and the 24pt ellipsis at 16 from the edge match,
the received bubble is the grey 16-radius fill with 14 bold text, and messages are 16 apart. Not verified: the sent
bubble (the fixture has no message of ours, and sending would write), the composer (covered by the dev push toast in
the capture; its top sits 8pt higher than the frame because the 16e's 34pt home-indicator inset is taller than the
frame's 21), dark, and the menu and Block & Report frames. Review notes from the agent still open: the pill and
received bubble use the hairline instead of the control edge (WCAG 1.4.11), pill glyph targets are 28x44, and 14 bold
for every message is heavy for body copy.

## Review 6 (radius, Post form fields, toast, Chat list and thread) — 2026-09-20

Fixed: the chat composer pill and the chat search field are back on the control edge (`color.inputLine`) since the
frame's hairline is 1.25:1 against the same canvas fill and the WCAG control-edge ruling was only accepted for the Post
form; the two composer glyph buttons are 28pt boxes with the IconButton hit slop (44pt vertical, 36-44 wide) so the
pill is exactly 44; the chat row's time and badge clearances scale with the font scale; the toast comment names its
second condition; an unused import.

Open: `FieldFrame` also reaches the edit-product twin (`edit-about-product.tsx`) because the wrapper is in the shared
form, confirm the edit frame `1:14332` agrees before device QA; the toast success branch keeps a raw radius 8 and no
shadow; message text is 14 bold both sides (the frame's, heavy for body copy); the attachment bubble's 4pt inset around a
16-radius photo; local 12s in `search.tsx` and `home/search-bar.tsx`.

## Chat menu (light) — 2026-09-20

Figma light frame `1:15543` · app `src/components/chat/chat-header.tsx`. Changed: the menu is a popover over the live
thread with no scrim (the app dimmed the whole screen), 196 wide, radius 16, hanging from the header hairline and 21
from the right edge; the full-screen Pressable stays so a tap outside dismisses it. On the simulator: right edge
368.4pt against the frame's 369, width 195 against 196, top on the header hairline. Kept: the "View listing" item the
frame does not draw, and the app's copy ("Block & report").

Not matched, product decision: the Block & Report frame `1:15593` is a bottom sheet with a free-text reason box and
Cancel / Block & Report buttons (the destructive fill drawn in Figma's `#E50914` red, not the danger token). The app
confirms with a native Alert and `onReportPress` sends no reason; a reason field needs a backend field for it.
The capture is not committed (it shows the QA thread).

## Make an offer — blocked, not restyled — 2026-09-20

Section `1:16369` (seven frames, exported to `design/figma-images/chat/offer/`): "Check Availability" (calendar in a
sheet), "Make Offer" (product summary, Duration with two date fields, Amount, Security Deposit, a bare-text "Make an offer"
when empty) and the sent states. The app's flow opens on a "Select a product" sheet the frames do not draw, and its list
was empty for the only fixture thread, so neither later sheet could be reached on the simulator without sending or
creating data. The sheets live in `src/screens/chat/chat-details.tsx` (~lines 800-1050). Needs a thread with a selectable
product (an `AGENT_QA_<run-id>` listing and conversation from a second account), or a ruling to restyle statically.

## Notifications (light) — 2026-09-20

Figma light frame `1:18332` · app `src/screens/profileScreens/notification.tsx`. The QA account has no notifications, so only
the empty state exists on the simulator (the frame draws no empty state); opening it made no writes (the earlier fix now
patches only unread items). Changed: the shared sub-page header (44pt row, 18 bold title) with the frame's hairline under
it; rows are 16/24 padded with the 48pt avatar 8 from the text, the name 16 bold inline with the 14 message and the 12
tertiary time below, no rules between rows; the 10pt brand dot for items that were unread when the screen opened (kept in
local state, since opening marks them read). Not verified on device: the rows and the dot (no data; a fixture
notification would need a second account acting on this one), and dark. The header and hairline were checked in the
capture only. Frame sample text and names are data and were not copied. Capture not committed.

## Review 7 (Chat menu, Notifications) — 2026-09-20

Fixed: pull-to-refresh on Notifications now runs the same load-and-mark path as opening (dots accumulate, new items get
marked read, unmounted guard); `markAllAsRead` uses `allSettled` so one failed PATCH keeps the others; the menu rows use
16 side padding so the label has room inside the 196pt panel and the icon sits 24 from its edge as in the frame; the menu's
dismissal target is labelled; dead `right`/`Dimensions` removed; list footer inset on Notifications.

Open: no dark frame or capture for the menu (no scrim leaves a `#0F0F0F` panel on black separated by a 1.8:1 hairline);
the Notifications rows and dot have never been seen with data; the menu is anchored to the icon box, so it drifts at large
text sizes; a refresh that resolves while the open-time PATCHes are in flight can overwrite the fresher list with the older
snapshot; the outer row `Text` injects a 27pt line height; Android `Modal` status-bar offset.

Chat list, unread state (second QA account, 2026-09-20): with a conversation that has 2 unread, the badge is a 24pt brand
circle below the time on the 24 gutter as the frame draws it; the time is now always the tertiary tone (the app had
tinted it brand when unread; the frame does not). The capture shows another user's photo and names and is not committed.

## Make an offer: Check Availability and Make Offer sheets (light) — 2026-09-20

Frames `1:16414` (Check Availability) and `1:16670` (Make Offer) of section `1:16369` · app `src/screens/chat/chat-details.tsx`.
Reached with the second QA account (a thread that lists two products): "Select a product" -> Check Availability ->
Make Offer, view only; the final "Make an offer" was never pressed and nothing was sent.

Found and fixed on the way: opening Check Availability crashed with "Couldn't find a navigation object", because
`BackButton` called `useNavigation()` inside a bottom sheet, which renders in a portal outside the navigator. `BackButton`
now reads `NavigationContext` (no throw) and the chat sheets no longer draw a back arrow, as the frames do not. Any other
sheet that mounts `BackButton` outside the tree is fixed by the same change.

Restyled: 44pt centred 18 bold title with the frame grabber; 72pt product thumbnail at radius 12 with 14 bold title, 14
location and the price as "₹25" 16 bold + "per day" 14 tertiary; the calendar in a hairline radius-16 card with a bold month
row closed by a rule; 48pt date fields, amount and deposit fields at the button radius on the hairline; "Duration" with
the brand pencil; the bare tertiary inactive action that becomes the primary button once usable. Measured against the
frame (sheet tops differ by the 90% snap): Duration, Amount and Security Deposit sit within 3pt of the frame's rows.

Not matched: weekday names are not uppercase (needs a global calendar locale change), the month rule is inset by the
header padding, the frame's sheet is content height where the app snaps to 90%, and the "Select a product" sheet has no
frame. Dark not checked. The captures show another user's listing and are not committed.

Review 8 (offer sheets, BackButton): fixed the dark-mode edges of the Amount, Security Deposit and date fields (they sit on the
sheet's own surface, so they take the control edge), the in-range day colours (brandText/brandWash, the fill failed AA on
dark), a NaN price, and a dead local. Open: the sheets hand-roll `FieldShell` and the calendar instead of `date-range-picker`
(which carries `minDate` and the day hit slop, so past dates are selectable and day cells are under 44pt); the inactive
action is a second disabled treatment next to `Button`'s; the sheets have no labelled dismiss control (the frames draw
none); `BackButton` now fails silently outside a navigator; the raw amount `TextInput` ignores the font-scale cap.

Dark check, chat thread and offer sheets (second QA account, 2026-09-20): the thread (header hairline, sent bubble, product card,
composer pill with the control edge) reads correctly on black; Check Availability shows past dates greyed by the new
`minDate`, the selected range in the brand fill with the in-range days in brandText on the wash (legible), the month rule and
the card edge visible; Make Offer's date fields, Amount and Security Deposit boxes are visible on the sheet surface with the
control edge. Nothing was sent. Simulator restored to light appearance afterwards.

## Post wizard steps 4 to 7 on device (light) — 2026-09-20

Walked with placeholder `AGENT_QA_wizardcheck` values, local state only: Post -> Electronics -> Laptops -> form (San Francisco
default location after you granted location permission; the "Country not supported" toast is the app's own guard for non-IN/US/UK
addresses, dismissed by the flow) -> two photos from the simulator library (the system picker needs no app permission) ->
crop -> availability -> review. Nothing was published: "Post product" was never pressed (it navigates to HangTight, which uploads).

Step 4 (photos): 2-up grid at radius 16, the add tile, the Next button; captured `design/app/post-images-photos.light.iphone16e.png`.
Fixed: the Next label sat at the left of the button (`justify-between` on a single label); it is now centred with the 6pt
chevron gap, on both the image and cover steps.

Step 5 (cover, frame `1:13698`): rewritten to the frame: 24 padding, two square tiles 24 apart at radius 16 (was a 160pt strip),
the chosen tile a 2pt brand edge with a 40% brand wash and a mini check-circle (was a Lottie tick on a brand fill), the "Crop
Image" heading, a 200pt crop preview at radius 16 on the hairline (was 176pt square), a 20pt info icon, tertiary caption. The
native crop tool (`expo-crop-image`) and its aspect ratio are unchanged. The wash is `rgba(99,91,232,0.4)`, a raw colour: the
frame's 40% brand has no token, add one if it is reused. Shared with the edit-cover screen (same component).

Step 6 (availability, frame `1:13729`): month title 20 regular in the secondary tone, month row 54 tall, the heading 16 bold in the
secondary tone. Not matched: uppercase weekday names (needs a calendar locale), the frame's white "Add date log" outline
button (the app's is grey while no date is chosen), and the range colours (the app marks unavailable days in danger red; the
frame shows none).

Step 7 (review, frame `1:14002`): already on the Product Details components (hero, title, spec strip, bottom bar with "Post
product"), so it inherits that pass; not measured separately. The frame's share icon on the title row is not drawn (nothing to
share before posting). Frames `1:13817` and `1:13908` (availability with dates chosen) were not reached.

Review 9 (cover and availability steps) — 2026-09-20. Fixed: the selected tile's tick is a brand tick on a solid white disc (the knockout
glyph vanished over a light photo); the crop preview uses `contain` so the whole portrait crop is visible (the frame's box is
landscape, so this deviates from the frame's fill on purpose); the empty crop placeholder uses the control edge; scroll to the
preview after cropping instead of on selection; per-tile labels ("Image 2 of 3"); the info caption may shrink; the month weight is
set with the family; a stale comment. NOT re-verified on the simulator: the app reloaded during the re-walk and a stray tap opened an
external page in Safari, so these changes are checked by `tsc` only. Open: dark capture of steps 5 and 6; a token for the 40% brand
wash (it duplicates the brand hex); `edit-cover-image` and `edit-product-images` were not walked (the edit header still uses a 4pt
inset against the pickers' 24); `lottie-react-native` and `tick.json` are now unused (removal needs a native rebuild); the back
button's dev warning fires on press only.

## Post wizard step 3, dark check (2026-09-20)

Captured `design/app/post-step3.dark.iphone16e.png` on the iPhone 16e. The 48pt framed fields keep a visible `color.inputLine` edge on the dark canvas, the required markers and helper text hold contrast, and the disabled Next reads as disabled. No dark-specific defect found. Steps 4 to 7 are still unchecked in dark: reaching them needs a photo set and a filled form, which a Fast-Refresh reset keeps wiping.

## Edit flow headers (2026-09-20)

`EditStepHeader` now uses the wizard header's measurements (16pt inset, 44pt row, 18pt bold title) instead of the older 4pt inset, 52pt row and 20pt title. Walked on the iPhone 16e, view-only, on the QA account's unlabelled listing (nothing saved): Edit Product Details, Edit Product Images and Edit Unavailability all read the same as the wizard steps. The hub ("Edit product") and Edit Product Details keep their own hand-rolled headers, which already sit on the same 16pt inset.

Observation, not a styling defect: this listing's `product.images` is empty, so Edit Product Images opens on the empty upload state with Next disabled even though the listing has a cover photo. It is a property of that record (the hub passes `product.images` straight through), so it was left alone. If real listings can have a cover but no `images`, the edit flow blocks the owner from continuing, and that is worth a backend/product check.

Edit Category was walked too (view-only): same taxonomy list and header as wizard step 1. Still not walked: Edit Cover Image, which needs a listing with images.

## Post wizard steps 3 to 7, dark walk on device (2026-09-20)

Walked the whole wizard in dark on the iPhone 16e with a fixture (`AGENT_QA_darkwalk`) and three stock photos; nothing was published ("Post product" was never pressed) and the draft was discarded. Captures in `design/app/`: `post-step3.dark`, `post-step3-filled.dark`, `post-images-photos.dark`, `post-cover.dark`, `post-availability.dark`, `post-review.dark`, `toast-error.dark`. The Post frames exist in light only, so there is no `compare.dark` for them.

Verified on device, closing the ninth review's open item: the selected cover tile shows the solid white disc with a brand tick over the brand wash and the 2pt brand edge; the crop preview shows the whole portrait crop (`contain`); the page scrolls to the preview after cropping. Dark reads correctly on every step: framed 48pt fields with visible edges, the focus ring, the condition menu, the Me/Someone else chips, the disabled and enabled Next, the dimmed past days in the calendar, the review hero and facts row, and the error toast.

Defect found and fixed: on the review and on the Product Details page, the "Approximate area" chip on the map sat on top of the Google logo in the bottom-left corner. Google's terms require the logo to stay uncovered. Both `product-map-classic.tsx` (the default variant that renders here) and `product-map.tsx` now inset the chip 84pt from the left and right-align it; verified on device.

Observations, not fixed:
- The review's hero carousel shows `product.images` in order, not the chosen cover. The live product page does the same, and the cover only feeds the cards, so it is consistent.
- Choose Address (the map step reached from step 3) is not restyled: its header is a hand-rolled band, and the map, search and buttons follow the old layout. It has no Figma frame in section `1:13230`.
- The Metro "Refreshing..." banner is a dev-only overlay and was excluded from the captures.

## Signed-out screens (2026-09-20, light + dark on the iPhone 16e)

Signed out on the QA simulator with the owner's go-ahead and walked Welcome (onboarding), the email step, and the signed-out Saved, Post, Chat and Profile tabs. None of these has a Figma frame except the email step (`1:9720`, dark), which models a different flow from the app's method-choice screen (parked for a product ruling). So these were audited against the tokens and against the signed-in screens they sit beside. Captures: `onboarding`, `auth-email`, `saved.signedout`, `post.signedout`, `chat.signedout`, `profile.signedout` in `design/app/` (light and dark).

Defects found and fixed:
- **Welcome:** `StaticContainer width={100}` removes the gutter so the carousel can bleed, and nothing gave the actions their own, so the three sign-in buttons ran edge to edge with their corners clipped. `welcome.tsx` now wraps the actions and the terms line in the 24pt gutter.
- **Signed-out Profile:** the list was its own copy of the Profile list, inside the hero's 24pt gutter plus another 24pt per section (rows 48pt from the edge, inset rules), with the older glyph set and labels ("Send feedback", a moon for Appearance, a warning triangle for Report a problem). It now uses `ProfileSection`, `ProfileRow` and `ProfileSectionRule` from the signed-in Profile, so both states of the tab are one design. "Request an item" keeps its label because it is a copy decision, not styling (the signed-in list calls the same feature "Unavailability form").
- **Latent bug in the same component:** the list was shown when `router.getState().routes[index].name === "Profile"`, read at render time. Any re-render of a mounted background tab while Profile was focused (Fast Refresh, or a theme change from the Appearance sheet) made Chat, Saved or Post show the Profile list until their next render. It now reads the screen's own route (`useRoute().name`). Reproduced on the device before the fix (Chat showing the Profile list under its own title) and confirmed gone after.

Open, not fixed: the light onboarding artwork has an off-white rectangle baked into the asset that shows against the white canvas (visible edge, and the third card fades into it); it needs a re-export of the image, not code. The signed-out Saved and Post empty states are bottom-anchored with a large empty area above; there is no frame, so this stays as the onboarding owner drew it.

## Product map (2026-09-20, revised after review)

The tenth review found that moving the "Approximate area" chip clear of the Google logo shrank its text box and could push "approximate area" off the end of a long address. Reverted: the chip is back at the bottom-left at full width, and the map's bottom `mapPadding` (`MAP_LOGO_LIFT` = 44, exported from `product-map-classic.tsx`) makes Google lift its own logo above the chip. Verified on a real listing: the logo is clear and the caption reads in full. Side effect: the map centre moves up by half the padding, so the marker sits ~21pt above the card's centre, still well inside it. The chip now uses `photoScrim` (62%) instead of `scrim` (45%), because map labels showed through the caption at 2.9:1; the brightest labels still show faintly. Also from the review: `EditStepHeader` comment and role tidied, and the raw scrim in `auth/about.tsx` moved to the token.

Follow-ups from the eleventh review (2026-09-20):
- The map lift is no longer a fixed 44: the detail map measures its caption chip and pads the map's bottom by chip height + 16, so a two-line caption cannot cover Google's logo. The classic map's caption is one line, so it keeps the exported `MAP_LOGO_LIFT` (44 = 28 + 16). `mapPadding` also changes the opening zoom, not only the centre: `initialRegion` is fitted inside the padded viewport, so both maps open about a third of a zoom level wider and the classic 500m circle draws ~20% smaller.
- The signed-out Profile list was scrolled to the bottom on the device in light (Terms & conditions and Privacy policy reachable, the tail clears the tab bar); the committed captures show the top of the list only.
- Signed out and signed in now close the profile block with the same 2pt rule and open the list with the same padding; only the signed-out list adds a second gap at its foot (no Logout below it).
- The gate is `useRoute().name === "Profile"`, a bare string against an untyped tab navigator: renaming the tab would silently remove the signed-out list. Left as is; the same literal was compared before.
Verified on the device after the change: a one-line caption gives the same result as before (logo clear above the chip). A two-line caption was not seen on a real listing (none of the QA listings has a place name long enough), so the wrapped case is covered by the measurement logic, not by a capture.

## Choose Address (Post wizard step 3 map picker, 2026-09-20, light + dark)

No Figma frame exists for this screen, so it was audited against the tokens and the neighbouring wizard screens (captures `design/app/choose-address.{light,dark}.iphone16e.png`). Fixed in `src/screens/post-screens/location-modal.tsx`:
- The hand-rolled 24pt title (off-centre, `tracking-wide`, back control at the 24 gutter) is now `EditStepHeader`, the 16pt inset / 44pt row / 18pt bold title every other wizard and edit screen uses; its `onBack` still cancels the pending location request before going back.
- A 48pt-tall empty spacer plus a `space-y-5` gap sat between the map and the panel and showed as a dead white band; both are gone and the map fills to the panel.
- The search field was 44pt on the hairline (`border-line-*`, 1.3:1 on the dark canvas) at `radius.card`; it is now 48pt on the control edge (`inputLine`) at `radius.button`, with the input sized to fill the box so the placeholder centres.
- The screen root used a class-based background that resolved to a lighter grey than the panel in dark (visible in the header and the safe-area band); it now uses the canvas token.

Left as is: the map's dark style asset (`assets/mapJSON/darkModeMapStyle.json`) colours water `#a7cdf2`, a light blue that reads as a bright block in dark mode; it may be deliberate and there is no frame to say, so it needs a design ruling. The "Use current location" row keeps its short inset rule, and the nearby-places list below it is a scrolling list inside a fixed 55% panel.

## Notifications empty state and Edit Cover Image reachability (2026-09-20)

Signed in as the QA "Development Team" account. Notifications opens on its empty state ("Nothing new"): title row and hairline from `SubpageHeader`, the brand-tint tile and body copy centred; light and dark both read correctly (`design/app/notifications-empty.{light,dark}.iphone16e.png`). This account has no notifications either, so the row layout, the unread dot and the pull-to-refresh path remain unseen with real data (they were verified only by the typed code and the reviewer).

Edit Cover Image cannot be reached with the available data: both of this account's listings ("Renit", "Lenovo laptop") return an empty `images` array from `getMyProductDetails`, so Edit Product Images opens on the empty upload state with Next disabled and never passes images on to the cover step. Getting there needs a listing with photos, which means creating an `AGENT_QA_` fixture with a publish, and that was not done.

## Auth inputs: email, phone, password, login password (2026-09-20, light + dark)

Walked view-only (nothing submitted: no code was requested, no SMS sent, no password typed; the email typed was the `example.com` placeholder `agent.qa@example.com`). The email step has the only Figma frame (`1:9720`, dark); the phone and password screens have none, so they were matched to the email step and the tokens. Captures `auth-phone`, `auth-password`, `auth-email-filled` in `design/app/`.

Defects fixed in `email.tsx`, `phone.tsx`, `password.tsx`, `confirm-password.tsx` and the login-password field in `verify.tsx`:
- The raw `TextInput`s had no font family, so the typed value and placeholder rendered in the system font next to Plus Jakarta labels; they now use `fontFamily.regular` at `fontSize.md` (16, as the frame draws the value).
- Horizontal padding was 8; the frame's field pads 16 (`px-4`).
- Email, phone and the login-password field used `bg-surface-raised-dark` in dark (a lighter grey than every other field, and than the email frame); they now use `bg-surface-dark` like the create-password fields.

Not changed: the six OTP cells in `verify.tsx` (that screen stays blocked on a real code) and the email/phone flow (single "Continue" versus method choice), which is still awaiting a product ruling.
Environment note: after signing back in, Home showed two toasts, "Unable to authenticate chat" and a `[network] response failed`. Chat authentication depends on the QA host's Google credentials, so this is an environment issue, not UI.

## Terms & Conditions, dark (2026-09-20)

Compared `design/app/terms.dark.iphone16e.png` with the dark frame `1:11542` (2x export in `design/figma-images/profile-subs/dark/`): body inset 24pt, line pitch 21pt, back arrow centred at 38pt, 18pt bold centred title, black canvas and the same text tones all match. The frame shows the tab bar and an older legal text ("Effective Date: 16/06/2023"); the app hides the tab bar on pushed screens and keeps its newer text ("Last updated: 10/11/2024"), which is deliberate and unchanged. Nothing to fix. Legal rows in the screen map are now DONE in light and dark.

## Request an item: categories and sub-categories (2026-09-20, dark on the iPhone 16e)

`unavailability_categories.tsx` and `unavailability_subCat.tsx` were hand-rolled copies of the wizard's steps 1 and 2: a 24pt-inset row with a 20pt 24pt-padded title, 22pt glyphs with a 20pt gap (labels 14pt right of the frame's), a 16pt-padded row and a bordered branch row of its own. They now use `EditStepHeader` and the shared `TaxonomyList` (with the branch row via `contextLabel`/`onContextPress`), so rows are the frame's 56pt with 8pt glyph gaps and 20pt chevrons, and the list's bottom inset is handled once. Behaviour is unchanged: the category screen keeps the bundled glyphs (`preferRemoteIcon={false}`), the sub-category screen keeps the API artwork (it falls back to the bundled glyph when the API sends none, as the captures show), and the navigation targets are the same. Captures `design/app/request-item{,-sub}.dark.iphone16e.png`. Light was not captured; the components are the ones already verified in light on the wizard and Edit Category.

## Product Detail, lower sections in dark (2026-09-20)

Walked the "Macbook" listing in dark on the iPhone 16e (captures `product-detail-{top,mid}.dark.iphone16e.png`, untracked because they show the owner's name and photo): section hairlines, the "Product's location" heading and map (Google's logo clear above the caption chip, circle and marker legible on the dark style), the "Exact address" note, the empty review state, the owner row and the sticky price and "Chat with owner" bar all read correctly on the black canvas. No dark-specific defect. Unseen: the review rail with real reviews and the description clamp on a long description (this listing has neither).

## Header sweep, three more screens (2026-09-20)

`unavailability_form.tsx` and `unavailability_form_inputs.tsx` (the last two steps of "Request an item") now use `EditStepHeader`, the same header as the two category steps before them; `report-a-problem.tsx` uses `SubpageHeader`, like FAQs, Contact Us, Feedback and the legal pages. Each hand-rolled a 24pt-inset row with a 20pt title and a 24pt vertical pad. Report a problem was checked on the device in light (`design/app/report-problem.light.iphone16e.png`); the two request-form screens were type-checked only (they need a category and sub-category chosen first, and submit a real request). Still hand-rolling their header, left on purpose: `edit-product` (the hub uses a 28pt `screenTitle` and is tied to the parked My Products ruling), `owners-products` and `owners-review` (frames were matched with their current header), `search`, `search-results`, `products-screen`, `my-product`.

## Rulings taken from the owner (2026-09-20)

Answered by the product owner in chat: (1) My Products follows both the frame's layout (Edit buttons, "Share entire catalogue") and keeps the status pill; (2) the auth flow keeps the app's method-choice structure (restyle only); (3) the owner verification card is restored; (4) reviews follow the frame's ink stars and bars.

Owner card, done: `users-screen.tsx` again shows the business-name pill under the name and one quiet card of trust rows (email / phone verified, "Lists in <area>") between the facts strip and the chat button, inside the profile block so the frame's 16pt rhythm is untouched. The rows come from the listing payload, and a signal the payload does not carry is not drawn; the code is the version from `25d3b0c` rebuilt on tokens. Checked on the device in light on a real owner (email verified, phone not, "Lists in Gayatri appartments and 1 other area").

## My Products (2026-09-20, light on the iPhone 16e; owner ruling: frame layout plus the status pill)

Frame `1:12006`. `my-product.tsx` now has the frame's structure: `SubpageHeader` titled "My Products" (was a 28pt "My listings" with a bare share glyph in the header; `SubpageHeader` gained an opt-in `onBack` for the arrow that goes to the Profile tab), a 51pt "Share entire catalogue" row with the three-node share glyph and a closing hairline, 24pt above the first row of cards, and a 44pt outlined "Edit" button (pencil glyph, `radius.button`, control-edge border) under every card. The card's tap still opens the same editor. The Live / Rejected / Pending pill stays under the price, above the Edit button, as ruled. Checked on the device with the two Live listings; the Rejected state (overlay chip on the photo plus the pill) was not re-seen with the new button. The capture shows the account's real listing photos, so it stays untracked.

Reviews: per the ruling the review surfaces are ink. The detail page and All reviews were already ink (bars and score star); the Write-a-review rating control (`Rating tone="ink"`, opt-in, default gold for the search filter) and the owner row's star now follow. The Write-a-review frame draws no rating control at all, so this is by ruling, not by frame. Type-checked only (Write a review needs a booking).

## Corrections after the eleventh review (2026-09-20)

- **Choose Address search field was 53pt, not 48pt.** The library's default `textInput` style adds a 5pt bottom margin under ours, which left the box 53pt tall with its text 2.5pt high; the earlier note ("48pt ... placeholder centres") was wrong on the shipped pixels. `marginTop`/`marginBottom` are now zeroed on the library style and the field measures exactly 48pt on a fresh capture (border rows 3px thick at y=1322 and y=1463 on the 3x image, so 144px = 48pt); the placeholder sits about 1pt below the box centre, which is glyph ink (descenders), not padding. Dead `HeaderIndicator` import and the constants' placement fixed.
- **Captures re-taken after the change:** `myproducts.light` and `owner.light` (`design/app/`) were older than the work they were cited for; both were re-captured after the final code (My Products now shows the header, the three-node share row and the Edit buttons; the owner card's area line now wraps to two lines instead of ellipsising the count). Both stay untracked (real listing photos and owner details).
- **Owner star:** the `AboutOwner` default-variant star I switched to ink is not rendered anywhere (the only caller uses `variant="detail"`, and the wizard's use is commented out), so the change was reverted and the audit's claim withdrawn. The Write a review control is the only `Rating tone="ink"` user; `Rating`'s ink tone colours only the filled star, unlike `Stars`, whose ink tone colours both (documented in the prop).
- **Auth fields** still hand-roll what `TextField` already does (app font, 48pt, 16pt padding, surface fill) and therefore have no focus border. Moving them onto `TextField` (a design-system change: `field.tsx` is shared) is a follow-up; the padding change from `p-2` to `px-4` also drops the explicit vertical padding, so Android needs a pass.
- **Request an item, sub-category step:** the branch row now shows the display name (`categoryDisplayName`) instead of the raw category param, matching the wizard and the edit flow; this is a copy change, not only styling.
- `SubpageHeader` now uses `minHeight` (not a fixed height) so its title cannot clip at large text sizes, and takes an opt-in `backLabel`; My Products announces "Back to profile" because its arrow returns to the Profile tab.
- The owner-profile docstring that said the verification card was "deliberately not drawn" was stale and now describes the ruling.

## Rulings: dark map water and Block & Report (2026-09-20)

Answered by the product owner in chat.

**Dark map water.** `assets/mapJSON/darkModeMapStyle.json` painted water `#a7cdf2`, a light blue that read as a bright block in dark mode; it is now `#1a2634` (a muted dark blue-grey). The style is shared by the product map (detail and post review), the Choose Address picker and the auth location screen. Verified on the device on Choose Address in dark (`design/app/choose-address.dark.iphone16e.png` re-captured); the other consumers use the same asset and were not re-walked.

**Block & Report.** A correction to an earlier note: the reason is NOT missing a backend field. `handleBlockPress` already sends it (`reportUser(userId, reason)` then `blockUser(userId, reason, conversationId)`), and the sheet already had a reason box; the real gaps were visual and behavioural. Changes: the sheet is now on the frame's styling (`frame` grabber and scrim, a 44pt centred title, a 200pt reason box at radius 16 on the hairline with 16 padding, the frame's Cancel and red "Block & Report" buttons 8 apart), the reason is a controlled value that clears on Cancel and on dismiss (it was uncontrolled, so a typed reason came back on the next open), "Block & Report" is disabled until there is a reason and shows a spinner while the two calls are in flight, and the extra "Block and report?" alert between the menu and the sheet is gone (the sheet, with its own Cancel, is the confirmation, as in the frame). `CustomBottomSheetModal` gained an opt-in `onDismiss`. Type-checked only: QA chat authentication returns 503 right now, so no conversation could be opened to see the sheet; it needs a device pass once chat is back.
