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

## Current release confidence: 45%

Environment and cold-start evidence is current, and one product-detail defect
has been fixed and retested. Authentication, chat/push, listing/upload, seller
editing, cross-user isolation, permission recovery, visual regression, and
release-package distribution have not yet been independently revalidated on
this QA candidate. This is not a production release approval.
