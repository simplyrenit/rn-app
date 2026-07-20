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
- [x] Verify account type selection in onboarding
- [x] Verify merchant-specific fields such as `business_name`
- [x] Verify merchant user with non-approved status is blocked from posting
- [x] Verify merchant approval messaging in `Post` tab and `Profile`
- [x] Verify `Request review again` behavior for rejected merchants

Exit criteria:

- merchant gating is intentional, understandable, and non-broken

### 5. Location permission and fallback flow

- [x] Verify onboarding location flow with permission granted
- [x] Verify onboarding location flow with permission denied
- [x] Verify `Skip for now` behavior
- [x] Verify location fallback does not block app usage in supported cases
- [x] Verify post-location modal fallback behavior
- [x] Verify search/current-location interactions

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
- [x] Verify typing/read-state behavior if available (read-state is verified; no typing-indicator feature is implemented)
- [x] Verify block/unblock/report paths

Exit criteria:

- user can enter conversations and exchange messages without runtime issues

### 11. Offer and rental intent flow

- [x] Verify product selection inside chat for offer flow
- [x] Verify availability selection and date range handling
- [x] Verify offer creation inputs and validation
- [x] Verify owner/renter handoff states visible in UI

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

- [x] Verify required field validation
- [x] Verify location-optional path used for local testing
- [x] Verify image count/type edge cases
- [x] Verify invalid price/description/title handling
- [x] Verify navigation backward/forward preserves form state

Exit criteria:

- publish flow blocks bad data clearly and does not lose user progress

### 14. Seller inventory management flow

- [x] Verify `My products` list
- [x] Verify product details for owned items
- [x] Verify edit category/sub-category/about/images/cover
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
- [x] Verify personal details edit
- [x] Verify profile image update
- [x] Verify notifications screen
- [x] Verify logout
- [x] Verify delete account flow if safe in test environment

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

