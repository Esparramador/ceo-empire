"""Procedural car models for CEO Empire.

Each car is lofted from cross-sections driven by a handful of profile curves
(side silhouette, plan width, greenhouse), then dressed with ray-cast-placed
details (lights, grille, mirrors, handles, plates) and real wheel assemblies.

Exported node layout (three.js, +Z forward):
    body               – paint/glass/trim/lights, multi-material
    wheel_FL/FR/RL/RR  – origin at wheel centre, spin on X, steer on Y
Materials named `headlight` / `taillight` let the game drive them at runtime.

To add a new car, append a dict to CARS (copy the closest existing one) and
re-run `python3 blender/build_assets.py --only cars`.
"""

import math

import numpy as np
from mathutils import Matrix, Vector

import lib

# ---------------------------------------------------------------------------
# Designs
# ---------------------------------------------------------------------------
# t runs 0 (front bumper) -> 1 (rear bumper). Heights in metres.

CARS = [
    {
        "id": "rosso_ceo",
        "label": "Rosso CEO",
        "paint": "#b3110f",
        "L": 4.62, "W": 1.98, "wheelbase": 2.66, "front_overhang": 1.02,
        "wheel_r": 0.35, "wheel_w": 0.30, "clearance": 0.11, "shoulder": 0.60,
        "top": [(0, 0.40), (0.03, 0.54), (0.12, 0.68), (0.25, 0.79), (0.33, 0.86),
                (0.62, 0.95), (0.85, 0.99), (0.96, 0.95), (1.0, 0.78)],
        "width": [(0, 0.70), (0.03, 0.88), (0.1, 0.97), (0.22, 1.0), (0.46, 0.93),
                  (0.72, 1.0), (0.95, 0.96), (1.0, 0.84)],
        "cabin": {"t0": 0.30, "t1": 0.74, "belt": 0.80, "roof_w": 0.60,
                  "roof": [(0.30, 0.84), (0.44, 1.16), (0.53, 1.19), (0.62, 1.14), (0.74, 0.96)]},
        "rim": {"style": "twin", "spokes": 5, "color": "#2b2d31"}, "caliper": "#f2c200",
        "headlights": {"x": 0.70, "z": 0.58, "size": (0.36, 0.07, 0.09), "shape": "slit"},
        "taillights": {"x": 0.62, "z": 0.80, "size": (0.15, 0.08, 0.15), "shape": "round", "pairs": 2},
        "grille": {"style": "sport", "z": 0.27, "w": 0.95, "h": 0.12},
        "spoiler": "ducktail", "side_intake": True, "exhaust": [(-0.28, 0.32), (0.28, 0.32)],
        "plate": "CEO 001",
    },
    {
        "id": "toro_azul",
        "label": "Toro Azul",
        "paint": "#1846c9",
        "L": 4.82, "W": 2.05, "wheelbase": 2.72, "front_overhang": 1.08,
        "wheel_r": 0.36, "wheel_w": 0.33, "clearance": 0.10, "shoulder": 0.58,
        "top": [(0, 0.36), (0.02, 0.46), (0.20, 0.66), (0.30, 0.76), (0.60, 0.94),
                (0.90, 0.97), (0.985, 0.92), (1.0, 0.70)],
        "width": [(0, 0.66), (0.025, 0.86), (0.12, 0.98), (0.25, 1.0), (0.48, 0.92),
                  (0.75, 1.0), (0.97, 0.97), (1.0, 0.88)],
        "cabin": {"t0": 0.27, "t1": 0.73, "belt": 0.80, "roof_w": 0.56,
                  "roof": [(0.27, 0.74), (0.45, 1.10), (0.56, 1.12), (0.73, 0.94)]},
        "faceted": True,
        "rim": {"style": "multi", "spokes": 10, "color": "#111214"}, "caliper": "#ff6a00",
        "headlights": {"x": 0.72, "z": 0.48, "size": (0.42, 0.06, 0.06), "shape": "slit"},
        "taillights": {"x": 0.55, "z": 0.78, "size": (0.5, 0.06, 0.07), "shape": "slit", "pairs": 1},
        "grille": {"style": "sport", "z": 0.24, "w": 1.10, "h": 0.10},
        "spoiler": "wing", "side_intake": True, "exhaust": [(0.0, 0.50)],
        "plate": "CEO 002",
    },
    {
        "id": "volt_verde",
        "label": "Volt Verde",
        "paint": "#17714a",
        "L": 4.97, "W": 1.96, "wheelbase": 2.96, "front_overhang": 0.95,
        "wheel_r": 0.35, "wheel_w": 0.26, "clearance": 0.15, "shoulder": 0.76,
        "top": [(0, 0.55), (0.03, 0.68), (0.10, 0.78), (0.24, 0.87), (0.30, 0.90),
                (0.70, 0.97), (0.92, 0.98), (0.98, 0.90), (1.0, 0.74)],
        "width": [(0, 0.78), (0.03, 0.90), (0.1, 0.98), (0.3, 1.0), (0.75, 1.0),
                  (0.95, 0.96), (1.0, 0.86)],
        "cabin": {"t0": 0.27, "t1": 0.92, "belt": 0.86, "roof_w": 0.66, "glass_roof": True,
                  "roof": [(0.27, 0.88), (0.40, 1.36), (0.52, 1.42), (0.66, 1.37), (0.92, 0.97)]},
        "rim": {"style": "aero", "spokes": 5, "color": "#c9ccd1"}, "caliper": "#6b6f75",
        "headlights": {"x": 0.70, "z": 0.70, "size": (0.36, 0.06, 0.07), "shape": "slit"},
        "taillights": {"x": 0.60, "z": 0.86, "size": (0.40, 0.06, 0.07), "shape": "slit", "pairs": 1},
        "lightbar": True,
        "grille": None,
        "spoiler": None, "side_intake": False, "exhaust": [],
        "plate": "CEO 003",
    },
    {
        "id": "dorado_royale",
        "label": "Dorado Royale",
        "paint": "#c8a034",
        "L": 5.76, "W": 2.02, "wheelbase": 3.55, "front_overhang": 0.98,
        "wheel_r": 0.41, "wheel_w": 0.28, "clearance": 0.17, "shoulder": 0.94,
        "top": [(0, 0.82), (0.02, 1.00), (0.06, 1.07), (0.30, 1.11), (0.75, 1.11),
                (0.95, 1.09), (1.0, 0.94)],
        "width": [(0, 0.86), (0.02, 0.95), (0.08, 1.0), (0.92, 1.0), (1.0, 0.92)],
        "cabin": {"t0": 0.31, "t1": 0.86, "belt": 0.90, "roof_w": 0.74,
                  "roof": [(0.31, 1.10), (0.40, 1.58), (0.48, 1.64), (0.76, 1.62), (0.86, 1.14)]},
        "sigma": 3.0,
        "rim": {"style": "classic", "spokes": 14, "color": "#e8e8ea"}, "caliper": "#3a3a3a",
        "headlights": {"x": 0.62, "z": 0.86, "size": (0.34, 0.08, 0.13), "shape": "slit"},
        "taillights": {"x": 0.80, "z": 0.86, "size": (0.10, 0.06, 0.34), "shape": "slit", "pairs": 1},
        "grille": {"style": "luxury", "z": 0.68, "w": 0.62, "h": 0.42},
        "spoiler": None, "side_intake": False, "exhaust": [(-0.45, 0.30), (0.45, 0.30)],
        "two_tone": "#1a1a1d",
        "plate": "CEO 004",
    },
    {
        "id": "bianco_gt",
        "label": "Bianco GT",
        "paint": "#eef0f2",
        "L": 4.52, "W": 1.86, "wheelbase": 2.45, "front_overhang": 0.98,
        "wheel_r": 0.34, "wheel_w": 0.28, "clearance": 0.12, "shoulder": 0.64,
        "top": [(0, 0.46), (0.03, 0.60), (0.10, 0.70), (0.30, 0.80), (0.40, 0.85),
                (0.80, 0.87), (0.95, 0.84), (1.0, 0.68)],
        "width": [(0, 0.78), (0.03, 0.90), (0.15, 0.95), (0.42, 0.92), (0.72, 1.0),
                  (0.95, 0.97), (1.0, 0.88)],
        "cabin": {"t0": 0.36, "t1": 0.96, "belt": 0.84, "roof_w": 0.64,
                  "roof": [(0.36, 0.84), (0.48, 1.25), (0.56, 1.28), (0.70, 1.19), (0.96, 0.86)]},
        "rim": {"style": "twin", "spokes": 5, "color": "#b9bcc2"}, "caliper": "#d01818",
        "headlights": {"x": 0.68, "z": 0.62, "size": (0.2, 0.1, 0.2), "shape": "round"},
        "taillights": {"x": 0.55, "z": 0.70, "size": (0.45, 0.06, 0.06), "shape": "slit", "pairs": 1},
        "lightbar_rear": True,
        "grille": {"style": "sport", "z": 0.30, "w": 0.90, "h": 0.12},
        "spoiler": "ducktail", "side_intake": False, "exhaust": [(-0.30, 0.28), (0.30, 0.28)],
        "plate": "CEO 005",
    },
]


