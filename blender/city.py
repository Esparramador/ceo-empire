"""Procedural city: road grid with markings, raised sidewalks/blocks, parks,
plaza fountain and textured buildings (day albedo + night window emission).

Writes:
    <out>/city.glb             – static city geometry, one mesh per material
    src/lib/cityLayout.json    – the same layout for gameplay (collisions,
                                 ground height, prop instances)

Work happens in game coordinates (x, y-up, z); `B()` converts to Blender.
"""

import json
import math
import os
import random

import numpy as np

import lib

SEED = 42
ROADS = [-60, -20, 20, 60]
ROAD_HALF = 5.0
EXTENT = 130.0
CURB = 0.15
SIDEWALK = 3.5
CELL_W, CELL_H, CELLS = 3.0, 3.5, 8  # facade texture: 8x8 windows per tile
TILE_W, TILE_H = CELL_W * CELLS, CELL_H * CELLS
LOBBY_H = 4.2

# Keep these clear of buildings (game coordinates, radius) — mission markers,
# businesses and spawn points from src/lib/gameData.ts.
EXCLUDE = [
    (0, 2, 9), (-60, -30, 8), (95, -80, 12), (0, -120, 14),
    (-60, -30, 8), (70, -20, 8), (-80, 60, 8), (90, 80, 9), (-40, -90, 9), (60, 100, 8), (-110, -110, 9), (110, 110, 9),
    (0, 30, 8), (8, 4, 4), (-6, 8, 4), (15, -8, 4), (80, -95, 6), (110, -70, 6),
]
# (90, 80): at z=75 the 28 m park spilled 4 m onto the z=60 road
PARKS = [(-80, -80, 28), (90, 80, 28)]
FOUNTAIN = (0.0, -6.0, 3.6)


def B(p):
    x, y, z = p
    return (x, -z, y)


# ---------------------------------------------------------------------------
# Textures (numpy, sRGB, row 0 = bottom)
# ---------------------------------------------------------------------------


