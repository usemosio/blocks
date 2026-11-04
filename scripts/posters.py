#!/usr/bin/env python3
"""Poster stills for a gallery, from the sheets scripts/check.py writes.

    python3 scripts/posters.py <out-dir> [name ...]

For each component, takes the third of the four stills in out/<name>.jpg (vertical) and
out/<name>-1920x1080.jpg (landscape), the moment at 65 % of the demo or its third "checkAt", and
writes <out-dir>/<name>.webp and <out-dir>/<name>-landscape.webp. Run check.py at both sizes first.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


def still(sheet: Path, index: int = 2) -> Image.Image:
    im = Image.open(sheet).convert("RGB")
    # check.py lays four stills side by side, 10 px apart.
    w = (im.width - 30) // 4
    return im.crop((index * (w + 10), 0, index * (w + 10) + w, im.height))


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    names = sys.argv[2:] or sorted(p.name for p in (ROOT / "components").iterdir() if p.is_dir())
    missing = []
    for name in names:
        for suffix, sheet in (("", f"{name}.jpg"), ("-landscape", f"{name}-1920x1080.jpg")):
            path = ROOT / "out" / sheet
            if not path.exists():
                missing.append(sheet)
                continue
            still(path).save(out / f"{name}{suffix}.webp", "WEBP", quality=68, method=6)
    print(f"{len(names)} components, {len(missing)} sheets missing")
    for m in missing:
        print("missing", m)


if __name__ == "__main__":
    main()
