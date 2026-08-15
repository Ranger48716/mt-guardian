"""Extract WoT minimaps + RU names into mt-guardian/public."""
from __future__ import annotations

import json
import re
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_MAPS = ROOT / "public" / "maps"
OUT_META = ROOT / "src" / "data" / "maps.json"
GAME = Path(r"C:\Games\Tanki")
MO = GAME / "res" / "text" / "ru" / "lc_messages" / "arenas.mo"
PKG_DIR = GAME / "res" / "packages"

TEST_RE = re.compile(r"(test|cgf|nextgen|styles_test|ai_test)", re.I)


def parse_mo(path: Path) -> dict[str, str]:
    data = path.read_bytes()
    magic = struct.unpack("<I", data[:4])[0]
    endian = "<" if magic == 0x950412DE else ">"
    nstrings, orig_off, trans_off = struct.unpack(endian + "III", data[8:20])
    out: dict[str, str] = {}
    for i in range(nstrings):
        olen, ooff = struct.unpack(endian + "II", data[orig_off + i * 8 : orig_off + i * 8 + 8])
        tlen, toff = struct.unpack(endian + "II", data[trans_off + i * 8 : trans_off + i * 8 + 8])
        key = data[ooff : ooff + olen].decode("utf-8", "replace")
        val = data[toff : toff + tlen].decode("utf-8", "replace")
        if key:
            out[key] = val
    return out


def decode_dxt1(data: bytes, width: int, height: int) -> bytes:
    """Return RGBA bytes for DXT1 block compression."""
    out = bytearray(width * height * 4)
    blocks_w = (width + 3) // 4
    blocks_h = (height + 3) // 4
    off = 0

    def rgb565(c: int) -> tuple[int, int, int]:
        r = ((c >> 11) & 31) * 255 // 31
        g = ((c >> 5) & 63) * 255 // 63
        b = (c & 31) * 255 // 31
        return r, g, b

    for by in range(blocks_h):
        for bx in range(blocks_w):
            c0, c1, bits = struct.unpack_from("<HHI", data, off)
            off += 8
            colors = [rgb565(c0), rgb565(c1)]
            if c0 > c1:
                colors.append(tuple((2 * colors[0][i] + colors[1][i]) // 3 for i in range(3)))
                colors.append(tuple((colors[0][i] + 2 * colors[1][i]) // 3 for i in range(3)))
                alphas = (255, 255, 255, 255)
            else:
                colors.append(tuple((colors[0][i] + colors[1][i]) // 2 for i in range(3)))
                colors.append((0, 0, 0))
                alphas = (255, 255, 255, 0)
            for i in range(16):
                idx = (bits >> (2 * i)) & 3
                px = bx * 4 + (i % 4)
                py = by * 4 + (i // 4)
                if px >= width or py >= height:
                    continue
                r, g, b = colors[idx]
                a = alphas[idx]
                p = (py * width + px) * 4
                out[p : p + 4] = bytes((r, g, b, a))
    return bytes(out)


def dds_to_png(dds_path: Path, png_path: Path) -> tuple[int, int]:
    from PIL import Image

    raw = dds_path.read_bytes()
    if raw[:4] != b"DDS ":
        raise ValueError("not dds")
    height, width = struct.unpack_from("<II", raw, 12)
    # DDS_PIXELFORMAT at 76: size, flags, fourCC
    pf_flags, fourcc = struct.unpack_from("<I4s", raw, 80)
    header_size = 128
    payload = raw[header_size:]
    four = fourcc.decode("ascii", "ignore")
    if four == "DXT1":
        rgba = decode_dxt1(payload, width, height)
        img = Image.frombytes("RGBA", (width, height), rgba)
    else:
        # fallback: let Pillow try if plugin exists
        img = Image.open(dds_path).convert("RGBA")
    png_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(png_path, "PNG")
    return width, height


def main() -> None:
    names = {k[:-5]: v for k, v in parse_mo(MO).items() if k.endswith("/name")}
    OUT_MAPS.mkdir(parents=True, exist_ok=True)
    OUT_META.parent.mkdir(parents=True, exist_ok=True)

    catalog: list[dict] = []
    tmp = ROOT / "_extracted_maps" / "_tmp_dds"
    tmp.mkdir(parents=True, exist_ok=True)

    for pkg in sorted(PKG_DIR.glob("*.pkg")):
        if pkg.name.endswith(("_bin.pkg", "_hd.pkg")):
            continue
        if not re.match(r"^\d", pkg.name):
            continue
        mid = pkg.stem
        if TEST_RE.search(mid):
            continue
        with zipfile.ZipFile(pkg) as z:
            mmaps = [n for n in z.namelist() if re.match(r"spaces/[^/]+/mmap\.dds$", n)]
            if not mmaps:
                continue
            entry = mmaps[0]
            dds_path = tmp / f"{mid}.dds"
            png_path = OUT_MAPS / f"{mid}.png"
            thumbs_dir = OUT_MAPS / "thumbs"
            thumbs_dir.mkdir(parents=True, exist_ok=True)
            thumb_path = thumbs_dir / f"{mid}.png"
            with z.open(entry) as src, open(dds_path, "wb") as dst:
                dst.write(src.read())
            try:
                w, h = dds_to_png(dds_path, png_path)
                from PIL import Image

                img = Image.open(png_path)
                if max(img.size) > 1024:
                    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
                    img.save(png_path, "PNG", optimize=True)
                    w, h = img.size
                else:
                    img.save(png_path, "PNG", optimize=True)
                t = img.copy()
                t.thumbnail((144, 144), Image.Resampling.LANCZOS)
                t.save(thumb_path, "PNG", optimize=True)
            except Exception as e:
                print("FAIL", mid, e)
                continue
            catalog.append(
                {
                    "id": mid,
                    "name": names.get(mid, mid),
                    "image": f"maps/{mid}.png",
                    "thumb": f"maps/thumbs/{mid}.png",
                    "size": [w, h],
                }
            )
            print(f"OK {mid}: {names.get(mid, mid)} {w}x{h}")

    catalog.sort(key=lambda m: m["name"].lower())
    OUT_META.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(catalog)} maps -> {OUT_META}")


if __name__ == "__main__":
    main()
