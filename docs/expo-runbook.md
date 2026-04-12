# Expo Build + OTA Runbook

This document is the single reference for how Expo/EAS is configured in this repo and how to release updates.

---

## 1. Current Strategy

We use a **build once, update many times** model:

1. Build and install one Android tester APK.
2. Push JS/config changes using `eas update` (no new APK each time).
3. Rebuild APK only when native/runtime changes are introduced.

Current backend endpoints used by app runtime:

- API: `https://rennit.toratora.site/api/`
- WebSocket: `wss://rennit.toratora.site/ws/chat/`

---

## 2. Release Architecture (ASCII)

```text
                   (one-time install)
Developer ──eas build (preview APK)──> EAS Build ──> APK link ──> QA installs app
    │
    │ (frequent JS/config changes)
    └──eas update (preview branch)──> EAS Update channel=preview
                                        │
                                        └── App launch checks for update
                                            (runtimeVersion must match)
                                            └── downloads OTA bundle
                                                └── applies on next reload/restart
```

```text
Runtime compatibility gate:
if app.runtimeVersion == update.runtimeVersion
    update is applied
else
    update is ignored (new native build required)
```

---

## 3. Relevant Files

| File | Purpose |
|---|---|
| `app.json` | Expo app config, owner, `runtimeVersion`, and `updates.url`. |
| `eas.json` | EAS build profiles (`preview`, `production`, etc.), channels, and profile env vars. |
| `package.json` | Short commands for OTA update publishing (`update:preview`, `update:production`). |
| `src/lib/config.ts` | App runtime API + WS base URLs (currently toratora for all envs). |
| `android/app/src/main/AndroidManifest.xml` | Android expo-updates metadata (`EXPO_UPDATE_URL`, launch policy, runtime ref). |
| `ios/Renit/Supporting/Expo.plist` | iOS expo-updates settings (`EXUpdatesURL`, `EXUpdatesRuntimeVersion`). |
| `android/app/src/main/res/xml/network_security_config.xml` | Android network domain trust config. |
| `ios/Renit/Info.plist` | iOS ATS exception domain entries. |
| `src/screens/profileScreens/network-diagnostics.tsx` | In-app diagnostics for active URLs + REST/WS health tests. |
| `src/components/profile/post-auth/profile-post-auth.tsx` | Profile menu entry to open diagnostics screen. |
| `src/navigation/nav.tsx` | Route registration for `NetworkDiagnostics`. |

---

## 4. Key Config Snapshot

| Setting | Current value |
|---|---|
| Expo project ID | `d9ee200a-0c82-4db8-bb21-95c3b225ba4a` |
| Update URL | `https://u.expo.dev/d9ee200a-0c82-4db8-bb21-95c3b225ba4a` |
| Runtime version | `1.0.2` |
| Preview channel | `preview` |
| Preview Android output | `apk` |
| `EXPO_PUBLIC_APP_ENV` (preview profile) | `QA` |
| `EXPO_PUBLIC_API_BASE_URL` | `https://rennit.toratora.site/api/` |
| `EXPO_PUBLIC_WS_BASE_URL` | `wss://rennit.toratora.site/ws/chat/` |

---

## 5. Command Runbook

### 5.1 Auth / sanity

```bash
npx eas-cli whoami
```

### 5.2 Build new QA APK (one-time install or native changes)

```bash
npx eas-cli build --platform android --profile preview
```

### 5.3 Publish OTA update to QA testers (no APK rebuild)

```bash
npm run update:preview -- --message "your update message"
```

Equivalent raw command:

```bash
EXPO_PUBLIC_APP_ENV=QA \
EXPO_PUBLIC_API_BASE_URL=https://rennit.toratora.site/api/ \
EXPO_PUBLIC_WS_BASE_URL=wss://rennit.toratora.site/ws/chat/ \
npx eas-cli update --branch preview --message "your update message"
```

### 5.4 Publish OTA update to production branch

```bash
npm run update:production -- --message "your update message"
```

### 5.5 Check build status / fetch artifact

```bash
npx eas-cli build:list --platform android --limit 5 --json
npx eas-cli build:view <build-id> --json
```

---

## 6. Build vs Update Decision Table

| Change type | OTA update only? | New APK build needed? |
|---|---:|---:|
| JS/TS logic, UI, API paths in JS config | Yes | No |
| Feature flags/env values read in JS bundle | Yes | No |
| Expo config/plugin/native Android/iOS files | No | Yes |
| `runtimeVersion` change | No | Yes |
| Native module add/remove, SDK-level native changes | No | Yes |

Rule: if unsure and native touched, do a new build.

---

## 7. How QA Should Pull an OTA Update

1. Keep the tester app installed (preview build).
2. Fully close app.
3. Reopen app on internet.
4. Launch again if needed to ensure the new bundle is applied.

Because updates check is `ALWAYS` with wait `0`, the app checks each launch but applies downloaded update on restart/reload.

---

## 8. Diagnostics Workflow (QA)

Open in app:

`Profile -> Network diagnostics`

Capture and share:

- `APP_ENV`
- `SERVERURL`
- `SOCKET_URL`
- `Test REST` result
- `Test WS` result

Use this to separate:

- wrong runtime config vs
- REST connectivity issue vs
- WebSocket-only issue.

---

## 9. Important Operational Notes

- EAS build/update uploads from the **local machine workspace at command time**, not automatically from GitHub.
- Keep `runtimeVersion` aligned with native app release cycle. OTA updates are runtime-version scoped.
- If testers are on very old build runtime, publish will succeed but update will not apply to that installed app.

