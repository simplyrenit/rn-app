#!/usr/bin/env python3
"""Diff every DevKit variant (index.tsv rows with check 'devkit') on the iOS simulator.

Usage: python3 kit_diff.py --metro-log <metro log> [--only <frameId> ...] [--platform ios]
Needs: Metro running from this worktree (its log captures the KITBOX lines), the simulator booted in light
appearance with the dev client open. For each variant it opens renit-qa://dev/kit/<set>?variant=<name>,
waits for that variant's KITBOX line, screenshots, runs visual_diff.py into ../diffs/ios/<frameId> and
finally rebuilds the tracker. Prints one line per variant.
"""
import argparse, csv, json, os, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SIM = os.environ.get('SIM', 'booted')


def kit_rows():
    rows = [r for r in csv.DictReader(open(os.path.join(ROOT, 'figma/index.tsv')), delimiter='\t') if r['check'] == 'devkit']
    table = json.load(open(os.path.join(HERE, 'kit_variants.json'))) if os.path.exists(os.path.join(HERE, 'kit_variants.json')) else None
    return rows, table


def set_of():
    # variant node id -> its component-set id (standalone components map to themselves)
    m = {}
    d0 = os.path.join(ROOT, 'figma/00')
    for f in os.listdir(d0):
        if not f.endswith('.json'):
            continue
        for n in json.load(open(os.path.join(d0, f))).get('nodes', []):
            m[n['id']] = n['id']
            if n.get('type') == 'COMPONENT_SET':
                for c in n.get('children', []):
                    m[c['id']] = n['id']
    return m


def wait_kitbox(log, start, frame, timeout=25):
    t0 = time.time()
    while time.time() - t0 < timeout:
        with open(log, errors='ignore') as f:
            f.seek(start)
            for line in f:
                i = line.find('KITBOX ')
                if i < 0:
                    continue
                try:
                    d = json.loads(line[i + 7:].strip().rstrip("'\""))
                except Exception:
                    continue
                if d.get('item') == frame:
                    return d
        time.sleep(0.5)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--metro-log', required=True)
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--platform', choices=['ios', 'android'], default='ios')
    ap.add_argument('--serial', default='LFTSCYFAN7LVLZTS')
    ap.add_argument('--android-top', type=float, default=39.667,
                    help='dp between the screen top and the app window (the 119px status bar; measureInWindow excludes it); '
                         'measured on the Realme RMX3151')
    a = ap.parse_args()
    rows, _ = kit_rows()
    sets = set_of()
    for r in rows:
        fid = r['frameId']
        if a.only and fid not in a.only:
            continue
        name = r['frameName']
        set_name, _, variant = name.partition(' · ')
        sid = sets.get(fid, fid)
        # Android (360dp) shows a 390-wide variant in two scrolled boxes: pt 0-360 and pt 30-390.
        scrolls = [0, 30] if a.platform == 'android' else [None]
        results = []
        for sx in scrolls:
            start = os.path.getsize(a.metro_log)
            url = f"renit-qa://dev/kit/{sid.replace(':', '-')}?variant={fid.replace(':', '-')}" + (f'&x={sx}' if sx else '')
            if a.platform == 'ios':
                subprocess.run(['xcrun', 'simctl', 'openurl', SIM, url], check=False)
            else:
                subprocess.run(['adb', '-s', a.serial, 'shell', f"am start -a android.intent.action.VIEW -p com.renit.app -d '{url}'"],
                               check=False, capture_output=True)
            box = wait_kitbox(a.metro_log, start, sid)
            if not box:
                results.append((None, 'NO KITBOX')); break
            time.sleep(1.2)  # let animations (sheets, focus) settle
            tag = fid.replace(':', '-') + (f'-x{sx}' if sx else '')
            shot = f'/tmp/kit-{a.platform}-{tag}.png'
            if a.platform == 'ios':
                subprocess.run(['xcrun', 'simctl', 'io', SIM, 'screenshot', shot], check=True, capture_output=True)
            else:
                with open(shot, 'wb') as fh:
                    subprocess.run(['adb', '-s', a.serial, 'exec-out', 'screencap', '-p'], stdout=fh, check=True)
            ax, ay, aw, ah = (float(v) for v in box['app_box'].split(','))
            if a.platform == 'android':
                ay += a.android_top
            out = os.path.join(ROOT, 'diffs', a.platform, tag)
            cmd = [os.path.join(HERE, '.venv/bin/python'), os.path.join(HERE, 'visual_diff.py'), '--platform', a.platform,
                   '--app', shot, '--out', out, '--ref', os.path.join(HERE, '../figma/00', sid.replace(':', '-') + '.png'),
                   '--ref-box', box['ref_box'], '--app-box', f'{ax},{ay},{aw},{ah}', '--ref-bg', box.get('ref_bg', '#FFFFFF')]
            res = subprocess.run(cmd, capture_output=True, text=True)
            line = (res.stdout.strip().splitlines() or [res.stderr.strip()])[-1]
            try:
                results.append((json.loads(line), out))
            except Exception:
                results.append((None, 'ERROR ' + line[:160])); break
            if box['ref_box'].split(',')[2] != '390' and sx == 0:
                break  # narrower than the screen: one box covers it
        if any(r[0] is None for r in results):
            print(f'{fid}\t{name}\t' + [r[1] for r in results if r[0] is None][0]); continue
        worst = max(results, key=lambda r: r[0]['mismatch_pct'])
        # The tracker reads <frameId>.json: keep the worse box there.
        main = os.path.join(ROOT, 'diffs', a.platform, fid.replace(':', '-'))
        if worst[1] != main:
            import shutil
            shutil.copy(worst[1] + '.json', main + '.json'); shutil.copy(worst[1] + '.heat.png', main + '.heat.png')
        d = worst[0]
        print(f"{fid}\t{name}\t{d['mismatch_pct']:.2f}%\t{'pass' if d['pass'] else 'FAIL'}" + (f"\t({len(results)} boxes)" if len(results) > 1 else ''))
    subprocess.run([sys.executable, os.path.join(HERE, 'tracker.py')], capture_output=True)


if __name__ == '__main__':
    main()
