#!/usr/bin/env python3
"""Self-test for visual_diff.py --split-bottom on synthetic images: python3 test_visual_diff.py (exit 0 = ok).

A frame (54pt status bar, 34pt indicator, a 68pt tab bar on the bottom) and a device shot of the same screen with a
47pt status bar: the content is 7pt taller on the device, so without the split the tab bar is offset and fails, and
with --split-bottom 68 both parts line up.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
S = 3


def screen(status_pt):
    h = 844 * S
    im = np.full((h, 390 * S, 3), 255, np.uint8)
    im[:status_pt * S] = 200                                   # status bar
    top = status_pt * S
    for i in range(6):                                         # content rows, from the top
        y = top + (20 + i * 70) * S
        im[y:y + 40 * S, 24 * S:(24 + 200 + i * 20) * S] = (40 * i, 90, 160)
    bar = h - (34 + 68) * S                                    # tab bar above the home indicator
    im[bar:bar + 68 * S] = (60, 60, 70)
    for i in range(5):
        im[bar + 18 * S:bar + 42 * S, (27 + 78 * i) * S:(51 + 78 * i) * S] = (250, 250, 250)
    im[h - 34 * S:] = 120                                       # home indicator strip
    return im


def run(ref, app, out, *extra):
    cmd = [sys.executable, os.path.join(HERE, 'visual_diff.py'), '--ref', ref, '--app', app, '--platform', 'ios',
           '--out', out, '--app-top', str(47 * S), '--app-bottom', str(34 * S), *extra]
    subprocess.run(cmd, capture_output=True)
    return json.load(open(out + '.json'))


with tempfile.TemporaryDirectory() as d:
    ref, app = os.path.join(d, 'ref.png'), os.path.join(d, 'app.png')
    Image.fromarray(screen(54)).save(ref)
    Image.fromarray(screen(47)).save(app)
    plain = run(ref, app, os.path.join(d, 'plain'))
    split = run(ref, app, os.path.join(d, 'split'), '--split-bottom', '68')
    print('no split', plain['mismatch_pct'], '| split', split['mismatch_pct'])
    assert plain['mismatch_pct'] > 1, plain
    assert split['mismatch_pct'] < 0.01 and split['pass'] and split['uncovered_rows'] == 0, split
    assert Image.open(os.path.join(d, 'split.heat.png')).size == (1170 * 3 + 40, (844 - 54 - 34) * S)
    # The device's content area 9pt shorter than the frame's (a 56pt status bar): those reference rows above the
    # bar cannot be shown, so they are left out rather than counted, and the bar still lines up.
    Image.fromarray(screen(56)).save(app)
    short = run(ref, app, os.path.join(d, 'short'), '--app-top', str(56 * S), '--split-bottom', '68')
    assert short['seam_hidden_rows'] == 2 * S and short['uncovered_rows'] == 0 and short['mismatch_pct'] < 0.01, short
print('ok')
