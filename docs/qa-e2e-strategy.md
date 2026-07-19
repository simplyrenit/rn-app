# Renit Mobile E2E QA Strategy

## Purpose

This document is the working QA backlog for end-to-end testing of the Renit mobile app.

Renit is a rental marketplace where:

- renters discover nearby products and merchants
- owners publish spare items for rent
- merchants onboard and list inventory after approval
- users chat, negotiate, and manage availability

The goal is not only to test happy paths, but to repeatedly run this loop for each flow:

1. Execute the flow like a QA on a real Android device.
2. Capture UI divergences, broken states, warnings, errors, and exceptions from logs.
3. Fix the defects based on best engineering judgment.
4. Review the fix and immediately resolve any P0, P1, or P2 issue found in review.
5. Dry run the flow locally.
6. Retest on device.
7. If stable, stage and commit before moving to the next flow.

## Test Modes

### Primary mode

- Android physical device over USB
- Expo dev client / native Android build
- Local backend

### Secondary mode

- Android emulator for quick regression checks
- Manual code walkthrough for flows that depend on data or account state not yet available

## Preconditions

Before starting any flow, confirm:

- backend is reachable from the phone
- Metro is running for the correct app workspace
- `adb devices` shows the physical phone as `device`
- `adb reverse tcp:8081 tcp:8081` is active
- `adb reverse tcp:8000 tcp:8000` is active when using local backend
- the app launches without boot-time exceptions
- test accounts are available for:
  - guest user
  - normal renter/owner user
  - merchant user in pending/rejected/approved state when possible

## Logging Rules

For every flow:

- clear logs before execution
- capture app logs during the flow
- classify issues as:
  - `P0`: app unusable, data loss, blocked critical commerce flow
  - `P1`: broken core flow with workaround or severe incorrect behavior
  - `P2`: noticeable incorrect behavior, misleading UX, repeated warnings/exceptions, partial failure
  - `P3`: polish, copy, layout, low-risk cleanup

Focus areas while watching logs:

- network failures
- auth/token refresh failures
- location permission errors
- Firestore/chat issues
- image upload / S3 failures
- React render warnings
- navigation errors
- unhandled promise rejections

## Exit Criteria Per Flow

A flow is complete only when:

- happy path works on device
- no unresolved P0/P1/P2 remains for that flow
- logs do not show recurring app-originated errors/exceptions for that flow
- regressions introduced by the fix are ruled out with a dry run
- code is staged and committed

## Active QA Backlog

Use these items in order unless a blocker forces a dependency-first detour.

### 1. Environment and boot stability

- [x] Launch app on physical Android device from local workspace
- [x] Verify backend connectivity, auth bootstrap, category fetch, and home bootstrap
- [x] Verify no blocking boot warnings/errors/exceptions
- [x] Verify app survives relaunch, background/foreground, and cold start

Exit criteria:

- app reaches usable state from cold start
- no recurring network bootstrap failures

### 2. Guest entry and welcome flow

- [x] Verify welcome screen renders correctly
- [ ] Verify `Google`, `Apple` (where applicable), `Email`, and `Skip` entry points
- [x] Verify guest navigation after `Skip`
- [x] Verify guest limitations are understandable and non-breaking

Exit criteria:

- guest user can enter the app without dead ends
- unauthenticated state does not crash guarded screens

### 3. Email signup and login flow

- [ ] Verify email submission
- [ ] Verify OTP / verification flow
- [ ] Verify password and confirm password flow
- [ ] Verify signup completion for renter/owner account
- [ ] Verify login persistence after app relaunch
- [ ] Verify logout returns cleanly to welcome

Exit criteria:

- new user can create an account and return as authenticated user
- auth state remains consistent across relaunches

### 4. Account type and merchant onboarding flow

- [ ] Verify account type selection in onboarding
- [ ] Verify merchant-specific fields such as `business_name`
- [ ] Verify merchant user with non-approved status is blocked from posting
- [ ] Verify merchant approval messaging in `Post` tab and `Profile`
- [ ] Verify `Request review again` behavior for rejected merchants

Exit criteria:

- merchant gating is intentional, understandable, and non-broken

### 5. Location permission and fallback flow

- [ ] Verify onboarding location flow with permission granted
- [ ] Verify onboarding location flow with permission denied
- [ ] Verify `Skip for now` behavior
- [ ] Verify location fallback does not block app usage in supported cases
- [ ] Verify post-location modal fallback behavior
- [ ] Verify search/current-location interactions

Exit criteria:

- location-dependent flows degrade gracefully
- optional-location dev/testing path does not break publish flow

### 6. Home discovery flow

- [x] Verify home tab loads categories and discovery sections
- [x] Verify top experiences / top rated / popular products sections
- [x] Verify loading, empty, and error states
- [x] Verify category taps route correctly
- [x] Verify no repeated fetch loops or noisy errors in logs

