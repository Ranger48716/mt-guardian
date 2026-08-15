"""Сжать карты и сделать thumbs для списков."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MAPS_DIR = ROOT / "public" / "maps"
THUMBS = MAPS_DIR / "thumbs"
META = ROOT / "src" / "data" / "maps.json"
THUMB_SIZE = 144


def main() -> None:
    THUMBS.mkdir(parents=True, exist_ok=True)
    meta = json.loads(META.read_text(encoding="utf-8"))

    # удалить старые загрузки не из каталога
    known = {Path(m["image"]).name for m in meta}
    for p in MAPS_DIR.glob("*.png"):
        if p.name not in known:
            print("remove junk", p.name)
            p.unlink()

    for m in meta:
        src = ROOT / "public" / m["image"]
        if not src.exists():
            print("MISS", src)
            continue
        img = Image.open(src).convert("RGBA")
        # пересохранить с оптимизацией
        if max(img.size) > 1024:
            img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        img.save(src, "PNG", optimize=True)

        thumb = THUMBS / src.name
        t = img.copy()
        t.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.Resampling.LANCZOS)
        t.save(thumb, "PNG", optimize=True)
        m["thumb"] = f"maps/thumbs/{src.name}"
        m["size"] = list(img.size)
        print(f"OK {m['id']}: {src.stat().st_size // 1024}KB full, {thumb.stat().st_size // 1024}KB thumb")

    META.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
