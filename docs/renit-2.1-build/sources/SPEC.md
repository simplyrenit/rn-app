# Renit 2.0 redesign — approved spec (iOS, light)

The user approved this direction on 2026-11-22 from three screens: Home, Product detail and Chat. Every other screen follows the same rules. The rules come from `docs/renit-2.0-ux-rules.md`; wherever that doc conflicts with the original's look, **the original wins**.

Figma file `rolMmAueK1PJq31gXqA8et`, page `Renit 2.0 · redesign (iOS)` (`2031:14158`).
Approved reference frames (inspect them, copy their treatment):

| Screen | Original copy | Approved redesign |
|---|---|---|
| Home | `2031:14159` | `2031:14367` |
| Product detail | `2031:14693` | `2031:14854` |
| Chat thread | `2031:15077` | `2031:15121` |

Never edit file `c7VIWG8Q8661rjNsau0Ijk`, anything on page `0:1`, the three original copies above, or any Status Bar node (its SF Pro / Satoshi fonts are missing).

## Look (unchanged from the original)

- Font Plus Jakarta Sans. Style names: `Regular`, `Medium`, `SemiBold`, `Bold`.
- White surfaces, purple `#635BE8`, tints `#EDEDFC` / `#CAC8F7`, border/hairline `#E6E6E6`.
- Frame 390×844, gutter 24, the same images, icons (heroicons) and radii. Buttons keep radius 11–12.
- Sizes only 20 / 18 / 16 / 14 / 12, with line heights 28 / 24 / 24 / 20 / 16.

## Hierarchy rules

**Text colour** (black at an opacity):
- 100% primary: titles, values, prices, names.
- 70% secondary: body copy, descriptions, review text, meta lines.
- 60% tertiary: labels, captions, timestamps, "/day", locations, placeholders.
- Never 50% on 12–14 text, because it fails contrast.

**Weights:**
- Bold: screen and section titles, prices.
- SemiBold: item titles, names, values, button labels, links.
- Medium: chips, tab labels, small labels that need some presence.
- Regular: body and meta text.

**Title sizes:**
- Screen title (one per screen): 20 Bold.
- Section titles: 18 Bold, sitting 12 above their content, with 32 above the section.
- Sheet titles: 18 Bold.

**Purple** is only for the one primary CTA, links ("See all", "Show more", "Resend OTP", "Edit"), the selected state (active tab, selected chip, radio, checkbox, toggle) and the sent chat bubble. Never use it on more than one filled control per screen.

**Buttons** (one filled button per screen or sheet):
- Primary: 52 high, full width in a sticky bottom area or the sheet footer. Label 16 SemiBold, radius 12, purple fill.
- Secondary: 44 high, tonal `#EDEDFC` fill with a 14 SemiBold purple label, or white with a `#CAC8F7` 1px outline. The `Button` component has `Type=Secondary`.
- Tertiary: a text link, 14 SemiBold purple, with no box.
- Cancel / dismiss: tertiary or secondary, always visibly lighter than confirm.
- Destructive (Delete, Logout): red `#D92D20` text, never filled.
- Disabled: primary at a 38% look (`#CAC8F7` fill, white label), as the Chat send button does.

## Reusable patterns

- **Listing card** (Home `2031:14461`):
  - 162×176 image, radius 8.
  - Then the title (14 SemiBold, 1 line, ellipsis).
  - Then the price row: "₹600" 16 Bold + "/day" 12 Regular at 60%, baseline-aligned, gap 2. Use "/day", not "per day".
  - Then the location (12 Regular at 60%, 1 line).
  - Text block padding-top 8, gap 2.
- **Section header** (Home "Section header"): the title on the left and "See all" (14 SemiBold purple) on the right, but only where a list continues.
- **Tab bar** (Home `2031:14562`):
  - Labels 12. The active tab is SemiBold purple, with its icon purple.
  - Inactive tabs are Medium black 60%, with icons black 60%.
  - Set the active tab to match the screen (Home / Saved / Post / Chat / Profile).
- **Sticky bottom bar** (Product detail "Bottom"):
  - Hairline top border `#E6E6E6`.
  - Summary on the left: value 20 Bold + unit 14 at 70%, and a second line 12 at 60%.
  - Primary 52 CTA on the right, or full width when there is no summary.
  - Keep the bar ending at y=844 (home indicator inside).
