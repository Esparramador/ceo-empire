// Asset URLs. Everything under `generated/` is produced by `npm run build:assets`
// (Blender, see blender/). Paths honour Vite's BASE_URL so the game also works
// when served from a sub-path.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const asset = (p: string) => `${BASE}/assets/${p}`;

export const CITY_MODEL = asset("generated/city/city.glb");
export const vehicleModel = (id: string) => asset(`generated/vehicles/${id}.glb`);
export const propModel = (id: string) => asset(`generated/props/${id}.glb`);
