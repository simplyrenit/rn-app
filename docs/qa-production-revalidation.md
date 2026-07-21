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

## Current release confidence: 60%

Current evidence supports 10/10 environment, 11/15 authentication,
12/15 discovery/detail, 15/20 chat, 4/20 listing, 4/10 profile/support, and
4/10 UX/resilience. This is deliberately not production approval: push
delivery on a second device, block/report behavior, a full app-driven listing
with image upload/edit/delete, support submission, cross-user permissions,
offline/recovery behavior, visual regression with representative fixtures,
and a distributable release-package test are still unverified.
