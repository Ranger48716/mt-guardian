"""Портретные JPEG-обложки 2:3 для карточек в Mini App."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCREENS = ROOT / "public" / "maps" / "screens"
COVERS = ROOT / "public" / "covers"
SIZE = (240, 360)
RATIO = SIZE[0] / SIZE[1]


def crop_portrait(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    w, h = img.size
    if w / h > RATIO:
        nw = int(h * RATIO)
        x = (w - nw) // 2
        img = img.crop((x, 0, x + nw, h))
    elif w / h < RATIO:
        nh = int(w / RATIO)
        y = (h - nh) // 2
        img = img.crop((0, y, w, y + nh))
    return img.resize(SIZE, Image.Resampling.LANCZOS)


def main() -> None:
    COVERS.mkdir(parents=True, exist_ok=True)
    srcs = sorted(SCREENS.glob("*.jpg")) or sorted(COVERS.glob("*.jpg"))
    total = 0
    for src in srcs:
        out = COVERS / src.name
        crop_portrait(Image.open(src)).save(
            out, "JPEG", quality=68, optimize=True, progressive=True
        )
        total += out.stat().st_size
        print(f"OK {src.name} {out.stat().st_size // 1024}KB")
    print(f"done {len(srcs)} files, {total // 1024}KB")


if __name__ == "__main__":
    main()
