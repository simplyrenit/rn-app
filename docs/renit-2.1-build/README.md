# Renit 2.1 build (ENG-424)

Rebuild of the rn-app UI to the Renit 2.1 Figma (file `rolMmAueK1PJq31gXqA8et`, page `2068:14158` "Renit 2.1 · current app (iOS)"). Behaviour stays as in code; only the look changes, plus the accepted `NEW · …` layers and the "beyond the current app" list in `docs/renit-2.0-current/review/REVIEW.md` (outside this repo, in the renit workspace).

- `figma/` holds the one-time export of every frame (ENG-425). Build from it; call Figma only to fill gaps.
  - `figma/<section>/<frameId>.png` is the frame at 3x.
  - `figma/<section>/<frameId>.json` is its design context.
  - `figma/index.tsv` lists each frame's id, section, name, app route, how to reach the state, and its check method (`live`, `fixture`, `devkit` or `jest`). The section 00 rows (kit components, one per variant) come from `tools/kit_table.py --tsv`, which also writes `src/dev/kit-table.ts`.
- `tracker.md` has one row per frame, with iOS and Android status and the diff % for each.
- `tools/visual_diff.py` is the visual diff (below).

## Visual diff

```bash
cd docs/renit-2.1-build/tools
python3 -m venv .venv && .venv/bin/pip install pillow numpy   # once
.venv/bin/python visual_diff.py --ref ../figma/03/2089-27772.png --app shot.png --platform ios --out ../diffs/ios/2089-27772
```

1. **Crop the system bars.**
   - From the Figma PNG, it removes the drawn status bar (54pt) and the home indicator (34pt).
   - From the device screenshot, it removes the real status bar and the home indicator or navigation bar:
     - iOS default: iPhone 17e simulator, 47pt + 34pt at 3x.
     - Android default: Realme RMX3151, 66px + 132px.
     - Re-measure for other devices and pass `--app-top` / `--app-bottom`.
2. **Scale.** The app crop is scaled to the Figma crop's width (1170px at 3x).
3. **Compare.** It uses pixelmatch's YIQ colour distance at threshold 0.1, with a 1px shift tolerance so antialiasing is not counted. Figma rows that the app screenshot does not cover count as mismatched.
4. **Compare only the first screen.** For a scrolling frame, only the first 844pt are compared. Diff the rest of a long screen by scrolling the app and passing a reference crop (`--ref-top`/`--ref-height`).
5. **Write the output.**
   - `<out>.heat.png` shows reference | app | heat map, with mismatches in red.
   - `<out>.json` holds the numbers.
   - Exit code 0 means pass.

**Pass rule:** mismatch ≤ 2%, **and** the heat map shows no visible text, icon, colour or spacing difference. Both conditions must hold. A mismatched 528×60px block is only ~1.2%, so the 2% figure alone is not enough. Fix the code, never the threshold.

Android is compared against the iOS frames, with Android's own status and navigation bars cropped. Dark mode is mapped, but it is not diffed.

States that can't be reached live, such as error states, are checked with a dev-only state fixture or a jest render. The check method is recorded in `figma/index.tsv`.

## DevKit: diffing a kit variant (section 00, ENG-426)

Kit components (`figma/00`) are diffed on **DevKit**, a dev-build-only screen that draws **one variant** with the real component and the kit's sample texts, and nothing else. Section 00 rows in `figma/index.tsv` have check `devkit`. The Tab bar (and its two solid icons) is the exception: it is diffed live on the tab roots (check `live`).

