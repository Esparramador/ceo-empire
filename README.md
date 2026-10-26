# CEO Empire 🎩👑

> GTA V-style open world browser game — built with React Three Fiber + Zustand

Part of the **Shopy Crafter** platform. Play as a CEO building a business empire in a 3D city.

## 🎮 Gameplay

- **Open world city** with 30+ buildings, parks, roads and street lights
- **5 playable missions** — from picking up the briefcase to becoming CEO of the year
- **8 buyable businesses** — from a digital café to the AI Tower (passive income)
- **11 NPCs** — friendly advisors, hostile rivals and bosses (Lord Tuétano, Arthas, Illidan…)
- **5 driveable cars modelled in Blender** — Rosso CEO (mid-engine berlinetta), Toro Azul (V12 wedge with wing), Volt Verde (EV fastback), Dorado Royale (luxury limo), Bianco GT (rear-engine classic). Arcade physics, steering wheels, brake lights, headlights at night
- **Blender-built city** — textured towers with night-lit windows, road markings, crosswalks, raised sidewalks, parks, fountain, street lamps, traffic lights and furniture; buildings are solid (collisions)
- **Dynamic day/night cycle** — sunrise, golden hour, night with street lights
- **Full HUD** — health/karma bars, money, wanted stars, minimap, inventory

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `WASD` / `↑↓←→` | Move |
| Mouse (click to lock) | Rotate camera |
| `F` | Talk to nearby NPC |
| `E` | Enter / exit vehicle · Start mission |
| `W/S` · `A/D` · `Space` (driving) | Throttle/brake · Steer · Handbrake |
| `B` | Buy nearby business |
| `I` | Open inventory |
| Left click | Attack |
| `Shift` | Sprint |

## 🏗️ Tech Stack

- **React Three Fiber** — 3D scene, shadows, ACES tonemapping
- **@react-three/drei** — GLB model loading, HTML overlays
- **Zustand** — game state (health, money, karma, missions, inventory…)
- **Vite** — dev server + bundler
- **TypeScript**

## 📁 Structure

```
src/
├── App.tsx               # Root — menu / game / dead screen
├── game/
│   ├── Game.tsx          # R3F Canvas + loading screen
│   ├── World.tsx         # Blender city, instanced props, street-light pool, markers
│   ├── Player.tsx        # On-foot movement, camera, melee, proximity prompts
│   ├── Character.tsx     # Character GLB loader (original model or generated stand-in)
│   ├── NPCSystem.tsx     # NPC AI (wander / chase / attack / knock-down / respawn)
│   ├── VehicleSystem.tsx # Drivable cars (arcade bicycle model) + chase camera
│   ├── MissionSystem.tsx # Checks the active mission against the live world
│   ├── DayNight.tsx      # 24h sun/sky/lighting cycle
│   └── runtime.ts        # Per-frame state shared by the systems (outside React)
├── ui/
│   ├── MainMenu.tsx      # Character selection
│   ├── HUD.tsx           # Health, money, wanted, clock, speedometer, hints
│   ├── MiniMap.tsx       # Canvas 2D radar (10 Hz)
│   ├── DialogBox.tsx     # NPC dialogue overlay
│   └── Inventory.tsx     # Item management
└── lib/
    ├── gameStore.ts      # Zustand store
    ├── gameData.ts       # Missions, businesses, NPCs, vehicles
    ├── missions.ts       # Story order and mission objectives (pure, tested)
    ├── city.ts           # City layout, ground height, collisions
    └── assets.ts         # Asset URLs (honour BASE_PATH)
```

The story is linear: only the next mission's marker is shown and can be
started with `E`, each mission pays once, and mission 3 needs Lord Tuétano
knocked down (not just a visit to his lair).

## 🚀 Getting Started

Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173 (PORT=xxxx to change it)
npm test           # unit tests (Vitest): store, missions, city layout, combat
npm run build      # type-check + production build into dist/public
npm run preview    # serve the production build
```

`PORT` and `BASE_PATH` are optional environment variables (Replit sets them);
`BASE_PATH=/juego/ npm run build` builds for a sub-path.

## 🧩 3D Models

### Blender pipeline (`blender/`)

Every car, the city, the street props and stand-in characters are generated
by Python scripts for Blender and exported as GLB into `public/assets/generated/`
(the city layout used for collisions goes to `src/lib/cityLayout.json`).

```bash
pip install bpy==4.2.0            # Blender as a Python module (headless)
npm run build:assets              # everything
python3 blender/build_assets.py --only cars        # just one group: cars|characters|props|city
blender -b -P blender/build_assets.py -- --only cars  # or with a Blender install
python3 blender/preview.py public/assets/generated/vehicles/rosso_ceo.glb preview.png
```

The scripts also run from Blender's Scripting tab (or a Blender MCP connection),
so models can be tweaked interactively. To add a car, append a design to
`CARS` in `blender/cars.py`, rebuild, and add an entry to `VEHICLE_CONFIGS`
in `src/lib/gameData.ts`. A ready-made GLB also works: drop it in
`public/assets/generated/vehicles/<id>.glb` facing +Z with wheel nodes named
`wheel_FL/FR/RL/RR` (optional — without them the car still drives, wheels just don't spin).

### Original character models

If `public/assets/models/<name>.glb` exists it is used; otherwise the game
falls back to the Blender-generated character. Original characters:
- `alec_monopoly.glb` — Alec CEO (playable)
- `chico_formal.glb`, `chica_ejecutiva.glb`, `chica_creativa.glb` — playable CEOs
- `lord_tuetano.glb`, `arthas.glb`, `illidan.glb`, `bowser.glb` — bosses/enemies
- `majin_bu.glb`, `mini_goku.glb`, `trono.glb` — NPCs

## 📄 License

MIT
