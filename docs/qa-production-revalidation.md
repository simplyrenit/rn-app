# QA production revalidation

This log is the authoritative record for the current QA release candidate. It
does not inherit completion from `qa-e2e-strategy.md` or
`qa-continuation-handoff.md`: those documents include local-backend, older
Firebase-project, and earlier-device evidence.

## 2026-07-22 baseline

- Frontend: `exp-yash`, product-detail cycle commit `86e6ee7`.
- Backend: `exp-yash` at `cdb7ca2`, running through
  `https://qa-api.toratora.site`.
- Device: physical Android `34962d85`, development client configured for
  `EXPO_PUBLIC_APP_ENV=QA` and Firebase project `renit-uat`.
- QA API, coordinate-based discovery endpoints, S3 bucket access, SMTP
  configuration, Docker services, and the Cloudflare HTTP/2 tunnel were
  reachable.
- The configured OTP SMTP provider completed a TLS authentication handshake
  from the QA web container. No email was sent during this configuration check.
- A cold device start completed authenticated category, profile, favorites,
  notification, and discovery requests without a React Native error.
- Current public QA API regression: the three listing media URLs returned HTTP
  200; Top Experiences, Top Rated, and Popular-in-Area each returned results
  for valid Mumbai coordinates; malformed coordinates returned the expected
  structured HTTP 400 response. This is API evidence only, not visual-device
  sign-off.

## Verified defects and outcomes

### P2 — QA Metro could not build an Android bundle on this host

Starting the QA development client bundle on this Linux host exhausted the
system's file-watcher limit while Metro recursively watched generated Android
build directories inside native dependencies. Metro then exited with `ENOSPC`,
leaving a stale or unavailable development-client runtime.

`metro.config.js` now excludes generated Android build output from Metro's
resolver watch set. With the repository's Node 20 prerequisite supplied by a
checksum-verified temporary runtime, the QA Metro server on port 8082 remained
healthy and produced an Android development bundle. The bundle contains
`qa-api.toratora.site` and no production API URL. The USB reverse route is in
place, but the phone has not yet been launched into this server so the
preserved in-memory post draft remains intact.

### P2 — QA web container used stale ADC quota metadata

The QA web container had started before its mounted Application Default
Credentials were assigned the `renit-uat` quota project. Firebase calls still
worked in the observed paths, but Google authentication emitted a quota-project
warning that could turn into a customer-visible failure under quota or API
enforcement.

The QA web service was recreated without rebuilding code or changing data. The
public category check returned HTTP 200 after the restart and its fresh logs
contain no quota-project warning. The `onNewMessage` function is `ACTIVE` and
has zero Cloud Run runtime errors in the preceding 24 hours; the five earlier
Cloud Functions error-severity records were failed deployment audit attempts,
not message-processing errors.

### P2 — Frontend static release check had 20 TypeScript errors

The current frontend branch did not pass `tsc --noEmit`. The errors covered
nullable category/image sources, nullable camera results, typed navigation
parameters, Home moderation data, edit-location input, and both availability
calendars. The calendars also used obsolete theme keys that the installed
calendar library does not recognize.

The affected call sites now use their real nullable/type boundaries, both
calendar themes retain the calendar library's runtime header override key, and
navigation has the missing route parameters. A code review caught that the
library's declaration omits that legacy key even though its renderer consumes
it; an earlier static-only change incorrectly nested the key and would have
silently removed the header separator. The physical Edit Unavailability screen
now visibly renders the separator. `tsc --noEmit` passes with zero errors and
the active QA Metro server produces an Android development bundle. The package
has no Jest test files, so physical UI coverage remains required.

### P1 — Stale Django session showed Firebase authentication error on Home

The first physical QA cold start on the verified port-8082 bundle showed the
customer-visible toast `Unable to authenticate Firebase` while the app's
ordinary requests refreshed the stored expired Django access token. Firebase
custom-token exchange had used raw Axios, so it bypassed the shared 401 refresh
interceptor and failed before the refreshed token was available.

