# Renit RN App Guidebook

Single guide for setting up, building, starting, debugging, and sharing this app on a new machine.

---

## 1. Scope

This repo is the React Native / Expo app.

Companion backend repo:

- `/home/yash/git/personal/rn-api/rn-api`

Important: this app can run in three runtime modes:

```text
+-------+--------------------------------------+--------------------------------------+
| Env   | API                                 | Use case                             |
+-------+--------------------------------------+--------------------------------------+
| DEV   | http://192.168.1.22:8000/api/       | local LAN debugging                  |
| QA    | https://rennit.toratora.site/api/   | internal tester APK / OTA updates    |
| PROD  | https://api.simplyrenit.com/api/    | production release                   |
+-------+--------------------------------------+--------------------------------------+
```

The env is selected through `EXPO_PUBLIC_APP_ENV` and mapped in `src/lib/config.ts`.

---

## 2. High-Level Flow

```text
                local machine
                     |
                     v
              npm install
                     |
                     v
        +--------------------------+
        | choose how to run app    |
        +--------------------------+
          |                |
          |                |
          v                v
   local dev client      cloud QA APK
   npm run android       npm run build:qa
          |                |
          v                v
   USB/emulator run     share install link
          |
          v
   npx expo start --dev-client
```

```text
JS/config-only change
    |
    +--> local debug: reload app
    |
    +--> QA testers: npm run update:qa -- --message "..."
    |
    +--> PROD users: npm run update:release -- --message "..."

Native/app.json/runtimeVersion change
    |
    +--> new build required
```

---

## 3. Prerequisites

### 3.1 Required on Any Machine

```text
+------------------+-----------------------------------------------------------+
| Tool             | Why it is needed                                          |
+------------------+-----------------------------------------------------------+
| Git              | clone/pull repo                                           |
| Node.js LTS      | install/run JS dependencies                               |
| npm              | package manager used by this repo                         |
| watchman         | recommended on macOS for Metro performance                |
| Expo account     | needed for EAS build/update flows                         |
+------------------+-----------------------------------------------------------+
```

Recommended baseline:

- Node.js 18 LTS is the safe default for this repo.
- Use `npm`, not `yarn`.

### 3.2 Android Prerequisites

```text
+----------------------+--------------------------------------------------------+
| Tool                 | Why it is needed                                       |
+----------------------+--------------------------------------------------------+
| Android Studio       | SDK, emulator, platform tools                          |
| Android SDK          | native Android build toolchain                         |
| JDK 17               | Gradle/Android build compatibility                     |
| adb                  | device detection and debugging                         |
+----------------------+--------------------------------------------------------+
```

You also need one of:

- Android emulator, or
- physical Android device with USB debugging enabled

### 3.3 iOS Prerequisites

Only if you want to run iOS locally:

```text
+----------------------+--------------------------------------------------------+
| Tool                 | Why it is needed                                       |
+----------------------+--------------------------------------------------------+
| macOS                | Xcode requires it                                      |
| Xcode                | iOS simulator/build chain                              |
| CocoaPods            | iOS native dependency install                          |
+----------------------+--------------------------------------------------------+
```

### 3.4 Backend Prerequisites

Needed only if you want full local app + backend development in `DEV`.

You need the backend repo running separately.

---

## 4. Fresh Machine Setup

### 4.1 Clone and Install

```bash
git clone <your-rn-app-repo-url>
cd rn-app
npm install
```

### 4.2 Verify Tooling

```bash
node -v
npm -v
npx expo --version
adb devices
```

If you use EAS:

```bash
npx eas-cli whoami
```

If not logged in:

```bash
npx eas-cli login
```

### 4.3 Android SDK Sanity

Confirm at least one device or emulator is visible:

```bash
adb devices
```

Expected shape:

```text
List of devices attached
emulator-5554   device
```

or

```text
List of devices attached
<phone-serial>  device
```

---

## 5. How to Start the Project

## 5.1 Fastest Local Android Debug Flow

Use this when you are actively developing features.