1. **Open it** with a deep link (Metro running from this worktree, simulator in light appearance):

   ```bash
   # iOS simulator. Quote the URL: variant names have =, + and spaces, and the query has &.
   xcrun simctl openurl booted 'renit-qa://dev/kit/2073-14380?variant=Tone%3DWarning'
   xcrun simctl openurl booted 'renit-qa://dev/kit/2071-14418?variant=Type%3DBack%2BTitle'
   # Android (Realme): the inner quotes are for the device shell, which would otherwise cut the URL at &.
   adb -s LFTSCYFAN7LVLZTS shell "am start -a android.intent.action.VIEW -p com.renit.app.qa -d 'renit-qa://dev/kit/2071-14467?variant=Full%20CTA&x=30'"
   ```

   - `<id>` is the kit node id (`2073:14380` or `2073-14380`); `figma/00/<id>.json` and `src/dev/kit-table.ts` list the variants.
   - `variant` is the variant's name (`Tone=Warning`), its value (`Warning`) or its node id. Without it, the first variant is drawn. Percent-encode it; a raw `+` is kept as a plus.
   - `x` scrolls the content horizontally, in pt. A 390-wide variant sits at x=0; a narrower one sits at its x in the set (on the 24 gutter for a standalone component) and is scrolled into view if it is past the screen's edge. On Android (360dp) diff a 390-wide variant twice: `x=0` (pt 0–360) and `x=30` (pt 30–390).
   - The canvas is `#F5F5F7` for a set's variants and white for a standalone component, as in the PNGs.
2. **Read the boxes** from the Metro log. Each variant logs one line:

   ```text
   KITBOX {"item":"2073:14380","variant":"Tone=Warning","ref_box":"216,24,120,24","app_box":"216,71,120,24","ref_bg":"#F5F5F7","args":"--ref ../figma/00/2073-14380.png --ref-box 216,24,120,24 --app-box 216,71,120,24 --ref-bg '#F5F5F7'"}
   ```

   - `ref_box` is the variant's box in the set PNG (from the JSON); `app_box` is the component's `measureInWindow` box in pt, snapped to 1/3pt. Both are clipped to the screen, and both leave out the drawn home-indicator strip of bars and sheets (Bottom bar, Sheet footer, Sheet usage example, Confirm destructive): the box covers the content strip only.
   - The app box is **measured**, never forced to the kit size. When the two sizes differ the diff tool stops (`--app-box … differs from --ref-box`), and that is the finding: fix the component, not the box. The one trim is the form gap under a `TextField`, which sits outside the kit's Form field box.
   - Sheet · Confirm destructive is a modal, so its box is **computed** from the sheet's snap height (`note` in the line says so). Its rounded corners sit on the scrim, not on white.
   - Timeline steps are clipped to the kit's 58pt row, so the rail runs on below the step as the kit draws it.
3. **Screenshot and diff**:

   ```bash
   xcrun simctl io booted screenshot /tmp/kit.png
   cd docs/renit-2.1-build/tools
   .venv/bin/python visual_diff.py --platform ios --app /tmp/kit.png --out ../diffs/ios/2073-14374 \
     --ref ../figma/00/2073-14380.png --ref-box 216,24,120,24 --app-box 216,71,120,24 --ref-bg '#F5F5F7'
   python3 tracker.py
   ```

   Name the output after the **variant's** id (the `frameId` in `index.tsv`), so the tracker picks it up. Use `--ref-bg '#F5F5F7'` for set variants and the default white for standalone components (the `args` field already has the right one). On Android, check the KITBOX `y` against the screenshot: `measureInWindow` is relative to the app window, which starts under the status bar unless the bar is translucent. Record the Realme's font scale (it must be 1.0) without changing it.

## Design fixtures (flow stories)

A design fixture makes a screen show a Figma frame's content in a dev build, so the diff compares layout and not QA data (see the decision below).

- **Where:** `src/dev/design-fixtures/<section>.ts` (`02.ts` … `14.ts`), one file per Figma section, so each story edits only its own. Each entry is keyed by frame id:

  ```ts
  "2089:24546": { route: "AllCategories", params: undefined, responses: { "GET /category/": [/* the frame's content */] } },
  ```

  - A response key is `"METHOD /path/suffix/"`, matched against the end of the request path; `*` matches one segment (`"GET /product/*/"`).
  - Responses are served with status 200 and copied per request. Set `server_time` where the screen reads it. Images are bundled `require()` assets resolved to URIs (`Image.resolveAssetSource(require(...)).uri`), with file names that avoid default, placeholder, user and profile.
  - The proof is `all-categories · Loaded` (2089:24546) in `03.ts`.
