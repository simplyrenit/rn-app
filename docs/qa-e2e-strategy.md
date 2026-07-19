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

- [x] Verify email submission and OTP-delivery handoff
- [x] Verify OTP / verification flow (retrieved from the authorized test-mailbox Chrome profile and verified on Android)
- [x] Verify password and confirm password flow
- [x] Verify signup completion for renter/owner account
- [x] Verify login persistence after app relaunch
- [x] Verify logout returns cleanly to welcome

Exit criteria:

- new user can create an account and return as authenticated user
- auth state remains consistent across relaunches

### 4. Account type and merchant onboarding flow

- [x] Verify guest Post tab has a clear sign-in gate
- [ ] Verify account type selection in onboarding
- [ ] Verify merchant-specific fields such as `business_name`
- [x] Verify merchant user with non-approved status is blocked from posting
- [x] Verify merchant approval messaging in `Post` tab and `Profile`
- [ ] Verify `Request review again` behavior for rejected merchants

Exit criteria:

- merchant gating is intentional, understandable, and non-broken

### 5. Location permission and fallback flow

- [x] Verify onboarding location flow with permission granted
- [x] Verify onboarding location flow with permission denied
- [x] Verify `Skip for now` behavior
- [x] Verify location fallback does not block app usage in supported cases
- [x] Verify post-location modal fallback behavior
- [ ] Verify search/current-location interactions

Exit criteria:

- location-dependent flows degrade gracefully
- post-form validation matches the API-required description and location fields in every build mode

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
- [x] Verify review writing entry points (guest guard and authenticated owner self-review guard pass)

Exit criteria:

- core buyer decisioning screens are stable and trustworthy

### 10. Chat list and chat detail flow

- [x] Verify guest Chat tab has a clear sign-in gate
- [x] Verify conversation list loads
- [x] Verify navigation into `ChatDetails`
- [x] Verify message history rendering
- [x] Verify send message flow (authenticated Android send, composer reset, cold-relaunch conversation-list persistence, and detail-screen history pass)
- [x] Verify second-user receive and unread/read-state transition
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

- [x] Verify category selection
- [x] Verify sub-category selection
- [x] Verify about-product form and location selection handoff
- [x] Verify image selection and cover image step
- [x] Verify product availability step
- [x] Verify review screen
- [x] Verify publish action and `HangTight` or success state

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

- [x] Verify `My products` list
- [x] Verify product details for owned items
- [ ] Verify edit category/sub-category/about/images/cover
- [x] Verify edit availability
- [x] Verify update persistence for product details
- [x] Verify unavailability date-form flow

Exit criteria:

- seller can maintain published inventory without regressions

### 15. Reviews flow

- [x] Verify product reviews list
- [x] Verify write review form
- [x] Verify owner reviews screen
- [x] Verify rating validation and submission behavior

Exit criteria:

- review creation and review visibility both work cleanly

### 16. Profile and account management flow

- [x] Verify profile screen for authenticated user
- [ ] Verify personal details edit
- [ ] Verify profile image update
- [x] Verify notifications screen
- [x] Verify logout
- [ ] Verify delete account flow if safe in test environment

Exit criteria:

- account settings are functional and do not corrupt user state

### 17. Support and diagnostics flow

