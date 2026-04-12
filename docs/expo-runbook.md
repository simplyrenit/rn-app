# Expo Build + OTA Runbook

Single reference for current Expo/EAS setup in this repo.

---

## 1. Current Strategy

We use a build-once/update-many flow for testers:

1. Build and install one QA APK.
2. Push JS/config changes with `eas update` (no new APK every time).
3. Rebuild only when native/runtime changes are made.

Runtime API/WS config is selected by `EXPO_PUBLIC_APP_ENV` in `src/lib/config.ts`.

| Env | API base URL | WS base URL | Typical usage |
|---|---|---|---|
| `DEV` | `http://192.168.1.22:8000/api/` | `ws://192.168.1.22:8000/ws/chat/` | local LAN debugging |
| `QA` | `https://rennit.toratora.site/api/` | `wss://rennit.toratora.site/ws/chat/` | internal QA testing |
| `PROD` | `https://api.simplyrenit.com/api/` | `wss://api.simplyrenit.com/ws/chat/` | production release |

---

## 2. Release Architecture (ASCII)

```text
                    (one-time install per runtime)
Developer -- eas build --profile qa --> EAS Build --> APK link --> QA installs app
   |
   | (frequent JS/config updates)
   +-- npm run update:qa -- --message "..." --> branch=qa, channel=qa
   |                                             |
   |                                             +--> app checks update on launch
   |                                                  downloads bundle
   |                                                  applies on next restart
   |
   +-- npm run update:release -- --message "..." --> branch=release, channel=release
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
| `app.json` | Expo config (`owner`, `runtimeVersion`, `updates.url`, app metadata). |
| `eas.json` | Build profiles/channels: `development`, `qa`, `release`. |
| `package.json` | OTA/build scripts: `update:development`, `update:qa`, `build:qa`, `update:release`. |
| `src/lib/config.ts` | Single source of truth for DEV/QA/PROD API + WS runtime config. |
| `ios/Renit/Supporting/Expo.plist` | iOS expo-updates (`EXUpdatesURL`, `EXUpdatesRuntimeVersion`, enabled flag). |
| `ios/Renit/Info.plist` | iOS runtime app settings and ATS config. |
| `android/app/src/main/res/xml/network_security_config.xml` | Android network security trust config. |
| `src/screens/profileScreens/network-diagnostics.tsx` | In-app diagnostics (current env/URLs + REST/WS checks). |

---

## 4. Key Config Snapshot

| Setting | Current value |
|---|---|
| Expo project ID | `d9ee200a-0c82-4db8-bb21-95c3b225ba4a` |
| Update URL | `https://u.expo.dev/d9ee200a-0c82-4db8-bb21-95c3b225ba4a` |
| Runtime version | `1.0.2` |
| Build profiles | `development`, `qa`, `release` |
| Update branches/channels | `development`, `qa`, `release` |
| Fallback env in debug (`__DEV__`) | `QA` |
| Fallback env in release build | `PROD` |
| iOS update check | `EXUpdatesCheckOnLaunch=ALWAYS` |

---

## 5. Command Runbook

### 5.1 Auth check

```bash
npx eas-cli whoami
```

### 5.2 Build QA APK (tester install / native change)

```bash
npm run build:qa
```

Equivalent:

```bash
npx eas-cli build --platform android --profile qa
```

### 5.3 Publish OTA update for QA

```bash
npm run update:qa -- --message "your update message"
```

Equivalent:

```bash
EXPO_PUBLIC_APP_ENV=QA npx eas-cli update --branch qa --message "your update message"
```

### 5.4 Publish OTA update for release

```bash
npm run update:release -- --message "your update message"
```

Equivalent:

```bash
EXPO_PUBLIC_APP_ENV=PROD npx eas-cli update --branch release --message "your update message"
```

### 5.5 Optional dev-client OTA updates

```bash
npm run update:development -- --message "your update message"
```

### 5.6 Check build status / artifact

```bash
npx eas-cli build:list --platform android --limit 5 --json
npx eas-cli build:view <build-id> --json
```

---

## 6. Build vs Update Decision Table

| Change type | OTA only | New build needed |
|---|---:|---:|
| JS/TS logic, UI, request paths in JS config | Yes | No |
| `src/lib/config.ts` URL changes only | Yes | No |
| `app.json`, `eas.json`, native iOS/Android file changes | No | Yes |
| `runtimeVersion` change | No | Yes |
| Add/remove native modules or plugins | No | Yes |

Rule: if native files changed, build again.

---

## 7. QA Update Pull Steps

1. Keep QA build installed.
2. Close app fully.
3. Reopen app with internet.
4. Restart once more if needed to apply downloaded bundle.

---

## 8. Diagnostics Workflow

Open:

`Profile -> Network diagnostics`

Collect and share:

- `APP_ENV`
- `SERVERURL`
- `SOCKET_URL`
- `Test REST` result
- `Test WS` result

Use this to separate config mismatch vs REST reachability vs WS issues.

---

## 9. Operational Notes

- EAS build/update uploads from local workspace at command time (not automatically from GitHub).
- `DEV` URLs use LAN IP and work only when tester and backend are reachable on that network.
- OTA updates are runtime-version scoped; older runtime installs do not receive mismatched updates.
