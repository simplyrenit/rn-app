#!/usr/bin/env python3
"""Diff Figma frames against their design fixtures on a device (flow stories, ENG-427..439).

Usage:
  .venv/bin/python frame_diff.py --platform ios|android-emu --metro-log <metro log> [frameId ...] [--section NN] [--story ENG-xxx]

For each frame: opens renit-qa://dev/fixture/<frameId>, waits for the Metro log line "[design-fixture] on: <frameId>",
waits until two screenshots 1s apart are identical (else 'unstable'), and runs visual_diff.py against
../figma/<section>/<frameId>.png with the device's crops and, when the frame has bottom-anchored chrome, --split-bottom.
Writes ../diffs/<ios|android>/<frameId>.json + .heat.png, prints one line per frame, turns fixtures off and rebuilds
the tracker. Fixture navigation only: it never taps. See ../README.md, "Flow stories: diffing a frame".
"""
import argparse, csv, glob, json, os, re, subprocess, sys, time
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from tracker import story_of  # noqa: E402

# Device, crops (px at 3x: status bar, home indicator / gesture bar) and the diffs folder per platform.
PLATFORMS = {
    # iPhone 17e simulator, 390x844pt @3x: status bar 47pt, home indicator 34pt.
    'ios': {'device': '407A6583-B2BF-4B0F-B5AB-F9C1B3FD33FB', 'top': 141, 'bottom': 102, 'diff': 'ios', 'vd': 'ios'},
    # AVD eng424_390, 1170x2532 @480dpi = 390x844dp: status bar 24dp (72px). Its gesture navigation gives the app no
    # bottom inset (measured 2026-11-23: the tab bar reaches the screen's edge, insets.bottom = 0, no handle drawn),
    # so nothing is cropped at the bottom. Re-measure if the AVD's navigation mode changes.
    'android-emu': {'device': 'emulator-5554', 'top': 72, 'bottom': 0, 'diff': 'android', 'vd': 'android'},
}
SHOTS = '/tmp/frame_diff'  # visual_diff.py records /tmp files by name only
BAR = re.compile(r'bar|footer|tab|bottom|^new · sticky', re.I)


def indicator(node):
    """Height of the home-indicator strip a bar draws at its own bottom (21pt in the 2.1 frames), else None."""
    for c in node.get('children', []):
        if 'home indicator' in c['name'].lower() and c.get('type') != 'RECTANGLE' and c['y'] + c['height'] >= node['height'] - 1:
            return c['height']
        found = indicator(c)
        if found:
            return found
    return None


def split_bottom(frame_json):
    """(B, reference bottom crop) in pt from the frame's root children, or (None, 34) for no split.

    B covers the bottom-anchored bars (bottom bar, tab bar, sheet footer, sticky bar) down to their content's end.
    The bars draw a 21pt home-indicator strip, while the device's bars stop 34pt above the bottom (the crop), so the
    reference is cropped by the bar's own strip: the bar's content then lines up with the device's.
    """
    root = json.load(open(frame_json))['nodes'][0]
    bars = [c for c in root.get('children', [])
            if c['y'] + c['height'] >= 843 and 600 < c['y'] < 810
            and BAR.search(c['name']) and 'home indicator' not in c['name'].lower()]
    if not bars:
        return None, 34
    strips = [h for h in map(indicator, bars) if h]
    ref_bottom = min(strips) if strips else 34
    return 844 - ref_bottom - min(c['y'] for c in bars), ref_bottom


def has_fixture(fid):
    pattern = re.compile(r'["\']' + re.escape(fid) + r'["\']\s*:')
    return any(pattern.search(open(f).read()) for f in glob.glob(os.path.join(ROOT, '../../src/dev/design-fixtures/[0-9]*.ts')))


def open_url(plat, device, url):
    if plat == 'ios':
        cmd = ['xcrun', 'simctl', 'openurl', device, url]
    else:
        # The inner quotes are for the device shell.
        cmd = ['adb', '-s', device, 'shell', f"am start -a android.intent.action.VIEW -p com.renit.app -d '{url}'"]
    subprocess.run(cmd, check=True, capture_output=True)


def screenshot(plat, device, path):
    if plat == 'ios':
        subprocess.run(['xcrun', 'simctl', 'io', device, 'screenshot', path], check=True, capture_output=True)
    else:
        with open(path, 'wb') as f:
            subprocess.run(['adb', '-s', device, 'exec-out', 'screencap', '-p'], check=True, stdout=f)