Exit criteria:

- renter can browse discovery content without broken sections

### 7. Search and results flow

- [x] Verify search screen rendering
- [x] Verify category + location-based search
- [x] Verify manual place selection and current location
- [x] Verify search results page content and navigation
- [x] Verify empty search results state

Exit criteria:

- search returns stable results and navigates correctly

### 8. Saved / favorites flow

- [x] Verify favorites fetch
- [x] Verify saving a product
- [x] Verify unsaving a product
- [x] Verify saved tab reflects latest state
- [x] Verify behavior for guest vs authenticated users

Exit criteria:

- favorites state remains consistent between detail and saved list

### 9. Product detail and owner trust flow

- [x] Verify product detail screen renders complete product data
- [x] Verify image gallery and cover image behavior
- [x] Verify pricing, availability, description, and location sections
- [x] Verify navigation to owner profile, owner products, and owner reviews
- [ ] Verify review writing entry points (guest guard passes; authenticated owner self-review retest is pending)

Exit criteria:

- core buyer decisioning screens are stable and trustworthy

### 10. Chat list and chat detail flow

- [x] Verify guest Chat tab has a clear sign-in gate
- [x] Verify conversation list loads
- [x] Verify navigation into `ChatDetails`
- [x] Verify message history rendering
- [ ] Verify send message flow
- [ ] Verify typing/read-state behavior if available
- [ ] Verify block/unblock/report paths

Exit criteria:

- user can enter conversations and exchange messages without runtime issues

### 11. Offer and rental intent flow

- [ ] Verify product selection inside chat for offer flow
- [ ] Verify availability selection and date range handling
- [ ] Verify offer creation inputs and validation
- [ ] Verify owner/renter handoff states visible in UI

Exit criteria:

- rental intent flow is coherent even if full payment/checkout is out of scope

### 12. Post listing happy path

- [ ] Verify category selection
- [ ] Verify sub-category selection
- [ ] Verify about-product form
- [ ] Verify image selection and cover image step
- [ ] Verify product availability step
- [ ] Verify review screen
- [ ] Verify publish action and `HangTight` or success state

Exit criteria:

- authenticated allowed user can publish a listing end to end

### 13. Post listing validations and edge cases

- [ ] Verify required field validation
- [ ] Verify location-optional path used for local testing
- [ ] Verify image count/type edge cases
- [ ] Verify invalid price/description/title handling
- [ ] Verify navigation backward/forward preserves form state

Exit criteria:

- publish flow blocks bad data clearly and does not lose user progress

### 14. Seller inventory management flow

- [ ] Verify `My products` list
- [ ] Verify product details for owned items
- [ ] Verify edit category/sub-category/about/images/cover/availability
- [ ] Verify update persistence
- [ ] Verify unavailability category/form flows

Exit criteria:

- seller can maintain published inventory without regressions

### 15. Reviews flow

- [ ] Verify product reviews list
- [ ] Verify write review form
- [ ] Verify owner reviews screen
- [ ] Verify rating validation and submission behavior

Exit criteria:

- review creation and review visibility both work cleanly

### 16. Profile and account management flow

- [ ] Verify profile screen for authenticated user
- [ ] Verify personal details edit
- [ ] Verify profile image update
- [ ] Verify notifications screen
- [ ] Verify logout
- [ ] Verify delete account flow if safe in test environment

Exit criteria:

- account settings are functional and do not corrupt user state

### 17. Support and diagnostics flow

- [x] Verify FAQs and Android Back navigation
- [x] Verify feedback & review screen and empty-form validation
- [ ] Verify feedback & review submission (not sent during guest UI retest)
- [ ] Verify contact us
- [x] Verify report a problem screen and empty-form validation
- [ ] Verify report-a-problem submission (not sent during guest UI retest)
- [ ] Verify network diagnostics screen

Exit criteria:

- support surfaces open correctly and do not produce avoidable runtime noise

### 18. Regression sweep

- [ ] Re-run critical renter path: launch -> browse -> detail -> save -> chat
- [ ] Re-run critical seller path: launch -> post -> publish/edit
- [ ] Re-run merchant gating path
- [ ] Re-run profile/account basics
- [ ] Confirm logs remain clean across the main flows

Exit criteria:

- no newly introduced divergence across the highest-value paths

## Execution Notes

While working each item:

- prefer fixing the root cause instead of silencing symptoms
- if logs expose unrelated but severe defects in touched code, fix them in the same cycle
- preserve user-visible intent unless the code is clearly broken
- avoid committing temporary artifacts such as screenshots, UI dumps, or local debug files

## Current Status

