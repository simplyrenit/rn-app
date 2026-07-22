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
all logout callers. After the original draft was explicitly discarded, the
physical device logged out and signed in as a distinct controlled QA merchant.
Post then started at category selection; category and subcategory selection
reached a new empty About screen, and its required-field `Next` control was
disabled. Android accessibility reports the form's static `Macbook Air`
examples as text, but source inspection confirmed they are placeholders, not
restored customer data. This cross-account isolation retest passes.

### P1 — Starting a chat failed silently despite valid Firebase authentication

The physical buyer could open a QA product but tapping `Chat with owner` left
the screen unchanged. Device logs showed Firestore denying the blocked-user
lookup: the query filtered by `initiatorUid` and `blockedUserUid`, but the
participant-scoped QA rule can only authorize reads whose query constrains the
current Firebase UID in `participantIds`. The product screen also swallowed
the failure, so a customer received no explanation.

Frontend commit `e5cdc6f fix authorized chat startup and feedback` queries
only the caller's authorized blocked records and filters the two-user pair
locally. It also logs and displays a recoverable error toast if chat startup
does fail. `tsc --noEmit` passed before the device retest.

Physical retest used two disposable QA accounts and a disposable QA listing:

- buyer opened the listing, started a conversation, and sent a text message;
- owner signed in on the same physical device, saw the exact message and an
  unread count, then opened the conversation and replied;
- buyer signed in again and saw the exact reply and its unread count.

The successful sequence emitted no Firestore permission or index errors. After
the chat safety retest, the two disposable accounts, their QA-only listing,
one conversation, three messages, and any matching block record were deleted;
a scoped verification confirmed none remained. This P1 is closed for
conversation creation, delivery, receipt, and unread state. Background push
delivery, offer state, report persistence, and notification-tap behavior
remain open.

### P1 — Unblock used an unauthorized Firestore query

The same physical QA conversation was then blocked with a controlled reason.
The UI correctly disabled the composer and exposed `Unblock`, but tapping it
returned a raw `firestore/permission-denied` error. Its unblock lookup had the
same unsafe query shape as the chat-start lookup: it filtered only the two UID
fields rather than constraining the caller's `participantIds`.

Frontend commit `3d270a7 fix authorized chat unblock` reads the caller's
authorized block records, selects the matching pair locally, and deletes only
that record. `tsc --noEmit` passed. On the physical device the exact blocked
conversation then unblocked successfully, the composer became enabled again,
and the retry log contained no Firestore permission error. Block and unblock
are now covered; report persistence remains unverified.

### P2 — Server-invalidated session produced customer-visible startup errors

After the disposable QA account was removed, a cold start initially rendered
Home while its now-invalid tokens triggered Firebase, notification, and stale
chat requests. The customer saw raw Axios/Firebase 401 toasts before the app
eventually cleared the session.

Frontend commit `2c55bfc fix invalid session bootstrap` validates `/users/me/`
before marking a stored session authenticated or starting Firebase work. A 401
now clears local and Firebase state without logging it as an app error. The
physical cold-start retest of the deleted QA session opened the Welcome screen
directly, with no Firebase, notification, or Firestore error in the app log.
This P2 is closed.

The cleanup repetition found that the final, expected 401 from a deleted
account was still emitted as a development-client error by the shared network
logger, even though the UI safely returned to onboarding. This QA-cycle change
logs handled 401 responses as informational; non-401 network failures remain
errors. `tsc --noEmit` passed, and a force-stop/cold start of that same deleted
QA account rendered onboarding with no fresh React Native, Firebase, Firestore,
or network error record. This closes the remaining invalid-session
observability gap.

### P1 — Full physical listing, media, availability, and deletion lifecycle

A fresh approved, disposable QA merchant completed the following flow on
physical Android `34962d85`: Post, Electronics, Drone, required About fields
and location, gallery-image selection, native crop/save, cover-image choice,
Review, and Post product. The active QA Metro log recorded two successful
presigned-media requests and `POST /api/my/products/` with HTTP 201. The My
Products screen rendered the new title and its image.