- **Key facts row** (Product detail): value 14 SemiBold, label 12 Regular at 60%.
- **Ratings:** stars 16, then "4.0 · 24 reviews" in 14 Regular at 70%.
- **Links** "Show more" / "See all N reviews": 14 SemiBold purple with a purple chevron.
- **List rows** (profile/settings):
  - Label 16 Medium at 100%.
  - Optional value or sub-line 14 Regular at 60%.
  - Chevron black 60%, row height at least 56.
  - Group headers ("Account", "App", "Support", "Legal") 14 SemiBold at 60%, sentence case.
- **Form fields:**
  - Label 14 SemiBold at 100% above the field.
  - Input text 16 Regular at 100%; placeholder 16 Regular at 60%.
  - Helper text 12 Regular at 60%; error text 12 Medium in red `#D92D20`.
  - Field height 48, radius 12, border `#E6E6E6`; the focused border is purple.
- **Bottom sheets:**
  - Grabber.
  - Title 18 Bold (left-aligned), with an optional close X at 60%.
  - Content.
  - Footer: the primary 52 full width; secondary or cancel as a text link or tonal above or beside it.
  - Top radius 24 if the original radius is close (keep the original if not).
  - The scrim behind stays as in the original.
- **Chips / filter options:**
  - Unselected: white, `#E6E6E6` border, 14 Medium at 100%.
  - Selected: `#EDEDFC` fill, `#635BE8` border, 14 SemiBold purple.
- **Chat:**
  - Messages 16 Regular, line height 24.
  - Sent bubbles purple with white text.
  - Received bubbles `#F3F3F6` with black text.
  - Radius 16 with a 4 tail corner.
  - Pinned item context card under the header.
  - "Make offer" is tonal (secondary), never filled.
  - Send is faded `#CAC8F7` when the input is empty.
- **Empty / success states:** an icon or illustration, then a title 18 Bold, then one line 14 at 70%, then one action.
- **OTP / auth:**
  - One task per screen.
  - Title 20 Bold, sub-line 14 Regular at 70%.
  - Primary 52 "Continue" in the sticky bottom; disabled look until valid.
  - Secondary actions ("Resend OTP", "Use phone instead") as tertiary purple links.

## Additions

New elements go in their own layer named `NEW · <what>`, so the user can say no to each one. Keep additions few and only where a rule clearly calls for them, for example:

- "See all" on rails.
- A deposit line beside the price.
- A context card in the chat.
- A live count on "Show N results".
- Step labels ("Step 2 of 7").

Never invent fake features.

## Copy rules

- Buttons are verb + noun naming the outcome: "Show 24 results", "Post listing", "Send offer", "Save changes". Never "Submit" or "OK".
- INR: ₹ prefix, Indian grouping, "/day".
- Sentence case everywhere.
- Fix obvious typos in the original ("Refine your seach" → "Refine your search", "Resent OTP" → "Resend OTP").

## Motion (for the prototype later)

- Push: smart animate 300 ms ease-out.
- Sheets: move in from the bottom at 300 ms; dismiss at 250 ms.
- Tab switches: dissolve 200 ms.
- Press feedback: within 100 ms.

## Android (360×800), sample built 2026-11-22

Page `Renit 2.0 · redesign (Android)` (`2062:19746`). Sample frames: Home `2062:19747`, Product detail `2062:19967`, Chat `2062:20131`.

- Same design, type, colours, radii and gutter 24 as iOS. Do not scale 390 → 360: fixed sizes stay, and content widths flex by −30.
- Horizontal rails keep their card size and positions (they scroll sideways).
- System chrome:
  - The iOS status bar (54) and home indicator are hidden.
  - Instances of local components `Android / Status bar` (32dp, `2063:14251`) and `Android / Navigation bar (3-button)` (48dp, `2063:14259`) are added as fixed top/bottom layers.
  - Content moves up 22; bottom bars sit directly above the 48dp nav bar.
- Auto-layout roots (Chat): paddingTop 32, paddingBottom 48, and the message area is set to `layoutGrow` 1.
- Still to do when rolling out: start-aligned titles on Android where iOS centres them, re-point prototype links to the Android frames, and use Android motion (300 ms, cubic-bezier(0.2,0,0,1)).
