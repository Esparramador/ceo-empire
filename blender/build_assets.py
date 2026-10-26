"""Build every 3D asset for CEO Empire.

Headless (pip install bpy==4.2.0):
    python3 blender/build_assets.py [--only cars,characters,city,props]
Inside Blender (UI, Blender MCP, or CLI):
    blender -b -P blender/build_assets.py -- --only cars

Output goes to public/assets/generated/ and src/lib/cityLayout.json.
"""

import os
import sys

import bpy  # noqa: F401  (must load before mathutils/bmesh when run as a module)

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "public", "assets", "generated")


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    only = None
    if "--only" in argv:
        only = set(argv[argv.index("--only") + 1].split(","))

    def want(k):
        return only is None or k in only

    if want("cars"):
        import cars

        print("Cars")
        for spec in cars.CARS:
            cars.build_car(spec, os.path.join(OUT, "vehicles", spec["id"] + ".glb"))

    if want("characters"):
        import characters

        print("Characters")
        for key, spec in characters.CHARACTERS.items():
            characters.build_character(key, spec, os.path.join(OUT, "characters", key + ".glb"))

    if want("props"):
        import props

        print("Props")
        props.build_all(os.path.join(OUT, "props"))

    if want("city"):
        import city

        print("City")
        city.build_city(os.path.join(OUT, "city"), os.path.join(ROOT, "src", "lib", "cityLayout.json"))


if __name__ == "__main__":
    main()
