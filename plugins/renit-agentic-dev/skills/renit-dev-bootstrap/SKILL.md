---
name: renit-dev-bootstrap
description: Validate and prepare the Renit React Native app for QA-backed local development on Android or a connected iPhone. Use when Codex needs to start, repair, or verify the Renit development environment, Expo configuration, native dependencies, or device connection.
---

# Renit QA Bootstrap

## Preconditions

- Work from the repository root.
- Use QA only. Do not start a local backend or set `EXPO_PUBLIC_APP_ENV=DEV` unless the user explicitly overrides this rule.
- Run `scripts/validate-qa-setup.sh` first. Exit code `2` means the local credential file is missing; stop safely and tell the user how to create it from `config/environments/qa-test-accounts.example.json`.

## Workflow

1. Confirm `config/environments/qa.env.example`, `eas.json`, and `src/lib/config.ts` resolve QA endpoints.
2. Install JavaScript dependencies with `npm ci` when dependencies are absent or the lockfile changed. Confirm `patch-package` applies the tracked patches.
3. Run `npx expo config --type public` with the QA environment before building or starting Metro.
4. For Android, verify `adb devices`, build/install the selected QA development target, and collect `adb logcat` evidence.
5. For iPhone, use `ios/Renit.xcworkspace`, verify CocoaPods, and use Xcode or `xcrun devicectl` to build, install, launch, and collect logs. Ask for Apple trust, OAuth, or permission actions instead of attempting to bypass them.

## Output

Return the required repository handoff. Include the resolved app environment, selected device, native build path, and every blocker. Do not expose credential values.