def _rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def _noise(n, scale, rnd):
    small = rnd.random((n // scale + 2, n // scale + 2)).astype(np.float32)
    up = np.kron(small, np.ones((scale, scale), np.float32))[:n, :n]
    k = scale
    # cheap blur
    for axis in (0, 1):
        up = sum(np.roll(up, s, axis=axis) for s in range(-k // 2, k // 2 + 1)) / (k + 1)
    return up


def facade_textures(style, seed, size=512):
    rnd = np.random.default_rng(seed)
    cw = size // CELLS
    yy, xx = np.mgrid[0:size, 0:size]
    fx = (xx % cw) / cw  # 0..1 inside a cell
    fy = (yy % cw) / cw
    cx, cy = xx // cw, yy // cw
    n = _noise(size, 8, rnd)[..., None]

    if style == "glass":
        wall, glass_a, glass_b = _rgb("#2a3138"), _rgb("#5a8fb0"), _rgb("#1b3448")
        win = (fx > 0.04) & (fx < 0.96) & (fy > 0.22) & (fy < 0.97)
        spandrel = _rgb("#203040")
    elif style == "office":
        wall, glass_a, glass_b = _rgb("#bdb7ab"), _rgb("#6d8796"), _rgb("#25323b")
        win = (fy > 0.3) & (fy < 0.85) & ((fx > 0.03) | (fx < 0.97))
        spandrel = wall
    elif style == "brick":
        wall, glass_a, glass_b = _rgb("#8a4632"), _rgb("#7d93a3"), _rgb("#2a3540")
        win = (fx > 0.25) & (fx < 0.75) & (fy > 0.25) & (fy < 0.82)
        spandrel = wall
    else:  # modern
        wall, glass_a, glass_b = _rgb("#e4e2dc"), _rgb("#7a9cb3"), _rgb("#22323f")
        win = (fx > 0.36) & (fx < 0.64) & (fy > 0.12) & (fy < 0.92)
        spandrel = wall

    t = (fy[..., None] * 0.8 + n * 0.4).clip(0, 1)
    glass = glass_b * (1 - t) + glass_a * t
    base = np.broadcast_to(wall, (size, size, 3)).copy() * (0.92 + 0.16 * n)
    if style == "glass":
        base[:] = spandrel * (0.9 + 0.2 * n)
        mull = ((fx < 0.04) | (fx > 0.96))[..., None]
        base = np.where(mull, wall, base)
    if style == "brick":
        by = (yy % 8) < 1
        bx = ((xx + (yy // 8 % 2) * 8) % 16) < 1
        base = np.where((by | bx)[..., None], _rgb("#b8ab98"), base * (0.9 + 0.2 * rnd.random((size, size, 1))))
        frame = ((fx > 0.22) & (fx < 0.78) & (fy > 0.22) & (fy < 0.85))[..., None]
        base = np.where(frame, _rgb("#e6e2d8"), base)
    base = np.where(win[..., None], glass, base)

    # Night: random lit windows, warm/cool
    lit = rnd.random((CELLS, CELLS)) < 0.38
    tint = np.where(rnd.random((CELLS, CELLS, 1)) < 0.7, _rgb("#ffcf86"), _rgb("#cfe6ff"))
    bright = rnd.uniform(0.55, 1.0, (CELLS, CELLS, 1))
    emis = np.zeros((size, size, 3), np.float32)
    cell_col = (tint * bright)[cy, cx]
    emis = np.where((win & lit[cy, cx])[..., None], cell_col * (0.75 + 0.25 * fy[..., None]), emis)

    # metallic-roughness: G = roughness, B = metallic
    mr = np.zeros((size, size, 3), np.float32)
    mr[..., 1] = np.where(win, 0.08, 0.85 if style != "glass" else 0.45)
    mr[..., 2] = np.where(win, 0.6, 0.0 if style != "glass" else 0.5)
    return base.astype(np.float32), emis, mr


def simple_texture(kind, seed, size=256):
    rnd = np.random.default_rng(seed)
    n = _noise(size, 4, rnd)[..., None]
    fine = rnd.random((size, size, 1)).astype(np.float32)
    yy, xx = np.mgrid[0:size, 0:size]
    if kind == "asphalt":
        return _rgb("#3a3b3f") * (0.8 + 0.25 * n + 0.15 * fine)
    if kind == "sidewalk":
        grid = ((xx % 64) < 2) | ((yy % 64) < 2)
        c = _rgb("#8f8b84") * (0.88 + 0.12 * n + 0.08 * fine)
        return np.where(grid[..., None], _rgb("#66635d"), c)
    if kind == "plaza":
        grid = ((xx % 32) < 2) | (((yy + (xx // 32 % 2) * 16) % 32) < 2)
        c = np.where(((xx // 32 + yy // 32) % 2 == 0)[..., None], _rgb("#c7b79a"), _rgb("#b3a184"))
        return np.where(grid[..., None], _rgb("#857a66"), c * (0.9 + 0.1 * n + 0.06 * fine))
    if kind == "grass":
        return _rgb("#3d6b2c") * (0.75 + 0.35 * n + 0.2 * fine)
    if kind == "roof":
        return _rgb("#55575b") * (0.8 + 0.2 * n + 0.2 * fine)
    raise ValueError(kind)


# ---------------------------------------------------------------------------
# Mesh accumulation
# ---------------------------------------------------------------------------


class Acc:
    def __init__(self):
        self.parts = {}

    def quad(self, key, pts, uvs, outward):
        v, f, u = self.parts.setdefault(key, ([], [], []))
        a, b, c = (np.array(p, float) for p in pts[:3])
        if np.dot(np.cross(b - a, c - a), outward) < 0:
            pts, uvs = pts[::-1], uvs[::-1]
        i = len(v)
        v += [B(p) for p in pts]
        u += list(uvs)
        f.append(tuple(range(i, i + len(pts))))

    def box(self, key_side, key_top, x0, x1, z0, z1, y0, y1, uv="world", uv_scale=4.0, v_off=0.0, bottom=False):
        corners = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
        normals = [(0, 0, -1), (1, 0, 0), (0, 0, 1), (-1, 0, 0)]
        for i in range(4):
            (ax, az), (bx, bz) = corners[i], corners[(i + 1) % 4]
            L = math.hypot(bx - ax, bz - az)
            if uv == "facade":
                u0, u1 = 0.0, L / TILE_W
                v0, v1 = (y0 - v_off) / TILE_H, (y1 - v_off) / TILE_H
            else:
                u0, u1 = 0.0, L / uv_scale
                v0, v1 = y0 / uv_scale, y1 / uv_scale
            self.quad(key_side, [(ax, y0, az), (bx, y0, bz), (bx, y1, bz), (ax, y1, az)],
                      [(u0, v0), (u1, v0), (u1, v1), (u0, v1)], normals[i])
        if key_top:
            s = uv_scale
            self.quad(key_top, [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)],
                      [(x0 / s, z0 / s), (x1 / s, z0 / s), (x1 / s, z1 / s), (x0 / s, z1 / s)], (0, 1, 0))
        if bottom:
            self.quad(key_side, [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)],
                      [(0, 0)] * 4, (0, -1, 0))

    def flat(self, key, x0, x1, z0, z1, y, s=4.0):
        self.quad(key, [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)],
                  [(x0 / s, z0 / s), (x1 / s, z0 / s), (x1 / s, z1 / s), (x0 / s, z1 / s)], (0, 1, 0))

    def build(self, mats):
        objs = []
        keys = list(self.parts)
        for key in keys:
            v, f, u = self.parts[key]
            uv_map = {}
            ob = lib.mesh_object(key, v, f, [mats[key]])
            layer = ob.data.uv_layers.new(name="UVMap")
            for poly in ob.data.polygons:
                for li, vi in zip(poly.loop_indices, poly.vertices):
                    layer.data[li].uv = u[vi]
            objs.append(ob)
        return objs


# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------


def intervals():
    edges = [-EXTENT] + [e for r in ROADS for e in (r - ROAD_HALF, r + ROAD_HALF)] + [EXTENT]
    return [(edges[i], edges[i + 1]) for i in range(0, len(edges), 2)]


def circle_hits_rect(cx, cz, r, x0, x1, z0, z1):
    dx = max(x0 - cx, 0, cx - x1)
    dz = max(z0 - cz, 0, cz - z1)
    return dx * dx + dz * dz < r * r


def split_lots(rect, rnd, out, max_size=26, min_size=11):
    x0, x1, z0, z1 = rect
    w, d = x1 - x0, z1 - z0
    if max(w, d) <= max_size or min(w, d) < min_size * 2 and max(w, d) < max_size * 1.4:
        out.append(rect)
        return
    if w >= d:
        s = x0 + w * rnd.uniform(0.4, 0.6)
        split_lots((x0, s, z0, z1), rnd, out)
        split_lots((s, x1, z0, z1), rnd, out)
    else:
        s = z0 + d * rnd.uniform(0.4, 0.6)
        split_lots((x0, x1, z0, s), rnd, out)
        split_lots((x0, x1, s, z1), rnd, out)


def make_layout():
    rnd = random.Random(SEED)
    blocks, buildings = [], []
    for (x0, x1) in intervals():
        for (z0, z1) in intervals():
            kind = "block"
            if x0 == -15 and z0 == -15:
                kind = "plaza"
            blocks.append({"x0": x0, "x1": x1, "z0": z0, "z1": z1, "type": kind})
            if kind != "block":
                continue
            lots = []
            split_lots((x0 + SIDEWALK + 0.5, x1 - SIDEWALK - 0.5, z0 + SIDEWALK + 0.5, z1 - SIDEWALK - 0.5), rnd, lots)
            for (lx0, lx1, lz0, lz1) in lots:
                bx0, bx1 = lx0 + 1.0, lx1 - 1.0
                bz0, bz1 = lz0 + 1.0, lz1 - 1.0
                if bx1 - bx0 < 7 or bz1 - bz0 < 7:
                    continue
                if any(circle_hits_rect(cx, cz, r, bx0, bx1, bz0, bz1) for cx, cz, r in EXCLUDE):
                    continue
                if any(circle_hits_rect(px, pz, s * 0.75, bx0, bx1, bz0, bz1) for px, pz, s in PARKS):
                    continue
                cx, cz = (bx0 + bx1) / 2, (bz0 + bz1) / 2
                d = math.hypot(cx - 0, cz + 50)
                h = 14 + 78 * math.exp(-d / 55) + rnd.uniform(-6, 14)
                if abs(cx) > 100 or abs(cz) > 100:
                    h = min(h, rnd.uniform(10, 24))
                h = round(max(9.0, h), 1)
                if h > 48:
                    style = rnd.choice(["glass", "glass", "modern"])
                elif h > 26:
                    style = rnd.choice(["office", "modern", "glass"])
                else:
                    style = rnd.choice(["brick", "brick", "office", "modern"])
                buildings.append({"x": round(cx, 2), "z": round(cz, 2), "w": round(bx1 - bx0, 2), "d": round(bz1 - bz0, 2),
                                  "h": h, "style": style})

    # Props --------------------------------------------------------------
    props = {k: [] for k in ("streetlight", "tree", "cypress", "traffic_light", "bench", "hydrant", "trash_bin", "planter")}

    def near_intersection(t):
        return any(abs(t - r) < ROAD_HALF + 4 for r in ROADS)

    off = ROAD_HALF + 1.0
    for r in ROADS:
        for side in (-1, 1):
            k = 0
            for t in np.arange(-EXTENT + 6, EXTENT - 6, 12.0):
                t = float(t)
                if near_intersection(t):
                    continue
                k += 1
                # roads along X at z=r, and along Z at x=r
                along_x = (t, r + side * off, math.pi if side > 0 else 0.0)
                along_z = (r + side * off, t, -math.pi / 2 if side > 0 else math.pi / 2)
                for (x, z, rot) in (along_x, along_z):
                    if k % 2 == 0:
                        props["streetlight"].append([round(x, 2), round(z, 2), round(rot, 4)])
                    elif k % 6 == 1:
                        props["cypress" if rnd.random() < 0.4 else "tree"].append([round(x, 2), round(z, 2), round(rnd.uniform(0, 6.28), 3)])
                    elif k % 6 == 3:
                        kind = rnd.choice(["bench", "hydrant", "trash_bin", "planter"])
                        props[kind].append([round(x, 2), round(z, 2), round(rot, 4)])
                    else:
                        props["tree"].append([round(x, 2), round(z, 2), round(rnd.uniform(0, 6.28), 3)])
    for rx in ROADS:
        for rz in ROADS:
            for sx, sz in ((1, 1), (-1, -1)):
                rot = -math.pi / 2 if sx > 0 else math.pi / 2
                props["traffic_light"].append([rx + sx * (ROAD_HALF + 1.2), rz + sz * (ROAD_HALF + 1.2), rot])
    for (px, pz, s) in PARKS:
        for i in range(14):
            a = rnd.uniform(0, 2 * math.pi)
            rr = rnd.uniform(3, s / 2 - 1.5)
            props["tree" if i % 3 else "cypress"].append([round(px + math.cos(a) * rr, 2), round(pz + math.sin(a) * rr, 2), round(a, 3)])
        for k in range(4):
            a = k * math.pi / 2
            props["bench"].append([round(px + math.cos(a) * 5, 2), round(pz + math.sin(a) * 5, 2), round(-a - math.pi / 2, 3)])
    fx, fz, _ = FOUNTAIN
    for k in range(6):
        a = k * math.pi / 3
        props["planter"].append([round(fx + math.cos(a) * 9.5, 2), round(fz + math.sin(a) * 9.5, 2), 0.0])

    return {
        "roads": {"centers": ROADS, "halfWidth": ROAD_HALF, "extent": EXTENT},
        "curbHeight": CURB,
        "blocks": blocks,
        "parks": [{"x": x, "z": z, "size": s} for x, z, s in PARKS],
        "fountain": {"x": FOUNTAIN[0], "z": FOUNTAIN[1], "r": FOUNTAIN[2]},
        "buildings": buildings,
        "props": props,
    }


# ---------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------


def build_geometry(layout, acc, rnd):
    E = EXTENT + 5
    acc.flat("grass", -300, 300, -300, 300, -0.03, s=6)
    acc.flat("asphalt", -E, E, -E, E, 0.0, s=8)

    # Markings
    def strip(key, x0, x1, z0, z1):
        acc.flat(key, min(x0, x1), max(x0, x1), min(z0, z1), max(z0, z1), 0.012, s=1)

    for r in ROADS:
        segs = []
        cuts = sorted([-E] + [c for q in ROADS for c in (q - ROAD_HALF, q + ROAD_HALF)] + [E])
        for a, b in zip(cuts[0::2], cuts[1::2]):
            segs.append((a, b))
        for a, b in segs:
            # double yellow centre line
            for o in (-0.18, 0.18):
                strip("paint_yellow", a, b, r + o - 0.06, r + o + 0.06)
                strip("paint_yellow", r + o - 0.06, r + o + 0.06, a, b)
            # dashed white lane edges
            for t in np.arange(a + 1, b - 1, 6.0):
                for o in (-3.3, 3.3):
                    strip("paint_white", t, min(t + 3, b), r + o - 0.07, r + o + 0.07)
                    strip("paint_white", r + o - 0.07, r + o + 0.07, t, min(t + 3, b))
        # crosswalks + stop lines at every intersection
        for q in ROADS:
            for sgn in (-1, 1):
                c0 = q + sgn * (ROAD_HALF + 0.6)
                for k in np.arange(-ROAD_HALF + 0.6, ROAD_HALF - 0.4, 1.0):
                    strip("paint_white", c0, c0 + sgn * 2.6, r + k, r + k + 0.5)
                    strip("paint_white", r + k, r + k + 0.5, c0, c0 + sgn * 2.6)

    # Blocks: raised slabs with curb
    for b in layout["blocks"]:
        top = "plaza" if b["type"] == "plaza" else "sidewalk"
        acc.box("curb", top, b["x0"], b["x1"], b["z0"], b["z1"], 0.0, CURB, uv_scale=3.0)
    for p in layout["parks"]:
        h = p["size"] / 2
        acc.flat("grass", p["x"] - h, p["x"] + h, p["z"] - h, p["z"] + h, CURB + 0.01, s=6)
        # paths across the park
        acc.flat("plaza", p["x"] - 1.2, p["x"] + 1.2, p["z"] - h, p["z"] + h, CURB + 0.02, s=3)
        acc.flat("plaza", p["x"] - h, p["x"] + h, p["z"] - 1.2, p["z"] + 1.2, CURB + 0.02, s=3)

    # Buildings
    for bd in layout["buildings"]:
        x0, x1 = bd["x"] - bd["w"] / 2, bd["x"] + bd["w"] / 2
        z0, z1 = bd["z"] - bd["d"] / 2, bd["z"] + bd["d"] / 2
        h, style = bd["h"], bd["style"]
        fac = "facade_" + style
        y0 = CURB
        # lobby (inset glass) + canopy
        acc.box("storefront", None, x0 + 0.4, x1 - 0.4, z0 + 0.4, z1 - 0.4, y0, LOBBY_H, uv_scale=3)
        acc.box("concrete", "concrete", x0 - 0.6, x1 + 0.6, z0 - 0.6, z1 + 0.6, LOBBY_H, LOBBY_H + 0.35, uv_scale=3, bottom=True)
        for cx, cz in ((x0, z0), (x1, z0), (x1, z1), (x0, z1)):
            acc.box("concrete", None, cx - 0.35, cx + 0.35, cz - 0.35, cz + 0.35, y0, LOBBY_H, uv_scale=3)
        # main body, with a setback crown on towers
        if h > 45:
            mid = round(LOBBY_H + (h - LOBBY_H) * 0.68)
            acc.box(fac, "roof", x0, x1, z0, z1, LOBBY_H + 0.35, mid, uv="facade", v_off=LOBBY_H, uv_scale=8)
            ix, iz = bd["w"] * 0.13, bd["d"] * 0.13
            acc.box(fac, "roof", x0 + ix, x1 - ix, z0 + iz, z1 - iz, mid, h, uv="facade", v_off=LOBBY_H, uv_scale=8)
            acc.box("concrete", None, x0, x1, z0, z1, mid, mid + 0.9, uv_scale=3)
            tx0, tx1, tz0, tz1 = x0 + ix, x1 - ix, z0 + iz, z1 - iz
        else:
            acc.box(fac, "roof", x0, x1, z0, z1, LOBBY_H + 0.35, h, uv="facade", v_off=LOBBY_H, uv_scale=8)
            tx0, tx1, tz0, tz1 = x0, x1, z0, z1
        # parapet
        t = 0.35
        for (a0, a1, b0, b1) in ((tx0, tx1, tz0, tz0 + t), (tx0, tx1, tz1 - t, tz1), (tx0, tx0 + t, tz0, tz1), (tx1 - t, tx1, tz0, tz1)):
            acc.box("concrete", "concrete", a0, a1, b0, b1, h, h + 0.9, uv_scale=3)
        # rooftop equipment
        for _ in range(rnd.randint(1, 3)):
            ux = rnd.uniform(tx0 + 2, tx1 - 4)
            uz = rnd.uniform(tz0 + 2, tz1 - 4)
            acc.box("rooftop", "rooftop", ux, ux + rnd.uniform(1.5, 3), uz, uz + rnd.uniform(1.5, 3), h, h + rnd.uniform(1, 2.2), uv_scale=2)
        if h > 70:
            acc.box("rooftop", "rooftop", bd["x"] - 0.15, bd["x"] + 0.15, bd["z"] - 0.15, bd["z"] + 0.15, h, h + 14, uv_scale=2)
            acc.box("beacon", "beacon", bd["x"] - 0.3, bd["x"] + 0.3, bd["z"] - 0.3, bd["z"] + 0.3, h + 14, h + 14.5, uv_scale=1)


def build_city(out_dir, layout_path):
    lib.reset_scene()
    rnd = random.Random(SEED + 1)
    layout = make_layout()
    tmp = os.path.join(out_dir, "_tex")

    mats = {}
    for i, style in enumerate(["glass", "office", "brick", "modern"]):
        base, emis, mr = facade_textures(style, SEED + i)
        mats["facade_" + style] = lib.material(
            "facade_" + style,
            base_tex=lib.image_from_array(f"facade_{style}", base, tmp),
            emit_tex=lib.image_from_array(f"facade_{style}_night", emis, tmp),
            mr_tex=lib.image_from_array(f"facade_{style}_mr", mr, tmp),
            emission_strength=1.0,
        )
    for kind, rough in (("asphalt", 0.92), ("sidewalk", 0.85), ("plaza", 0.8), ("grass", 0.95), ("roof", 0.9)):
        mats[kind] = lib.material(kind, roughness=rough, base_tex=lib.image_from_array(kind, simple_texture(kind, SEED), tmp))
    mats["curb"] = lib.material("curb", "#9d9a93", roughness=0.85)
    mats["concrete"] = lib.material("concrete", "#c9c5bc", roughness=0.85)
    mats["storefront"] = lib.material("storefront", "#1b232c", metallic=0.4, roughness=0.12, emission="#ffcf8a", emission_strength=0.6)
    mats["rooftop"] = lib.material("rooftop", "#8e9399", metallic=0.6, roughness=0.5)
    mats["beacon"] = lib.material("beacon", "#ff2020", emission="#ff2020", emission_strength=4)
    mats["paint_white"] = lib.material("paint_white", "#e8e8e2", roughness=0.7)
    mats["paint_yellow"] = lib.material("paint_yellow", "#e0b62a", roughness=0.7)
    mats["water"] = lib.material("water", "#2f7fb8", metallic=0.1, roughness=0.05, emission="#1d5c8a", emission_strength=0.4)
    mats["stone"] = lib.material("fountain_stone", "#d8d2c4", roughness=0.7)

    acc = Acc()
    build_geometry(layout, acc, rnd)
    objs = acc.build(mats)

    # Fountain (lathed) in the HQ plaza
    fx, fz, fr = FOUNTAIN
    loc = B((fx, CURB, fz))
    basin = lib.lathe("basin", [(0, 0), (fr, 0), (fr, 0.6), (fr - 0.3, 0.6), (fr - 0.3, 0.2), (0, 0.2)], mats["stone"], segments=40, axis="Z", smooth=False)
    water = lib.cylinder("water", fr - 0.3, 0.05, loc=(0, 0, 0.45), mat=mats["water"], verts=40)
    column = lib.lathe("column", [(0.5, 0), (0.35, 0.4), (0.25, 1.6), (1.4, 1.8), (1.3, 2.0), (0.2, 2.1), (0.15, 2.8), (0, 2.9)],
                       mats["stone"], segments=32, axis="Z")
    water2 = lib.cylinder("water2", 1.25, 0.04, loc=(0, 0, 1.95), mat=mats["water"], verts=32)
    f = lib.join([basin, water, column, water2], "fountain")
    f.location = loc
    lib.join(objs + [f], "city")

    lib.export_glb(os.path.join(out_dir, "city.glb"))
    with open(layout_path, "w") as fh:
        json.dump(layout, fh, separators=(",", ":"))
    print(f"  -> {os.path.relpath(layout_path)}  ({len(layout['buildings'])} buildings)")
    import shutil

    shutil.rmtree(tmp, ignore_errors=True)
