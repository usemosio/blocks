#!/usr/bin/env python3
"""Check blocks: Hyperframes lint, then stills at four moments, then pixel checks.

    python3 scripts/check.py [name ...]        # all components when no name is given
    python3 scripts/check.py --size 1920x1080 name

For each component it mounts demo.html (which loads ./<name>.html) in a scratch
project, runs `hyperframes lint --json`, takes stills at 10/35/65/95 % of the
demo's duration, and writes out/<name>.jpg (the four stills side by side).
A component fails when lint reports an error, more than one still is one flat
colour, or under 0.05 % of the pixels change between neighbouring stills
(registry-item.json may set "checkAt": [seconds] for motion in a short window,
or "static": true for an item meant to hold still). Prints one JSON line per component and exits 1 on any
failure.

Needs Node (npx) and Chrome: set PRODUCER_HEADLESS_SHELL_PATH to a
chrome-headless-shell binary. Python needs Pillow.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent
HYPERFRAMES = os.environ.get("HYPERFRAMES_VERSION", "0.8.174")
ENV = {**os.environ, "HYPERFRAMES_NO_TELEMETRY": "1"}


def run(args, timeout=240):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, env=ENV)


def project(name, size):
    comp = ROOT / "components" / name
    demo = (comp / "demo.html").read_text()
    if size:
        w, h = size.split("x")
        demo = re.sub(r'(data-width=")\d+', rf"\g<1>{w}", demo)
        demo = re.sub(r'(data-height=")\d+', rf"\g<1>{h}", demo)
        demo = re.sub(r"(width[:=]\s*)1080(px)?", rf"\g<1>{w}\g<2>", demo)
        demo = re.sub(r"(height[:=]\s*)1920(px)?", rf"\g<1>{h}\g<2>", demo)
    # Mounted where a host loads it, so the scratch project has one root composition.
    demo = demo.replace(f"./{name}.html", f"compositions/components/{name}.html")
    work = ROOT / ".tmp" / f"{name}-{size or 'demo'}"
    shutil.rmtree(work, ignore_errors=True)
    (work / "compositions" / "components").mkdir(parents=True)
    (work / "index.html").write_text(demo)
    shutil.copy(comp / f"{name}.html", work / "compositions" / "components" / f"{name}.html")
    return work, demo


def check(name, size):
    meta = json.loads((ROOT / "components" / name / "registry-item.json").read_text())
    work, demo = project(name, size)
    result = {"name": name, "ok": True, "problems": []}

    lint = run(["npx", "-y", f"hyperframes@{HYPERFRAMES}", "lint", str(work), "--json"])
    try:
        findings = json.loads(lint.stdout[lint.stdout.index("{"):])
    except ValueError:
        findings = {"errorCount": 1, "findings": [{"message": (lint.stderr or lint.stdout)[-300:]}]}
    if findings.get("errorCount"):
        result["problems"] += [f"lint: {f.get('code', '')} {f.get('message', '')}"[:200] for f in findings["findings"] if f.get("severity", "error") == "error"]
    result["warnings"] = [f.get("code", "") for f in findings.get("findings", []) if f.get("severity") == "warning"]

    m = re.search(r'id="root"[^>]*data-duration="([\d.]+)"', demo) or re.search(r'data-duration="([\d.]+)"', demo)
    duration = float(m.group(1)) if m else float(meta.get("duration", 3))
    # An item whose motion sits in a short window can name its own moments.
    times = meta.get("checkAt") or [round(duration * p, 3) for p in (0.1, 0.35, 0.65, 0.95)]
    out = work / "snap"
    snap = run(["npx", "-y", f"hyperframes@{HYPERFRAMES}", "snapshot", str(work), "--at", ",".join(map(str, times)),
                "--no-end", "-o", str(out), "--describe", "false"])
    stills = sorted(out.glob("*.png"))
    if len(stills) != len(times):
        result["problems"].append(f"snapshot: {len(stills)} of {len(times)} stills; {(snap.stderr or snap.stdout)[-300:]}")
    else:
        images = [Image.open(p).convert("RGB") for p in stills]
        # A one-shot effect may end on a clear frame; most of the stills must show something.
        flat = [t for t, im in zip(times, images) if max(ImageStat.Stat(im.convert("L")).stddev) < 1.0]
        if len(flat) > 1:
            result["problems"].append(f"flat still at {flat}")

        # Motion: the share of pixels that change visibly between neighbouring stills,
        # so a thin stroke on a large frame still counts.
        def changed(a, b):
            diff = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 24 else 0)
            return ImageStat.Stat(diff).mean[0] / 255

        motion = max(changed(a, b) for a, b in zip(images, images[1:]))
        result["motion"] = round(motion * 100, 3)  # percent of pixels
        if motion < 0.0005 and not meta.get("static"):
            result["problems"].append("nothing moves between the stills")
        w, h = images[0].size
        tw = 360 if h >= w else 480
        th = round(h * tw / w)
        sheet = Image.new("RGB", (tw * 4 + 30, th), "white")
        for i, im in enumerate(images):
            sheet.paste(im.resize((tw, th)), (i * (tw + 10), 0))
        (ROOT / "out").mkdir(exist_ok=True)
        sheet.save(ROOT / "out" / f"{name}{'-' + size if size else ''}.jpg", quality=82)
    result["ok"] = not result["problems"]
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--size", help="WxH to mount the demo at instead of its own size")
    args = ap.parse_args()
    names = args.names or sorted(p.name for p in (ROOT / "components").iterdir() if p.is_dir())
    failed = 0
    for name in names:
        try:
            r = check(name, args.size)
        except Exception as err:  # noqa: BLE001
            r = {"name": name, "ok": False, "problems": [f"{type(err).__name__}: {err}"]}
        failed += not r["ok"]
        print(json.dumps(r), flush=True)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