- [x] Re-run critical renter path: launch -> browse -> detail -> save -> chat
- [x] Re-run critical seller path: launch -> post -> publish/edit
- [x] Re-run merchant gating path
- [x] Re-run profile/account basics
- [x] Confirm logs remain clean across the main flows

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
- [x] Flow 4 partial retest: a local QA merchant in `pending` state is blocked in Post with the expected approval message. After the local admin-approved transition, the same physical Android account reached category selection, Electronics > Laptop / Desktop, and the listing form. Full approved-merchant publish is still open.
- [x] P2 verified: the post-location permission recovery now survives Renit's own `OPEN SETTINGS` round trip. After Android permission is granted, the existing post form resumes without a restart and can reopen the map and confirm the resolved address.
- [x] Flow 16 partial retest: Personal Details updated a physical Android test account's full name, returned to the sheet with the new value, and the local API persisted the same first-name value.
- [x] Flow 16 partial retest: a disposable local QA account rendered the explicit delete confirmation, deleted successfully on physical Android, returned to Welcome, and no longer exists in the local API.
- [x] Flow 4 partial retest: a fresh physical Android email signup selected merchant onboarding, displayed and validated the legal-business-name and owner fields, completed password and location setup, and persisted `account_type=merchant`, the entered `business_name`, and `pending` approval status in the local API. The same organically created account is blocked in Post with the expected pending-approval message.
- [x] Flow 4 complete: the same disposable local QA merchant was transitioned to rejected, displayed the rejection reason and `Request review again` action on physical Android, and changed back to `pending` after the action; the local API persisted that transition.
- [x] Flow 5 partial retest: Search opened its location picker, `Use current location` populated the resolved address, enabled search, and returned two physical-device results for `Laptop`.
- [x] Flow 13 partial retest: an approved local QA merchant reached the about-product form with every required field blank; after scrolling to the action, `Next` remained disabled and did not allow an incomplete listing to advance.
- [x] Flow 13 state retest: a physical Android merchant completed the valid about-product form, advanced to Product Images, then returned. The title, condition, description, address, price, deposit, and Owner option all persisted, and `Next` remained enabled.
- [x] Flow 13 publish retest: on physical Android, the QA merchant selected a gallery image, completed native cover cropping, skipped optional unavailable dates, reviewed the rate and listing details, published successfully, and saw the active listing in My products. The API confirms the expected rate, one image, and a cover image.
- [x] Flow 14 image retest: the same owned listing added a second gallery image, selected and cropped it as the replacement cover, and returned from Update Product to the edit hub. The API confirms the active listing now has two images and a cover image.
- [x] Location recovery retest: on physical Android, a seller denied the native location prompt, used Renit's `OPEN SETTINGS` recovery action, granted Android location access, returned to the same post form without restarting, reopened the location chooser, and confirmed the resolved Mumbai address back into the form.
- [x] Flow 16 profile-image retest: on physical Android, the QA merchant selected a gallery image, completed native crop, and updated the profile image. The API persisted the resulting user-image record and uploaded URL. This retest also fixed the client PATCH call, which had incorrectly wrapped the image payload in `headers` and `body` fields.
- [x] P2 fixed: legacy WebSocket chat no longer sends offline messages to a hard-coded FCM token. The app now registers its Expo token with an authenticated API endpoint while retaining Firestore registration, and the backend resolves the intended recipient's stored Expo token. Django route and authenticated registration checks pass; physical offline delivery remains an open P1 until deployment and recipient-device proof.
- [x] Chat push registration retest: after a local API restart, the physical Android QA account signed in with password, opened Chat, and stored one real Expo token through the new authenticated registration endpoint.
- [x] Flow 11 complete: on the physical Android device, a renter opened a product chat, chose the owner's listed product, selected a July 21–23 range, and saw the three-day calculation. The empty amount/deposit form kept `Make an offer` disabled; entering both values enabled and submitted it. The owner received the pending card and accepted it, then the renter's live conversation updated to `YOUR OFFER WAS ACCEPTED`, with no app-originated error during the handoff.
- [x] P2 fixed: signing the same physical device into another QA account caused `POST /api/register-push-token/` to return 500 because the Expo token is globally unique. Registration now atomically reassigns a device token to the active account and removes that account's stale token. Two API regressions cover token transfer and replacement; after the local backend restart, the physical Android Chat entry retried registration with `200` and no LogBox.
- [x] Flow 10 complete: the physical Android device exercised persisted two-user messaging and read-state, then opened the header's Block & Report control, supplied a QA reason, and blocked the other participant. The conversation showed the blocked state and disabled composer; `Unblock` immediately restored the composer. No typing-indicator feature exists in the client, so the read-state coverage is the available presence-status behavior.
- [x] Flow 14 complete: physical Android retests cover owned-listing navigation, Product Details update/readback, category/sub-category persistence, gallery-image addition, native cover crop/replacement, and one-day unavailability update/readback. The apparent image-editor overlay was traced to the two QA fixture images themselves: they are screenshots uploaded during earlier testing, while the native image grid bounds and edit flow render normally.
- [x] Flow 13 validation retest: pasted non-numeric price input is stripped and the Android edit form keeps Update Product disabled while a required rate is invalid. Both post and edit forms require a trimmed title/description, a positive price, and a non-negative deposit. The API independently rejects a negative rate with `400`.
- [x] P2 fixed: listing galleries were unbounded. Both Android image pickers now allow at most five images, hide Add at the cap, and the API rejects a six-image create or update request before image moderation. A physical edit retest started with two images, selected only three more from the images-only picker, rejected a fourth selection, and returned a five-image grid without an Add control.
- [x] Flow 13 location-optional retest: selecting `Skip for now` from the post location modal returns safely to the form. Form validation now accepts its existing persisted-profile-coordinate fallback (while still requiring a real location when no fallback exists), so local device testing is not blocked downstream.
- [x] Flow 18 renter regression: fresh physical Android session on the authorized renter account opened `QA_E2E_Laptop_20260719` from Home, rendered its detail, saved it, showed it in Saved, and entered the owner chat with an enabled composer. The current local-stack requests for this path returned `200` with no app-originated error.
- [x] Flow 18 seller/account regression: an approved merchant completed password sign-in, opened Post category selection, opened My products, and reached the owned-listing edit hub. Profile accurately displayed the approved account state; logout and re-entry through Email/password also passed.
- [x] Flow 18 merchant-gating regression: the local-only QA merchant was changed to `pending`, Android Post displayed the expected approval-required state, then the account was restored to `approved`. After a cold relaunch, Post returned to category selection. No permanent test-account state was left behind.
- [x] Flow 18 log regression: the current device log window contains no Renit crash or React Native error. `expo config --json` resolves the tracked `./android/app/google-services.json` path; the repeated `./google-services.json` parse messages are stale historical lines in an untracked Metro log, not current configuration or runtime output.
- [x] Push-infrastructure recovery: the company-owned Expo project is now `@simply-renit/renit` and its Android application identifier is `com.renit.app`. FCM v1 is assigned in Expo from the company-owned `renit-production` Firebase project. The tracked Android Firebase configuration now resolves to that project, and a fresh native Android debug build installed successfully on the physical device.
- [x] P1 fixed: push-token registration used a hard-coded, unrelated Expo project ID. It now reads the EAS project ID from the active Expo configuration, preventing a mismatch between the client token, the EAS project, and the FCM credential.
- [x] Physical-device native smoke: the freshly installed app reached the Welcome screen from the existing LAN Metro workspace without a native Firebase or app-startup exception.

