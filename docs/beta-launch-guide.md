# Beta Launch Guide

App-side steps to get Renit builds to beta testers: runtime configuration, EAS
builds, distribution, and a pre-launch checklist.

> **Backend and infrastructure are out of scope here.** The backend (Docker
> services, database, Cloudflare Tunnel, AWS/S3) lives in its own repository.
> The shared QA deployment is `https://qa-api.toratora.site`; use that
> repository's `docs/ubuntu-qa-deployment.md` for its runbook. Production
> hostnames below are planning values, not QA configuration.
>
> **Approval gates apply.** Creating an EAS build, uploading to App Store
> Connect, assigning testers, and releasing to production each need explicit
> approval (see the human approval gates in `AGENTS.md`). The local Xcode/
> TestFlight route (`renit-local-testflight-release` skill) does not use EAS.

## 1. Prerequisites

- [ ] Apple Developer account, required for iOS TestFlight
- [ ] Google Play Console account, required for Play distribution
- [ ] Expo account with access to the project's EAS
- [ ] Firebase project configured (auth, firestore, storage)
- [ ] A reachable backend for the environment you are building against

## 2. Runtime configuration

URL selection in `src/lib/config.ts` is driven by `EXPO_PUBLIC_APP_ENV`, set per
EAS build profile in `eas.json`:

| Value | API |
| --- | --- |
| `DEV` | Local backend (LAN), for local debugging only |
| `QA` | `https://qa-api.toratora.site/api/` |
| `PROD` | `https://api.simplyrenit.com/api/` |

Before building, check these against the real files rather than a copy in this
guide:

- `app.json` / `app.config.js`: name, slug, `version`, `runtimeVersion`, iOS
  `bundleIdentifier` and `buildNumber`, Android `package` and `versionCode`.
  `app.config.js` switches the app to "Renit QA" and the `com.renit.app.qa`
  package when `EXPO_PUBLIC_APP_ENV=QA`.
- `eas.json`: profiles `development`, `qa`, `testflight-qa` and `release`. The
  QA host must match `config/environments/qa.env.example`.
- `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are
  present for the target environment.

Sensitive keys go in EAS secrets, never in `EXPO_PUBLIC_*` values (those are
embedded in the bundle):

```bash
eas secret:create --name GOOGLE_MAP_API_KEY --value "<your-key>"
```

## 3. Build with EAS

```bash
eas build --platform android --profile qa       # QA APK, shareable directly
eas build --platform ios --profile release      # iOS build for TestFlight
eas submit --platform ios                       # submit the iOS build to TestFlight
```

## 4. Distribute to beta testers

**Android**

- *Direct APK:* share the APK download link from EAS with testers.
- *Google Play Internal Testing:* in Play Console > Internal Testing, upload an
  AAB (set `buildType: app-bundle` on the `release` profile for Play uploads),
  add tester emails, and share the opt-in link.

**iOS**

1. In App Store Connect > TestFlight, wait for the build to finish processing.
2. Add internal testers (up to 25) or external testers (up to 10,000).
3. Testers install through the TestFlight app.

## 5. Post-launch monitoring

- **Error tracking:** Sentry is recommended (`npx expo install @sentry/react-native`).
- **Uptime:** point a monitor (UptimeRobot, Better Uptime) at the API base URL.
- **Backend logs and tunnel health:** see the backend repository's runbook.

## 6. Pre-launch checklist

### Security

- [ ] No secrets hardcoded in source or in `EXPO_PUBLIC_*` values
- [ ] HTTPS working on the API domain
- [ ] Firebase security rules reviewed (`firestore.rules`) and deployed only
      with approval
- [ ] Any AWS or API credentials that were shared or exposed have been rotated

### App

- [ ] `EXPO_PUBLIC_APP_ENV` mapping verified in `src/lib/config.ts` for DEV/QA/PROD
- [ ] `app.json` has the correct bundle identifiers and version
- [ ] `eas.json` has the development, qa, testflight-qa and release profiles
- [ ] Google services files present for each platform
- [ ] Push notifications configured (FCM + APNs)
- [ ] Android APK built and tested
- [ ] iOS build submitted to TestFlight

### Functional (before sharing with users)

- [ ] Registration and login
- [ ] Google Sign-In
- [ ] Product posting with images
- [ ] Product browsing and search
- [ ] Chat / messaging (Firestore-backed)
- [ ] Push notifications received
- [ ] Favorites / saved products
- [ ] Profile editing
- [ ] Location and maps
