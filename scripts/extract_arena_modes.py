"""Extract battle modes + spawn/base positions from arena_defs PackedSection."""
from __future__ import annotations

import json
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "arena_modes.json"
PKG = Path(r"C:\Games\Tanki\res\packages\scripts.pkg")
MO = Path(r"C:\Games\Tanki\res\text\ru\lc_messages\arenas.mo")

MAGIC = 0x62A14E45
DATA_POS_MASK = 0x0FFFFFFF
TYPE_MASK = ~DATA_POS_MASK & 0xFFFFFFFF
TYPE_DATA_SECTION = 0x00000000
TYPE_STRING = 0x10000000
TYPE_INT = 0x20000000
TYPE_FLOAT = 0x30000000
TYPE_BOOL = 0x40000000
TYPE_BLOB = 0x50000000

MODE_ORDER = ["ctf", "domination", "assault", "assault2", "domination3", "comp7"]


def parse_mo(path: Path) -> dict[str, str]:
    data = path.read_bytes()
    magic = struct.unpack("<I", data[:4])[0]
    endian = "<" if magic == 0x950412DE else ">"
    n, ooff, toff = struct.unpack(endian + "III", data[8:20])
    out: dict[str, str] = {}
    for i in range(n):
        olen, oo = struct.unpack(endian + "II", data[ooff + i * 8 : ooff + i * 8 + 8])
        tlen, to = struct.unpack(endian + "II", data[toff + i * 8 : toff + i * 8 + 8])
        k = data[oo : oo + olen].decode("utf-8", "replace")
        v = data[to : to + tlen].decode("utf-8", "replace")
        if k:
            out[k] = v
    return out


def read_string_table(data: bytes, pos: int) -> tuple[list[str], int]:
    table: list[str] = []
    while True:
        end = data.index(0, pos)
        s = data[pos:end].decode("utf-8", "replace")
        pos = end + 1
        if s == "":
            break
        table.append(s)
    return table, pos


def decode_value(typ: int, blob: bytes):
    if typ == TYPE_DATA_SECTION:
        return None  # children only / nested
    if typ == TYPE_BOOL:
        return bool(blob[0]) if blob else False
    if typ == TYPE_INT:
        if not blob:
            return 0
        if len(blob) == 1:
            return struct.unpack("<b", blob)[0]
        if len(blob) == 2:
            return struct.unpack("<h", blob)[0]
        if len(blob) == 4:
            return struct.unpack("<i", blob)[0]
        if len(blob) == 8:
            return struct.unpack("<q", blob)[0]
        return blob
    if typ == TYPE_FLOAT:
        if len(blob) == 4:
            return struct.unpack("<f", blob)[0]
        if len(blob) == 8:
            return struct.unpack("<ff", blob)
        if len(blob) == 12:
            return struct.unpack("<fff", blob)
        if len(blob) == 16:
            return struct.unpack("<ffff", blob)
        if len(blob) == 48:  # matrix
            return struct.unpack("<" + "f" * 12, blob)
        return blob
    if typ == TYPE_STRING:
        s = blob.decode("utf-8", "replace")
        return s[:-1] if s.endswith("\x00") else s
    if typ in (TYPE_BLOB, TYPE_ENCRYPTED_BLOB := 0x60000000):
        return blob
    return blob


def parse_section(data: bytes, table: list[str], typ: int) -> dict:
    """Parse one packed section; returns {name-less node with v and children dict/list}."""
    if typ != TYPE_DATA_SECTION:
        return {"v": decode_value(typ, data), "c": []}

    if len(data) < 2:
        return {"v": None, "c": []}

    num = struct.unpack_from("<h", data, 0)[0]
    # ChildRecord = int32 dataPos + int16 keyPos = 6 bytes; plus final int32
    header = 2 + num * 6 + 4
    if header > len(data):
        return {"v": None, "c": []}

    # records[i] = (dataPos, keyPos); synthetic end uses final DataPos
    records: list[tuple[int, int]] = []
    for i in range(num):
        data_pos, key_pos = struct.unpack_from("<ih", data, 2 + i * 6)
        records.append((data_pos, key_pos))
    final_pos = struct.unpack_from("<i", data, 2 + num * 6)[0]
    records.append((final_pos, -1))  # sentinel

    data_block = data[header:]

    # own value: from 0 to start of first child; type in first record high bits
    own_end = records[0][0] & DATA_POS_MASK
    own_type = records[0][0] & TYPE_MASK
    own_blob = data_block[:own_end]
    own_val = decode_value(own_type, own_blob) if own_type != TYPE_DATA_SECTION else None

    children: list[tuple[str, dict]] = []
    for i in range(num):
        start = records[i][0] & DATA_POS_MASK
        end = records[i + 1][0] & DATA_POS_MASK
        child_type = records[i + 1][0] & TYPE_MASK
        key = records[i][1]
        name = table[key] if 0 <= key < len(table) else f"?{key}"
        child_blob = data_block[start:end]
        children.append((name, parse_section(child_blob, table, child_type)))

    return {"v": own_val, "c": children}


