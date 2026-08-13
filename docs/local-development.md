# Local development

This is the reference for running the Renit mobile app on a development machine.

## Prerequisites

- Node.js 20 LTS and npm
- Android Studio with an emulator, or a USB-debuggable Android device
- For iOS: macOS, Xcode, and CocoaPods
- The QA backend is used for the standard device workflow; do not start a
  local backend unless that work is explicitly required.

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

## Run QA on a connected iPhone

This is the standard local iPhone workflow. It runs the JavaScript bundle from
Metro and sends every API and chat request to the shared QA backend; it does
not require a local backend.

### One-time setup

1. Install JavaScript dependencies and iOS pods:

   ```bash
   npm install
   cd ios && pod install && cd ..
   ```

2. Copy the QA template. The local file is ignored by Git. Add a restricted QA
   Maps key only when you need a Maps or Places flow; do not commit keys or QA
   account credentials.

   ```bash
   cp config/environments/qa.env.example config/environments/qa.env
   ```

3. Connect and unlock the iPhone. Accept the Mac trust prompt on the phone if
   shown. In Xcode, sign in with an Apple ID, select a valid development team,
   and use a bundle identifier that the selected team can provision.

4. Open **`ios/Renit.xcworkspace`**, not `ios/Renit.xcodeproj`. In Xcode,
   select the `Renit` scheme, the connected iPhone, and the Debug
   configuration, then choose **Product > Run**. The first build installs the
   development client on the phone.

   Xcode may require manual approval for Apple account sign-in, device trust,
   Developer Mode, provisioning, OAuth, or iOS permissions. Those are normal
   system gates and must be completed by the device owner.

### Daily run loop

Keep the phone and Mac on the same Wi-Fi network. In one terminal, start the
QA-configured development server:

```bash
npm run start:qa -- --clear --lan
```

Open the installed Renit development client on the iPhone, then reload it if
needed. `--lan` lets the phone reach Metro; a USB cable alone does not make a
Mac `localhost` server available to iOS.

The QA endpoint for this local workflow is
`https://qa-api.toratora.site/api/`. To make a quick read-only availability
check:

```bash
curl -fsS https://qa-api.toratora.site/api/category/ > /dev/null
```

Debug builds without an explicit environment now default to QA. Local API use
is still explicit: set `EXPO_PUBLIC_APP_ENV=DEV` and
`EXPO_PUBLIC_USE_LOCAL_API=true` only for a deliberate local-backend task.

### Optional command-line build and launch

Use Xcode for signing or when you prefer a visual device picker. For a
repeatable command-line build after signing is configured:

```bash
xcrun devicectl list devices
xcodebuild -workspace ios/Renit.xcworkspace -scheme Renit -configuration Debug \
  -destination 'id=<iphone-identifier>' \
  -derivedDataPath /private/tmp/renit-ios-build build
xcrun devicectl device install app --device <iphone-identifier> \
  /private/tmp/renit-ios-build/Build/Products/Debug-iphoneos/SimplyRenit.app
xcrun devicectl device process launch --device <iphone-identifier> \
  <your-debug-bundle-identifier>
```

`xcrun devicectl list devices` must show the phone as available. If it does
not, unlock and reconnect it, then reopen Xcode's **Devices and Simulators**
window before retrying.

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

`EXPO_PUBLIC_USE_LOCAL_API=true` is required to opt into local URLs. Without
it, Debug development sessions use QA by default. Restart Metro after changing
any `EXPO_PUBLIC_*` value.

## Firebase Functions

The `functions/` directory is its own Node.js project. Install and run it separately when working on Firebase Functions:

```bash
cd functions
npm install
npm run serve
```

## Troubleshooting

- **App cannot reach a local backend:** confirm the backend listens on port 8000 and use the correct host from the table above. For a physical USB device, run `adb reverse` again after reconnecting it.
- **iPhone cannot find Metro:** make sure `npm run start:qa -- --lan` is still
  running, the phone is on the same Wi-Fi network, and no older Metro server is
  listening on port 8081. Reload the Renit development client after restarting
  Metro.
- **iPhone is unavailable in Xcode/devicectl:** unlock the phone, reconnect its
  cable, accept trust prompts, and wait for it to show as available in Xcode's
  **Devices and Simulators** window.
- **Signing or provisioning fails:** choose the correct development team and a
  unique bundle identifier in the `Renit` target's **Signing & Capabilities**.
  Apple account, agreement, and Developer Mode prompts require the device or
  account owner to complete them.
- **Native module / Firebase error:** rebuild the development client with `npm run android`; Expo Go does not include this app's native dependencies.
- **Android build fails:** open Android Studio once to install the required SDK components, accept licenses with `sdkmanager --licenses`, then retry.
- **Need remote services instead:** unset `EXPO_PUBLIC_USE_LOCAL_API` and restart Metro.

## QA build

Create the configured Android QA APK with:

```bash
npm run build:qa
```

This requires access to the project's Expo/EAS account.

The local iPhone QA workflow above is separate from an EAS-distributed build.
Before creating an EAS QA build, reconcile and verify the QA host in `eas.json`
with `config/environments/qa.env.example`; they currently differ.