def _variant(base_id, **over):
    """A new car from an existing design: same body, its own paint, plate and label."""
    base = next(c for c in CARS if c["id"] == base_id)
    return {**base, **over}


# Story cars (CEO Empire campaign): the city taxi, the police patrol and the
# black saloon the mole escapes in. Roof sign and light bar are added in-game.
CARS += [
    _variant("volt_verde", id="taxi_crafter", label="Taxi Crafter", paint="#f2c318", two_tone="#151515",
             rim={"style": "aero", "spokes": 5, "color": "#2b2d31"}, plate="TAXI 07"),
    _variant("bianco_gt", id="patrulla", label="Patrulla", paint="#f4f6f8", two_tone="#1c3f8f",
             rim={"style": "twin", "spokes": 5, "color": "#2b2d31"}, caliper="#1c3f8f", plate="POL 112"),
    _variant("dorado_royale", id="sedan_negro", label="Sedán de Víctor", paint="#16171b", two_tone="#16171b",
             caliper="#3a3a3a", plate="TTN 666"),
]


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------


def car_materials(spec):
    return {
        "paint": lib.material(f"paint_{spec['id']}", spec["paint"], metallic=0.65, roughness=0.28, coat=1.0),
        "glass": lib.material("glass", "#0a121b", metallic=0.3, roughness=0.04, alpha=0.82),
        "trim": lib.material("trim", "#0d0e10", roughness=0.55),
        "under": lib.material("underbody", "#08080a", roughness=0.9),
        "chrome": lib.material("chrome", "#f2f3f5", metallic=1.0, roughness=0.08),
        "headlight": lib.material("headlight", "#ffffff", roughness=0.05, emission="#fff4dc", emission_strength=1.5),
        "taillight": lib.material("taillight", "#7a0000", roughness=0.1, emission="#ff1010", emission_strength=0.8),
        "tire": lib.material("tire", "#141414", roughness=0.92),
        "rim": lib.material(f"rim_{spec['id']}", spec["rim"]["color"], metallic=1.0, roughness=0.25),
        "disc": lib.material("brake_disc", "#6a6c70", metallic=1.0, roughness=0.45),
        "caliper": lib.material(f"caliper_{spec['id']}", spec["caliper"], roughness=0.35),
        "leather": lib.material("leather", "#2a1d17", roughness=0.6),
        "plate": lib.material("plate", "#f5f2e6", roughness=0.4),
        "plate_text": lib.material("plate_text", "#10204a", roughness=0.4),
        "two_tone": lib.material(f"tone_{spec['id']}", spec.get("two_tone", "#111111"), metallic=0.6, roughness=0.25, coat=1.0),
    }