def wait_log(log, start, fid, timeout=25):
    """'on' once the fixture's line is logged after `start`, 'missing' for its "no fixture" warning, else None."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        with open(log, errors='ignore') as f:
            f.seek(start)
            text = f.read()
        if f'[design-fixture] on: {fid}' in text:
            return 'on'
        if f'no fixture for {fid}' in text:
            return 'missing'
        time.sleep(0.3)
    return None


def wait_stable(plat, device, path, top, bottom, timeout=15):
    """Screenshots 1s apart until two are identical between the crops (the clock may tick) and not one flat colour
    (DevFixture's blank view while it reloads). True when stable; the last shot is at `path`."""
    prev, t0 = None, time.time()
    while time.time() - t0 < timeout:
        screenshot(plat, device, path)
        cur = np.asarray(Image.open(path).convert('RGB'))
        cur = cur[top:cur.shape[0] - bottom]
        if prev is not None and cur.shape == prev.shape and np.array_equal(cur, prev) and cur.std() > 0:
            return True
        prev = cur
        time.sleep(1)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('frames', nargs='*', help='frame ids (2095:25572 or 2095-25572)')
    ap.add_argument('--platform', choices=PLATFORMS, required=True)
    ap.add_argument('--metro-log', required=True, help='log file of the Metro started from this worktree')
    ap.add_argument('--section', help='every frame of a figma section (NN)')
    ap.add_argument('--story', help='every frame of a flow story (ENG-xxx)')
    ap.add_argument('--device', help='simulator udid / adb serial (default: the ENG-424 device for the platform)')
    a = ap.parse_args()
    cfg = PLATFORMS[a.platform]
    device = a.device or cfg['device']

    rows = list(csv.DictReader(open(os.path.join(ROOT, 'figma/index.tsv')), delimiter='\t'))
    wanted = {f.replace('-', ':') for f in a.frames}
    rows = [r for r in rows if r['frameId'] in wanted or r['section'] == a.section or (a.story and story_of(r) == a.story)]
    if not rows:
        sys.exit('no frames selected')
    os.makedirs(SHOTS, exist_ok=True)
    vd = os.path.join(HERE, 'visual_diff.py')

    try:
        run_frames(a, rows, device, cfg, vd)
    finally:
        # Leave the device as it was found, even after a failure or Ctrl-C: fixtures (and any design session) off.
        open_url(a.platform, device, 'renit-qa://dev/fixture/off')
        subprocess.run([sys.executable, os.path.join(HERE, 'tracker.py')])


def run_frames(a, rows, device, cfg, vd):
    for r in rows:
        fid, sec = r['frameId'], r['section']
        name = fid.replace(':', '-')
        if not has_fixture(fid):
            print(f'{fid}\t{a.platform}\tNO FIXTURE')
            continue
        start = os.path.getsize(a.metro_log)
        open_url(a.platform, device, f'renit-qa://dev/fixture/{name}')
        state = wait_log(a.metro_log, start, fid)
        if state != 'on':
            print(f'{fid}\t{a.platform}\t' + ('NO FIXTURE' if state == 'missing' else 'timeout (no Metro log line)'))
            continue
        shot = os.path.join(SHOTS, f'{a.platform}-{name}.png')
        if not wait_stable(a.platform, device, shot, cfg['top'], cfg['bottom']):
            print(f'{fid}\t{a.platform}\tunstable')
            continue
        b, ref_bottom = split_bottom(os.path.join(ROOT, 'figma', sec, name + '.json'))
        out = os.path.join(ROOT, 'diffs', cfg['diff'], name)
        cmd = [sys.executable, vd, '--ref', os.path.join(ROOT, 'figma', sec, name + '.png'), '--app', shot,
               '--platform', cfg['vd'], '--app-top', str(cfg['top']), '--app-bottom', str(cfg['bottom']), '--out', out]
        if b:
            cmd += ['--split-bottom', f'{b:g}', '--ref-bottom', f'{ref_bottom:g}']
        p = subprocess.run(cmd, capture_output=True, text=True)
        try:
            res = json.loads(p.stdout.strip().splitlines()[-1])
        except (IndexError, ValueError):
            print(f'{fid}\t{a.platform}\tdiff error: {p.stderr.strip() or p.stdout.strip()}')
            continue
        verdict = 'pass' if res['pass'] else 'fail'
        print(f"{fid}\t{a.platform}\t{verdict} {res['mismatch_pct']:.2f}%\tsplit={b and f'{b:g}pt (ref bottom {ref_bottom:g}pt)'}\t{os.path.relpath(out, ROOT)}.heat.png")



if __name__ == '__main__':
    main()
