# Renit mobile app

Renit is an Expo/React Native rental marketplace. This repository contains the
mobile app and its Firebase Cloud Functions; the REST backend is maintained
separately.

## Start locally

The standard workflow runs against the shared **QA backend**
(`https://qa-api.toratora.site`). You do not need a local backend.

1. Install Node.js 20 LTS, then install dependencies:

   ```bash
   npm install
   ```

2. Copy the QA environment template. The real file is git-ignored; never commit
   keys or QA account credentials.

   ```bash
   cp config/environments/qa.env.example config/environments/qa.env
   ```

3. Build and install a native development client. The app uses native modules,
   so Expo Go does not work:

   ```bash
   npm run ios       # macOS + Xcode
   npm run android   # Android Studio or a USB-debuggable device
   ```

4. For later sessions, start the QA-configured Metro server and open the
   installed development client:

   ```bash
   npm run start:qa -- --clear --lan
   ```

Connecting a physical iPhone, working against a local backend, Firebase
Functions, builds and troubleshooting are all in
[`docs/local-development.md`](docs/local-development.md).

## Commands

```bash
npm start                 # Expo/Metro server
npm run start:qa          # QA-configured Metro server for a development client
npm run android           # native Android development build
npm run ios               # native iOS development build (macOS only)
npm run web               # Expo web server (limited native-module support)
npm test                  # Jest in watch mode
npm run build:qa          # EAS Android QA APK
npx tsc --noEmit          # type-check (there is no linter)
```

## Project map

- `src/screens/` — application screens
- `src/components/` — shared and feature UI
- `src/backend/` — API hooks and requests
- `src/context/` — application state contexts
- `src/navigation/nav.tsx` — navigation setup
- `src/lib/config.ts` — API, Firebase and runtime configuration
- `functions/` — Firebase Cloud Functions project

## Documentation

- [`AGENTS.md`](AGENTS.md) — architecture, conventions and the agent contract
  (`CLAUDE.md` imports it)
- [`docs/local-development.md`](docs/local-development.md) — environments, running
  the app, iPhone QA, builds, troubleshooting
- [`docs/qa-e2e-strategy.md`](docs/qa-e2e-strategy.md) — how QA flows are run and
  classified
- [`docs/qa-production-revalidation.md`](docs/qa-production-revalidation.md) —
  release-readiness baseline and blockers
- [`docs/beta-launch-guide.md`](docs/beta-launch-guide.md) — getting builds to
  beta testers
- [`docs/known-issues.md`](docs/known-issues.md) — diagnosed recurring failures
  and testing gotchas