The published public QA listing returned its cover and one image, and both
media URLs returned HTTP 200. In Edit Unavailability, selecting a July date
and Update returned HTTP 200; a subsequent backend read confirmed the blocked
date persisted. Deleting through the physical UI returned My Products to its
`No products` state, and a scoped backend check confirmed the product was
gone. The disposable user and the device-local test image were then deleted;
follow-up checks confirmed neither the user, product, nor photo remained.

This is a pass for the one-image publish/upload/crop/cover, availability
update, and deletion path. Image count limits, upload failure recovery, and
representative fixture-media visual quality are still open.

### P2 — Android Back left an open profile sheet over a changed tab

On physical Android, opening Personal Details from Profile and pressing the
system Back button navigated the underlying tab to Home while leaving the
Personal Details sheet visible. A customer could recover by dragging the sheet
down, but the Back behavior was inconsistent and misleading.

`CustomBottomSheetModal` now consumes Android Back only while that sheet is
open and dismisses the active sheet. This shared correction also covers the
other screens that use the same wrapper. `tsc --noEmit` passed. Physical
retest opened Personal Details, pressed Android Back, and returned to the
unchanged Profile screen with the sheet dismissed. This P2 is closed.

### Profile image upload and persistence — physical QA pass

An isolated password-based QA user signed in through the physical email and
password UI, opened Profile, selected Upload, chose a gallery image, completed
the native crop action, and pressed Update Profile Picture. The QA Metro log
recorded successful presigned-upload, profile PATCH, and refreshed
`/users/me/` requests. The image relationship and file owner were persisted in
QA, and the public media URL returned HTTP 200. Returning to Profile rendered
the updated avatar. The test image was a white UI screenshot, so its thumbnail
is intentionally visually sparse; this was confirmed as image content rather
than a layout failure.

The QA user, image database records, device photo, and QA S3 object were
removed after the test. A force-stop/cold start then received the expected
deleted-user 401, cleared the session, and showed the unauthenticated Home
screen without a customer-facing error or Firebase/Firestore failure.

### P2 — Offline cold start surfaced a raw Axios category error

With Wi-Fi disabled on physical Android `34962d85`, a guest cold start reached
onboarding but emitted `Failed to fetch categories: AxiosError: Network Error`
as a development-client error. The category fetch is optional at this point;
the failure should leave categories empty until connectivity returns, not look
like an application crash.

The category caller now treats a no-response Axios error as offline and the
shared network logger records no-response transport failures informationally.
HTTP failures continue to log as errors. `tsc --noEmit` passed. The physical
Wi-Fi-off cold-start retest stayed usable on onboarding with no error,
exception, red overlay, or customer-facing failure text; Wi-Fi was restored
after the test. This P2 is closed.

### Support report and feedback — physical QA pass

A disposable password-based QA account signed in through the physical Android
email/password UI and submitted both Profile → Report a problem and Profile →
Feedback & review. Each form enabled its action only after text entry, returned
to Profile without an app error, and created the expected authenticated QA
`Feedback` record. The two records and disposable account were then deleted;
a cold start of the deleted session had no customer-facing failure.

### P1 — A new-listing one-day unavailability could publish an invalid end date

Selecting one day in the new-listing calendar stored an empty `endDate` in the
mobile draft. The UI displayed it as one day, but the post transformer formatted
that empty value as a date, which could submit an invalid timestamp.

The calendar now normalizes a single-day range to equal start and end dates;
the posting boundary also falls back to the start date for any older in-memory
draft. On physical Android `34962d85`, a disposable approved QA merchant
completed Post → gallery selection → native crop → cover selection → one-day
unavailability (July 25, 2026) → Review → Post product. The calendar displayed
`Jul 25, 2026 - Jul 25, 2026`; the listing published and appeared in My
Products with no app-originated error. QA persistence recorded one booking
whose start and end were both that day. The fixture was deleted through the
physical My Products delete flow, which returned to `No products`.

### P1 — QA image moderation was denied after every listing publish