# ---------------------------------------------------------------------------
# Body
# ---------------------------------------------------------------------------


class Profiles:
    def __init__(self, s):
        sig = s.get("sigma", 1.5 if s.get("faceted") else 5.0)
        self.s = s
        self.top = lib.smooth_profile(s["top"], sigma=sig)
        self.wid = lib.smooth_profile(s["width"], sigma=sig)
        self.roof = lib.smooth_profile(s["cabin"]["roof"], sigma=sig)
        self.L, self.W = s["L"], s["W"]
        yf = -self.L / 2 + s["front_overhang"]
        self.axles = [yf, yf + s["wheelbase"]]

    def y(self, t):
        return -self.L / 2 + t * self.L

    def half_w(self, t):
        return self.W / 2 * self.wid(t)

    def bottom(self, t):
        s = self.s
        y = self.y(t)
        edge = min(t, 1 - t)
        zb = s["clearance"] + 0.14 * max(0.0, 1 - edge / 0.06) ** 2  # bumpers tuck up
        ra = s["wheel_r"] + 0.07
        for ya in self.axles:
            d = abs(y - ya)
            if d < ra:
                zb = max(zb, s["wheel_r"] + math.sqrt(ra * ra - d * d))
        return min(zb, self.shoulder(t) - 0.07)

    def fender(self, t):
        """Top height for the outer part of the section: bulges over each wheel."""
        y = self.y(t)
        R = self.s["wheel_r"]
        z = self.top(t)
        for ya in self.axles:
            d = abs(y - ya) / (R + 0.35)
            if d < 1:
                z = max(z, (2 * R + 0.08) * (0.5 + 0.5 * math.cos(math.pi * d)) + z * (0.5 - 0.5 * math.cos(math.pi * d)))
        return z

    def shoulder(self, t):
        return min(self.s["shoulder"], self.top(t) - 0.08)