Firebase custom-token exchange now uses the shared refresh-aware API client and
stores the current persisted access token after a successful exchange. After a
force-stop/cold start on port 8082, Home showed no Firebase error toast and
Chat rendered its normal authenticated `No Chats` state with no Firebase or
Firestore permission/index error. The exact stale-token replay was then run on
the physical QA device by replacing only the QA access token in its private
environment-scoped store while preserving the refresh token. A cold start
replaced the intentionally stale value, kept the user signed in, showed no
Firebase toast, and Chat again rendered normally. This P1 is closed.

### P2 — Post and Review used different category-icon data shapes

Post saved category icons with API snake-case fields while Review read
camel-case product-context fields. This could make configured category icons
disappear on Review. Post now normalizes the category once at selection.
Physical QA category and subcategory screens render their current cube fallback
without clipping or errors; the current fixture has no configured category
icon, so icon-enabled Review coverage remains open.

### P1 — QA chat denied by Firestore rules

The Android Chat screen returned `firestore/permission-denied` for both the
`conversations` subscription and the device-token write. The application uses
Django authentication rather than Firebase Auth; the repository's QA rules had
not been deployed to `renit-uat`.

The isolated QA rules were deployed to `renit-uat` on 2026-07-22. No production
Firebase project, Functions, or rules were changed. Chat still requires a full
two-user, message, read-state, block/report, and push retest before it can be
counted as passing.

### P2 — Product detail media and summary layout

Products whose API response contained only `cover_image` rendered with no
gallery image in Product Detail. The three-column category/deposit/condition
summary also assigned `flex: 1` to each value text, causing visible overlap on
the physical Android device.

`86e6ee7 fix product detail media and summary layout` adds the cover image to
the gallery and constrains the summary columns. The physical-device retest
showed the cover image and readable Category, Deposit, and Condition values
with no app-originated error.

### P3 — QA fixture media is misleading

The `Lenovo` QA listing uses an uploaded screenshot of an image-crop screen as
its cover image. This is fixture content, not a rendered crop UI. Replace it
with representative approved media before visual QA sign-off.

### P1 — Chat message query lacked its required Firestore index

After the QA rules deployment, a real buyer-to-owner conversation could be
created, but its message subscription failed with
`firestore/failed-precondition`: the `messages` query orders by `timestamp`
after filtering by `conversationId` and therefore needs a composite index.

The committed `firestore.indexes.json` already defined that index, but it had
not been deployed to `renit-uat`. On 2026-07-22 it was deployed to the QA
Firebase project only and verified `READY`. No production Firebase resources
were changed.

Physical-device retest: two isolated password-based QA users started a
conversation about a QA-only listing. The sender's initial product card and a
text message were visible, then the recipient signed in on the same device,
received the conversation, and saw the exact message. The device log was
clean of Firestore permission/index errors for the successful retry.

### P1 — QA chat push trigger was not deployed

Firebase-backed chat relies on the Gen-2 `onNewMessage` Firestore trigger in
`functions/src/index.ts` to submit Expo push notifications. QA had no Cloud
Functions API enabled and no deployed function. The function source now builds
locally after installing its ignored dependencies; the QA-only Cloud Functions,
Eventarc, Cloud Run, Artifact Registry, and Cloud Build APIs were enabled.

The scoped QA IAM prerequisites were granted and the trigger was deployed to
`renit-uat`; its Cloud Function state is `ACTIVE`. The source now resolves the
recipient's Firebase UID before looking up the device token, matching the
participant-scoped data model. Delivery is still not verified: it needs a
second authenticated QA device (or a deliberately offline recipient) and a
notification tap test. No production cloud resource was changed.

### P0 — Firebase chat data had no user-level access control

The old QA rules granted unrestricted reads and writes to every document. That
was not acceptable for a customer release and is no longer deployed.

The remediation uses Firebase custom-token authentication tied to the
Django-authenticated user's stable `user-<primary-key>` UID and
participant-scoped Firestore rules. QA's runtime signer has only the required
QA-scoped ability to sign custom tokens; no service-account key was created.
Firebase Authentication was initialized for `renit-uat` after the API was
enabled, and an issued custom token successfully exchanged for a Firebase ID
token. No production rules or data were changed.

