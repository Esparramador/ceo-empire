"""Street furniture and vegetation. Each prop is one merged mesh at the origin
(base on the ground). Props with a direction point their "front" to -Y in
Blender (+Z in three.js)."""

import math
import os
import random

import numpy as np
from mathutils import Vector

import lib


def _m():
    return {
        "metal": lib.material("pole_metal", "#3b4046", metallic=0.8, roughness=0.4),
        "bulb": lib.material("lamp_bulb", "#fff6e0", emission="#ffd98a", emission_strength=2.0),
        "bark": lib.material("bark", "#5a3d2b", roughness=0.95),
        "leaf": lib.material("leaf", "#3f7d32", roughness=0.85),
        "leaf2": lib.material("leaf_dark", "#2c5e2a", roughness=0.85),
        "wood": lib.material("bench_wood", "#9a6a3c", roughness=0.7),
        "red": lib.material("hydrant_red", "#b5221c", roughness=0.45, metallic=0.2),
        "green_bin": lib.material("bin_green", "#2c4a34", roughness=0.5, metallic=0.4),
        "black": lib.material("signal_black", "#141618", roughness=0.5),
        "sig_r": lib.material("signal_red", "#ff2020", emission="#ff2020", emission_strength=2.5),
        "sig_y": lib.material("signal_amber", "#40300a", roughness=0.3),
        "sig_g": lib.material("signal_green", "#0a3a1a", roughness=0.3),
        "planter": lib.material("planter", "#8d8a83", roughness=0.9),
    }


def blob(name, r, loc, mat, seed, jitter=0.18, subdiv=2):
    import bpy

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    rnd = random.Random(seed)
    for v in ob.data.vertices:
        v.co *= 1 + rnd.uniform(-jitter, jitter)
    ob.location = loc
    ob.data.materials.append(mat)
    return ob


def tree_round(m, seed=1):
    rnd = random.Random(seed)
    parts = [lib.cylinder("trunk", 0.22, 3.2, loc=(0, 0, 1.6), mat=m["bark"], r2=0.13, verts=10)]
    for i in range(3):
        a = i * 2.1
        b = lib.cylinder("branch", 0.08, 1.4, loc=(math.cos(a) * 0.35, math.sin(a) * 0.35, 3.1), mat=m["bark"], r2=0.04, verts=6)
        b.rotation_euler = (math.cos(a) * 0.7, -math.sin(a) * 0.7, 0)
        parts.append(b)
    for i in range(6):
        a = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(0.3, 1.0)
        parts.append(blob("foliage", rnd.uniform(1.1, 1.6), (math.cos(a) * r, math.sin(a) * r, rnd.uniform(3.6, 4.8)),
                          m["leaf"] if i % 2 else m["leaf2"], seed * 10 + i))
    ob = lib.join(parts, "tree")
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


def tree_cypress(m, seed=2):
    parts = [lib.cylinder("trunk", 0.16, 1.2, loc=(0, 0, 0.6), mat=m["bark"], r2=0.12, verts=8)]
    parts.append(blob("crown", 1.0, (0, 0, 3.3), m["leaf2"], seed, jitter=0.12))
    parts[-1].scale = (0.9, 0.9, 3.0)
    ob = lib.join(parts, "cypress")
    for p in ob.data.polygons:
        p.use_smooth = False
    return ob


def streetlight(m):
    parts = [
        lib.cylinder("base", 0.22, 0.6, loc=(0, 0, 0.3), mat=m["metal"], r2=0.14, verts=12),
        lib.cylinder("pole", 0.09, 7.4, loc=(0, 0, 4.0), mat=m["metal"], r2=0.06, verts=12),
    ]
    # Curved arm reaching over the road (-Y)
    pts = [Vector((0, -1.8 * math.sin(a), 7.6 + 0.7 * math.cos(a) - 0.7)) for a in np.linspace(0, math.pi / 2, 7)]
    for a, b in zip(pts, pts[1:]):
        d = b - a
        seg = lib.cylinder("arm", 0.05, d.length + 0.02, mat=m["metal"], verts=8)
        seg.rotation_mode = "QUATERNION"
        seg.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
        seg.location = (a + b) / 2
        parts.append(seg)
    end = pts[-1]
    parts.append(lib.box("head", (0.36, 0.7, 0.14), loc=(0, end.y - 0.25, end.z - 0.02), mat=m["metal"], bevel=0.05, segments=3))
    parts.append(lib.box("bulb", (0.28, 0.58, 0.02), loc=(0, end.y - 0.25, end.z - 0.095), mat=m["bulb"]))
    return lib.join(parts, "streetlight")