def hull_ring(p, t, faceted):
    w, zt, zb, zs = p.half_w(t), p.top(t), p.bottom(t), p.shoulder(t)
    zf = p.fender(t)
    mid = zb + 0.55 * (zs - zb)
    crown = 0.025
    right = [
        (0.0, zb), (0.80 * w, zb), (0.95 * w, zb + 0.35 * (mid - zb)), (w, mid), (w, zs),
        (0.965 * w, zs + 0.45 * (zf - zs)), (0.84 * w, zf - 0.012), (0.6 * w, 0.4 * zf + 0.6 * zt),
        (0.35 * w, zt), (0.0, zt + crown),
    ]
    left = [(-x, z) for x, z in reversed(right[1:-1])]
    poly = right + left
    pts = poly if faceted else lib.catmull_closed(poly, sub=3)
    y = p.y(t)
    return [(x, y, z) for x, z in pts]


def stations(n, extra=()):
    u = np.linspace(0, 1, n)
    ts = 0.5 - 0.5 * np.cos(np.pi * u)  # dense at the bumpers
    return np.unique(np.round(np.concatenate([ts, extra]), 5))


def build_hull(p, m):
    s = p.s
    extra = []
    for ya in p.axles:  # extra stations around arches
        for d in np.linspace(-(s["wheel_r"] + 0.12), s["wheel_r"] + 0.12, 15):
            extra.append((ya + d + p.L / 2) / p.L)
    ts = stations(70, extra)
    rings = [hull_ring(p, t, s.get("faceted")) for t in ts]
    ob = lib.loft("hull", rings, m["paint"], smooth=not s.get("faceted"))
    if s.get("faceted"):
        lib.smooth_by_angle(ob, 25)
    me = ob.data
    me.materials.append(m["under"])
    me.materials.append(m["two_tone"])
    for poly in me.polygons:
        c = poly.center
        if poly.normal.z < -0.45:
            poly.material_index = 1
        elif s.get("two_tone") and c.z > p.shoulder(0.5) + 0.06 and abs(poly.normal.z) < 0.8:
            poly.material_index = 2
    return ob


