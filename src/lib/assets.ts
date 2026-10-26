// Asset URLs. Everything under `generated/` is produced by `npm run build:assets`
// (Blender, see blender/). Paths honour Vite's BASE_URL so the game also works
// when served from a sub-path.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const asset = (p: string) => `${BASE}/assets/${p}`;

export const CITY_MODEL = asset("generated/city/city.glb");
export const vehicleModel = (id: string) => asset(`generated/vehicles/${id}.glb`);
export const propModel = (id: string) => asset(`generated/props/${id}.glb`);

/** Original (hand-made) character model, if the project ships one. */
export const originalCharacterModel = (key: string) => asset(`models/${key}.glb`);

const GENERATED_CHARACTERS = new Set([
  "alec_monopoly", "chico_formal", "chica_ejecutiva", "chica_creativa", "chico_casual",
  "lord_tuetano", "majin_bu", "illidan", "arthas",
]);

/** Blender-generated stand-in, always available. */
export const generatedCharacterModel = (key: string) =>
  asset(`generated/characters/${GENERATED_CHARACTERS.has(key) ? key : "chico_casual"}.glb`);
