# Renit 2.1 kit (shared components)

Figma file `rolMmAueK1PJq31gXqA8et`, page `Renit 2.1 · current app (iOS)` (`2068:14158`), section `00 · Kit (shared components)` (`2068:14159`). Built 2026-11-22 in the approved look (see `docs/renit-2.0-redesign/SPEC.md`).

How to use it from a `use_figma` script:
- Get the node by id. For a set, pick the variant with `set.children.find(c => c.name === 'Type=…')`, then call `.createInstance()`.
- Set properties with `instance.setProperties({ 'Title#2071:4': '…' })`. The keys are listed below.
- Where a row says "edit text by layer name", find the TEXT child with that name and set `characters`. Load Plus Jakarta Sans first.
- Remote Buttons nested in kit components are exposed instances. Find them by layer name, then call `setProperties({ 'Label#309:8': '…' })`.
- Never put more than one filled purple button on a screen. The Bottom bar or Sheet footer primary is that button.

## Tokens

Local variable collection `Renit 2.1 · tokens` (`VariableCollectionId:2071:14158`), one mode, `Light`. The kit's colour fills and strokes are bound to it.

| Variable | Value | Scopes |
|---|---|---|
| color/brand/primary | #635BE8 | all fills, stroke |
| color/brand/tint | #EDEDFC | frame/shape fill |
| color/brand/tint-strong | #CAC8F7 | frame/shape fill, stroke |
| color/border/default | #E6E6E6 | stroke, frame/shape fill |
| color/surface/default | #FFFFFF | frame/shape fill |
| color/surface/muted | #F2F2F2 | frame/shape fill |
| color/text/primary | #000000 100% | text, shape fill, stroke |
| color/text/secondary | #000000 70% | text, shape fill, stroke |
| color/text/tertiary | #000000 60% | text, shape fill, stroke |
| color/text/on-brand | #FFFFFF | text, shape fill, stroke |
| color/status/success/text · /bg | #067647 · #ECFDF3 | text · fill |
| color/status/warning/text · /bg | #B54708 · #FFFAEB | text · fill |
| color/status/danger/text · /bg | #B42318 · #FEF3F2 | text · fill |
| color/status/danger/strong | #D92D20 | text, shape fill, stroke (error border/text, destructive labels) |
| color/status/info/text · /bg | #175CD3 · #EFF8FF | text · fill |

## Components

