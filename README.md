# Renit mobile app

Renit is an Expo/React Native rental marketplace. This repository contains the mobile app and Firebase Cloud Functions; the REST/WebSocket backend is maintained separately.

## Start locally

### 1. Install prerequisites

- Node.js 20 LTS (and npm)
- Android Studio, Android SDK, and an Android emulator **or** an Android device with USB debugging enabled
- The companion backend running on port `8000` if you need local API data

### 2. Install dependencies

```bash
npm install
```

If PowerShell blocks `npm.ps1` on Windows, use `npm.cmd` in place of `npm`.

### 3. Build and run Android

The app uses native modules, so use an Expo development build rather than Expo Go:

```bash
npm run android
```

For later sessions, start Metro and open the already-installed development build:

```bash
npm start -- --dev-client
```

## Local backend

Enable the local API explicitly and choose the host reachable by the app:

```powershell
# Android device connected by USB
adb reverse tcp:8000 tcp:8000
$env:EXPO_PUBLIC_USE_LOCAL_API = "true"
$env:EXPO_PUBLIC_LOCAL_API_HOST = "127.0.0.1:8000"
npm start -- --dev-client
```

For an Android Studio emulator, use `10.0.2.2:8000` instead. See [local development details](docs/local-development.md) for iOS, troubleshooting, Firebase Functions, and build commands.

## Project map

- `src/screens/` - application screens
- `src/components/` - shared and feature UI
- `src/backend/` - API hooks and requests
- `src/context/` - application state contexts
- `src/navigation/nav.tsx` - navigation setup
- `src/lib/config.ts` - API, WebSocket, Firebase, and runtime configuration
- `functions/` - Firebase Cloud Functions project

## Commands

```bash
npm start                 # Expo/Metro server
npm run android           # native Android development build
npm run ios               # native iOS development build (macOS only)
npm run web               # Expo web server (limited native-module support)
npm test                  # Jest in watch mode
npm run build:qa          # EAS Android QA APK
```

## Documentation

- [Environment guide](docs/environments.md)
- [Local development](docs/local-development.md)
- [Beta launch guide](docs/beta-launch-guide.md)
- [QA strategy](docs/qa-e2e-strategy.md)
