# Screen map — pixel-fidelity pass

Tracks each iOS screen against its Figma frame. Method and tooling notes live in
the `renit-home-fidelity-pass` memory; the short version: iPhone 16e simulator
(390×844, same width as the frames), captures downsampled to the Figma PNG grid,
content aligned −7pt at the top and the tab bar −13pt at the bottom.

Figma file `c7VIWG8Q8661rjNsau0Ijk`, page `0:1`. Frame IDs are filled in as each
screen is fetched. Do NOT read the whole page in one call (635 frames; the
Figwright plugin times out and drops). List a section at a time.

Status: `DONE` matches within 0.5pt · `TODO` not started · `BLOCKED` see note.

## Baseline

| Screen | Route (file) | Auth | Light frame | Dark frame | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Home | `Home` (`src/screens/tabs/index.tsx`) | out | `1:21677` | `1:21465` | DONE | Commits 77480e1, c1625e2, 5b0d408. Dark below row 1 diverges because the frames disagree with each other; needs a designer ruling. Logo settled: purple R mark + text "Renit". |

## Phase A — signed out

| Screen | Route (file) | Light frame | Dark frame | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Search | `Search` (`src/screens/search.tsx`) | `1:8212` (flow: `1:8041`–`1:8572` in section `1:8040`) | section `1:7401` (frame `1:7571`) | DONE (light+dark) | Reached from the Home search bar. Structural mismatch, not a spacing one: the app is a progressive-disclosure screen (back arrow, boxed What/Where/When cards, "Popular categories", "Browse all" CTA); the design is three flat stacked sections ("What?" field, "Where?" row with pin + pencil, "When?" row with calendar + pencil, each 24pt padded and divided by a hairline), a centred 44pt "Search anything" header, and a bottom bar with "Clear all" (text) and "Search" (primary, magnifier). Flattened to the design (light measured within 0.5pt; see `design/audit.md`); search, place-sheet and date logic kept. Dark verified (see audit). Place sheet and date picker frames `1:8241`–`1:8572` still to audit. Exports in `design/figma-images/search/light/`. |
| Search results | `SearchResults` (`src/screens/search-results.tsx`) | `1:5212` | `1:3958` | DONE (light+dark), filter sheet TODO | Summary bar, count and grid match within 1–2px. The ten filter-sheet frames (`1:5325`…`1:6351`, dark `1:4071`…`1:5097`) are not audited. See `design/audit.md`. |
| Product detail | `ProductDetail` (`src/screens/products/products-screen.tsx`) | `1:9120` | `1:8958` | DONE (top light+dark; lower sections light, partly verified) | Lower sections restyled; dark, the review rail and the description clamp are unverified. Five delivery decisions to confirm in `design/audit.md`. |
| Saved | `Saved` tab (`src/screens/tabs/saved.tsx`) | `1:8859` | `1:8760` | DONE signed in (light+dark) | Grid, tile and topbar match to 0.5pt. Signed-out state and empty state have no frame. See `design/audit.md`. |
| Post (signed-out state) | `Post` tab (`src/screens/tabs/post.tsx`) | — | — | TODO | |
| Profile | `Profile` tab (`src/screens/tabs/profile.tsx`) | signed in `1:10017`, signed out `1:10110` | signed in `1:9953` | DONE signed in (light+dark); signed out TODO | Signed-in list matches to 0.5pt. Signed-out (title, "Enjoy Renit to the fullest…", three outline buttons; note the frame's "Create an Apple" typo) not restyled. See `design/audit.md`. |
| Chat tab (list) | `Chat` tab (`src/screens/tabs/chat.tsx`) | — | — | NO FRAME | Figma has no conversation-list frame: the five Chat frames are message threads. The list stays as it is. |
| Welcome / onboarding | `Welcome` (`src/screens/welcome.tsx`) | — | — | TODO | Capture in `design/app/onboarding-2.dark.png` exists. |
| Auth: email, phone, password, confirm, about, location | `src/screens/auth/*` | email `1:9745` | email `1:9720` | AUDITED (email), parked | The frames model a different flow (single "Continue", then a "Welcome back" step) from the app's method-choice footer. Needs a product decision before any restyle; see `design/audit.md`. |
| Auth: verify (OTP) | `Verify` (`src/screens/auth/verify.tsx`) | — | — | BLOCKED | Needs a real code; capture the entry state only, never submit. |
| Legal: terms, privacy | `Terms`, `Privacy` (`src/screens/terms.tsx`, `privacy.tsx`) | `1:11963`, `1:11981` | `1:11542`, `1:11560` | DONE (light), dark not compared | Layout only; the frames' legal text is an older version than the app's and is not copied. See `design/audit.md`. |
| Static info: who we are, FAQ, contact us | `whoWeAre`, `faq`, `contactUs` | — | — | TODO | Reachable signed out only if the Profile tab exposes them; check. |

## Phase B — signed in (needs Yash to sign in once)

| Screen | Route (file) | Status | Notes |
| --- | --- | --- | --- |
| Chat thread | `ChatDetails` | RESTYLED (light, unverified) | Frames light `1:15543`, `1:15593`, `1:15651`, `1:15695`, `1:15742` (section `1:15542`; dark in section `1:15316`). Header, message list, text bubbles and composer restyled to `1:15651` from a measured spec and the 2× exports in `design/figma-images/chat/frames/`; type-checked only. Nothing was run: opening a thread on this signed-in session marks it read on the real backend, so device verification still waits for an `AGENT_QA_<run-id>` fixture conversation. Dark is by token only. The ⋯ menu (`1:15543`), the Block & Report sheet (`1:15593`), the offer/attachment bubbles and frames `1:15695`/`1:15742` are not audited. Two WCAG 1.4.11 deviations to rule on — see `design/audit.md`. |
| Profile sub-screens | `profile`, `notification`, `myProducts`, `feedback`, `NetworkDiagnostics`, `ReportAProblem`, `UserDetail`, `unavailabilityForm*` | PARTLY | Appearance sheet DONE (light; frames `1:19482`/`1:19346`). Notifications (`1:18332`) PARKED: opening it calls `markAllAsRead` on the real account. FAQs DONE (light+dark, frames `1:11770`/`1:11349`); Contact Us DONE (light+dark, `1:11890`/`1:11469`); Who we are, Terms & Conditions and Privacy Policy DONE in light (`1:11932`, `1:11963`, `1:11981`; dark `1:11511`, `1:11542`, `1:11560`: Privacy and Who we are compared, Terms not; Who we are's dark body text is brighter than the frame's; the frames DO exist for Terms and Privacy, an earlier note here was wrong); Feedback & Review empty state DONE (light+dark, `1:11804`/`1:11383`; the other two frames `1:11831`, `1:11858` not audited); My Products (`1:12006`) PARKED (frame has Edit buttons + "Share entire catalogue"; app has Live/Rejected status pills; product decision). Personal details sheet DONE view-only (light+dark, `1:10776`; sub-sheets not restyled). Filter sheet: NO FRAME (the Overlay frames of section `1:5211` contain only a home indicator; the sheet was never drawn). Not yet looked at: Profile subpages (`1:11707`/`1:11286`), Change password (`1:18756`), Change phone number (`1:22817`), Change profile picture (`1:22245`): NO FRAME (they draw only the Profile tab, no sheet). |
| Post flow | `PostSubCategories`, `AboutProduct`, `ProductImages`, `ChooseCoverImage`, `ProductAvailability`, `LocationModal`, `ReviewProduct`, `HangTight` | DONE steps 1–7 in light and dark (dark walked on device 2026-09-20; the frames are light only); shared header and the edit-step header match | Section `1:13230`. Structure kept by decision: seven steps, the X exit with "Step N of 7", the app's own category list/order/names/glyphs. Header, progress segments, category and sub-category rows and the image-upload empty state match the frames to ≤0.5pt (`1:13231`, `1:13333`, `1:13650`); exports in `design/figma-images/post/light/`. Step 3 (`1:13455`) was ruled: 48pt fields with a `color.line` hairline via the opt-in `FieldFrame` (see `design/audit.md`). Steps 5–7 were exported once Figwright came back. Captured through a temporary harness, since the Simulator cannot be tapped on this machine. Steps 4 to 7 walked on device 2026-09-20 (view-only, nothing published): step 4 Next centred, step 5 cover rewritten to the frame, step 6 month row and heading matched, step 7 inherits the Product Details components (see `design/audit.md`, "Post wizard steps 4 to 7"). |
| Edit flow | `editProduct`, `EditAboutProduct`, `EditCategory`, `EditSubCategories`, `EditProductImages`, `EditCoverImage`, `EditProductAvailability` | TODO | |
| Reviews / owner | `ReviewsScreen`, `WriteReviews`, `OwnersReviewScreen`, `OwnersProducts`, owner profile (`UserDetail`) | PARTLY | Owner profile (`UserDetail`, frame `1:21984`, dark `1:21886`) DONE in light, dark fills match; the old verification card and business pill were removed (needs sign-off, see `design/audit.md`). All reviews (`ReviewsScreen`, frame `1:17697`) DONE (light measured, dark by token); Write a review (`WriteReviews`, frame `1:18034`) DONE (light measured, dark by token) — the frame omits the owner review and both star ratings that the API requires, so they are kept as extra sections and need a product ruling. Both were measured against 1× exports (no Figwright this session), so the floor is 1pt not 0.5pt, and both were captured through a temporary harness because the Simulator window was closed — see `design/audit.md`. `OwnersReviewScreen` and `OwnersProducts` not started. |

## Figma section inventory

The page has 39 sections in dark/light pairs: the dark set sits at y<20000 and the
light set at y>20000, both named "… - Dark mode" (Home's light frame is under a
section labelled "Dark mode"; the fill tells them apart). Light section IDs:
Home `1:21676` · Search `1:8040` · Saved `1:8858` (frame `1:8859`, "Wishlist",
signed-in state) · Product Details `1:9119` (frame `1:9120`) · Profile `1:10016` and
`1:10109` · Post a Product `1:13230` · Chat `1:15542` · Make an offer `1:16369` ·
Writing a review `1:17538` · Notifications `1:18269` · Edit personal details `1:10712` ·
Profile subpages `1:11707` · Edit Product `1:14552`, `1:15029` · Change password `1:18756` ·
Appearance settings `1:19418` · About Owner `1:21983` · Change profile picture `1:22245` ·
Change phone number `1:22817` · Filters `1:5211` · Search products from user profiles `1:19806`.
Dark counterparts are the same names at y<20000 (Search `1:7401`, Saved `1:8759`,
Product Details `1:8957`, Profile `1:9952`/`1:10080`, …).

Onboarding, auth and legal screens are not in the 39 sections. The auth flow IS in the
file as top-level frames: the dark sign-up email screen is `1:9720` (390×844; a 44pt
back row, a 24pt "Welcome to Renit" title, an "Enter your email" 14pt bold label over a
48pt field, and a "Continue" text button at the foot), with sibling frames in the
`1:97xx`–`1:99xx` range (email, "Welcome back to Renit", password, OTP with "Resend OTP")
and a second family in `1:20xxx` (light, same copy). There are no frames for the
welcome carousel, terms or privacy; `search_nodes` for "onboard", "sign in" and "terms"
finds nothing. Find the rest by `search_nodes` on a known string (it returns text nodes
with their `parentId`; climb with `get_nodes_info`), never by reading `0:1` whole. Note
the frame exports the back arrow as `#FFFFFFB2` (white at 70%) on both themes. Never read node `0:1` whole: it times the
Figwright plugin out and drops it.

App captures (signed out, light, 780×1688) are in `design/app/`: saved, post, chat,
profile. The signed-out Saved/Post/Chat/Profile states have no matching Figma frame
that I have found yet (Figma's Saved is the signed-in "Wishlist").

## Open decisions

From the Post wizard pass (2026-09-20), needing a ruling:

- **Step 3's field ramp.** Figma `1:13455` wants 16pt bold labels over 16pt helper text, 48pt fields
  with an `#E6E6E6` hairline edge and 39pt between groups. The app is at 14/14/44/`inputLine`/18 —
  each one a commented design-system decision (label density, and WCAG 1.4.11 on control edges).
  Matching the frame means changing `core/`, for every form in the app. Left unchanged; your call.
- **Step 4's "Next" colour.** The frame draws it at 50% black; the app uses `textDim` (0.58), the
  smallest step that clears AA on white. Same trade as everywhere else the design sets 0.50.
- **The frames' per-screen top inset disagrees with itself again:** 16pt under the bar on the two
  list steps, ~35 on the form, ~40 on the upload step. Each screen is matched to its own frame.

From the All reviews / Write a review pass (2026-09-20), needing a ruling:

- **The review histogram goes monochrome.** The frame draws the score star and the bar fill in ink with an
  `#E6E6E6` track; the screen had a gold star and a brand-purple bar. Matched to the frame, but it is the
  last place the brand colour appeared on that screen.
- **Write a review is missing three required fields in Figma.** The frame has no owner review and no star
  ratings; `write-review/` requires both reviews and both ratings. They are kept as extra sections in the
  frame's own tokens. Either the frame needs them drawn or the API should stop requiring them.
- **The two frames disagree about the top inset** under an identical 44pt header: All reviews measures 24,
  Write a review 27. Both are matched as measured.

Third review (`renit-build-reviewer`, 2026-09-20), fixed in the commit after `04a8d4f`: the owner
screen's back arrow was dead at scroll 0 (a pinned copy of the header swallowed the tap;
reproduced on the simulator, then fixed with `pointerEvents` and re-checked); Search results now
shows saved listings' hearts as saved; the results and owner loading skeletons mirror their real
layouts; the review card's VoiceOver hint is a prop so the owner screen no longer says
"listing"; stale comments updated. Still open from that review: the WCAG control-edge ruling for
hairline-bordered controls (Logout, the results filter button, the owner buttons); the fixed 44pt
header boxes at very large Dynamic Type; a numeric-`snapPoints` keyboard path in the shared sheet;
consolidating the tile-width formula.

Second review (`renit-build-reviewer`, 2026-09-20) fixed in the commit after `9c74a3f`: Saved's
columns are now computed from the window (163 on the 390pt frame, narrower on a smaller
phone) instead of a fixed 163 that clipped the right card on an iPhone SE; `ProductMap` is
opt-in (`variant="detail"`), the post wizard keeps the original 500m circle and pin
(`product-map-classic.tsx`); the map caption may wrap to two lines; the expand control's
target is 44pt; the review card and its body are minimums, so they grow with Larger Text; four
stale comments updated. Left for a device pass: a long place name and Larger Text at 1.4× on
Product Details, and dark rendering of the ring marker. Left as a copy decision: the
"Unavailability form" (Home card, Profile) versus "Request an item" (Search results card)
naming, and the unreachable `CurrencySheet` code in the Profile file.

From the independent review (`renit-build-reviewer`, 2026-09-20), fixed in the commit after `ee2dffe`: Product
Details title no longer capped at one line, the CTA can grow with text size, the
skeleton lands on the hero's ground and width, the photo indicator is clamped, the
Home tiles speak the app-wide category name. Still open, needing a ruling:

- **`Disclaimer` on Search results** — resolved by the goal's own rule (shared components
  gain opt-in props only): the Home request card is now `<Disclaimer card />`, and Search
  results keeps the compact card it had, byte for byte. It should get its own frame
  before being restyled. The dark request-card values are still unsampled.
- **Home category wording.** The tiles show the design's text ("Musicals",
  "Art & Craft", "Real Estate") where the rest of the app says "Musical instruments",
  "Arts & crafts", "Real estate". Only the spoken label was normalised.
- **Home rail headings** bypass `SectionHeader` (18pt bold against its 20pt
  semibold). Fine if the design wants it; a `SectionHeader` variant would be tidier.
- **Tab-bar home glyph** renders ~1pt larger than the design reads because the
  `stroke-width` attribute in `src/icons/home.tsx` is kebab-case and ignored; the
  measured match was taken against the glyph as it renders.

- Which Figma frame is canonical where light and dark disagree (Home dark below row 1).
- Whether the shared `Disclaimer` should stay changed on Search results or be limited to Home.
- The Figma is not fully authoritative (freelancer-drawn): flag suspect values instead of copying them.