def unpack_file(raw: bytes) -> dict:
    magic = struct.unpack_from("<I", raw, 0)[0]
    if magic != MAGIC:
        raise ValueError(f"bad magic {hex(magic)}")
    version = raw[4]
    table, pos = read_string_table(raw, 5)
    root_blob = raw[pos:]
    return parse_section(root_blob, table, TYPE_DATA_SECTION)


def kid(node: dict, name: str) -> dict | None:
    for n, c in node.get("c", []):
        if n == name:
            return c
    return None


def as_xy(val) -> tuple[float, float] | None:
    if isinstance(val, tuple) and len(val) >= 2:
        return float(val[0]), float(val[1])
    if isinstance(val, (list, tuple)) and len(val) >= 2:
        return float(val[0]), float(val[1])
    if isinstance(val, str):
        parts = val.replace(",", " ").split()
        if len(parts) >= 2:
            try:
                return float(parts[0]), float(parts[1])
            except ValueError:
                return None
    return None


def collect_xy(node: dict) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    xy = as_xy(node.get("v"))
    if xy:
        pts.append(xy)
    for _, ch in node.get("c", []):
        pts.extend(collect_xy(ch))
    return pts


def extract_mode(node: dict) -> dict:
    spawns: dict[str, list[list[float]]] = {"1": [], "2": []}
    bases: dict[str, list[float]] = {}

    tb = kid(node, "teamBasePositions")
    if tb:
        for name, tn in tb["c"]:
            tid = "1" if name.endswith("1") else ("2" if name.endswith("2") else None)
            if not tid:
                continue
            pts = collect_xy(tn)
            if pts:
                bases[tid] = [pts[0][0], pts[0][1]]

    ts = kid(node, "teamSpawnPoints")
    if ts:
        for name, tn in ts["c"]:
            tid = "1" if name.endswith("1") else ("2" if name.endswith("2") else None)
            if not tid:
                continue
            for x, z in collect_xy(tn):
                spawns[tid].append([x, z])

    return {"spawns": spawns, "bases": bases}


def world_to_pct(x: float, z: float, bb: dict) -> list[float]:
    min_x, min_z = bb["min"]
    max_x, max_z = bb["max"]
    px = (x - min_x) / (max_x - min_x) * 100.0
    py = (max_z - z) / (max_z - min_z) * 100.0
    return [round(px, 2), round(py, 2)]


def convert_mode(raw: dict, bb: dict) -> dict:
    spawns = {
        "1": [world_to_pct(x, z, bb) for x, z in raw["spawns"]["1"]],
        "2": [world_to_pct(x, z, bb) for x, z in raw["spawns"]["2"]],
    }
    bases = {tid: world_to_pct(xy[0], xy[1], bb) for tid, xy in raw["bases"].items()}
    # В стандартном бое часто только базы — показываем их как респы
    for tid in ("1", "2"):
        if not spawns[tid] and tid in bases:
            spawns[tid] = [bases[tid]]
    return {"spawns": spawns, "bases": bases}


def parse_arena(raw: bytes) -> dict | None:
    root = unpack_file(raw)
    bb_n = kid(root, "boundingBox")
    if not bb_n:
        return None
    bl_n, ur_n = kid(bb_n, "bottomLeft"), kid(bb_n, "upperRight")
    bl = as_xy(bl_n["v"]) if bl_n else None
    ur = as_xy(ur_n["v"]) if ur_n else None
    if not bl or not ur:
        pts = collect_xy(bb_n)
        if len(pts) >= 2:
            bl, ur = pts[0], pts[1]
    if not bl or not ur:
        return None
    bb = {"min": [bl[0], bl[1]], "max": [ur[0], ur[1]]}

    modes: dict[str, dict] = {}
    gp = kid(root, "gameplayTypes")
    if gp:
        for name, node in gp["c"]:
            if name not in MODE_ORDER:
                continue
            modes[name] = convert_mode(extract_mode(node), bb)

    if "ctf" not in modes:
        raw_m = extract_mode(root)
        if raw_m["spawns"]["1"] or raw_m["spawns"]["2"] or raw_m["bases"]:
            modes["ctf"] = convert_mode(raw_m, bb)

    return {"modes": modes}


def main() -> None:
    mo = parse_mo(MO)
    labels = {m: mo.get(f"type/{m}/name", m) for m in MODE_ORDER}
    result = {"labels": labels, "order": MODE_ORDER, "maps": {}}

    with zipfile.ZipFile(PKG) as z:
        for info in z.infolist():
            if not info.filename.startswith("scripts/arena_defs/") or not info.filename.endswith(
                ".xml"
            ):
                continue
            mid = Path(info.filename).stem
            if mid.startswith(("_", "h", "H")):
                continue
            try:
                parsed = parse_arena(z.read(info.filename))
            except Exception as e:
                print("FAIL", mid, e)
                continue
            if not parsed or not parsed["modes"]:
                print("empty", mid)
                continue
            result["maps"][mid] = {
                "modes": {k: parsed["modes"][k] for k in MODE_ORDER if k in parsed["modes"]}
            }
            print(mid, list(result["maps"][mid]["modes"].keys()))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("OK", len(result["maps"]), "->", OUT)


if __name__ == "__main__":
    main()
