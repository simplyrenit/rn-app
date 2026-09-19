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
| Search | `Search` (`src/screens/search.tsx`) | — | — | TODO | Reached from the Home search bar. |
| Search results | `SearchResults` (`src/screens/search-results.tsx`) | — | — | TODO | Shares `Disclaimer` with Home, which changed visually; verify. |
| Product detail | `ProductDetail` (`src/screens/products/products-screen.tsx`) | — | — | TODO | |
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

## Open decisions

- Which Figma frame is canonical where light and dark disagree (Home dark below row 1).
- Whether the shared `Disclaimer` should stay changed on Search results or be limited to Home.
- The Figma is not fully authoritative (freelancer-drawn): flag suspect values instead of copying them.