The running QA web container logged `AccessDenied` for
`rekognition:DetectModerationLabels` after listing creation. Publishing still
returned `201`, but customer-upload moderation was not actually enforced.

The dedicated QA AWS identity now has the least-privilege
`rekognition:DetectModerationLabels` action in addition to its existing
QA-bucket-only S3 policy. IAM policy simulation returned `allowed`, and the
running QA web container successfully called Rekognition against a QA image
using its configured bucket and credentials. A fresh physical listing publish
is still required to close this flow end to end.

## 2026-07-22 independent release-candidate baseline

This baseline intentionally does not inherit the earlier checklist score. The
physical phone has the standalone `com.renit.app.qa` build installed and in
the foreground; it is distinct from the development client and its bundle
contains `qa-api.toratora.site`. The public endpoint returned HTTP 200 through
Cloudflare, all QA Compose services were healthy, and the QA Firebase project
was selected locally. The app reached the password screen without a startup
exception.

The independently evidenced confidence is **25%**: build/tunnel/API, guest
discovery and product detail, offline recovery, and the QA media-moderation
permission are verified, but authenticated device flows, chat/push, listing
lifecycle, profile/support, and release-package distribution still need
reproduction on this exact build.

### P3 — Welcome carousel used an incorrect contraction

The physical QA cold-start screen said “The chat feature let's you”. The
string now correctly says “lets you”. TypeScript passed, a fresh isolated QA
APK was installed on Android `34962d85`, and the corrected text rendered on a
cold start with no app-originated error.

### Guest QA smoke — physical release-candidate pass

On the isolated QA APK, Skip displayed the Android location prompt. Choosing
`Don't allow` reached Home with categories and empty discovery sections,
without an app-originated error. Electronics opened a stable `0 results`
search state. Saved, Post, Chat, and Profile each rendered their sign-in gate;
the public FAQ screen and Android Back navigation also rendered cleanly. This
is guest-only coverage and does not prove authenticated or data-bearing flows.

### P0 — Isolated QA APK could silently use the production API

The first `com.renit.app.qa` APK was native-isolated but its direct Gradle
bundle did not reliably inline `EXPO_PUBLIC_APP_ENV`; `config.ts` fell back to
production. An offline cold-start log exposed discovery requests targeting the
production host. The test was unauthenticated and offline, so no production
write or customer data change occurred.

The shared runtime resolver now identifies the installed QA Android
application ID as QA, with the Expo config value retained as an additional
fallback. A physical rebuilt APK made only QA-host requests during an offline
cold start; a following online cold start returned four QA API responses with
no app-originated error. This P0 is closed.

### P2 — Offline Home logged optional discovery failures as errors

Top Experiences, Popular Near You, and Recently Added each rethrew transport
failures and logged an error even though Home could safely show empty sections.
Their shared home fetcher now returns an empty result only for no-response
transport failures; HTTP errors still use the existing error path. The rebuilt
QA APK reached a usable Home screen offline with no error/exception/fatal log,
then completed an online QA cold start cleanly. This P2 is closed.

### P2 — Product-detail owner card reported the wrong product count

The physical Lenovo detail page said its owner had `0 products`, while the
owner profile and current product response both reported `2`. The backend
already returns `products_listed` and `avg_rating` at product level; the
client incorrectly read nonexistent nested owner fields and fell back to zero.

The card now uses those existing product fields. TypeScript passed, the
rebuilt APK rendered `2 products` on the same physical owner card, and the
related product, review, owner-profile, and guest chat/review gates had no
app-originated error. All available QA covers are uploaded UI screenshots, so
this validates media rendering but not representative product-photo quality.

### P1 — QA address search used a key from the wrong Google project

The isolated QA APK made Places autocomplete requests with a hard-coded key
that does not belong to any project accessible to the QA operator. Google
rejected it with `REQUEST_DENIED` and a billing message, even though
`renit-uat` billing is enabled. The UAT Firebase-generated keys are restricted
to Firebase APIs and cannot serve Places requests.