| # | Component | Node id | Component key | Variants (variant ids) | Properties | When to use |
|---|---|---|---|---|---|---|
| 1 | Tab bar (set) | `2071:14393` | `b428e81967a894679512c6095eb5daeaa149a708` | Active=Home `2071:14211`, Saved `2071:14259`, Post `2071:14303`, Rentals `2071:14346`, Profile `2071:14392` | none | Every tab-root screen. 390×102 including the home indicator; put it at y=742. Built from the remote Navbar/Tab instances. Rentals uses heroicons-outline/clipboard-document. There is no Chat tab. |
| 2 | Top bar (set) | `2071:14418` | `584d92ddaa5a4b22816edd140505693c31dd5d11` | Type=Back+Title `2071:14397`, Tab title `2071:14407`, Back only `2071:14413` | `Title#2071:4` (Back+Title only), `Show trailing#2071:5` | 390×56 at y=54, under the cloned Status Bar. Back+Title: pushed screens, 18 Bold. Tab title: tab roots, 20 Bold; edit the text by layer name "Title". Back only: over hero images (transparent). Exposed Icon Buttons are "Back" and "Trailing"; swap them with `Icon#602:12`. |
| 3 | Bottom bar (set) | `2071:14467` | `04136a00aae84ea39368f1bdfae49dbcf0cf5e16` | Layout=Summary+CTA `2071:14422`, Full CTA `2071:14439`, Secondary+Primary `2071:14449` | `Value#2071:12`, `Unit#2071:13`, `Sub-line#2071:14`, `Show sub-line#2071:15` | Sticky action bar, 390×106. Its bottom edge sits at y=844, so place it at y=738. Exposed Buttons: "Primary button" and "Secondary button" (white with #CAC8F7 outline, purple label), both 52 high. Examples: PDP "₹X /day · Deposit ₹Y" + Book now; Add to cart + Book now; Continue. |
| 4a | Sheet header | `2071:14471` | `e05e9be498f8195cf63b3dc1d0aa3e3a82dcaf7b` | — | `Title#2071:24`, `Show close#2071:25` | Top of a bottom sheet: grabber, 18 Bold left title, close X at 60%, top radius 24. |
| 4b | Sheet footer | `2071:14481` | `e13198318eb7168b0e06ce02c4cb15a9ff6d7f27` | — | `Show secondary link#2071:26` | Bottom of a sheet: hairline, primary 52 full width ("Primary button"), optional text link above it ("Secondary link", e.g. Cancel or Reset), home indicator. Bottom edge at y=844. See the "Sheet · usage example" frame `2071:14501` (not a component). |
| 5 | Listing card | `2073:14326` | `44ba326f2e67c0a2af80b83c39ac54196e9db732` | — | `Title#2073:1`, `Price#2073:2`, `Unit#2073:3`, `Location#2073:4`, `Show heart#2073:0` | Home rails, Saved, search grids. 162 wide (image 162×176 r8). Override the fill of the "Image" frame per item. The exposed heart Icon Button is "Heart". Grid: 2 columns, gap 18. |
| 6 | Status pill (set) | `2073:14380` | `98fdbc0e27a99265ae9c3ff7225d67a93c6f2f46` | Tone=Neutral `2073:14368`, Brand `2073:14370`, Success `2073:14372`, Warning `2073:14374`, Danger `2073:14376`, Info `2073:14378` | edit the text by layer name "Label" | Booking stage and listing status, 24 high, radius full, 12 SemiBold. Neutral: Not sent yet, Completed. Brand: Accepted, Confirmed, Returned. Success: Ready, Active, Live. Warning: Asked at opening, Asking the owner, Lapsed, No-show, Pending approval. Danger: Cancelled, Refused, Not approved, Flagged. Info: In review, Checking. |
| 7 | Form field (set) | `2073:14413` | `3fa0a0f8fc1b064ddc1d2bfff848bb9bbf2bbeef` | State=Default `2073:14392`, Filled `2073:14397`, Focused `2073:14402`, Error `2073:14408` | `Label#2073:55`, `Helper#2073:57`, `Error#2073:59`, `Show helper#2073:58`; the value/placeholder is layer "Value" | Every text input. 342 wide, input 48 r12. Default shows the placeholder at 60%; Focused has a purple border and caret; Error has a #D92D20 border and a 12 Medium red message. |
| 8 | List row (set) | `2073:14364` | `edce2bccb41e1e8aad79c2a10c7bf5fcf937234f` | Size=Single (56) `2073:14347`, Two-line (72) `2073:14355` | `Label#2073:21`, `Sub-line#2073:27`, `Value#2073:22`, `Show value#2073:23`, `Show chevron#2073:24`, `Show leading icon#2073:25`, `Leading icon#2073:26` (instance swap) | Profile, settings and menu rows, 390 wide, padding 0 24. The group header above the rows is plain text, 14 SemiBold at 60%. For Logout, recolour the label to color/status/danger/strong. |
| 9 | Section header | `2073:14341` | `8e24cf7a4f907935ee952b35eda1e5cb1928a9c2` | — | `Title#2073:5`, `Link#2073:6`, `Show link#2073:7` | Section title, 18 Bold, 342 wide. It sits 12 above its content with 32 above the section. Show "See all" only where the list continues. |
| 10 | Timeline step (set) | `2074:14356` | `ba9b039fece867945285afa94de5f8ff550732bf` | State=Done `2074:14332`, Current `2074:14341`, Upcoming `2074:14349` | `Show line#2074:12`, `Show time#2074:15`; edit the text by layer names "Title" and "Time" | Booking status timeline. Stack the steps with gap 0 and turn the line off on the last step. |
| 11 | Notice card (set) | `2074:14388` | `08f6c90e630cb18bc7fc8142529864ee960ab6e7` | Tone=Info `2074:14360`, Warning `2074:14367`, Success `2074:14374`, Danger `2074:14381` | `Show title#2074:37`, `Show link#2074:40` (default off); edit the text by layer names "Title", "Body" and "Link" | Inline tinted banner, 342 wide, r12: live booking notes, "Not taking bookings right now", KYC notes, server errors. |
| 12 | Empty state | `2074:14392` | `bd2f0d112f97f30cd8ddd6063a7d95d04776ba0e` | — | `Icon#2074:41` (instance swap), `Title#2074:42`, `Body#2074:43`, `Show action#2074:44` | Empty lists and success screens. The action ("Action") is a tonal Secondary Button, 44 high, so it never competes with a Bottom bar primary. Switch it to Type=Primary only when the screen has no other filled button. |
| 13a | Price row (set) | `2074:14416` | `a960561fa9d9b3dc433c39b011c2b93a0786d77b` | Type=Default `2074:14410`, Total `2074:14413` | edit the text by layer names "Label" and "Value" | Money breakdowns (Review and book, Payments, Cancel sheet). Default: 14 at 70% / 14 SemiBold. Total: 16 Bold with a hairline above. Stack with gap 12. |
| 13b | Stepper (set) | `2074:14448` | `16171699a4929c712c53cffa4bb37eb3c585445d` | Step=1 `2074:14420`, 2 `2074:14427`, 3 `2074:14434`, 4 `2074:14441` (of 4) | `Show label#2074:60`; edit the text by layer name "Step label" | Multi-step flows (listing, KYC, booking). 342 wide. For M≠4, hide "Segment N" layers and edit the label. |
| 14 | Chip (set) | `2073:14388` | `666f3fdea8433a1e5e8a7d40d1d66f1b49acde8d` | State=Default `2073:14384`, Selected `2073:14386` | `Label#2073:38` | Filter and option chips, 40 high, r12. Rows wrap with gap 8. |

## Notes
- The remote library Button `Type=Secondary` renders white with a grey border and a black label. In the kit it is overridden to the SPEC look: an outline in brand/tint-strong with a purple label, or tonal brand/tint. Apply the same overrides wherever you instance the Button directly.
- Variant sets share property defaults, so per-variant sample copy lives in plain text layers for the Status pill, Timeline step, Notice card, Price row and Stepper.
- `Show trailing` (Top bar), `Show link` (Notice card) and `Show secondary link` (Sheet footer) default to off. Turn them on per screen.
- Active tab icons are solid for Home, Saved and Profile. Post and Rentals stay outline but turn purple, because the library has no solid version of those icons.
- If you swap an icon (Empty state `Icon`, List row `Leading icon`), its colour carries over. The swap was tested with bell and banknotes.
- Swapping the Empty state "Action" to Type=Primary was tested: it gives a purple fill, a white 14 label and a height of 44.
- The checked hidden options: trailing icons, sheet "Cancel" link, notice links, the line hidden on the last timeline step, and button labels set from a Bottom bar instance.
- No `NEW · …` layers were needed in the kit.