def build_cabin(p, m):
    c = p.s["cabin"]
    ts = np.linspace(c["t0"], c["t1"], 46)
    roof_max = max(p.roof(t) for t in ts)
    rings = []
    for t in ts:
        zt = p.top(t)
        zr = max(p.roof(t), zt + 0.015)
        w = p.half_w(t)
        wb, wr = w * c["belt"], w * c["roof_w"]
        mid = zt + 0.5 * (zr - zt)
        right = [(0.0, zt - 0.12), (wb, zt - 0.12), (wb, zt), (0.5 * (wb + wr) + 0.02, mid),
                 (wr, zr - 0.05), (0.55 * wr, zr), (0.0, zr + 0.01)]
        left = [(-x, z) for x, z in reversed(right[1:-1])]
        pts = lib.catmull_closed(right + left, sub=3)
        y = p.y(t)
        rings.append([(x, y, z) for x, z in pts])
    ob = lib.loft("cabin", rings, m["glass"])
    me = ob.data
    me.materials.append(m["paint"])
    me.materials.append(m["trim"])
    for poly in me.polygons:
        cz = poly.center.z
        if poly.normal.z > 0.8 and cz > roof_max - 0.2 and not c.get("glass_roof"):
            poly.material_index = 1
        elif cz < p.top(0.5) + 0.03 and abs(poly.normal.z) < 0.6:
            poly.material_index = 2  # black window seal along the belt
    return ob


def oriented(ob, normal, base=(0, -1, 0)):
    q = Vector(base).rotation_difference(normal)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = q
    return ob


def on_surface(hull, origin, direction, make, inset=0.02):
    hit = lib.ray_hit(hull, origin, direction)
    if not hit:
        return None
    loc, n = hit
    ob = make()
    base = (0, -1, 0)
    if n.y > 0.5:  # rear-facing: turn the part around first so text/shapes stay upright
        ob.data.transform(Matrix.Rotation(math.pi, 4, "Z"))
        base = (0, 1, 0)
    oriented(ob, n, base)
    ob.location = loc - n * inset
    return ob


