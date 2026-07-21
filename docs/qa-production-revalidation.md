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
- A cold device start completed authenticated category, profile, favorites,
  notification, and discovery requests without a React Native error.

## Verified defects and outcomes

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

### P1 — QA chat push trigger is not deployed

Firebase-backed chat relies on the Gen-2 `onNewMessage` Firestore trigger in
`functions/src/index.ts` to submit Expo push notifications. QA had no Cloud
Functions API enabled and no deployed function. The function source now builds
locally after installing its ignored dependencies; the QA-only Cloud Functions,
Eventarc, Cloud Run, Artifact Registry, and Cloud Build APIs were enabled.

Deployment to `renit-uat` is blocked by IAM only: the active build account
lacks `iam.serviceAccounts.actAs` on the QA default compute service account.
Grant that account the narrow `roles/iam.serviceAccountUser` role on this one
QA service account, then deploy the existing Gen-2 Firestore-created trigger
and repeat an offline recipient-device notification/tap test. No production
cloud resource was inspected or changed.

### P0 — Firebase chat data has no user-level access control

`firestore.rules` currently grants unrestricted reads and writes to every
document. The mobile client does not sign in to Firebase, so this is the only
way its Firestore chat works today. It means any actor using the app's Firebase
configuration can read or alter conversations, messages, blocks, and push-token
documents. It is not acceptable for a customer release.

The minimum correct remediation is Firebase custom-token authentication using
the Django-authenticated user's stable ID, followed by participant-scoped
Firestore rules. QA's existing ADC credential can read Firestore but cannot
sign a custom token: direct IAM signing was rejected for missing
`iam.serviceAccounts.signBlob` on the QA Firebase admin service account. This
must be resolved with a narrowly scoped IAM Token Creator grant or a dedicated
runtime service identity before implementation and device retest can proceed.
No production rules or data were changed.

Backend commits `da3c137 add authenticated Firebase token endpoint` and
`5b71016 expose stable Firebase user identifiers` provide the first required
components: `POST /api/chat/firebase-token/` is JWT-protected, uses the stable
`user-<Django primary key>` UID, and returns a generic 503 instead of exposing
signing failures. Existing user, owner, and product-owner payloads now expose
the same read-only `firebase_uid`. A fresh QA-configured image passed the full
48-test backend suite, then the QA API was rebuilt and restarted. The public
endpoint returned 401 without credentials and the API/category health check
returned 200 after the brief expected restart window.

The endpoint cannot issue a token until the QA token-creator grant is
available. The mobile client and existing conversation data must then be
migrated to participant-scoped queries/rules before the permissive rule can be
removed.

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

## Current release confidence: 30%

Current evidence supports 8/10 environment, 8/15 authentication,
12/15 discovery/detail, 0/20 chat, 2/20 listing, 4/10 profile/support, and
0/10 UX/resilience. This is deliberately not production approval: the open
Firebase security P0 must be resolved before any customer chat can ship; push
delivery on a second device, block/report behavior, a full app-driven listing
with image upload/edit/delete, support submission, cross-user permissions,
offline/recovery behavior, visual regression with representative fixtures,
and a distributable release-package test are still unverified. The current
cross-account draft-isolation fix also requires physical-device retest.