The Places API is now enabled only on `renit-uat`. A dedicated QA key is
restricted to that API and stored as a sensitive EAS `preview` environment
variable; no key value is committed. The QA runtime reads that value only for
the QA application, while the existing non-QA key is unchanged. A direct
Places request returned `OK` with predictions, TypeScript passed, and a fresh
isolated APK contained the QA runtime value. On physical Android, typing a
generic city produced selectable city-level suggestions and selecting one
updated the location picker without an app-originated error.

### P2 — Android autocomplete results were hidden by the keyboard

The picker placed its autocomplete field below the current-address and action
content. Android correctly resized the window for the keyboard, but there was
no remaining vertical space for the result list; a user had to dismiss the
keyboard before choosing a valid suggestion.

The existing search control now appears first in the picker panel and its
result list has a bounded height with normal scrolling. On physical Android,
typing a generic city showed multiple suggestions above the still-open
keyboard; selecting the first one immediately set the selected address and
left Confirm location available. Android logs contained no app-originated
error, Places failure, or billing warning. No listing was submitted and no
precise device address was published.

### Listing/media lifecycle — physical QA pass

On the standalone QA APK, an approved QA merchant completed Post → category
and details → generic address search → Android photo picker → native crop →
cover selection → review → publish. The test used a deliberately generated
QA-only image, never device-gallery content. The review and My Products card
both rendered the cropped cover correctly. QA returned `201 Created` for the
listing, a valid two-day availability update returned `200 OK` and persisted
after reopening the editor, and delete returned `204 No Content` followed by
the empty My Products state. Device logs had no app-originated error.

### P2 — required product description lacked a required-field cue

The listing form rejected an empty product description, but unlike its other
mandatory fields its label had no required marker. This made an apparently
complete form leave Next disabled. The label now uses the same red asterisk
as the other required fields. A rebuilt standalone QA APK physically rendered
`Product description *` while preserving the existing validation.

### P2 — calendar allowed past unavailability dates through its custom day UI

Although the calendar declared a minimum date, its custom day renderer still
made disabled historical days pressable. A customer could select a past day
and add it to a listing availability range. Both new-listing and edit
calendars now disable historical touches and retain an in-handler date guard.
On physical Android, tapping a past day left it disabled and left Add date log
disabled; no draft range was created and no app-originated error appeared.

### P1 — merchant profile-image updates failed after successful image upload

An approved legacy QA merchant with an empty business name could select and
crop a profile image, but the final authenticated profile PATCH returned 400:
`Business name is required for merchant accounts.` The image upload had
already completed, leaving the visible profile unchanged after a cold reload.

The backend now applies merchant-name validation to creates, full updates, and
PATCHes that change merchant identity; it does not reject unrelated PATCHes on
an existing legacy record. The regression test covers that shared serializer
boundary. After rebuilding the QA web container, the same physical Android
flow returned 200, device logs were clean, and the cropped QA-only image
persisted on Profile after a cold restart.

### P2 — Authenticated offline startup logged handled transport failures as errors

With Wi-Fi disabled on physical Android `34962d85`, a cold start of the
authenticated standalone QA APK rendered Home but logged duplicate raw Axios
errors while fetching the signed-in user's details and notifications. The
network client already classified no-response transport failures as
informational; three callers did not follow that contract.

The affected profile, global user-details, and notification callers now leave
their existing HTTP-error and 401 handling intact while treating no-response
Axios failures as the expected offline state. `tsc --noEmit` passed and a
fresh standalone QA APK was installed. A Wi-Fi-off force-stop/cold start
rendered the usable cached Home shell with empty discovery sections and zero
React Native or Android error-level records; Wi-Fi was restored, and Profile
then loaded with the authenticated avatar and no error-level record. This P2
is closed.

### P1 — Chat Details crashed in the standalone QA APK

Opening Chat Details from the physical Chat tab crashed the standalone QA APK
with `TypeError: undefined is not a function` in Reanimated's UI microtask
runtime. The same crash also prevented a notification tap from reaching the
conversation. A controlled Gradle clean rebuilt all native artifacts but did
not change the result; the runtime libraries were being initialized only by
downstream imports.

