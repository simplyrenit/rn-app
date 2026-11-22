# Renit 2.1 build (ENG-424)

Rebuild of the rn-app UI to the Renit 2.1 Figma (file `rolMmAueK1PJq31gXqA8et`, page `2068:14158` "Renit 2.1 · current app (iOS)"). Behaviour stays as in code; only the look changes, plus the accepted `NEW · …` layers and the "beyond the current app" list in `docs/renit-2.0-current/review/REVIEW.md` (outside this repo, in the renit workspace).

- `figma/` holds the one-time export of every frame (ENG-425). Build from it; call Figma only to fill gaps.
  - `figma/<section>/<frameId>.png` is the frame at 3x.
  - `figma/<section>/<frameId>.json` is its design context.
  - `figma/index.tsv` lists each frame's id, section, name, app route, how to reach the state, and its check method (`live`, `fixture` or `jest`).
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

## Proof run (ENG-425, 2026-11-23)

The current app (origin/main ed1a950, QA debug build, iPhone 17e simulator) was compared with the three Home frames in `proof/`. All three fail, as expected: 2083:15120 29.09%, 2083:15347 29.45%, 2083:15579 29.34%. The heat map catches the layout differences: category tiles that are photos instead of line icons, label weights, the tab-bar labels, and the toast.

## Decision: diff against design fixtures, not live QA data

Live QA data (product photos, names, categories, prices) never matches the Figma's sample content, so a live screen can't reach ≤2% even when the code is a perfect match. Pixel diffs therefore run in a **dev-only design-fixture mode**. In this mode, the screen's API responses are replaced with the content shown in the frame: the same texts, and the same images exported from Figma with Figwright `save_image_fills`. The fixture is compiled out of release builds (`__DEV__` only) and never touches QA data.

Live QA runs remain the behaviour check (navigation, real data and states). They do not count toward the pixel pass. Each flow story adds the fixtures for its own frames.