- [x] Initial code crawl completed
- [x] Core route families identified: auth, discovery, saved, post, chat, profile, merchant gating
- [x] Flow 1 complete: environment and boot stability
- [ ] Flow 2 in progress: auth entry-point validation still pending
- [x] Guest-mode guard fixes landed for `users/me`, favorites, and notifications
- [x] Guest tab sweep on physical Android completed without app-originated `401` or unhandled promise noise
- [x] Email entry handoff opens cleanly on Android without runtime errors
- [x] Authenticated renter sweep verified saved list, profile bootstrap, post category entry, and chat list/detail navigation on physical Android
- [x] Chat detail warning `Attempt to set local data for view with unknown tag: -1` fixed by removing direct native input mutation in `ChatInput`
- [x] Chat bubble tap no longer throws `Possible unhandled promise rejection` for plain text messages; only valid links remain tappable
- [x] Product detail renders core product information correctly on physical Android, including deposit vs daily-rate separation
- [x] Owner detail review uncovered and fixed a hardcoded owner rating on `UserDetail`
- [x] Favorites flow now passes on physical Android for both authenticated and guest behavior: fetch, save, unsave, and Saved-tab empty state all behave consistently
- [x] Root cause of Android unsave failure fixed end to end: mobile now sends a body-less `DELETE` with `product_name` as a query param, and the backend accepts that contract
- [x] Backend favorites delete response corrected from an invalid body-plus-`204` response to a normal `200` success payload so Android no longer misclassifies successful deletes as network failures
- [x] Home discovery category taps no longer send hardcoded coordinates into `SearchResults`
- [x] Home discovery now shares one optional-location resolver instead of prompting repeatedly from each section
- [x] Home tab no longer shows a blocking location-permission alert just by mounting
- [x] Final unsave-from-Saved retest passed on the physical device after the latest favorites fixes
- [x] Search flow fixes landed and passed retest on the physical Android device: category searches no longer send `Invalid date`, empty category results now bootstrap correctly, and refining a search preserves `what`, `where`, and coordinates
- [x] Backend search no longer crashes when NLTK `wordnet` data is absent, and `nearest` sorting now orders by actual proximity
- [x] Flow 9 guest retest: image gallery, product content, product reviews, owner profile, owner catalogue, and owner empty-review state pass on physical Android
- [x] Flow 9 P2 fixed: product-detail content now respects the Android top safe area while scrolling
- [x] Flow 9 P2 fixed: signed-out owner profiles now use a deliberately public, contact-free owner-details response instead of calling the authenticated `users/{username}` endpoint
- [x] Flow 16 P2 fixed: the guest Profile screen no longer mounts the authenticated personal-details sheet and triggers a needless `users/me` 401 request
- [ ] Flow 9 authenticated owner self-review guard remains queued until the test-account OTP can be retrieved and verified
- [x] Flow 6 complete: fresh Android retest verified categories, discovery sections, zero-result rendering, and category-result navigation with clean Renit logs
- [x] Flow 10 guest retest: Chat shows its sign-in gate on Android without a crash or app-originated error
- [x] Flow 17 FAQ retest: FAQ content and accordion expansion render on Android; Android Back now returns to Profile instead of leaving Renit
- [x] P2 fixed: a root Android hardware-back bridge now returns to the current React Navigation stack when possible; retested on FAQ and product detail
- [x] Flow 17 guest support retest: Report a problem and Feedback & Review render, keep empty submissions disabled, and return to Profile through Android Back

## QA Findings Queue

- [ ] P1 candidate for Flow 10: local API logs report that Firestore is disabled because `FIREBASE_SECRETS_PATH` is not configured. Authenticate a test user and validate the actual send/receive path before classifying or fixing it.
- [ ] P3 data-quality issue: local discovery data includes obviously synthetic/malformed listing names and image content. Keep test fixtures from being confused with production-ready catalogue data during final readiness review.
- [ ] P3 content issue: the FAQ sign-up answer points to `renit.co.in`, while current app/support links use the SimplyRenit domain. Confirm the intended public site and update the copy.

## Production Readiness Confidence

**Current confidence: 19% — not ready for production.**

Tested and passing: environment/boot (Flow 1), home discovery (Flow 6), search (Flow 7), favorites (Flow 8), guest product-detail and owner trust paths (partial Flow 9), guest Chat gate (partial Flow 10), and FAQ/navigation (partial Flow 17). Open findings: P0 0, P1 candidate 1 (Firestore-dependent chat send path), P2 0, P3 2 (test catalogue quality and FAQ website copy). Critical evidence is still missing for authenticated onboarding and session persistence, posting and inventory, actual chat sending, review submission, merchant gating, account management, the remaining support forms, and the full regression sweep. Confidence may rise only after each flow meets its exit criteria with device and log evidence; unresolved P0/P1/P2 findings keep production readiness below 100%.