- **Turn one on:** `xcrun simctl openurl booted 'renit-qa://dev/fixture/2089-24546'` (Android: `adb shell "am start -a android.intent.action.VIEW -p com.renit.app.qa -d 'renit-qa://dev/fixture/2089-24546'"`). The DevFixture screen turns it on, empties React Query, loads the user and the category list again, and replaces itself with the fixture's route.
- **Turn it off:** `renit-qa://dev/fixture/off` does the same with no fixture and returns to the tabs.
- **While a fixture is on:** the requests it lists are answered from it, other reads go to QA (with a `session`: a 404, see below), the analytics batch (`POST …/events/`) gets a no-op 204, and any other POST, PUT, PATCH or DELETE is refused with a 409 (`ERR_DESIGN_FIXTURE`), so the screen shows its error state rather than its offline one. Only `axiosInstance` is intercepted: bare `axios` (token refresh), the listing SSE stream, `fetch` and Firestore (chat) still reach QA, so don't send chat messages or run the listing flow under a fixture.
- **Preconditions:** a fixture without a `session` needs a signed-in QA account. A fixture with one works on any device, signed in or out (below).
- **Not covered:** only `axiosInstance` requests are served. Bare `axios` (the token refresh), the listing flow's SSE stream, `fetch` and Firestore (chat) are not. Neither are location, permission, SSE or clock-only states. Check those with a jest render test (check `jest`).

## Flow stories: diffing a frame

Each flow story (ENG-427..439) checks its frames with `tools/frame_diff.py`: it opens the frame's design fixture on a device, screenshots it, and diffs it against the frame PNG.

### 1. Write the fixture

Add an entry to `src/dev/design-fixtures/<section>.ts`, keyed by the frame id, with the frame's content (texts, images) as the API responses (see "Design fixtures" above).

A screen that needs a signed-in user gets a `session`, the body of the me-request (`MyDetailsResponse`):

```ts
"2095:25572": { route: "MainTabs", params: { screen: "Profile" }, responses: {}, session: { user: riya } },
```

While a fixture with a session is on, the app is in a dev-only **design session**:

- The global context reports `isAuthenticated: true` and `userDetails` built from `session.user`. A signed-out device gets in-memory `authTokens` for the screens that check them. A signed-in device keeps its own.
- Nothing is written: no tokens in AsyncStorage, no `Authorization` header, no Firebase sign-in, no token refresh. Only what the context reports changes. `renit-qa://dev/fixture/off` (or a fixture without a session) ends the session and brings back the device's own auth state exactly. A signed-out emulator goes back to the tabs, not to Welcome.
- Every `axiosInstance` request is served or refused, and nothing reaches QA. The me-request returns `session.user` unless `responses` lists it. Any other read the fixture does not list gets a **404**. Writes get the usual 409, and the events batch gets a 204. So a screen's other reads (KYC status, cart, favorites, notifications) show their empty or error state unless the fixture lists them.
- Keep `firebase_uid` empty so chat's Firestore listeners stay off: Firestore is not intercepted.
- The session user is also the **viewer for distances** (ENG-429, `lib/distance.ts` `useViewerCoordinates`): with a usable `session.user.coordinates` (not 0/0) every "2.4 km away" line (the product page, choose dates, kit `Card`, `booking/outcome`) is measured from it, and the device is never asked for its location. Without a session, or with 0/0, the device's location is used as before. It is `__DEV__` only (the release bundle drops the require). Other stories reuse it for their distance lines (ENG-427): pick coordinates that print the frame's distance.
- LogBox is silenced while any fixture is on, because the refused requests log errors and the toasts would cover the bottom bar. The errors still reach the Metro log.

