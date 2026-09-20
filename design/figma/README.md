# Figma frame exports for the fidelity audit

Drop PNG exports of the Figma frames here. They are the reference side of a
per-screen visual diff against simulator screenshots of the running app.

## Naming

    <screen-key>.<theme>.png        e.g.  home.light.png   home.dark.png

Lowercase, hyphens, no spaces. The theme suffix is required — the audit checks
both, and most of the defects found so far have been dark-mode-only.

## Export settings

- Select the frame (not a group inside it), Export → PNG, **2x**.
- One frame per file. Do not export a board of many frames as one image; the
  audit compares one screen to one screen.
- Include the whole frame, status bar and all, so the top inset can be measured.

## First pass — unauthenticated screens only

These are reachable without a login, so they can be audited immediately:

    onboarding-1 / onboarding-2 / onboarding-3   (carousel slides)
    auth-entry                                   (sign-in options)
    auth-email
    auth-password
    auth-phone
    auth-verify                                  (OTP)
    auth-about                                   (name / DOB)
    auth-location
    home
    search
    search-results
    search-filters                               (the filter sheet, open)
    product-detail
    saved-signed-out
    post-signed-out
    profile-signed-out

Anything not in that list is fine to add — extra frames are used, not ignored.
Anything missing is reported as "no reference frame" rather than guessed at.

## Note

These are binary assets in a git repo. Whether they get committed or ignored is
your call; nothing in the audit depends on them being tracked.
