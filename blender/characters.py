"""Stylised low-poly characters (fallbacks for the original character GLBs).

Exported node layout (three.js, +Z forward, feet at y=0):
    body           – torso, head, hair, accessories
    leg_L / leg_R  – origin at the hip joint   (swing on X to walk)
    arm_L / arm_R  – origin at the shoulder    (swing on X to walk)
"""

import math

import lib

CHARACTERS = {
    "alec_monopoly": {"skin": "#e8b996", "suit": "#15161a", "shirt": "#f4f4f4", "tie": "#c8102e", "pants": "#15161a",
                      "shoes": "#0a0a0a", "hair": "#d9d9d9", "hair_style": "short", "extras": ["tophat", "monocle", "mustache"]},
    "chico_formal": {"skin": "#d9a37e", "suit": "#1d2b4f", "shirt": "#eef3ff", "tie": "#c9a227", "pants": "#1d2b4f",
                     "shoes": "#2b1a10", "hair": "#2a1a10", "hair_style": "short", "extras": []},
    "chica_ejecutiva": {"skin": "#f0c3a0", "suit": "#4a4d55", "shirt": "#ffffff", "tie": None, "pants": "#4a4d55",
                        "shoes": "#111111", "hair": "#3b2416", "hair_style": "bun", "extras": ["skirt"], "slim": True},
    "chica_creativa": {"skin": "#c98e6b", "suit": "#e0457b", "shirt": "#ffd23f", "tie": None, "pants": "#2e2a5a",
                       "shoes": "#f4f4f4", "hair": "#7b3fe4", "hair_style": "long", "extras": ["glasses"], "slim": True},
    "chico_casual": {"skin": "#b07a55", "suit": "#3d7a3a", "shirt": "#3d7a3a", "tie": None, "pants": "#2f4d7a",
                     "shoes": "#e8e8e8", "hair": "#111111", "hair_style": "short", "extras": ["hood"]},
    "lord_tuetano": {"skin": "#ece4d0", "suit": "#3b0d18", "shirt": "#1a1a1a", "tie": "#d4af37", "pants": "#1a0a0e",
                     "shoes": "#111111", "hair": None, "hair_style": "none", "extras": ["crown", "cape", "glow_red"], "bulk": 1.1},
    "majin_bu": {"skin": "#f39ac2", "suit": "#f4f4f4", "shirt": "#3b1f6e", "tie": None, "pants": "#f4f4f4",
                 "shoes": "#e0b000", "hair": None, "hair_style": "none", "extras": ["antenna", "belt_gold"], "bulk": 1.5},
    "illidan": {"skin": "#6a4c93", "suit": "#2c2c2c", "shirt": "#6a4c93", "tie": None, "pants": "#3a2d1e",
                "shoes": "#1e1e1e", "hair": "#111111", "hair_style": "long", "extras": ["horns", "blindfold", "bare_chest"], "bulk": 1.15},
    "arthas": {"skin": "#cfd8e3", "suit": "#4b5a6e", "shirt": "#2a3442", "tie": None, "pants": "#2a3442",
               "shoes": "#1a2230", "hair": None, "hair_style": "none", "extras": ["helm", "pauldrons", "cape", "glow_blue"], "bulk": 1.2},
}


def mats(spec):
    m = {k: lib.material(f"{k}_{spec[k]}", spec[k], roughness=0.65) for k in ("skin", "suit", "shirt", "pants", "shoes") if spec.get(k)}
    m["skin"] = lib.material(f"skin_{spec['skin']}", spec["skin"], roughness=0.55)
    if spec.get("hair"):
        m["hair"] = lib.material(f"hair_{spec['hair']}", spec["hair"], roughness=0.8)
    if spec.get("tie"):
        m["tie"] = lib.material(f"tie_{spec['tie']}", spec["tie"], roughness=0.4)
    m["eye"] = lib.material("eye", "#101010", roughness=0.2)
    m["gold"] = lib.material("gold", "#d4af37", metallic=1, roughness=0.25)
    m["steel"] = lib.material("steel", "#b8c2cc", metallic=1, roughness=0.3)
    m["black"] = lib.material("black", "#151515", roughness=0.6)
    m["glow_red"] = lib.material("glow_red", "#ff2a2a", emission="#ff2a2a", emission_strength=4)
    m["glow_blue"] = lib.material("glow_blue", "#7fd8ff", emission="#7fd8ff", emission_strength=4)
    m["glow_green"] = lib.material("glow_green", "#3dff6a", emission="#3dff6a", emission_strength=3)
    return m


def limb(name, top, bottom, r_top, r_bot, mat):
    """Tapered cylinder between two z heights, x/y of `top`."""
    x, y, zt = top
    h = zt - bottom
    return lib.cylinder(name, r_bot, h, loc=(x, y, bottom + h / 2), mat=mat, r2=r_top, verts=14)


