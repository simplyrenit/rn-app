# Renit app environments

The mobile app has three explicit runtime environments. Only `EXPO_PUBLIC_*`
values belong here; they are embedded in the app bundle and must never contain
secrets.

| Environment | API | Intended use |
| --- | --- | --- |
| Dev | Local backend | Developer emulator or device testing |
| QA | `https://qa-api.simplyrenit.com` | Internal QA builds and manual regression testing |
| Prod | `https://api.simplyrenit.com` | Customer release builds |

## Run a local Dev build

Copy the template once, then adjust `EXPO_PUBLIC_LOCAL_API_HOST` only when
using a physical device. Android emulators use `10.0.2.2:8000`; physical
devices must use the LAN IP of the machine running the API.

```powershell
Copy-Item config/environments/dev.env.example config/environments/dev.env
node --env-file=config/environments/dev.env ./node_modules/expo/bin/cli start --clear
```

To build and install on Android with the same settings:

```powershell
node --env-file=config/environments/dev.env ./node_modules/expo/bin/cli run:android
```

## Run against QA

QA is the shared Ubuntu deployment. Start Metro with the QA file to test a
development client against it:

```powershell
Copy-Item config/environments/qa.env.example config/environments/qa.env
node --env-file=config/environments/qa.env ./node_modules/expo/bin/cli start --clear
```

Create an installable QA APK with the environment locked into the build:

```powershell
npx eas-cli build --platform android --profile qa
```

## Build production

Production settings are only for release verification and customer builds.
Do not point a QA build at production by changing its runtime environment.

```powershell
npx eas-cli build --platform android --profile release
```

The EAS profiles in `eas.json` are the source of truth for cloud builds.
The files in `config/environments/` make the same settings reproducible for
local Metro sessions. Restart Metro after changing any environment file.
