# Local development

This is the reference for running the Renit mobile app on a development machine.

## Prerequisites

- Node.js 20 LTS and npm
- Android Studio with an emulator, or a USB-debuggable Android device
- For iOS: macOS, Xcode, and CocoaPods
- The separate Renit backend if you want to exercise local API and chat flows

Run `npm install` from the repository root after cloning or changing dependencies.
If PowerShell blocks `npm.ps1` on Windows, use `npm.cmd` in place of `npm`.

## Run the app

Renit includes native Firebase, maps, and sign-in packages. Expo Go is therefore not the normal development path.

Build and install a development client:

```bash
npm run android
```

On macOS, use `npm run ios` instead. Once the development client is installed, use this faster loop:

```bash
npm start -- --dev-client
```

Choose the running Android emulator/device from the Expo terminal. If no device is detected, confirm it with `adb devices` and start an emulator from Android Studio.

## Connect to the local backend

The app resolves its API and chat URLs in `src/lib/config.ts`. Set these variables before starting Metro:

| Target | `EXPO_PUBLIC_LOCAL_API_HOST` |
| --- | --- |
| USB Android device, with `adb reverse tcp:8000 tcp:8000` | `127.0.0.1:8000` |
| Android Studio emulator | `10.0.2.2:8000` |
| Another device on the same LAN | `<your-computer-LAN-IP>:8000` |

PowerShell example for a USB device:

```powershell
adb reverse tcp:8000 tcp:8000
$env:EXPO_PUBLIC_USE_LOCAL_API = "true"
$env:EXPO_PUBLIC_LOCAL_API_HOST = "127.0.0.1:8000"
npm start -- --dev-client
```

`EXPO_PUBLIC_USE_LOCAL_API=true` is required to opt into local URLs. Without it, the app uses the production API by default. Restart Metro after changing any `EXPO_PUBLIC_*` value.

## Firebase Functions

The `functions/` directory is its own Node.js project. Install and run it separately when working on Firebase Functions:

```bash
cd functions
npm install
npm run serve
```

## Troubleshooting

- **App cannot reach a local backend:** confirm the backend listens on port 8000 and use the correct host from the table above. For a physical USB device, run `adb reverse` again after reconnecting it.
- **Native module / Firebase error:** rebuild the development client with `npm run android`; Expo Go does not include this app's native dependencies.
- **Android build fails:** open Android Studio once to install the required SDK components, accept licenses with `sdkmanager --licenses`, then retry.
- **Need remote services instead:** unset `EXPO_PUBLIC_USE_LOCAL_API` and restart Metro.

## QA build

Create the configured Android QA APK with:

```bash
npm run build:qa
```

This requires access to the project's Expo/EAS account.