- [x] Verify FAQs and Android Back navigation
- [x] Verify feedback & review screen and empty-form validation
- [x] Verify feedback & review submission
- [x] Verify contact us
- [x] Verify report a problem screen and empty-form validation
- [x] Verify report-a-problem submission
- [x] Verify network diagnostics screen

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
- [x] Flow 2 complete: current-bundle Email entry, password sign-in, Skip, and Google OAuth entry/return all pass
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
- [x] Flow 9 complete: authenticated owner retest shows the self-review guard in the reviews screen; no review CTA is exposed for the owner's own listing
- [x] Flow 6 complete: fresh Android retest verified categories, discovery sections, zero-result rendering, and category-result navigation with clean Renit logs
- [x] Flow 10 guest retest: Chat shows its sign-in gate on Android without a crash or app-originated error
- [x] Flow 10 partial authenticated retest: sent a labelled QA message, confirmed it in ChatDetails and after a cold relaunch in the conversation list; message history remained available
- [x] Flow 10 P2 fixed: notification-token registration now creates or merges the Firestore user document instead of failing when the document does not exist; retested after a cold relaunch with no recurrence of the prior Firestore `NOT_FOUND` write
- [x] Flow 17 FAQ retest: FAQ content and accordion expansion render on Android; Android Back now returns to Profile instead of leaving Renit
- [x] P2 fixed: a root Android hardware-back bridge now returns to the current React Navigation stack when possible; retested on FAQ and product detail
- [x] Flow 17 guest support retest: Report a problem and Feedback & Review render, keep empty submissions disabled, and return to Profile through Android Back
- [x] Flow 4 guest retest: Post tab shows the sign-in gate without app-originated errors
- [x] Flow 3 partial retest: the authorized test mailbox received the OTP, Android verification succeeded, authenticated APIs returned 200, and the session survived a cold app relaunch
- [x] Flow 12 partial retest: authenticated Android navigation passes category, subcategory, product detail fields, condition selection, live location selection, and return of the confirmed address to the listing form
- [x] P2 fixed: LocationModal now passes a serializable request ID through React Navigation and returns the chosen location through the existing callback; Android retest confirmed the selected address returns without the prior non-serializable-navigation warning
- [x] P2 fixed: replaced the animated LocationModal bottom sheet with an equivalent static, scrollable control panel; Android Back and confirmed-location returns now complete without the prior `NativeViewHierarchyManager` / `IllegalViewOperationException`
- [x] Flow 12 complete: a physical Android retest selected a gallery image, completed native cover cropping, skipped optional unavailability dates, reviewed the listing, uploaded image and cover assets, created the listing (`201`), and read it back from My products and its owned product detail page
- [x] P1 fixed: post-form validation no longer allows the development build to bypass the API-required description, address, and location fields. The previously reproducible `400` rejection is now prevented in the UI; a complete valid post succeeds end to end.
- [x] Flow 14 partial retest: an owned listing opened from My products, its detail screen exposed Edit product, and the edit hub loaded on physical Android.
- [x] P1 fixed: the owned-listing Edit product control incorrectly navigated to Profile instead of the edit hub. It now targets the root edit route with the product ID; Android retest reached the edit hub.
- [x] Flow 14 partial retest: Product Details accepted a changed test description, issued `PATCH 200`, returned to the edit hub, and fetched the changed description again from the API. The submit action now also requires the API-required description, address, and valid coordinates before it enables.
- [x] P2 fixed: backend startup reported pending schema changes for product, feedback, and review moderation-label fields. Added and applied the three generated migrations; the migration-drift check is clean and the affected backend test suite passes (10 tests).
- [x] P2 fixed: when both stored access and refresh tokens are invalid, Android now clears the session instead of leaving a stale authenticated shell and Profile error. A physical retest returned to Welcome/sign-in without recurring authenticated request failures.
- [x] Flow 3 partial retest: Logout from Profile returned cleanly to Welcome on physical Android; the same authorized test account then completed the email OTP flow back to Home.
- [x] P1 fixed: OTP verification built the query string manually, so valid email addresses containing `+` were decoded as spaces and returned `401`. The client now passes email and code as Axios query parameters; a physical Android alias-email retest received `200` and advanced to onboarding.
- [x] Flow 3 complete for standard email registration: a unique alias of an authorized test mailbox completed OTP verification, profile form validation, password confirmation, location confirmation, `POST /api/signup/` (`201`), and authenticated Home. The persisted account has a verified email, usable password, and coordinates.
- [x] Flow 5 complete: on physical Android, a fresh user denied the Android location prompt. Renit showed its explicit Permission Denied recovery dialog, returned safely to onboarding on Cancel, exposed `Skip for now`, and completed onboarding to authenticated Home without location access.
- [x] P1 fixed: chat attempted to use Socket.IO against an endpoint that exposes neither Socket.IO nor a compatible transport, producing repeated `/socket.io/` `404`s. Chat now uses its existing Firestore persistence/subscription path and reports failed sends instead of silently clearing them.
- [x] Flow 10 partial retest: a newly registered renter sent a message to an existing owner about a listing; the message persisted and cleared the composer. After owner sign-in, the Chat list showed the renter, message preview, unread count, and message body; opening the conversation completed the read transition.
- [x] P2 fixed: after a successful review submission (`POST /api/write-review/` `200`), All reviews and Product Details kept rendering stale route-supplied data, including "No reviews yet" and `(0)`. Both screens now refresh their review data whenever they regain focus.
- [x] Flow 15 partial retest: a non-owner renter selected condition, entered product and owner reviews, rated both four stars, and submitted. The API persisted both records; Android returned to All reviews, which refreshed to show a 4.0 average, one review, and the submitted product-review text.
- [x] Flow 15 complete: the owner profile reflected the renter's four-star owner rating and displayed the submitted owner-review text on physical Android.
- [x] Flow 14 partial retest: category and subcategory selection now persists from the physical Android edit flow (`PATCH 200`) and returns to the edit hub. The backend avoids unnecessary image recompression/moderation when an edit changes only category data, preventing unrelated seller edits from being blocked by image-storage failures.
- [x] P1 fixed: seller unavailability edits previously sent the unsupported `booked` field; valid one-day date-only values were also discarded by the API, and updates referenced an undefined user. The client now sends `blocked_dates`, normalizes one-day ranges, and the API accepts and persists date-only same-day bookings for the authenticated owner.
- [x] Flow 14 partial retest: on physical Android, selecting Jul 20 as a one-day unavailability range displays one unavailable day, Update returns to the edit hub, the local API stores the same-day booking, and reopening the screen reads the range back.
- [x] Flow 4 re-review retest: tapping `Request review again` returned `200` and changed the authorized disposable merchant from `rejected` to `pending` in the local API. A fresh Android bundle then completed Email -> password sign-in and displayed `Merchant approval required` with the expected pending-only message in Post.
- [x] P1 fixed: the Welcome carousel was constrained by its parent to 60% of the screen but its own scroll view was forced to 75%, leaving an invisible touch target over the sign-in controls. Giving the carousel matching explicit dimensions restores Email navigation on physical Android.
- [x] Current-bundle guest retest: Skip reaches guest Home, guest Post presents its sign-in gate, and its Email action reaches the Email screen.
- [x] Current-bundle Google retest: guest Post opened the native account chooser, selected the authorized test account, and returned to the app's authenticated category-selection state without an OAuth or navigation error.
- [x] Flow 16 partial retest: authenticated Profile displayed the test account and merchant state; Notifications opened; Logout returned to Welcome and current-bundle Skip then restored guest Home.
- [x] Flow 17 partial retest: authenticated feedback and report submissions both returned to Profile and created their respective QA-labelled `Feedback` records through `POST /api/platform-feedback/`.
- [x] Flow 17 partial retest: Contact Us displayed the expected email and phone details. Network Diagnostics now tests the REST path only; its physical Android check returned `REST OK (12 categories returned)` instead of a false error from an unauthenticated legacy socket probe.
- [x] QA harness recovery: the Expo config now points `android.googleServicesFile` at the tracked `android/app/google-services.json`; `expo config` resolves it cleanly and a fresh Android debug build installed on the physical device.

