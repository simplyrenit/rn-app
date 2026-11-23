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
- **While a fixture is on:** the requests it lists are answered from it, other reads go to QA, the analytics batch (`POST …/events/`) gets a no-op 204, and any other POST, PUT, PATCH or DELETE is refused with a 409 (`ERR_DESIGN_FIXTURE`), so the screen shows its error state rather than its offline one. Only `axiosInstance` is intercepted: bare `axios` (token refresh), the listing SSE stream, `fetch` and Firestore (chat) still reach QA, so don't send chat messages or run the listing flow under a fixture.
- **Preconditions:** a signed-in QA account; fixtures fake no tokens.
- **Not covered:** only `axiosInstance` requests are served. Bare `axios` (the token refresh), the listing flow's SSE stream, `fetch` and Firestore (chat) are not. Neither are location, permission, SSE or clock-only states. Check those with a jest render test (check `jest`).

## Release safety (dev-only code)

DevKit, the dev links and the fixtures live in `src/dev/` and `src/screens/dev/`. They are loaded only by `__DEV__ ? require(...) : null` (nav.tsx) and `if (__DEV__) require(...)` (networkUtils.ts); nothing imports them statically. A production bundle constant-folds `__DEV__` to false and drops the requires. Each dev module exports a `RENIT_DEV_*_MARKER` string, so a bundle that contained it would show it:

```bash
npx expo export --platform ios --no-bytecode --output-dir /tmp/eng426-export
grep -rl RENIT_DEV_ /tmp/eng426-export && echo "DEV CODE IN RELEASE" || echo "clean"
rm -rf /tmp/eng426-export
```

## Proof run (ENG-425, 2026-11-23)

The current app (origin/main ed1a950, QA debug build, iPhone 17e simulator) was compared with the three Home frames in `proof/`. All three fail, as expected: 2083:15120 29.09%, 2083:15347 29.45%, 2083:15579 29.34%. The heat map catches the layout differences: category tiles that are photos instead of line icons, label weights, the tab-bar labels, and the toast.

## Decision: diff against design fixtures, not live QA data

Live QA data (product photos, names, categories, prices) never matches the Figma's sample content, so a live screen can't reach ≤2% even when the code is a perfect match. Pixel diffs therefore run in a **dev-only design-fixture mode**. In this mode, the screen's API responses are replaced with the content shown in the frame: the same texts, and the same images exported from Figma with Figwright `save_image_fills`. The fixture is compiled out of release builds (`__DEV__` only) and refuses writes through `axiosInstance` (see the list above for what it does not cover).

Live QA runs remain the behaviour check (navigation, real data and states). They do not count toward the pixel pass. Each flow story adds the fixtures for its own frames.
