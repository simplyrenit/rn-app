# Final cross-check against Figma (2026-09-20)

Scope: every iOS screen in `design/screen-map.md`, on the iPhone 16e simulator, against the Figma file `c7VIWG8Q8661rjNsau0Ijk`. "Pixel perfect" here follows the working definition agreed with the owner: static elements match the frame, most of them to within 0.5pt, with deliberate deviations recorded and ruled on.

## Automated checks (run at the end of this pass)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` (app source; the two `functions/` module errors are pre-existing and unrelated) | 0 errors |
| Raw hex colours in `src/**/*.tsx` outside `src/lib` (code lines, comments excluded) | 0 |
| `wp()` / `hp()` calls outside `design-tokens` | 0 |
| Uncommitted source changes | 0 |
| Commits on `redesign/phase-1` not on `main` | 106, of which 27 are `fix(ui): match … to Figma` |
| Side-by-side compare images in `design/app/` and `design/figma-images/home/` | 33 |
| Nothing pushed | true |

## Screen matrix

Legend: **M** = matched to the frame (measured, mostly within 0.5pt on the 2x grid); **M\*** = matched with deliberate deviations listed below; **NF** = no Figma frame exists, audited against tokens and neighbouring screens; **DV** = verified on the device only (no compare image).

| Screen | Light | Dark | Notes |
| --- | --- | --- | --- |
| Home | M | M (frames disagree with each other below row 1) | Reference screen |
| Search, Search results | M\* | M\* | Progressive-disclosure Search kept (structure), results grid and summary bar match |
| Filter sheet | NF | NF | Ten Figma frames contain only a home indicator: nothing to match |
| Product Detail (top, lower sections, map, reviews) | M | M | Map lifts Google's logo with `mapPadding`; owner verification card restored by ruling |
| Saved | M | M | Signed-out state NF |
| Post wizard steps 1–7 | M\* | DV | Seven steps and the X exit with "Step N of 7" kept by decision (frames draw five segments and a back arrow); dark walked on the device |
| Choose Address | NF | DV | Restyled to tokens; dark map water set to a muted blue-grey by ruling |
| Edit flow (hub, details, images, cover, category, unavailability) | M\* | hub DV | Walked on an `AGENT_QA_` fixture; header matches the wizard's |
| Profile (signed in) | M\* | M\* | "Appearance" instead of the frame's "Dark mode"; "Currency" row not shown (decision) |
| Profile (signed out), Saved / Post / Chat signed-out | NF | DV | Reuse the signed-in rows and rules |
| Profile sub-screens: Appearance, Personal details, FAQs, Contact us, Who we are, Terms, Privacy, Feedback & review, Report a problem | M | M (Terms/Privacy/Who we are/FAQs/Contact/Feedback compared) | Legal text kept at the app's newer version |
| Notifications | M (empty state) | M (empty state) | Rows and the unread dot are code-verified only: no QA account has notifications |
| My Products | M\* | DV | Frame layout plus the app's status pill, by ruling |
| Chat list | NF | DV | The frames draw only threads |
| Chat thread, ⋯ menu | M | DV | Header name collapse fixed in this pass |
| Block & Report sheet | M | M | Verified on the device; nothing was submitted |
| Make an offer / Check availability sheets | M | DV | |
| Owner profile | M\* | M\* | Verification card and business pill restored by ruling |
| All reviews, Write a review | M\* | M\* | Ink stars and bars by ruling |
| Onboarding / Welcome | NF | DV | Actions on the 24pt gutter |
| Auth: email, phone, password, login password | NF (email has a frame for a different flow) | DV | Flow kept as the app's method choice, by ruling |
| Auth: OTP | not reached | not reached | Skipped at the owner's direction (backend OTP not set up) |

## Deliberate deviations (all recorded in `design/audit.md`)

- Post wizard keeps seven steps, the X exit and the "Step N of 7" caption; the category list, order, names and glyphs are the app's.
- Profile keeps "Appearance" (a three-way choice) where the frame says "Dark mode".
- Auth keeps its email / phone / password method choice; the frames model a single "Continue" flow.
- Product Details map caption and the card hierarchy follow the app's data (place name, distance), not the frame's placeholder text.
- Control edges use the `inputLine` token and hairlines use `line` (WCAG 1.4.11), where the frame draws one grey for both.
- Secondary text tones are kept at the accessible weight (`textDim` 0.58 on light) where the frame is 0.50.
- Sheets and cover-crop preview: the crop preview shows the whole crop (`contain`), not a slice.

## Not verifiable, and why

- Search filter sheet: no drawn frame content.
- OTP entry: needs a real code; skipped by the owner.
- Notifications rows, unread dot, pull-to-refresh: no QA account has notifications; they come from chat and booking events.
- The owner's All reviews screen: needs a second review (only shown with more than one).
- Android: not exercised at all in this pass.

## Known measured caveats

- A 1px measurement floor on the 2x grid applies to the price line and text-area boxes on Write a review (recorded as 1px low).
- The home indicator on the iPhone 16e is 34pt tall against the frame's 21pt, so a control pinned above it sits about 8pt higher than in the frame (recorded on the composer and Post steps).
- The status bar in the compares is simulator chrome, not app.
- `design/app/chat-thread.compare.light.png` predates the header-name fix (it shows the avatar with no name); the fix is verified on the device.

## Verdict

The screens that have a Figma frame match it in structure and spacing, and the measured elements are within the 0.5pt target except for the caveats above. Tokens are used throughout, `tsc` is clean, nothing regressed on a walked screen, and every artifact is committed locally. Remaining gaps are unreachable or undrawn, not unmatched.
