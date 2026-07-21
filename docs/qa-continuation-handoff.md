# Renit QA Continuation Handoff

## Current State

We are running a long-lived, todo-by-todo mobile QA cycle for Renit (Expo React Native frontend plus Django backend). The required loop for every todo is:

1. Test on the physical Android device.
2. Inspect app logs and note divergences.
3. Fix issues using best engineering judgment.
4. Review the fix and immediately resolve any P0/P1/P2 issue.
5. Dry run the code.
6. Retest on device.
7. Stage and commit only that todo's changes, then continue to the next todo.

The complete checklist is [qa-e2e-strategy.md](./qa-e2e-strategy.md).

## Completed Commits

Frontend repository: `C:\Users\yasht\git\rn-app`

- `f4368ca Fix search flow bootstrap and handoff` (Flow 7)
- `26c3b89 Fix Android favorites delete flow` (Flow 8)
- `ac1dc4d Stabilize favorites and discovery QA flows`

Backend repository: `C:\Users\yasht\git\rn-api`

- `c6aa64c Harden search endpoint fallbacks` (Flow 7)
- `4112b05 Fix favorites delete response contract`
- `b4b0433 Improve local development logging`

## Todo In Progress: Flow 9

Flow 9 is "Product detail and owner trust flow."

Already found and fixed, but not yet committed:

- `expo-image` warned that `resizeMode` is deprecated. The frontend now uses `contentFit="fill"` in `src/components/product/product-image.tsx`.
- A listing owner could open the review flow and potentially review their own product. The frontend hides/blocks the self-review entry points in:
  - `src/screens/products/reviews-screen.tsx`
  - `src/screens/products/write-review.tsx`
- The backend rejects self-reviews in both review creation paths in `src/review/views.py`.
- Regression tests were added in `src/review/tests.py`.

Backend verification already passed:

```powershell
docker exec rn-api-web-1 sh -lc "cd /code/src && python manage.py test review.tests.ReviewTrustBoundaryTests --verbosity 1"
```

Known passing results include owner rejection through both endpoints and successful non-owner review creation.

Remaining Flow 9 retest work:

- Open a product detail on device and verify cover image/gallery behavior.
- Navigate to About Owner / owner profile / owner product list / owner reviews surfaces.
- Log in again on the device, then verify a self-owned product has no usable "Write review" CTA and the toast guard works if reached indirectly.
- Capture logs for app-originated warnings/errors. The prior `expo-image` deprecation no longer appeared after the patch.
- Update the Flow 9 checklist, stage only the Flow 9 files, and create one frontend and one backend commit.

## Current Worktrees

Do not bulk-stage or revert either repository. Both contain unrelated user changes.

Frontend Flow 9 files to commit after retest:

- `src/components/product/product-image.tsx`
- `src/screens/products/reviews-screen.tsx`
- `src/screens/products/write-review.tsx`

Backend Flow 9 files to commit after retest:

- `src/review/views.py`
- `src/review/tests.py`

There are many unrelated tracked changes and untracked QA screenshots/XML files in both repositories. Preserve them. In particular, the frontend has unrelated edits/deletions in `.gitignore`, `package.json`, `Podfile`, several docs, and miscellaneous source files. The backend has unrelated changes in settings/chat/docs and untracked configuration files.

## Device And Local Setup

Physical Android device connected over USB:

```text
adb devices
# 34962d85    device
```

The app was reinstalled after a system restart. Its old login session was cleared, so the app is currently running as a guest. The user needs to log in again for authenticated owner/self-review verification.

Active Metro is intentionally running as a background process from the frontend workspace. It is configured for local backend access and uses USB forwarding:

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000

$env:EXPO_PUBLIC_USE_LOCAL_API='true'
Start-Process -FilePath 'C:\Program Files\nodejs\npx.cmd' `
  -ArgumentList @('expo','start','--dev-client','--localhost','--clear') `
  -WorkingDirectory 'C:\Users\yasht\git\rn-app' `
  -WindowStyle Hidden `
  -RedirectStandardOutput 'C:\Users\yasht\git\rn-app\metro-flow9.out.log' `
  -RedirectStandardError 'C:\Users\yasht\git\rn-app\metro-flow9.err.log'
```

The phone must use the dev launcher server labeled `Renit on ... http://127.0.0.1:8081`; do not select an old `localhost` entry. This matters because USB reverse exposes the computer's `127.0.0.1` to the device.

The app is confirmed to call the local backend successfully:

```text
http://127.0.0.1:8000/api/category/ -> 200
http://127.0.0.1:8000/api/top-experiences/?lat=... -> 200
```

Logs are in:

- `metro-flow9.out.log`
- `metro-flow9.err.log`

Useful device diagnostics:

```powershell
adb logcat -c
adb logcat -d -s ReactNativeJS:V ReactNative:V AndroidRuntime:E
adb shell uiautomator dump /sdcard/window_dump.xml
adb pull /sdcard/window_dump.xml flow9-current.xml
adb shell screencap -p /sdcard/current.png
adb pull /sdcard/current.png current.png
```

## Important Engineering Notes

- `src/lib/config.ts` deliberately selects `127.0.0.1:8000` for Android local development. This works on a physical phone only with `adb reverse tcp:8000 tcp:8000`.
- Avoid `npx` directly in PowerShell here because the host policy blocks `npx.ps1`. Use `C:\Program Files\nodejs\npx.cmd` when needed.
- `npx expo run:android --device` prompts for a device and is not useful non-interactively. Direct Gradle install worked:

```powershell
cd C:\Users\yasht\git\rn-app\android
.\gradlew.bat app:installDebug
```

- The frontend TypeScript check has many known pre-existing unrelated errors. Do not attribute them to Flow 9 unless a changed file causes one.
- The temporary `Could not parse Expo config: android.googleServicesFile` lines occurred after the broader worktree lost `google-services.json`; this is unrelated to Flow 9 and did not block the currently installed app or local network checks.

## Next Todo Order

Finish and commit Flow 9 first. Then follow `qa-e2e-strategy.md` in order:

1. Flow 10: Chat list and chat detail, including send message.
2. Flow 11: Offer and rental intent.
3. Flow 12: Post listing happy path.
4. Flow 13: Post listing validations and location-optional path.
5. Continue remaining unchecked flows in the strategy without stopping after a single todo.
