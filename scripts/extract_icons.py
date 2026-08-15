"""Extract vehicle-type and base icons from WoT client into public/icons."""
from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
GAME = Path(r"C:\Games\Tanki")
PKG = GAME / "res" / "packages"

VEHICLE = {
    "tt": ("gui-part1.pkg", "gui/maps/icons/vehicleTypes/60x54/heavyTank.png"),
    "st": ("gui-part1.pkg", "gui/maps/icons/vehicleTypes/60x54/mediumTank.png"),
    "lt": ("gui-part1.pkg", "gui/maps/icons/vehicleTypes/60x54/lightTank.png"),
    "pt": ("gui-part1.pkg", "gui/maps/icons/vehicleTypes/60x54/AT-SPG.png"),
    "sau": ("gui-part1.pkg", "gui/maps/icons/vehicleTypes/60x54/SPG.png"),
}

BASE = {
    "team1": ("gui-part1.pkg", "gui/maps/icons/library/hangarFlag/flag_green.png"),
    "team2": ("gui-part2.pkg", "gui/maps/icons/library/hangarFlag/flag_red.png"),
    "capture90": (
        "gui-part2.pkg",
        "gui/maps/icons/quests/battleCondition/90/icon_battle_condition_base_capture_90x90.png",
    ),
}


def extract(pkg: str, entry: str, dest: Path) -> None:
    with zipfile.ZipFile(PKG / pkg) as z:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(z.read(entry))
        print(f"OK {dest.relative_to(ROOT)}")


def tint_base(src: Path, dest: Path, color: tuple[int, int, int]) -> None:
    from PIL import Image

    img = Image.open(src).convert("RGBA")
    px = img.load()
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    op = out.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            lum = (r + g + b) / (3 * 255)
            if lum < 0.15 and a > 200:
                op[x, y] = (*tuple(int(c * 0.25) for c in color), a)
            else:
                op[x, y] = (*tuple(int(c * max(0.35, lum)) for c in color), a)
    tight_square(out).save(dest)
    print(f"OK {dest.relative_to(ROOT)}")


def tight_square(img: "Image.Image", size: int = 128) -> "Image.Image":
    from PIL import Image

    px = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 20 and r + g + b > 30:
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        return img.resize((size, size), Image.Resampling.NEAREST)
    minx = max(0, minx - 2)
    miny = max(0, miny - 2)
    maxx = min(w - 1, maxx + 2)
    maxy = min(h - 1, maxy + 2)
    cropped = img.crop((minx, miny, maxx + 1, maxy + 1))
    cpx = cropped.load()
    cw, ch = cropped.size
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = cpx[x, y]
            if r + g + b < 25:
                cpx[x, y] = (0, 0, 0, 0)
    side = max(cw, ch)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cw) // 2, (side - ch) // 2), cropped)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def knock_black(path: Path) -> None:
    from PIL import Image

    img = Image.open(path).convert("RGBA")
    px = img.load()
    w, h = img.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            lum = max(r, g, b)
            if lum < 28:
                continue
            op[x, y] = (255, 255, 255, 255 if lum > 90 else min(255, 140 + lum))
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    pad = 6
    canvas = Image.new("RGBA", (out.width + pad * 2, out.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(out, (pad, pad), out)
    side = max(canvas.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(canvas, ((side - canvas.width) // 2, (side - canvas.height) // 2), canvas)
    sq = sq.resize((96, 96), Image.Resampling.LANCZOS)
    px = sq.load()
    for y in range(96):
        for x in range(96):
            _r, _g, _b, a = px[x, y]
            if a < 40:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (255, 255, 255, 255)
    sq.save(path)


def main() -> None:
    for key, (pkg, entry) in VEHICLE.items():
        dest = OUT / "vehicle" / f"{key}.png"
        extract(pkg, entry, dest)
        knock_black(dest)
    for key, (pkg, entry) in BASE.items():
        extract(pkg, entry, OUT / "base" / f"{key}.png")
    src = OUT / "base" / "capture90.png"
    tint_base(src, OUT / "base" / "team1_base.png", (31, 157, 85))
    tint_base(src, OUT / "base" / "team2_base.png", (214, 69, 69))


if __name__ == "__main__":
    main()