The application entry point now loads Gesture Handler first and Reanimated
immediately after it. A fresh standalone APK rebuilt successfully. On physical
Android, the exact QA conversation opened manually with its header, message,
and enabled composer visible; the process remained alive and the error-level
log was clean. This P1 is closed.

### P1 — Background chat push and notification tap — physical QA pass

The active QA merchant's Firebase user document contained a registered Android
Expo token and the high-importance `chat` notification channel was enabled.
A clearly labelled, disposable QA Firestore conversation and messages were
created through the QA backend's scoped Firebase credential while the app was
in the background. QA's `onNewMessage` Gen-2 Function recorded accepted Expo
push tickets, Android displayed the message notification, and tapping it
opened the matching Chat Details conversation with the expected messages and
composer. React Native and Android error-level logs were clean. All four test
messages and the conversation were then deleted.

The response listener was moved from the lazily mounted Chat tab to the
authenticated root navigator, so a notification can route even when Chat has
not yet been opened in the current session. Explicit force-stop and process
kill on this Android build clear the system notification card, so a true
cold-process tap remains an environment-specific follow-up rather than a
claimed pass.

### P3 — stale disposable QA listing appeared in guest discovery

An independent guest cold-start on physical Android `34962d85` showed the
old `QA E2E Chat Listing 20260722` fixture in Home. Its owner was the
disposable `qa-e2e-peer-20260722@qa.invalid` account, but its listing had
remained active after the earlier chat cleanup. The exact QA listing (database
id `4`) was archived through the existing model method; no customer or
production data was changed. The active-discovery query then excluded it, and
a force-stop/cold-start of the standalone QA APK confirmed it no longer
appeared. Android and React Native error-level logs were empty.

### P2 — guest My Products made protected requests behind the sign-in UI

As a guest, opening Profile → My products rendered the expected sign-in screen
but its focus hook still called the protected My Products endpoint. QA returned
two 401 responses, both logged as errors and therefore capable of producing a
development error overlay. The screen now returns before fetching unless the
shared authentication state is present. `tsc --noEmit` passed; a fresh
standalone QA APK was force-stopped, launched, and taken through the same
guest path. It rendered the sign-in screen with no React Native or Android
error-level log.

### P2 — reopening a chat duplicated its initial product card

`startChat` always added the product-card message after locating or creating a
conversation. Returning to the same listing and starting its existing chat
therefore duplicated the introductory card. The write now occurs only in the
new-conversation branch, shared by both product and user chat entry points.

Physical QA retest used two newly created, password-authenticated disposable
accounts and a disposable Mumbai listing. The renter started the chat; the
owner then received its unread conversation and opened the matching product
card without Firebase or Android errors. A separate fresh pair repeated the
same start action twice: Firestore contained exactly one conversation and one
initial message after both opens. All four accounts, both listings, matching
Firestore conversations/messages, and test device-token documents were
deleted after the checks. The ADB automation did not dispatch the composer
send control while the keyboard was open, so this cycle does not claim a fresh
typed-message send.

## Current independent confidence: 63%

The authenticated standalone-QA pass now covers password sign-in, profile,
real chat message send, push-token registration, generic address search, and
the complete create/update/delete listing lifecycle on this exact APK, in
addition to guest and discovery flows. It also covers merchant profile-image
upload, cold-reload persistence, and an authenticated offline/reconnect
cycle. It now includes actual background push delivery and warm-process
notification routing. It remains far from production approval: cold-process
notification routing, representative product-media quality and failure paths,
and remaining authenticated/session edge cases are not yet signed off. The
guest protected-request and duplicate-chat-card regressions are closed; the
two-point increase reflects the focused physical-device chat retest only.

## Superseded historical confidence: 80%

Current evidence supports 9/10 environment, 13/15 authentication/session,
13/15 discovery/detail, 15/20 chat, 15/20 listing/media, 8/10
profile/support, and 7/10 UX/resilience. This is not production approval.
The remaining release risks include background push delivery on a second
device, listing image-count and failure paths, support and merchant edge
paths, offline/slow-network recovery, representative media visual regression,
and a distributable release-package test.