### 2. Run frame_diff.py

Start Metro from the worktree, with its log in a file. Then run:

```bash
npm run start:qa -- --port 8081 > /tmp/metro.log 2>&1 &
cd docs/renit-2.1-build/tools
.venv/bin/python frame_diff.py --platform ios --metro-log /tmp/metro.log 2095:25572 2089:24546
.venv/bin/python frame_diff.py --platform android-emu --metro-log /tmp/metro.log --section 13
.venv/bin/python frame_diff.py --platform ios --metro-log /tmp/metro.log --story ENG-438
```

For each frame, the script:

1. Opens `renit-qa://dev/fixture/<frameId>`.
2. Waits for `[design-fixture] on: <frameId>` in the Metro log.
3. Waits until two screenshots 1s apart are identical between the crops and are not a blank view (up to 15s, else `unstable`).
4. Diffs the screenshot into `diffs/<ios|android>/<frameId>.json` and `.heat.png`.
5. Prints one line: `pass`/`fail` with the %, the split, and the heat map path. A frame with no fixture prints `NO FIXTURE`.

At the end, it turns fixtures off and rebuilds the tracker. It only navigates by link and never taps.

Before a run, check three things. Each one stops the script, which then prints `timeout`:

- **The app is in front and attached to this worktree's Metro.** Attach it with the `exp+renit://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081` link while the dev client is open. A link sent to a closed app makes iOS ask "Open in Renit?".
- **After a full reload, the dev client is back in the app.** A reload can leave the dev launcher showing its "Deep link received" chooser. Attach again with the link above.
- **The emulator's first-run dev-menu sheet is closed.** Close it once with `adb -s emulator-5554 shell input keyevent 4` (Back).

### Devices and crops

The crops are px at 3x.

| `--platform` | Device | App crop (top / bottom) | Results in |
| --- | --- | --- | --- |
| `ios` | iPhone 17e simulator `407A6583-…`, 390×844pt @3x | 141 (47pt status bar) / 102 (34pt home indicator) | `diffs/ios/` |
| `android-emu` | emulator `emulator-5554` (AVD `eng424_390`, 1170×2532 @480dpi = 390×844dp), light mode | 72 (24dp status bar) / 0 | `diffs/android/` |

- On the emulator, gesture navigation gives the app no bottom inset: the tab bar reaches the screen's edge and no handle is drawn (measured 2026-11-23). So nothing is cropped at the bottom. Re-measure if the AVD's navigation mode changes, and pass `--device` for another simulator or emulator.
- The Realme phone (360dp) is not used for frame diffs.
- The Android dev client is `com.renit.app`. Connect it with:

  ```bash
  adb -s emulator-5554 reverse tcp:8081 tcp:8081
  adb -s emulator-5554 shell "am start -a android.intent.action.VIEW -p com.renit.app -d 'exp+renit://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'"
  ```

- The reference is cropped by the frame's 54pt status bar and 34pt indicator, and only the first 844pt (one screen) is compared.

### Bottom chrome: `--split-bottom`

A tab bar, bottom bar or sheet footer sits on the device's bottom edge, while the scroll content starts under the top bar. The device's bars differ from the frame's (47pt or 24dp vs 54pt), so one crop cannot line up both.

`frame_diff.py` finds the bottom chrome in the frame's JSON: root children that reach the frame's bottom, start below y 600, and are bars. A bar's name contains bar, footer, Tab or Bottom, or starts with `NEW · sticky`; Home Indicator is skipped. It then passes `--split-bottom B` to `visual_diff.py`:

- The reference above the bar is compared top-aligned with the app.
- The last B pt is compared bottom-aligned.
- Both parts are stacked into one heat map. Blue ticks in the gutters mark the seam.