def build_character(key, spec, out_path):
    lib.reset_scene()
    m = mats(spec)
    ex = set(spec.get("extras", []))
    b = spec.get("bulk", 1.0)
    slim = 0.85 if spec.get("slim") else 1.0
    hip_z, sh_z = 0.95, 1.45
    hip_x, sh_x = 0.1 * b * slim, 0.24 * b * slim

    # ---- body -----------------------------------------------------------
    body = []
    body.append(lib.box("pelvis", (0.34 * b * slim, 0.22 * b, 0.18), loc=(0, 0, hip_z), mat=m["pants"], bevel=0.06, segments=3))
    torso_mat = m["shirt"] if "bare_chest" in ex else m["suit"]
    torso = lib.cylinder("torso", 0.17 * b * slim, sh_z - hip_z + 0.02, loc=(0, 0, (hip_z + sh_z) / 2 + 0.02),
                         mat=torso_mat, r2=0.23 * b * slim, verts=16)
    torso.scale = (1, 0.62, 1)
    body.append(torso)
    body.append(lib.sphere("chest_top", 0.23 * b * slim, loc=(0, 0, sh_z - 0.02), scale=(1, 0.6, 0.35), mat=torso_mat))
    if "bare_chest" not in ex:
        body.append(lib.box("shirt", (0.11, 0.02, 0.3), loc=(0, -0.13 * b, sh_z - 0.17), mat=m["shirt"]))
        if spec.get("tie"):
            body.append(lib.box("tie", (0.045, 0.02, 0.28), loc=(0, -0.142 * b, sh_z - 0.19), mat=m["tie"]))
            body.append(lib.box("knot", (0.05, 0.03, 0.04), loc=(0, -0.142 * b, sh_z - 0.04), mat=m["tie"]))
        for s in (-1, 1):  # lapels
            body.append(lib.box("lapel", (0.06, 0.02, 0.22), loc=(s * 0.075, -0.135 * b, sh_z - 0.12), mat=m["suit"],
                                rot=(0, s * 0.35, 0)))
    if "skirt" in ex:
        body.append(lib.cylinder("skirt", 0.25 * slim, 0.42, loc=(0, 0, hip_z - 0.17), mat=m["pants"], r2=0.18 * slim, verts=16))
    if "belt_gold" in ex:
        body.append(lib.cylinder("belt", 0.19 * b, 0.07, loc=(0, 0, hip_z + 0.08), mat=m["gold"], verts=16))
    if "hood" in ex:
        body.append(lib.torus("hood", 0.13, 0.05, loc=(0, 0.03, sh_z + 0.02), mat=m["suit"], rot=(math.radians(-20), 0, 0)))

    # neck + head
    head_z = sh_z + 0.21
    body.append(lib.cylinder("neck", 0.055, 0.12, loc=(0, 0, sh_z + 0.05), mat=m["skin"], verts=12))
    body.append(lib.sphere("head", 0.115, loc=(0, 0, head_z), scale=(0.92, 1, 1.12), mat=m["skin"]))
    body.append(lib.sphere("nose", 0.022, loc=(0, -0.112, head_z - 0.01), scale=(0.8, 1, 1.2), mat=m["skin"]))
    for s in (-1, 1):
        body.append(lib.sphere("ear", 0.03, loc=(s * 0.105, 0, head_z), scale=(0.5, 1, 1.3), mat=m["skin"]))
        eye_mat = m["glow_red"] if "glow_red" in ex else m["glow_blue"] if "glow_blue" in ex else m["eye"]
        body.append(lib.sphere("eye", 0.016, loc=(s * 0.042, -0.1, head_z + 0.025), mat=eye_mat))
    if spec.get("hair") and spec["hair_style"] != "none":
        body.append(lib.sphere("hair", 0.125, loc=(0, 0.012, head_z + 0.035), scale=(0.95, 1.02, 0.9), mat=m["hair"]))
        if spec["hair_style"] == "long":
            body.append(lib.box("hair_long", (0.24, 0.1, 0.32), loc=(0, 0.07, head_z - 0.12), mat=m["hair"], bevel=0.04, segments=3))
        if spec["hair_style"] == "bun":
            body.append(lib.sphere("bun", 0.06, loc=(0, 0.11, head_z + 0.08), mat=m["hair"]))

    # accessories
    if "tophat" in ex:
        body.append(lib.cylinder("brim", 0.17, 0.015, loc=(0, 0, head_z + 0.12), mat=m["black"], verts=24))
        body.append(lib.cylinder("hat", 0.1, 0.2, loc=(0, 0, head_z + 0.225), mat=m["black"], verts=24))
        body.append(lib.cylinder("band", 0.102, 0.03, loc=(0, 0, head_z + 0.145), mat=m["tie"], verts=24))
    if "monocle" in ex:
        body.append(lib.torus("monocle", 0.026, 0.004, loc=(0.042, -0.112, head_z + 0.025), mat=m["gold"], rot=(math.pi / 2, 0, 0), seg=16, mseg=6))
    if "mustache" in ex:
        body.append(lib.box("mustache", (0.1, 0.02, 0.022), loc=(0, -0.108, head_z - 0.045), mat=m["hair"], bevel=0.008))
    if "glasses" in ex:
        for s in (-1, 1):
            body.append(lib.torus("lens", 0.028, 0.005, loc=(s * 0.045, -0.112, head_z + 0.025), mat=m["black"], rot=(math.pi / 2, 0, 0), seg=16, mseg=6))
    if "horns" in ex:
        for s in (-1, 1):
            h = lib.cylinder("horn", 0.03, 0.26, loc=(s * 0.1, 0.0, head_z + 0.15), mat=m["black"], r2=0.004, verts=10)
            h.rotation_euler = (math.radians(-25), s * math.radians(30), 0)
            body.append(h)
    if "blindfold" in ex:
        body.append(lib.cylinder("blindfold", 0.118, 0.04, loc=(0, 0, head_z + 0.025), mat=m["glow_green"], verts=20))
    if "crown" in ex:
        body.append(lib.cylinder("crown", 0.11, 0.06, loc=(0, 0, head_z + 0.13), mat=m["gold"], verts=16))
        for k in range(6):
            a = 2 * math.pi * k / 6
            body.append(lib.cylinder("spike", 0.02, 0.08, loc=(math.cos(a) * 0.1, math.sin(a) * 0.1, head_z + 0.19), mat=m["gold"], r2=0.0, verts=6))
    if "helm" in ex:
        body.append(lib.sphere("helm", 0.135, loc=(0, 0.005, head_z + 0.02), scale=(0.95, 1.05, 1.1), mat=m["steel"]))
        body.append(lib.box("visor", (0.14, 0.03, 0.03), loc=(0, -0.13, head_z + 0.025), mat=m["glow_blue"]))
        for s in (-1, 1):
            sp = lib.cylinder("helm_spike", 0.03, 0.25, loc=(s * 0.12, 0.02, head_z + 0.17), mat=m["steel"], r2=0.0, verts=8)
            sp.rotation_euler = (0, s * math.radians(35), 0)
            body.append(sp)
    if "pauldrons" in ex:
        for s in (-1, 1):
            body.append(lib.sphere("pauldron", 0.13, loc=(s * (sh_x + 0.03), 0, sh_z + 0.03), scale=(1.1, 1, 0.75), mat=m["steel"]))
            for k in range(3):
                body.append(lib.cylinder("ps", 0.03, 0.12, loc=(s * (sh_x + 0.03 + (k - 1) * 0.06), 0, sh_z + 0.16), mat=m["steel"], r2=0.0, verts=6))
    if "cape" in ex:
        cape_mat = m["suit"] if "glow_blue" in ex else lib.material("cape_red", "#7a0f1c", roughness=0.7)
        cape = lib.box("cape", (0.5 * b, 0.03, 1.15), loc=(0, 0.17 * b, sh_z - 0.55), mat=cape_mat, rot=(math.radians(8), 0, 0))
        body.append(cape)
    if "antenna" in ex:
        a = lib.cylinder("antenna", 0.03, 0.22, loc=(0, -0.02, head_z + 0.18), mat=m["skin"], r2=0.012, verts=10)
        a.rotation_euler = (math.radians(-30), 0, 0)
        body.append(a)
    lib.join(body, "body")

    # ---- legs ---------------------------------------------------------------
    for side, s in (("L", -1), ("R", 1)):
        x = s * hip_x
        parts = [
            limb("thigh", (x, 0, hip_z), 0.5, 0.085 * b, 0.065 * b, m["pants"]),
            lib.sphere("knee", 0.066 * b, loc=(x, 0, 0.5), mat=m["pants"]),
            limb("shin", (x, 0, 0.5), 0.09, 0.064 * b, 0.05 * b, m["pants"]),
            lib.box("shoe", (0.11 * b, 0.26, 0.09), loc=(x, -0.05, 0.045), mat=m["shoes"], bevel=0.035, segments=3),
        ]
        leg = lib.join(parts, f"leg_{side}")
        lib.set_origin(leg, (x, 0, hip_z))

    # ---- arms ---------------------------------------------------------------
    for side, s in (("L", -1), ("R", 1)):
        x = s * sh_x
        sleeve = m["skin"] if "bare_chest" in ex else m["suit"]
        parts = [
            lib.sphere("shoulder", 0.07 * b, loc=(x, 0, sh_z - 0.02), mat=sleeve),
            limb("upper", (x, 0, sh_z - 0.02), 1.15, 0.065 * b, 0.055 * b, sleeve),
            lib.sphere("elbow", 0.055 * b, loc=(x, 0, 1.15), mat=sleeve),
            limb("fore", (x, 0, 1.15), 0.88, 0.054 * b, 0.045 * b, sleeve),
            lib.sphere("hand", 0.052 * b, loc=(x, 0, 0.84), scale=(0.8, 1, 1.2), mat=m["skin"]),
        ]
        if not ("bare_chest" in ex):
            parts.append(lib.cylinder("cuff", 0.048 * b, 0.03, loc=(x, 0, 0.895), mat=m["shirt"], verts=12))
        arm = lib.join(parts, f"arm_{side}")
        lib.set_origin(arm, (x, 0, sh_z - 0.02))

    lib.export_glb(out_path)
