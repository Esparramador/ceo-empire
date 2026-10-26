"""Render a quick turntable-style preview of a GLB (Cycles, CPU).

    python3 blender/preview.py public/assets/generated/vehicles/rosso_ceo.glb out.png [distance]
"""

import math
import sys

import bpy
from mathutils import Vector


def main():
    src, out = sys.argv[1], sys.argv[2]
    dist = float(sys.argv[3]) if len(sys.argv) > 3 else 0
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    lo = Vector((min(min((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs),
                 min(min((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs),
                 min(min((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in objs)))
    hi = Vector((max(max((o.matrix_world @ Vector(c)).x for c in o.bound_box) for o in objs),
                 max(max((o.matrix_world @ Vector(c)).y for c in o.bound_box) for o in objs),
                 max(max((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in objs)))
    center = (lo + hi) / 2
    size = (hi - lo).length
    d = dist or size * 1.15

    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, lo.z))
    floor = bpy.context.active_object
    fm = bpy.data.materials.new("floor")
    fm.use_nodes = True
    fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.35, 0.36, 0.38, 1)
    fm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
    floor.data.materials.append(fm)

    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    sky = world.node_tree.nodes.new("ShaderNodeTexSky")
    world.node_tree.links.new(sky.outputs["Color"], world.node_tree.nodes["Background"].inputs["Color"])
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    bpy.context.scene.world = world
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), 0, math.radians(35)))
    bpy.context.active_object.data.energy = 3.5

    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = center + Vector((d * 0.75, -d * 0.85, d * 0.38))
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.lens = 45
    bpy.context.scene.camera = cam

    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 900, 560
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)


main()