The 2.1 bars draw their own 21pt home-indicator strip, while the device's bars stop 34pt above the bottom on iOS. So the reference's bottom crop is the bar's strip (`--ref-bottom 21`), and B runs to the bar content's end: `B = 844 − 21 − bar y`, which is 81 for the tab bar. That lines up the bar's content.

When the device's content area above the bar is shorter than the frame's (iOS with a tab bar: 682pt vs 688pt), the reference rows it cannot show are left out of the comparison. They are reported as `seam_hidden_rows`, not counted. Check that content by scrolling.

The split covers only the bar itself. A note or small print stacked on top of a bar (for example "Bottom bar · small print") is compared top-aligned.

### Reading a result

- Check the heat map before the %. The status and top bar region and the bottom bar must line up, not be offset.
- A frame passes only at ≤ 2% **and** a clean heat map (see the pass rule above).
- `tools/test_visual_diff.py` self-tests the split on synthetic images.

### Tracker notes

`tracker-notes.tsv` holds one tab-separated row per frame and platform: `frameId  platform  status  note`. The platform is `ios` or `android`; Android emulator results also go under `android`. `tracker.py` uses a manual status only when the frame has no diff JSON. The one exception is `fail-heatmap`, which overrides a passing %.

| Status | Use when |
| --- | --- |
| `fail-heatmap` | The % passes but the heat map shows a real difference. Say what in the note. |
| `n/a` | The frame can't appear on that platform or in that state. Say where it is checked instead. |
| `fluid` | The layout adapts to the screen width, so a box diff can't apply (Realme 360dp). Name the side-by-side evidence file. |
| `text-width` | Only the platform's font rendering differs. Name the evidence. |
| `pass` | Checked by another frame's diff. Name that diff and its %. |
| `blocked` / `pending` | The frame can't be diffed yet. Say why and which story unblocks it. |

Keep notes to one plain sentence and run `python3 tools/tracker.py` after editing.

## Release safety (dev-only code)

DevKit, the dev links and the fixtures live in `src/dev/` and `src/screens/dev/`. They are loaded only by `__DEV__ ? require(...) : null` (nav.tsx, global-context.tsx) and `if (__DEV__) require(...)` (networkUtils.ts), plus `__DEV__ ? require("@/dev/list-flow-seed")` in the list-flow screens add-photos, reading, review and preview (ENG-435); nothing imports them statically (global-context.tsx has a type-only import, which is erased). A production bundle constant-folds `__DEV__` to false and drops the requires. Each dev module exports a `RENIT_DEV_*_MARKER` string, so a bundle that contained it would show it:

```bash
npx expo export --platform ios --no-bytecode --output-dir /tmp/harness-export
grep -rlE 'RENIT_DEV_|design-fixture|design-session' /tmp/harness-export && echo "DEV CODE IN RELEASE" || echo "clean"
rm -rf /tmp/harness-export
```

## Proof run (ENG-425, 2026-11-23)

The current app (origin/main ed1a950, QA debug build, iPhone 17e simulator) was compared with the three Home frames in `proof/`. All three fail, as expected: 2083:15120 29.09%, 2083:15347 29.45%, 2083:15579 29.34%. The heat map catches the layout differences: category tiles that are photos instead of line icons, label weights, the tab-bar labels, and the toast.

## Decision: diff against design fixtures, not live QA data

Live QA data (product photos, names, categories, prices) never matches the Figma's sample content, so a live screen can't reach ≤2% even when the code is a perfect match. Pixel diffs therefore run in a **dev-only design-fixture mode**. In this mode, the screen's API responses are replaced with the content shown in the frame: the same texts, and the same images exported from Figma with Figwright `save_image_fills`. The fixture is compiled out of release builds (`__DEV__` only) and refuses writes through `axiosInstance` (see the list above for what it does not cover).

Live QA runs remain the behaviour check (navigation, real data and states). They do not count toward the pixel pass. Each flow story adds the fixtures for its own frames.