def build_details(p, hull, cabin, m):
    s, L, W = p.s, p.L, p.W
    parts = []

    # Headlights / taillights -------------------------------------------------
    def lamp(mat, cfg, front):
        sx, sy, sz = cfg["size"]
        out = []
        for side in (-1, 1):
            for k in range(cfg.get("pairs", 1)):
                x = side * (cfg["x"] - k * 0.16) * W / 2
                y0 = -L if front else L
                d = (0, 1, 0) if front else (0, -1, 0)

                def mk():
                    if cfg["shape"] == "round":
                        return lib.sphere("lamp", 0.5, mat=mat, scale=(sx, sy, sz))
                    return lib.box("lamp", (sx, sy, sz), mat=mat, bevel=min(sx, sy, sz) * 0.35, segments=3)

                ob = on_surface(hull, (x, y0, cfg["z"]), d, mk, inset=sy * 0.3)
                if ob:
                    out.append(ob)
        return out

    parts += lamp(m["headlight"], s["headlights"], True)
    parts += lamp(m["taillight"], s["taillights"], False)
    if s.get("lightbar"):
        parts.append(on_surface(hull, (0, -L, s["headlights"]["z"] + 0.02), (0, 1, 0),
                                lambda: lib.box("bar", (W * 0.55, 0.03, 0.025), mat=m["headlight"])))
    if s.get("lightbar") or s.get("lightbar_rear"):
        parts.append(on_surface(hull, (0, L, s["taillights"]["z"]), (0, -1, 0),
                                lambda: lib.box("bar", (W * 0.75, 0.03, 0.03), mat=m["taillight"])))

    # Grille -------------------------------------------------------------------
    g = s.get("grille")
    if g:
        if g["style"] == "luxury":
            def mk():
                frame = lib.box("grille", (g["w"], 0.1, g["h"]), mat=m["chrome"], bevel=0.015)
                bars = [lib.box("bar", (0.012, 0.06, g["h"] * 0.9), loc=(x, -0.04, 0), mat=m["chrome"])
                        for x in np.linspace(-g["w"] / 2 + 0.04, g["w"] / 2 - 0.04, 15)]
                back = lib.box("gback", (g["w"] * 0.94, 0.05, g["h"] * 0.92), loc=(0, -0.02, 0), mat=m["trim"])
                return lib.join([frame, back] + bars, "grille")
            parts.append(on_surface(hull, (0, -L, g["z"]), (0, 1, 0), mk, inset=0.01))
        else:
            parts.append(on_surface(hull, (0, -L, g["z"]), (0, 1, 0),
                                    lambda: lib.box("grille", (g["w"], 0.12, g["h"]), mat=m["trim"], bevel=0.03, segments=3)))

    # Plates -------------------------------------------------------------------
    for front in (True, False):
        z = (g["z"] + g["h"] / 2 + 0.09) if (front and g and g["style"] != "luxury") else (0.38 if front else 0.45)
        if front and g and g["style"] == "luxury":
            z = g["z"] - g["h"] / 2 - 0.1

        def mk_plate():
            plate = lib.box("plate", (0.52, 0.02, 0.12), mat=m["plate"], bevel=0.005)
            text = make_text(s["plate"], m["plate_text"], 0.075)
            text.location = (0, -0.012, -0.03)
            text.rotation_euler = (math.radians(90), 0, 0)
            return lib.join([plate, text], "plate")

        ob = on_surface(hull, (0, -L if front else L, z), (0, 1, 0) if front else (0, -1, 0), mk_plate, inset=0.0)
        parts.append(ob)

    # Mirrors ------------------------------------------------------------------
    c = s["cabin"]
    tm = c["t0"] + 0.06
    ym, zm = p.y(tm), p.top(tm) + 0.12
    for side in (-1, 1):
        xm = side * (p.half_w(tm) * c["belt"] + 0.12)
        head = lib.box("mirror", (0.2, 0.09, 0.11), loc=(xm, ym, zm), mat=m["paint"], bevel=0.03, segments=3)
        glass = lib.box("mirror_g", (0.16, 0.01, 0.08), loc=(xm, ym + 0.046, zm), mat=m["glass"])
        stalk = lib.box("stalk", (0.12, 0.03, 0.03), loc=(xm - side * 0.08, ym, zm - 0.03), mat=m["trim"])
        parts += [head, glass, stalk]

    # Door handles + side intakes -------------------------------------------------
    td = c["t0"] + 0.18 * (c["t1"] - c["t0"]) + 0.12
    for side in (-1, 1):
        zh = p.shoulder(td) - 0.04
        parts.append(on_surface(hull, (side * W, p.y(td), zh), (-side, 0, 0),
                                lambda: lib.box("handle", (0.2, 0.03, 0.035), mat=m["chrome"], bevel=0.01), inset=0.0))
        if s.get("side_intake"):
            ti = c["t1"] - 0.02
            parts.append(on_surface(hull, (side * W, p.y(ti), p.shoulder(ti) - 0.12), (-side, 0, 0),
                                    lambda: lib.box("intake", (0.5, 0.08, 0.2), mat=m["trim"], bevel=0.04, segments=3), inset=0.03))

    # Exhausts -----------------------------------------------------------------
    for x, z in s.get("exhaust", []):
        hit = lib.ray_hit(hull, (x, L, z), (0, -1, 0))
        if hit:
            parts.append(lib.cylinder("exhaust", 0.055, 0.25, loc=(x, hit[0].y - 0.05, z), rot=(math.pi / 2, 0, 0), mat=m["chrome"]))
            parts.append(lib.cylinder("exhaust_in", 0.042, 0.01, loc=(x, hit[0].y + 0.075, z), rot=(math.pi / 2, 0, 0), mat=m["trim"]))

    # Spoilers -----------------------------------------------------------------
    sp = s.get("spoiler")
    if sp == "wing":
        tz = 0.93
        zt = p.top(tz)
        y = p.y(tz)
        wing = lib.box("wing", (W * 0.88, 0.34, 0.035), loc=(0, y, zt + 0.28), mat=m["trim"], bevel=0.015, rot=(math.radians(-8), 0, 0))
        posts = [lib.box("post", (0.04, 0.12, 0.3), loc=(x, y, zt + 0.12), mat=m["trim"]) for x in (-0.38, 0.38)]
        fins = [lib.box("fin", (0.02, 0.38, 0.12), loc=(x, y, zt + 0.29), mat=m["paint"]) for x in (-W * 0.44, W * 0.44)]
        parts += [wing] + posts + fins
    elif sp == "ducktail":
        tz = 0.975
        y = p.y(tz)
        zt = p.top(tz)
        parts.append(lib.box("ducktail", (p.half_w(tz) * 1.6, 0.18, 0.03), loc=(0, y, zt + 0.02),
                             mat=m["paint"], bevel=0.012, rot=(math.radians(10), 0, 0)))

    # Interior (seen through the glass) -----------------------------------------
    ts = c["t0"] + 0.45 * (c["t1"] - c["t0"])
    belt = p.top(ts)
    head = p.roof(ts) - 0.2
    seat_y = p.y(ts)
    for x in (-0.36, 0.36):
        parts.append(lib.box("seat_back", (0.46, 0.14, head - belt + 0.2), loc=(x, seat_y + 0.05, (head + belt) / 2 - 0.2),
                             mat=m["leather"], bevel=0.05, segments=3, rot=(math.radians(-14), 0, 0)))
        parts.append(lib.box("headrest", (0.26, 0.1, 0.16), loc=(x, seat_y + 0.11, head), mat=m["leather"], bevel=0.04, segments=3))
    if p.L > 5.3:  # limo: rear bench
        yr = p.y(c["t0"] + 0.78 * (c["t1"] - c["t0"]))
        parts.append(lib.box("bench", (1.3, 0.16, 0.5), loc=(0, yr, p.top(0.7) + 0.06), mat=m["leather"], bevel=0.05, segments=3))
    tdash = c["t0"] + 0.1 * (c["t1"] - c["t0"])
    parts.append(lib.box("dash", (p.half_w(tdash) * 1.5, 0.25, 0.12), loc=(0, p.y(tdash) + 0.12, p.top(tdash) + 0.02), mat=m["trim"], bevel=0.04))
    parts.append(lib.torus("steering", 0.17, 0.022, loc=(-0.36, p.y(tdash) + 0.42, min(p.top(tdash) + 0.16, p.roof(tdash + 0.08) - 0.2)),
                           rot=(math.radians(70), 0, 0), mat=m["trim"]))

    return [x for x in parts if x is not None]