Backend commits `da3c137 add authenticated Firebase token endpoint` and
`5b71016 expose stable Firebase user identifiers` provide the first required
components: `POST /api/chat/firebase-token/` is JWT-protected, uses the stable
`user-<Django primary key>` UID, and returns a generic 503 instead of exposing
signing failures. Existing user, owner, and product-owner payloads now expose
the same read-only `firebase_uid`. The current backend branch passes all 49
tests with Django's preserved disposable test database, then the QA API was
rebuilt and restarted. The public
endpoint returned 401 without credentials and the API/category health check
returned 200 after the brief expected restart window.

A disposable QA user and JWT then called that endpoint through
`https://qa-api.toratora.site`; it returned a valid custom token with HTTP 200.
The temporary user was deleted immediately after the check. This proves the
public tunnel, JWT guard, runtime signer, and endpoint wiring together without
using a customer account.

The mobile client now exchanges the Django-authenticated custom token before
any chat operation, and clears Firebase authentication on logout. Existing QA
conversation, message, and block documents were backfilled with Firebase UID
fields before the secure rules were deployed. A controlled QA rules test used
two participant identities and one outsider: both participants could read the
fixture, a participant could create a message, and the outsider was denied
conversation reads and message listing. The temporary fixture was removed.

This resolves the data-exposure P0 at the infrastructure/rules level. It is
not yet a release pass: a physical-device retest must prove the real app can
obtain its authenticated token, create/join a conversation, send/read a
message, update allowed read state, and perform block/report behavior without
regressing the participant boundary.

### P1 — Listing image moderation assigned derived files to a nonexistent user

Creating a QA listing with media exposed an integrity failure in backend image
moderation: derived `RNFile` records were hard-coded to `user_id=1`, which is
not present in the QA database. A listing could be saved, but its moderation
path raised an integrity error.

Backend commit `db2baf4 fix product image moderation file ownership` now
assigns each derived file to the listing owner (or no user for ownerless legacy
records). Its focused backend regression suite passed: 8 tests including the
ownership assertion and existing listing-ownership coverage. The rebuilt QA
API returned 200 after the test.

### P3 — Review rating validation emitted framework warnings

The backend review model and serializer passed float bounds to Django REST
Framework decimal fields. Normal tests passed but emitted warnings; a strict
warning run converted the review trust-boundary request into an error.

Backend commit `c74f8c5 fix review decimal validation warnings` uses Decimal
bounds consistently. The focused three-test review suite passes with REST
Framework decimal warnings treated as errors, and the rebuilt QA backend's full
44-test suite passes.

### P2 — Recoverable 401 responses raised development error overlays

The API client logged a normal expired-token refresh and unauthenticated
startup request as `console.error`. In a React Native development client this
produced a red error overlay even when the refresh subsequently succeeded.

Frontend commit `f249542 fix recoverable auth error logging` logs those
expected 401 paths as informational while preserving error logs for actual
request or refresh failures. Cold restart and fresh password sign-in were
retested. The app still attempts protected profile/notification requests before
an unauthenticated user signs in; those calls are handled but remain a
resilience follow-up because they generate app-level 401 logs.

### P1 — Post drafts leaked across account logout/login on one device

While signed in as the isolated QA peer, entering Post showed the previous
account's in-progress `Macbook Air` title, brand, and model draft. No fields
were changed. Authentication state was correctly replaced, but the in-memory
`ProductContext` was not reset on the normal Profile logout path.

Frontend commit `5f09064 fix reset post drafts on session logout` clears the
draft whenever the shared authentication state becomes logged out, covering
all logout callers. The current original draft has been deliberately
preserved, so the physical logout/login retest is pending an explicit decision
to discard or save that draft. Until that retest passes, cross-account post
isolation is not verified.

## Current release confidence: 50%

Current evidence supports 9/10 environment, 12/15 authentication,
13/15 discovery/detail, 8/20 chat, 3/20 listing, 4/10 profile/support, and
1/10 UX/resilience. This is deliberately not production approval: the
formerly open Firebase data-exposure P0 is technically resolved, but all
app-driven chat flows and push delivery on a second device remain unverified.
A full app-driven listing with image upload/edit/delete, support submission,
cross-user permissions, offline/recovery behavior, visual regression with
representative fixtures, and a distributable release-package test also remain
open. The current cross-account draft-isolation fix requires a physical-device
logout/login retest once the preserved draft is intentionally saved or
discarded.
