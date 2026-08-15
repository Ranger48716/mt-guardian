"""Extract map loading screens (gui/.../map/screen/*.dds) as JPEG covers."""
from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_maps import TEST_RE, dds_to_png  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "maps" / "screens"
META = ROOT / "src" / "data" / "maps.json"
PKG_DIR = Path(r"C:\Games\Tanki\res\packages")
TMP = ROOT / "_extracted_maps" / "_tmp_screen"


def collect_screens() -> dict[str, tuple[Path, str]]:
    found: dict[str, tuple[Path, str]] = {}
    for pkg in (PKG_DIR / "gui-part1.pkg", PKG_DIR / "gui-part2.pkg"):
        z = zipfile.ZipFile(pkg)
        for name in z.namelist():
            if not name.startswith("gui/maps/icons/map/screen/") or not name.endswith(".dds"):
                continue
            stem = Path(name).stem
            if TEST_RE.search(stem) or stem == "default_screen":
                continue
            found[stem.lower()] = (pkg, name)
        z.close()
    return found


def main() -> None:
    from PIL import Image

    OUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)
    screens = collect_screens()
    print(f"screens in client: {len(screens)}")

    maps = json.loads(META.read_text(encoding="utf-8"))
    ok = 0
    for item in maps:
        mid = item["id"]
        hit = screens.get(mid.lower())
        if not hit:
            print("MISS", mid)
            continue
        pkg, entry = hit
        dds = TMP / f"{mid}.dds"
        png = TMP / f"{mid}.png"
        jpg = OUT / f"{mid}.jpg"
        with zipfile.ZipFile(pkg) as z:
            dds.write_bytes(z.read(entry))
        dds_to_png(dds, png)
        img = Image.open(png).convert("RGB")
        img.thumbnail((960, 600), Image.Resampling.LANCZOS)
        img.save(jpg, "JPEG", quality=82, optimize=True)
        item["screen"] = f"maps/screens/{mid}.jpg"
        ok += 1
        print(f"OK {mid} {jpg.stat().st_size // 1024}KB")
    META.write_text(json.dumps(maps, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {ok}/{len(maps)} screens")


if __name__ == "__main__":
    main()