## QA Findings Queue

- [ ] P1 Flow 10: offline chat push is fixed in the Firebase Function source but still requires Cloud Functions deployment and a physical recipient-device delivery retest. The app registers Expo push tokens; the function now sends them to Expo instead of incorrectly passing them to FCM.
- [ ] P1 infrastructure candidate: this QA host's Windows Time service is unsynchronized and uses the local CMOS clock. AWS rejects S3 writes with `RequestTimeTooSkewed`, blocking the physical product-image edit path. Require NTP/time-service health in the deployment runbook and retest image updates on a synchronized host.
- [ ] P2 legacy-chat finding: the unused Django WebSocket notification service hard-codes a device FCM token. The mobile app uses Firestore directly, but remove or replace this path with user-scoped delivery before enabling server-side WebSocket chat.
- [ ] P3 data-quality issue: local discovery data includes obviously synthetic/malformed listing names and image content. Keep test fixtures from being confused with production-ready catalogue data during final readiness review.
- [ ] P3 content issue: the FAQ sign-up answer points to `renit.co.in`, while current app/support links use the SimplyRenit domain. Confirm the intended public site and update the copy.

## Production Readiness Confidence

**Current confidence: 70% — not ready for production.**

Tested and passing: environment/boot (Flow 1), current-bundle Email entry, password sign-in, Skip, guest Post sign-in gate, and Google OAuth account-selection return (Flow 2), standard email signup plus OTP/password/logout/session recovery and both location-confirmation and denied-permission/Skip onboarding (Flows 3 and 5), merchant re-review API transition plus fresh-device pending-state UI readback (Flow 4), home discovery (Flow 6), search (Flow 7), favorites (Flow 8), product-detail and owner trust paths including complete non-owner product and owner-review submission/readback (Flow 9 and Flow 15), two-user chat send, persistence, recipient receive, and read-state transition (partial Flow 10), full listing creation including gallery selection, native crop, image upload, publish, and owned-listing readback (Flow 12), owned-listing edit navigation plus Product Details, category/subcategory, and single-day unavailability update/readback (partial Flow 14), authenticated profile, notifications entry, and logout (partial Flow 16), authenticated feedback/problem-report submission, contact details, and REST diagnostics (partial Flow 17), backend moderation-label migration integrity, and FAQ/navigation. Offline-chat push now has a compiling source fix but no deployment/device proof. Open findings: P0 0, P1 2 (offline-chat push deployment/retest and time synchronization for S3), P2 1 (legacy hard-coded WebSocket push token), P3 2 (test catalogue quality and FAQ website copy). Critical evidence is still missing for merchant onboarding and approved-merchant posting, remaining seller image and inventory paths, chat push delivery, personal-details and profile-image updates, and the full regression sweep. Confidence may rise only after each flow meets its exit criteria with device and log evidence; unresolved P0/P1/P2 findings keep production readiness below 100%.