def traffic_light(m):
    parts = [
        lib.cylinder("pole", 0.1, 5.6, loc=(0, 0, 2.8), mat=m["black"], verts=12),
        lib.cylinder("arm", 0.07, 4.2, loc=(0, -2.1, 5.4), rot=(math.pi / 2, 0, 0), mat=m["black"], verts=10),
        lib.box("housing", (0.38, 0.32, 1.05), loc=(0, -3.8, 4.75), mat=m["black"], bevel=0.05),
        lib.box("ped", (0.3, 0.25, 0.55), loc=(0, -0.2, 2.6), mat=m["black"], bevel=0.04),
    ]
    for z, k in ((5.07, "sig_r"), (4.75, "sig_y"), (4.43, "sig_g")):
        parts.append(lib.cylinder("lens", 0.11, 0.04, loc=(0, -3.97, z), rot=(math.pi / 2, 0, 0), mat=m[k], verts=16))
        parts.append(lib.box("visor", (0.28, 0.14, 0.02), loc=(0, -4.04, z + 0.12), mat=m["black"]))
    return lib.join(parts, "traffic_light")


def bench(m):
    parts = []
    for i in range(4):
        parts.append(lib.box("slat", (1.8, 0.11, 0.04), loc=(0, -0.2 + i * 0.13, 0.45), mat=m["wood"], bevel=0.01))
    for i in range(3):
        parts.append(lib.box("back", (1.8, 0.03, 0.1), loc=(0, 0.26, 0.62 + i * 0.13), mat=m["wood"], rot=(math.radians(-10), 0, 0), bevel=0.01))
    for x in (-0.75, 0.75):
        parts.append(lib.box("leg", (0.06, 0.5, 0.45), loc=(x, 0, 0.22), mat=m["metal"]))
        parts.append(lib.box("leg_back", (0.06, 0.05, 0.5), loc=(x, 0.27, 0.68), mat=m["metal"]))
    return lib.join(parts, "bench")


def hydrant(m):
    prof = [(0.0, 0.0), (0.16, 0.0), (0.16, 0.08), (0.12, 0.1), (0.12, 0.55), (0.14, 0.58), (0.14, 0.62),
            (0.1, 0.66), (0.06, 0.74), (0.0, 0.76)]
    parts = [lib.lathe("hydrant", prof, m["red"], segments=16, axis="Z")]
    for s in (-1, 1):
        parts.append(lib.cylinder("nozzle", 0.05, 0.12, loc=(s * 0.15, 0, 0.45), rot=(0, math.pi / 2, 0), mat=m["red"], verts=10))
    return lib.join(parts, "hydrant")


def trash_bin(m):
    prof = [(0.0, 0.0), (0.24, 0.0), (0.26, 0.9), (0.28, 0.92), (0.28, 0.98), (0.1, 1.02), (0.0, 1.02)]
    return lib.join([lib.lathe("bin", prof, m["green_bin"], segments=18, axis="Z")], "trash_bin")


def planter(m, seed=3):
    parts = [lib.box("pot", (1.2, 1.2, 0.5), loc=(0, 0, 0.25), mat=m["planter"], bevel=0.04)]
    parts.append(blob("bush", 0.6, (0, 0, 0.75), m["leaf"], seed, jitter=0.2, subdiv=2))
    parts[-1].scale = (1.0, 1.0, 0.7)
    return lib.join(parts, "planter")


PROPS = {
    "tree": tree_round,
    "cypress": tree_cypress,
    "streetlight": streetlight,
    "traffic_light": traffic_light,
    "bench": bench,
    "hydrant": hydrant,
    "trash_bin": trash_bin,
    "planter": planter,
}


def build_all(out_dir):
    for name, fn in PROPS.items():
        lib.reset_scene()
        fn(_m())
        lib.export_glb(os.path.join(out_dir, name + ".glb"))
