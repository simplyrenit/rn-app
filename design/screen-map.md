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
| Search results | `SearchResults` (`src/screens/search-results.tsx`) | — | — | TODO | Shares `Disclaimer` with Home, which changed visually; verify. |
| Product detail | `ProductDetail` (`src/screens/products/products-screen.tsx`) | `1:9120` | `1:8958` | DONE (top of page, light+dark) | Hero, title/rating, facts and bottom bar match; About, location, reviews, owner and similar-products sections still to do. See `design/audit.md`. |
| Saved (signed-out state) | `Saved` tab (`src/screens/tabs/saved.tsx`) | — | — | TODO | Tab bar already matches. |
| Post (signed-out state) | `Post` tab (`src/screens/tabs/post.tsx`) | — | — | TODO | |
| Profile (signed-out state) | `Profile` tab (`src/screens/tabs/profile.tsx`) | — | — | TODO | |
| Chat (signed-out state) | `Chat` tab (`src/screens/tabs/chat.tsx`) | — | — | TODO | |
| Welcome / onboarding | `Welcome` (`src/screens/welcome.tsx`) | — | — | TODO | Capture in `design/app/onboarding-2.dark.png` exists. |
| Auth: email, phone, password, confirm, about, location | `src/screens/auth/*` | — | — | TODO | |
| Auth: verify (OTP) | `Verify` (`src/screens/auth/verify.tsx`) | — | — | BLOCKED | Needs a real code; capture the entry state only, never submit. |
| Legal: terms, privacy | `Terms`, `Privacy` (`src/screens/terms.tsx`, `privacy.tsx`) | — | — | TODO | |
| Static info: who we are, FAQ, contact us | `whoWeAre`, `faq`, `contactUs` | — | — | TODO | Reachable signed out only if the Profile tab exposes them; check. |

## Phase B — signed in (needs Yash to sign in once)

| Screen | Route (file) | Status | Notes |
| --- | --- | --- | --- |
| Chat list / thread | `Chat`, `ChatDetails` | TODO | |
| Profile (full) and sub-screens | `profile`, `notification`, `myProducts`, `feedback`, `NetworkDiagnostics`, `ReportAProblem`, `UserDetail`, `unavailabilityForm*` | TODO | |
| Post flow | `PostSubCategories`, `AboutProduct`, `ProductImages`, `ChooseCoverImage`, `ProductAvailability`, `LocationModal`, `ReviewProduct`, `HangTight` | TODO | |
| Edit flow | `editProduct`, `EditAboutProduct`, `EditCategory`, `EditSubCategories`, `EditProductImages`, `EditCoverImage`, `EditProductAvailability` | TODO | |
| Reviews | `ReviewsScreen`, `WriteReviews`, `OwnersReviewScreen`, `OwnersProducts` | TODO | |

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

Onboarding, auth and legal screens are not sections; find them by name search
(`search_nodes`) rather than a page read. Never read node `0:1` whole: it times the
Figwright plugin out and drops it.

App captures (signed out, light, 780×1688) are in `design/app/`: saved, post, chat,
profile. The signed-out Saved/Post/Chat/Profile states have no matching Figma frame
that I have found yet (Figma's Saved is the signed-in "Wishlist").

## Open decisions

From the independent review (`renit-build-reviewer`, 2026-09-20), fixed in the commit after `ee2dffe`: Product
Details title no longer capped at one line, the CTA can grow with text size, the
skeleton lands on the hero's ground and width, the photo indicator is clamped, the
Home tiles speak the app-wide category name. Still open, needing a ruling:

- **`Disclaimer` on Search results.** The Home request card (brand panel, larger
  body, "Unavailability form ›", tile fill) changed for every caller, so Search
  results shows it too without its own frame. Gate it behind an opt-in prop that only
  Home passes, or accept it on Search results deliberately. The design's dark card was
  never sampled, so its dark values are not design-backed.
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
