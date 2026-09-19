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
radius 12 where `radius.button` is 11: three local `12` constants remain until one ruling on the token (token and
`tailwind.config.js` change together). (3) Numeric snap point shrinks 10% while the keyboard is up (custom sheet
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
