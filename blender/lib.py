"""Shared helpers for the CEO Empire Blender asset pipeline.

Everything here works both inside the Blender UI (Scripting tab / Blender MCP)
and headless through the `bpy` Python module.

Conventions (Blender space, Z-up):
  * Vehicles and characters face -Y. The glTF exporter converts to Y-up, so
    in three.js they face +Z, which is the game's "forward".
  * 1 unit = 1 metre.
"""

import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

# ---------------------------------------------------------------------------
# Scene
# ---------------------------------------------------------------------------


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def export_glb(path, extras=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if extras:
        for k, v in extras.items():
            bpy.context.scene[k] = v
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_extras=bool(extras),
        export_cameras=False,
        export_lights=False,
        export_image_format="AUTO",
    )
    print(f"  -> {os.path.relpath(path)}  ({os.path.getsize(path) / 1024:.0f} KB)")


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------


def hex_rgb(h):
    h = h.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    # Principled BSDF expects linear colour.
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


def material(
    name,
    color="#ffffff",
    metallic=0.0,
    roughness=0.5,
    emission=None,
    emission_strength=1.0,
    alpha=1.0,
    coat=0.0,
    coat_roughness=0.05,
    base_tex=None,
    emit_tex=None,
    mr_tex=None,
):
    """Principled material that round-trips cleanly through glTF."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*hex_rgb(color), 1)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    if coat:
        p.inputs["Coat Weight"].default_value = coat
        p.inputs["Coat Roughness"].default_value = coat_roughness
    if emission:
        p.inputs["Emission Color"].default_value = (*hex_rgb(emission), 1)
        p.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1:
        p.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "BLENDED"

    def tex(img, non_color=False):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = img
        if non_color:
            img.colorspace_settings.name = "Non-Color"
        return n

    if base_tex is not None:
        nt.links.new(tex(base_tex).outputs["Color"], p.inputs["Base Color"])
    if emit_tex is not None:
        nt.links.new(tex(emit_tex).outputs["Color"], p.inputs["Emission Color"])
        p.inputs["Emission Strength"].default_value = emission_strength
    if mr_tex is not None:
        t = tex(mr_tex, non_color=True)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(t.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], p.inputs["Roughness"])
        nt.links.new(sep.outputs["Blue"], p.inputs["Metallic"])
    return m


def image_from_array(name, arr, tmp_dir):
    """arr: float32 HxWx3|4 in sRGB 0..1 (row 0 = bottom). Saved as PNG and reloaded."""
    h, w = arr.shape[:2]
    if arr.shape[2] == 3:
        arr = np.concatenate([arr, np.ones((h, w, 1), np.float32)], axis=2)
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    os.makedirs(tmp_dir, exist_ok=True)
    path = os.path.join(tmp_dir, name + ".png")
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    return bpy.data.images.load(path)


# ---------------------------------------------------------------------------
# Mesh construction
# ---------------------------------------------------------------------------


def mesh_object(name, verts, faces, mats=None, face_mats=None, smooth=False, uvs=None, collection=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate()
    if mats:
        for m in mats:
            me.materials.append(m)
        if face_mats is not None:
            me.polygons.foreach_set("material_index", list(face_mats))
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    if uvs is not None:
        layer = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            for li, vi in zip(poly.loop_indices, poly.vertices):
                layer.data[li].uv = uvs[vi]
    me.update()
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob


def loft(name, rings, mat, cap_start=True, cap_end=True, smooth=True):
    """Skin a list of closed rings (each an (N,3) array, same N) into a tube."""
    rings = [np.asarray(r, dtype=float) for r in rings]
    n = len(rings[0])
    verts = np.concatenate(rings)
    faces = []
    for i in range(len(rings) - 1):
        a, b = i * n, (i + 1) * n
        for j in range(n):
            k = (j + 1) % n
            faces.append((a + j, a + k, b + k, b + j))
    verts = list(map(tuple, verts))
    if cap_start:
        verts.append(tuple(rings[0].mean(axis=0)))
        c = len(verts) - 1
        faces += [(c, (j + 1) % n, j) for j in range(n)]
    if cap_end:
        verts.append(tuple(rings[-1].mean(axis=0)))
        c = len(verts) - 1
        base = (len(rings) - 1) * n
        faces += [(c, base + j, base + (j + 1) % n) for j in range(n)]
    ob = mesh_object(name, verts, faces, [mat], smooth=smooth)
    fix_normals(ob)
    return ob


def fix_normals(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def lathe(name, profile, mat, segments=32, axis="X", smooth=True, cap=False):
    """Revolve a 2D profile [(radius, axial), ...] around an axis through the origin."""
    rings = []
    for s in range(segments):
        a = 2 * math.pi * s / segments
        ring = []
        for r, ax in profile:
            if axis == "X":
                ring.append((ax, r * math.cos(a), r * math.sin(a)))
            elif axis == "Z":
                ring.append((r * math.cos(a), r * math.sin(a), ax))
            else:
                ring.append((r * math.cos(a), ax, r * math.sin(a)))
        rings.append(ring)
    n = len(profile)
    verts = [v for ring in rings for v in ring]
    faces = []
    for s in range(segments):
        a, b = s * n, ((s + 1) % segments) * n
        for j in range(n - 1):
            faces.append((a + j, a + j + 1, b + j + 1, b + j))
    ob = mesh_object(name, verts, faces, [mat], smooth=smooth)
    fix_normals(ob)
    return ob


def box(name, size, loc=(0, 0, 0), mat=None, bevel=0.0, rot=(0, 0, 0), segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "NONE"
        apply_modifiers(ob)
        smooth_by_angle(ob, 35)
    ob.rotation_euler = rot
    ob.location = loc
    if mat:
        ob.data.materials.append(mat)
    return ob


def cylinder(name, r, depth, loc=(0, 0, 0), mat=None, rot=(0, 0, 0), verts=24, r2=None, smooth=True):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=(0, 0, 0))
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_euler = rot
    ob.location = loc
    if smooth:
        smooth_by_angle(ob)
    if mat:
        ob.data.materials.append(mat)
    return ob


def sphere(name, r, loc=(0, 0, 0), mat=None, scale=(1, 1, 1), segs=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=r, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    ob.location = loc
    ob.data.shade_smooth()
    if mat:
        ob.data.materials.append(mat)
    return ob


def torus(name, major, minor, loc=(0, 0, 0), mat=None, rot=(0, 0, 0), seg=32, mseg=10):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=seg, minor_segments=mseg)
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_euler = rot
    ob.location = loc
    ob.data.shade_smooth()
    if mat:
        ob.data.materials.append(mat)
    return ob


def smooth_by_angle(ob, angle=40):
    """Smooth faces, keep edges sharper than `angle` hard (glTF splits normals)."""
    me = ob.data
    me.shade_smooth()
    bm = bmesh.new()
    bm.from_mesh(me)
    lim = math.radians(angle)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()


def apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def join(objs, name):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    ob.data.name = name
    return ob


def set_origin(ob, point):
    """Move object origin to `point` (world) without moving the geometry."""
    p = Vector(point)
    ob.data.transform(Matrix.Translation(-p))
    ob.location = p


def mirror_x(ob, name=None):
    cp = ob.copy()
    cp.data = ob.data.copy()
    cp.name = name or ob.name + "_m"
    bpy.context.scene.collection.objects.link(cp)
    cp.data.transform(Matrix.Scale(-1, 4, (1, 0, 0)))
    cp.location.x = -ob.location.x
    cp.rotation_euler = (ob.rotation_euler.x, -ob.rotation_euler.y, -ob.rotation_euler.z)
    cp.data.flip_normals()
    return cp


# ---------------------------------------------------------------------------
# Curves
# ---------------------------------------------------------------------------


def smooth_profile(points, samples=400, sigma=5.0):
    """Piecewise-linear keypoints [(t, v)] -> smoothed callable f(t)."""
    pts = np.asarray(sorted(points), dtype=float)
    ts = np.linspace(pts[0, 0], pts[-1, 0], samples)
    vs = np.interp(ts, pts[:, 0], pts[:, 1])
    if sigma > 0:
        k = int(sigma * 3)
        x = np.arange(-k, k + 1)
        g = np.exp(-(x**2) / (2 * sigma**2))
        g /= g.sum()
        vs = np.convolve(np.pad(vs, k, mode="edge"), g, mode="valid")
    return lambda t: float(np.interp(t, ts, vs))


def catmull_closed(points, sub=4):
    """Subdivide a closed polygon with Catmull-Rom for smooth cross sections."""
    p = np.asarray(points, dtype=float)
    n = len(p)
    out = []
    for i in range(n):
        p0, p1, p2, p3 = p[i - 1], p[i], p[(i + 1) % n], p[(i + 2) % n]
        for s in range(sub):
            t = s / sub
            t2, t3 = t * t, t * t * t
            out.append(
                0.5
                * (
                    2 * p1
                    + (-p0 + p2) * t
                    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
                )
            )
    return np.asarray(out)


def ray_hit(ob, origin, direction):
    """Ray-cast against an object (object at identity transform). Returns (loc, normal) or None."""
    ok, loc, normal, _ = ob.ray_cast(Vector(origin), Vector(direction).normalized())
    return (loc, normal) if ok else None
