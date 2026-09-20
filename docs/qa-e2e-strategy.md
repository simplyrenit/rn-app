# Renit Mobile E2E QA Strategy

## Purpose

This document is the method for end-to-end QA of the Renit mobile app: how a
flow is run, how issues are classified, and when a flow counts as done. It
holds no per-flow status. The current release-readiness picture is in
[`qa-production-revalidation.md`](./qa-production-revalidation.md), and the
older flow-by-flow backlog is in git history.

Renit is a rental marketplace where:

- renters discover nearby products and merchants
- owners publish spare items for rent
- merchants onboard and list inventory after approval
- users chat, negotiate, and manage availability

The goal is not only to test happy paths, but to repeatedly run this loop for each flow:

1. Execute the flow like a QA on a real Android device.
2. Capture UI divergences, broken states, warnings, errors, and exceptions from logs.
3. Fix the defects based on best engineering judgment.
4. Review the fix and immediately resolve any P0, P1, or P2 issue found in review.
5. Dry run the flow locally.
6. Retest on device.
7. If stable, stage and commit before moving to the next flow.

## Test Modes

### Primary mode

- Physical device: Android over USB, or a connected iPhone (see
  [`local-development.md`](./local-development.md))
- Expo dev client / native build
- Shared QA backend (`qa-api.toratora.site`). A local backend is used only
  when a task explicitly requires it.

### Secondary mode

- Android emulator or iOS simulator for quick regression checks
- Manual code walkthrough for flows that depend on data or account state not yet available

## Preconditions

Before starting any flow, confirm:

- backend is reachable from the phone
- Metro is running for the correct app workspace
- Android: `adb devices` shows the physical phone as `device`, and
  `adb reverse tcp:8081 tcp:8081` is active
- iPhone: it shows as available in `xcrun devicectl list devices`, and Metro is
  running with `--lan`
- `adb reverse tcp:8000 tcp:8000` is active only when deliberately using a
  local backend
- the app launches without boot-time exceptions
- test accounts are available for:
  - guest user
  - normal renter/owner user
  - merchant user in pending/rejected/approved state when possible

## Logging Rules

For every flow:

- clear logs before execution
- capture app logs during the flow
- classify issues as:
  - `P0`: app unusable, data loss, blocked critical commerce flow
  - `P1`: broken core flow with workaround or severe incorrect behavior
  - `P2`: noticeable incorrect behavior, misleading UX, repeated warnings/exceptions, partial failure
  - `P3`: polish, copy, layout, low-risk cleanup

Focus areas while watching logs:

- network failures
- auth/token refresh failures
- location permission errors
- Firestore/chat issues
- image upload / S3 failures
- React render warnings
- navigation errors
- unhandled promise rejections

## Exit Criteria Per Flow

A flow is complete only when:

- happy path works on device
- no unresolved P0/P1/P2 remains for that flow
- logs do not show recurring app-originated errors/exceptions for that flow
- regressions introduced by the fix are ruled out with a dry run
- code is staged and committed