Step 1. Build/install the dev client once:

```bash
npm run android
```

Step 2. Start Metro for the dev client:

```bash
npx expo start --dev-client
```

Step 3. Open the app on the connected emulator/device.

Notes:

- `npm run android` maps to `expo run:android`.
- This uses native modules correctly.
- This is the correct path for Firebase, Google Sign-In, Maps, and other native dependencies.

## 5.2 Expo Go Flow

Use this only for very light UI testing.

```bash
npm start
```

Why this is limited:

- Expo Go will not fully represent this app because the project uses native modules.

## 5.3 iOS Local Run

On macOS only:

```bash
npm run ios
```

If pods are missing:

```bash
cd ios
pod install
cd ..
npm run ios
```

## 5.4 Start the Backend Locally for DEV Mode

Use this only when you need the app to hit your own local backend.

```bash
cd /home/yash/git/personal/rn-api/rn-api
docker compose up -d
```

Then verify:

```bash
curl http://localhost:8000/api/category/
```

Important:

- `DEV` currently points to `192.168.1.22:8000`.
- If your new machine has a different LAN IP, update `src/lib/config.ts`.

---

## 6. How to Build the Project

## 6.1 Local Native Android Build

```bash
npm run android
```

This is the best choice for day-to-day development.

## 6.2 QA APK Build Through EAS

Use this when you want a shareable tester APK.

```bash
npm run build:qa
```

Equivalent raw command:

```bash
npx eas-cli build --platform android --profile qa
```

## 6.3 Release OTA Update

Use this when the installed app already exists and only JS/config changed.

QA:

```bash
npm run update:qa -- --message "describe the change"
```

Release:

```bash
npm run update:release -- --message "describe the change"
```

## 6.4 When You Must Rebuild Instead of Updating

```text
+------------------------------------------------------+----------------------+
| Change                                               | New build required?  |
+------------------------------------------------------+----------------------+
| JS/TS screen logic                                   | No                   |
| API URL change in src/lib/config.ts                  | No                   |
| app.json change                                      | Yes                  |
| eas.json change                                      | Yes                  |
| Android/iOS native file change                       | Yes                  |
| runtimeVersion change                                | Yes                  |
| adding/removing native package                       | Yes                  |
+------------------------------------------------------+----------------------+
```

---

## 7. Runtime Env Model

Current EAS profiles:

```text
+--------------+------------------------+-------------------------------+
| Profile       | EXPO_PUBLIC_APP_ENV    | Purpose                       |
+--------------+------------------------+-------------------------------+
| development   | DEV                    | dev client / local debugging  |
| qa            | QA                     | internal tester APK           |
| release       | PROD                   | production release            |
+--------------+------------------------+-------------------------------+
```

Selection flow:

```text
eas profile
    |
    +--> sets EXPO_PUBLIC_APP_ENV
            |
            +--> src/lib/config.ts chooses API + WS URLs
                    |
                    +--> app talks to DEV / QA / PROD backend
```

Fallback behavior:

- debug builds fall back to `QA`
- release builds fall back to `PROD`

That means a debug build without explicit env will not automatically point to LAN `DEV`.

---

## 8. Debugging Playbook

## 8.1 Device Not Detected

Run:

```bash
adb devices
```

If no device appears:

1. Reconnect USB cable.
2. Re-enable USB debugging on phone.
3. Accept the RSA trust dialog on the device.
4. Restart adb:

```bash
adb kill-server
adb start-server
adb devices
```

## 8.2 Metro / Packager Issues

Run:

```bash
npx expo start --clear --dev-client
```

If still broken, reinstall dependencies:

```bash
rm -rf node_modules
npm install
```

## 8.3 Android Build Failures

Common first-pass cleanup:

```bash
cd android
./gradlew clean
cd ..
npm run android
```

If Java issues appear, verify:

```bash
java -version
```

Target expectation: JDK 17.

## 8.4 App Opens But API Calls Fail

Check four things in order:

```text
1. Which env is the app actually using?
2. Is that backend reachable from the device?
3. Is the URL in src/lib/config.ts correct?
4. Is this a REST issue or only a WebSocket issue?
```

Use the in-app diagnostics screen:

```text
Profile -> Network diagnostics
```

Capture:

- `APP_ENV`
- `SERVERURL`
- `SOCKET_URL`
- REST test result
- WS test result

## 8.5 DEV Build Works Only on Home Wi-Fi

This is expected if the app is using `DEV`.

Why:

- `DEV` points to a LAN IP (`192.168.1.22`)
- devices outside that network cannot reach it

Fix options:

1. move testers to `QA`
2. expose backend on a public dev/QA URL
3. change `DEV` mapping to the current machine LAN IP for local testing

## 8.6 OTA Update Published But Testers Do Not See It

Check:

```text
+---------------------------------+---------------------------------------------+
| Check                           | Why it matters                              |
+---------------------------------+---------------------------------------------+
| correct branch/channel          | update must match installed build channel   |
| correct runtimeVersion          | OTA applies only to same runtime            |
| app fully restarted             | downloaded bundle usually applies on relaunch |
| user has internet               | app checks updates on launch                |
+---------------------------------+---------------------------------------------+
```

Useful commands:

```bash
npx eas-cli build:list --platform android --limit 5 --json
npx eas-cli build:view <build-id> --json
```

## 8.7 Need Logs From Android Device

```bash
adb logcat | rg -i "ReactNative|Expo|AndroidRuntime|Renit"
```

## 8.8 Need To Verify Current App Config

Check:

- `app.json`
- `eas.json`
- `src/lib/config.ts`

These are the three main sources for:

- runtime version
- build profile env
- backend base URLs

---

## 9. Common FAQs

### Q1. Does EAS build from local code or from GitHub?

From your local machine at command time.

That means:

- uncommitted local changes are included in the build/update upload
- GitHub is not the build source unless you use a separate CI pipeline

### Q2. Do testers need developer mode enabled?

No for QA/release APKs.

They only need:

- the installed APK
- internet access
- app restart to receive OTA updates

Developer mode is only relevant for dev-client debugging workflows.

### Q3. If I change only URLs in `src/lib/config.ts`, do I need a new APK?

No, not if the installed app runtime stays the same.

Use OTA update:

```bash
npm run update:qa -- --message "update backend URLs"
```

### Q4. If I change `app.json` or `runtimeVersion`, do I need a new build?

Yes.

Those are native/runtime-affecting changes.

### Q5. Why should I prefer `npm` over `yarn` here?

Because this repo is already standardized on `package-lock.json`.

Using both lockfiles creates dependency drift and harder debugging.

### Q6. Why is Expo Go not enough for this project?

Because the app uses native modules such as:

- Firebase
- Google Sign-In
- Maps
- Notifications

Use dev client or EAS builds instead.

### Q7. Why do remote testers fail in DEV but succeed in QA?

Because `DEV` points to a private LAN address and `QA` points to a public HTTPS/WSS backend.

---

## 10. Recommended Daily Workflow

For app development:

```text
1. git pull
2. npm install          (only if dependencies changed)
3. npm run android      (if native app not installed yet)
4. npx expo start --dev-client
5. develop + debug
```

For tester rollout:

```text
JS-only change
    -> npm run update:qa -- --message "..."

Native/runtime change
    -> npm run build:qa
    -> share new APK link
```

---

## 11. Relevant Files

```text
+----------------------------------------------------+--------------------------------------+
| File                                               | Why it matters                       |
+----------------------------------------------------+--------------------------------------+
| package.json                                       | run scripts                          |
| eas.json                                           | build profiles and channels          |
| app.json                                           | Expo config and runtimeVersion       |
| src/lib/config.ts                                  | backend URL source of truth          |
| docs/expo-runbook.md                               | EAS build/update runbook             |
| docs/running-on-android.md                         | Android-specific quick notes         |
+----------------------------------------------------+--------------------------------------+
```

