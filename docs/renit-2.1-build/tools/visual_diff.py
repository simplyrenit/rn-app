#!/usr/bin/env python3
"""Visual diff: app screenshot vs Figma frame PNG.

Usage:
  .venv/bin/python visual_diff.py --ref figma/03/2089-27772.png --app shots/ios/saved.png \
      --platform ios --out diffs/ios/2089-27772 [--ref-scale 3] [--app-top PX] [--app-bottom PX]

What it does (see ../README.md, "Visual diff"):
  1. Crops the system bars: the Figma frame's drawn status bar (54pt) and home indicator (34pt),
     and the device's status bar / home indicator or navigation bar (pixels, per device).
  2. Scales the app crop to the reference crop's width.
  3. Counts mismatched pixels with a YIQ colour distance (pixelmatch's metric, threshold 0.1)
     and a 1px shift tolerance, so sub-pixel antialiasing is not counted.
     Reference rows the app does not cover count as mismatched.
  4. Writes <out>.heat.png (reference | app | heat map) and <out>.json; prints one JSON line.
Exit code 0 = pass (mismatch <= --threshold %), 1 = fail.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

# Defaults for the devices used in ENG-424. Override with --app-top / --app-bottom.
DEVICE_BARS = {
    # iPhone 17e simulator (390x844 pt @3x = 1170x2532): status bar 47pt, home indicator 34pt.
    'ios': (47 * 3, 34 * 3),
    # Realme RMX3151 (1080x2412, 480dpi = 3x): status bar ~22dp, 3-button nav bar 44dp. Re-measure per phone.
    'android': (66, 132),
}


def flatten(im, bg):
    # Kit PNGs are partly transparent; .convert('RGB') alone would turn those pixels black.
    im = im.convert('RGBA')
    return Image.alpha_composite(Image.new('RGBA', im.size, bg), im).convert('RGB')


def load(p, bg='#FFFFFF'):
    return np.asarray(flatten(Image.open(p), bg), dtype=np.float32)


def yiq(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (0.29889531 * r + 0.58662247 * g + 0.11448223 * b,
            0.59597799 * r - 0.27417610 * g - 0.32180189 * b,
            0.21147017 * r - 0.52261711 * g + 0.31114694 * b)


def delta(a, b):
    ya, ia, qa = yiq(a)
    yb, ib, qb = yiq(b)
    return 0.5053 * (ya - yb) ** 2 + 0.299 * (ia - ib) ** 2 + 0.1957 * (qa - qb) ** 2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', required=True)
    ap.add_argument('--app', required=True)
    ap.add_argument('--out', required=True, help='output path prefix (no extension)')
    ap.add_argument('--platform', choices=['ios', 'android'], required=True)
    ap.add_argument('--ref-scale', type=float, default=3.0, help='export scale of the Figma PNG')
    ap.add_argument('--ref-top', type=float, default=54, help='pt cropped from the top of the frame')
    ap.add_argument('--ref-bottom', type=float, default=34, help='pt cropped from the bottom of the frame')
    ap.add_argument('--ref-height', type=float, default=844, help='pt of the frame compared (first screen)')
    ap.add_argument('--app-top', type=int)
    ap.add_argument('--app-bottom', type=int)
    ap.add_argument('--threshold', type=float, default=2.0, help='max %% mismatched pixels (do not raise it)')
    ap.add_argument('--color-t', type=float, default=0.1, help='per-pixel colour threshold (pixelmatch t)')
    ap.add_argument('--ref-box', help='x,y,w,h in pt: compare only this box of the reference (kit variants); '
                    'replaces --ref-top/--ref-bottom/--ref-height')
    ap.add_argument('--app-box', help='x,y,w,h in pt of the screenshot (device points, status bar included); '
                    'replaces --app-top/--app-bottom. Requires --ref-box.')
    ap.add_argument('--app-scale', type=float, help='device px per pt (default 3: iPhone 17e and Realme RMX3151 both 3x)')
    ap.add_argument('--ref-bg', default='#FFFFFF', help='colour behind transparent reference pixels '
                    '(#F5F5F7 for kit set variants)')
    a = ap.parse_args()

    ref = load(a.ref, a.ref_bg)
    s = a.ref_scale
    app_img = flatten(Image.open(a.app), a.ref_bg)
    if a.ref_box:
        x, y, w_, h_ = (float(v) for v in a.ref_box.split(','))
        ref = ref[round(y * s): round((y + h_) * s), round(x * s): round((x + w_) * s)]
        if not a.app_box:
            sys.exit('--ref-box needs --app-box')
        ax, ay, aw, ah = (float(v) for v in a.app_box.split(','))
        k = a.app_scale or 3.0  # iPhone 17e @3x; Realme RMX3151 is 480dpi = 3.0
        app_img = app_img.crop((round(ax * k), round(ay * k), round((ax + aw) * k), round((ay + ah) * k)))
        # The boxes must describe the same thing; a size mismatch would be silently resampled.
        if abs(aw - w_) > 0.5 or abs(ah - h_) > 0.5:
            sys.exit(f'--app-box {aw}x{ah} pt differs from --ref-box {w_}x{h_} pt')
    else:
        ref = ref[int(a.ref_top * s): int(min(ref.shape[0], a.ref_height * s) - a.ref_bottom * s)]
        top, bottom = DEVICE_BARS[a.platform]
        top = a.app_top if a.app_top is not None else top
        bottom = a.app_bottom if a.app_bottom is not None else bottom
        app_img = app_img.crop((0, top, app_img.width, app_img.height - bottom))
    w = ref.shape[1]
    h = round(app_img.height * w / app_img.width)
    app = np.asarray(app_img.resize((w, h), Image.LANCZOS), dtype=np.float32)

    H = ref.shape[0]
    hh = min(H, app.shape[0])
    r, p = ref[:hh], app[:hh]
    # 1px shift tolerance: a pixel matches if any of the 3x3 neighbours in the app matches.
    pad = np.pad(p, ((1, 1), (1, 1), (0, 0)), mode='edge')
    best = np.full(r.shape[:2], np.inf, dtype=np.float32)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            best = np.minimum(best, delta(r, pad[dy:dy + hh, dx:dx + w]))
    mism = best > 35215 * a.color_t ** 2
    uncovered = (H - hh) * w
    pct = 100.0 * (mism.sum() + uncovered) / (H * w)

    # heat map: reference | app | faded reference with mismatches in red
    gray = (r.mean(axis=2, keepdims=True) * 0.25 + 191).repeat(3, axis=2)
    heat = np.where(mism[..., None], np.array([230, 30, 30], np.float32), gray)
    canvas = np.full((H, w * 3 + 40, 3), 255, np.float32)
    canvas[:H, :w] = ref
    canvas[:hh, w + 20:2 * w + 20] = p
    canvas[:hh, 2 * w + 40:] = heat
    if H > hh:
        canvas[hh:H, 2 * w + 40:] = [230, 30, 30]
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    Image.fromarray(canvas.clip(0, 255).astype(np.uint8)).save(a.out + '.heat.png')
    res = {'ref': a.ref, 'app': a.app, 'platform': a.platform, 'mismatch_pct': round(float(pct), 3),
           'threshold_pct': a.threshold, 'pass': bool(pct <= a.threshold),
           'compared_px': [w, H], 'app_scaled_height': h, 'uncovered_rows': H - hh}
    json.dump(res, open(a.out + '.json', 'w'), indent=1)
    print(json.dumps(res))
    sys.exit(0 if res['pass'] else 1)


if __name__ == '__main__':
    main()