## QA Findings Queue

- [x] P0 Firebase cutover: copied the five Firestore collections from `rn-api-35b38` to `renit-production` with matching document IDs, fields, subcollections, and counts (`chats` 2, `conversations` 77, `messages` 480, `online_status` 3, `users` 5). The local API now connects to `renit-production`; physical Android retests load the migrated chat list, offer history, message history, and composer. The required `messages(conversationId ASC, timestamp ASC)` index is deployed and tracked in `firestore.indexes.json`.
- [ ] P1 Flow 10: obtain an offline recipient-device receipt for the new production push path. A real physical-device sender wrote labelled QA messages to Firestore; the active `onNewMessage` Gen-2 Firestore trigger invoked successfully after reading the migrated conversation and recipient token, and Expo accepted the ticket. The recipient-device notification/tap proof remains required before this finding can close.
- [ ] P2 QA harness: a newly started Metro instance on port 8082 times out from the USB-connected physical device, while the existing LAN Metro instance on port 8081 serves the current app successfully. Keep the working 8081 process for device QA and diagnose the secondary-port reachability before relying on parallel Metro instances.
- [ ] P3 data-quality issue: local discovery data includes obviously synthetic/malformed listing names and image content. Keep test fixtures from being confused with production-ready catalogue data during final readiness review.
- [x] P3 fixed: the FAQ sign-up answer now points to `simplyrenit.com`, matching the current app and support links. Physical Android FAQ retest passed.
- [x] P3 resolved: the QA host Windows Time service now reports `Leap Indicator: 0`, a successful sync at 2026-07-20 02:50:42, and `time.windows.com` as source. The earlier unsynchronized state is no longer present; current listing image workflows remain passing.

## Production Readiness Confidence

**Current confidence: 94% — not ready for production.**

Tested and passing: environment/boot (Flow 1), current-bundle Email entry, password sign-in, Skip, guest Post sign-in gate, and Google OAuth account-selection return (Flow 2), standard email signup plus OTP/password/logout/session recovery and both location-confirmation and denied-permission/Skip onboarding (Flows 3 and 5), full merchant onboarding, business-name persistence, pending/rejected gating, and review re-request recovery (Flow 4), home discovery (Flow 6), search including current-location resolution (Flow 7), favorites (Flow 8), product-detail and owner trust paths including complete non-owner product and owner-review submission/readback (Flow 9 and Flow 15), complete two-user chat send, persistence, recipient receive, read-state, and block/report/unblock handling (Flow 10), complete renter offer selection, availability, required-value validation, owner decision, and renter readback (Flow 11), full listing creation including gallery selection, native crop, image upload, publish, owned-listing readback, and validation edge cases (Flows 12 and 13), and the complete owned-listing edit flow including Product Details, category/subcategory, images/cover, and unavailability (Flow 14). Also passing: denial-to-Settings-return location recovery without an app restart, full profile image upload/crop persistence plus authenticated profile, notifications entry, logout, persisted personal-details edits, and disposable-account deletion (Flow 16), authenticated feedback/problem-report submission, contact details, and REST diagnostics (partial Flow 17), backend moderation-label migration integrity, and FAQ/navigation. A fresh Flow 18 device sweep covers renter browse/save/chat, approved seller Post/edit, pending merchant gating and restoration, profile/password-sign-in/logout basics, and clean current device/config logs. Offline-chat push no longer has a hard-coded recipient token and its authenticated registration path is verified; the company-owned EAS/FCM configuration, Gen-2 Firestore trigger, migrated Firestore data, and new native Firebase build are also in place. The physical sender registered and used a real Expo token, the destination API returned `200`, and Expo accepted the production ticket. The remaining functional proof is an offline recipient-device receipt and notification-tap return to its conversation. Open findings: P1 1 (offline-chat recipient delivery), P2 1 (secondary Metro port reachability), P3 1 (local test catalogue quality). The temporary permissive Firestore rules are intentionally held for functional-migration parity and must be replaced in the security phase before release. Confidence may rise only after each flow meets its exit criteria with device and log evidence; unresolved P1/P2 findings keep production readiness below 100%.
