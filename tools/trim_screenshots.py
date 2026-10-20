"""Trim the empty page background from the bottom of the captured screenshots.

The prototype screenshots are rendered in a 1600x1600 viewport so that no page is
ever cut off; this script then removes the unused background below the content.
Run from the repository root:  python tools/trim_screenshots.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"


def trim(path: Path) -> None:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    px = img.load()

    # Reference colour = the page background, sampled just inside the right edge.
    bg = px[w - 40, h - 8]
    x0, x1 = int(w * 0.16), w - 20   # ignore the left sidebar column
    step = 2

    last = h - 1
    for y in range(h - 1, 0, -step):
        row_has_content = False
        for x in range(x0, x1, 3):
            r, g, b = px[x, y]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 12:
                row_has_content = True
                break
        if row_has_content:
            last = y
            break

    pad = 40
    new_h = min(h, max(int(h * 0.55), last + pad))
    if new_h < h:
        img.crop((0, 0, w, new_h)).save(path, optimize=True)
        print(f"{path.name}: {w}x{h} -> {w}x{new_h}")
    else:
        print(f"{path.name}: kept {w}x{h}")


def main() -> None:
    for p in sorted(SHOTS.glob("*.png")):
        if p.name.startswith("_"):
            continue
        trim(p)


if __name__ == "__main__":
    main()
