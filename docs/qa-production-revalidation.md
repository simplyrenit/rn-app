# QA production revalidation

Release-readiness record for the QA release candidate, condensed from the
2026-07-22 to 2026-07-24 revalidation cycle. It does not inherit completion from
[`qa-e2e-strategy.md`](./qa-e2e-strategy.md) (which is now method only).

> **Status: not release-ready, and out of date.** Every figure below was
> measured on the July build, before the redesign branch. Treat this as the
> last known baseline and re-baseline against the current build before any
> release decision.
>
> The full per-defect log (about 60 entries with evidence and reproduction
> detail) is in git history: `git log -- docs/qa-production-revalidation.md`,
> then read the version from before the commit that condensed it.

## Baseline (2026-07-22)

- Frontend and backend on `exp-yash`, running against
  `https://qa-api.toratora.site`.
- Physical Android `34962d85`, development client with
  `EXPO_PUBLIC_APP_ENV=QA` and Firebase project `renit-uat`.
- QA API, coordinate-based discovery endpoints, S3 access, SMTP, Docker
  services and the Cloudflare tunnel were reachable.
- A cold device start completed authenticated category, profile, favorites,
  notification and discovery requests without a React Native error.
- Listing media URLs returned HTTP 200. Top Experiences, Top Rated and
  Popular-in-Area returned results for valid Mumbai coordinates, and malformed
  coordinates returned the expected structured HTTP 400.

## Current confidence: 88/100

| Area | Evidence-backed confidence |
| --- | ---: |
| Environment | 9/10 |
| Auth/session | 14/15 |
| Discovery/detail/images | 15/15 |
| Chat/push/isolation | 15/20 |
| Listing/media/availability | 18/20 |
| Profile/support/merchant | 9/10 |
| UX/resilience/logs | 8/10 |
| **Total** | **88/100** |

Covered on a physical device: cold boot and resume, Google account selection and
the selected-account login/profile/logout regression, location-denial recovery,
guest discovery/search/detail/gallery, two-user chat receipt, read state and
block/report/unblock, controlled create/crop/upload/publish/readback with
duplicate-publish protection and one-day availability, Profile/Support/
Diagnostics, stale access-token recovery (401, one refresh, retry 200), offline
cold start and recovery, and clean post-logout guest requests.

Also closed on the current release candidate:

- **Search location.** `What?` is required, `Where?` is optional, and no
  coordinates are sent without a location. The QA API accepts the title-only
  request.
- **QA Firebase App Check** is active in the Metro dev client and the standalone
  QA APK. It uses debug attestation for DEV/QA; production still uses Play
  Integrity.
- **Guest OTP error path** shows only `Wrong OTP. Try again`, with no error
  overlay.

## Release blockers

Do not claim release approval while any of these remain:

1. **Notification delivery and tap routing** has not been reproduced with a
   second, inactive recipient device. Warm-process routing passes, and a true
   cold-process tap is an environment-specific follow-up (force-stopping this
   Android build clears the notification card).
2. **Successful-code phone OTP.** It is implemented (Firebase Phone Auth on
   `renit-uat`, India-restricted, QA API accepts only verified phone-provider
   tokens), but the device disconnected before a code could be submitted. It
   does not count as a pass.
3. **Malformed-response paths** need current evidence.
4. **QA-package confirmation** of the cover-image crop modal fix. It was verified
   through Metro, but the installed `com.renit.app.qa` APK predates it.
5. **Representative media quality.** Existing QA fixture covers are screenshots,
   so they are not valid visual-quality evidence.

## Retained QA fixtures (clean up)

Labelled controlled data left in place from the last cycle: listing
`PROgt2Q6rN0Rxy49XQfIvxstA` and conversation `k3bdVEILivaqvdHTndPx`. Delete both
when the flow no longer needs them, and touch no unlabelled QA data.

## Defect ledger: P0 and P1 outcomes

Each was found during the cycle and closed on a physical device unless noted.

**P0**

| Defect | Outcome |
| --- | --- |
| Firebase chat data had no user-level access control | Rules deployed to `renit-uat`; participant boundary verified by the two-user chat runs |
| Isolated QA APK could silently use the production API | Runtime resolver now identifies the QA package ID as QA; rebuilt APK made only QA-host requests |
| Coordinate-less listing crashed Product Detail | Fixed; unavailable-location state renders, no error-level log |

**P1**

| Defect | Outcome |
| --- | --- |
| Stale Django session showed a Firebase auth error on Home | Closed; stale-token replay stays signed in |
| QA chat denied by Firestore rules | QA rules deployed to `renit-uat` |
| Chat message query lacked its Firestore index | Closed; two-user retest log free of Firestore permission/index errors |
| QA chat push trigger not deployed | Deployed and `ACTIVE`; delivery later proven for warm-process routing (see blockers) |
| Listing image moderation assigned files to a nonexistent user | Fixed in backend (`db2baf4`); regression suite passes |
| Post drafts leaked across account logout/login | Isolation retest passes |
| Starting a chat failed silently with valid Firebase auth | Closed for creation, delivery, receipt, unread state |
| Unblock used an unauthorized Firestore query | Fixed; block and unblock both verified |
| Full listing, media, availability and deletion lifecycle | Passes for the one-image path; the five-image gallery cap and sixth-selection rejection were covered by a later pass |
| New-listing one-day unavailability published an invalid end date | Fixed; a same-day range persists |
| QA image moderation denied after every publish | IAM policy corrected; a fresh physical publish confirmed it |
| QA address search used a key from the wrong Google project | QA-specific key configured; city suggestions work |
| Merchant profile-image update failed after a successful upload | Serializer boundary fixed; image persists across a cold restart |
| Chat Details crashed in the standalone QA APK | Gesture Handler now loads before Reanimated at app entry; no crash |
| Background chat push and notification tap | Routing moved to the authenticated root navigator; see blocker 1 |
| Block & Report claimed completion without retaining the report | Fixed; one report retained, duplicates prevented |
| OAuth sign-in could enter the OTP-only signup flow | Google/Apple now go straight to `MainTabs`; verified |

The P2/P3 entries and the remaining "physical pass" records (layout, copy,
offline logging, guest-mode request guards, support-form behaviour and similar)
are in git history. Not every one is closed: for example, representative QA
discovery content is still visually unsuitable (see blocker 5). Check the full
log before treating any P2/P3 as resolved.