def make_text(text, mat, size):
    import bpy

    cu = bpy.data.curves.new("txt", "FONT")
    cu.body = text
    cu.size = size
    cu.align_x = "CENTER"
    cu.extrude = 0.002
    ob = bpy.data.objects.new("txt", cu)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.active_object
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    return ob


# ---------------------------------------------------------------------------
# Wheels
# ---------------------------------------------------------------------------


def build_wheel(spec, m, name):
    R, Wd = spec["wheel_r"], spec["wheel_w"]
    hw = Wd / 2
    Rr = R * 0.68
    rim = spec["rim"]
    parts = []

    tire = [(Rr * 0.98, -hw * 0.82), (R - 0.05, -hw), (R - 0.01, -hw * 0.8), (R, -hw * 0.45), (R, hw * 0.45),
            (R - 0.01, hw * 0.8), (R - 0.05, hw), (Rr * 0.98, hw * 0.82)]
    parts.append(lib.lathe("tire", tire, m["tire"], segments=40))
    # Sidewall lettering ring, subtle
    parts.append(lib.lathe("sidewall", [(R * 0.84, hw * 0.99), (R * 0.88, hw * 0.995)], m["trim"], segments=40))

    barrel = [(Rr * 0.95, -hw * 0.85), (Rr * 0.97, hw * 0.6), (Rr * 1.04, hw * 0.78), (Rr * 1.03, hw * 0.88), (Rr * 0.93, hw * 0.84)]
    parts.append(lib.lathe("barrel", barrel, m["rim"], segments=40))

    # Brake disc + caliper (behind the spokes)
    parts.append(lib.cylinder("disc", Rr * 0.78, 0.03, loc=(-hw * 0.05, 0, 0), rot=(0, math.pi / 2, 0), mat=m["disc"], verts=32))
    parts.append(lib.box("caliper", (0.07, 0.11, Rr * 0.42), loc=(hw * 0.08, Rr * 0.48, Rr * 0.38), mat=m["caliper"],
                         bevel=0.02, rot=(math.radians(-50), 0, 0)))
    parts.append(lib.cylinder("backplate", Rr * 0.95, 0.01, loc=(-hw * 0.6, 0, 0), rot=(0, math.pi / 2, 0), mat=m["under"], verts=32, smooth=False))

    face_x = hw * 0.62
    style = rim["style"]
    n = rim["spokes"]
    if style == "aero":
        parts.append(lib.lathe("aero", [(0.0, face_x + 0.04), (Rr * 0.35, face_x + 0.035), (Rr * 0.6, face_x + 0.02),
                                        (Rr * 0.96, face_x - 0.01)], m["rim"], segments=40))
        for k in range(n):
            a = 2 * math.pi * k / n
            parts.append(lib.box("vane", (0.012, Rr * 0.55, 0.04), loc=(face_x + 0.03, math.cos(a) * Rr * 0.62, math.sin(a) * Rr * 0.62),
                                 rot=(a + math.radians(20), 0, 0), mat=m["trim"]))
    else:
        widths = {"twin": 0.045, "multi": 0.03, "classic": 0.022}
        sw = widths.get(style, 0.04)
        offsets = (-0.035, 0.035) if style == "twin" else (0.0,)
        for k in range(n):
            a = 2 * math.pi * k / n
            for off in offsets:
                ob = lib.box("spoke", (0.035, sw, Rr * 0.78), mat=m["rim"], bevel=0.008)
                ob.location = (face_x, 0, 0)
                ob.data.transform(Matrix.Translation((0, off, Rr * 0.5)))
                ob.rotation_euler = (a, 0, 0)
                parts.append(ob)
        if style == "classic":
            parts.append(lib.lathe("dish", [(Rr * 0.25, face_x + 0.01), (Rr * 0.9, face_x - 0.02)], m["chrome"], segments=40))
    parts.append(lib.cylinder("hub", Rr * 0.22, 0.06, loc=(face_x + 0.01, 0, 0), rot=(0, math.pi / 2, 0), mat=m["rim"], verts=24))
    parts.append(lib.cylinder("cap", Rr * 0.12, 0.02, loc=(face_x + 0.045, 0, 0), rot=(0, math.pi / 2, 0), mat=m["chrome"], verts=20))
    for k in range(5):
        a = 2 * math.pi * k / 5
        parts.append(lib.cylinder("nut", 0.012, 0.03, loc=(face_x + 0.04, math.cos(a) * Rr * 0.16, math.sin(a) * Rr * 0.16),
                                  rot=(0, math.pi / 2, 0), mat=m["chrome"], verts=6))
    return lib.join(parts, name)


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------


def build_car(spec, out_path):
    lib.reset_scene()
    m = car_materials(spec)
    p = Profiles(spec)
    hull = build_hull(p, m)
    cabin = build_cabin(p, m)
    details = build_details(p, hull, cabin, m)
    lib.join([hull, cabin] + details, "body")

    R = spec["wheel_r"]
    x = spec["W"] / 2 - spec["wheel_w"] / 2 - 0.05
    for (tag, y) in (("F", p.axles[0]), ("R", p.axles[1])):
        for side, sx in (("L", -1), ("R", 1)):
            w = build_wheel(spec, m, f"wheel_{tag}{side}")
            if sx < 0:
                w.data.transform(Matrix.Rotation(math.pi, 4, "Z"))
            w.location = (sx * x, y, R)

    lib.export_glb(out_path, extras={
        "label": spec["label"],
        "wheelRadius": R,
        "wheelbase": spec["wheelbase"],
        "length": spec["L"],
        "width": spec["W"],
    })
