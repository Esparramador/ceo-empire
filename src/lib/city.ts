import layout from "./cityLayout.json";
import { PLACE_OBSTACLES } from "./gameData";

export interface Building { x: number; z: number; w: number; d: number; h: number; style: string }
export interface Block { x0: number; x1: number; z0: number; z1: number; type: string }
/** [x, z, rotationY] */
export type PropInstance = [number, number, number];

export const CITY = layout as unknown as {
  roads: { centers: number[]; halfWidth: number; extent: number };
  curbHeight: number;
  blocks: Block[];
  parks: { x: number; z: number; size: number }[];
  fountain: { x: number; z: number; r: number };
  buildings: Building[];
  props: Record<string, PropInstance[]>;
};

export const WORLD_LIMIT = 190;

/** Height of the walkable surface (raised sidewalks/blocks vs. road). */
export function groundHeight(x: number, z: number): number {
  for (const b of CITY.blocks) {
    if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return CITY.curbHeight;
  }
  return 0;
}

/**
 * Push a circle of radius `r` out of buildings and the fountain.
 * Mutates and returns `p`; `hit` is true when a correction happened.
 */
export function resolveCollision(p: { x: number; z: number }, r: number): boolean {
  let hit = false;
  for (const b of CITY.buildings) {
    const hw = b.w / 2 + 0.6, hd = b.d / 2 + 0.6; // canopy/columns overhang
    const dx = p.x - b.x, dz = p.z - b.z;
    if (Math.abs(dx) > hw + r || Math.abs(dz) > hd + r) continue;
    const cx = Math.max(-hw, Math.min(hw, dx));
    const cz = Math.max(-hd, Math.min(hd, dz));
    const ox = dx - cx, oz = dz - cz;
    const d2 = ox * ox + oz * oz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      p.x += (ox / d) * (r - d);
      p.z += (oz / d) * (r - d);
    } else {
      // centre inside the box: exit through the nearest face
      const px = hw + r - Math.abs(dx), pz = hd + r - Math.abs(dz);
      if (px < pz) p.x += Math.sign(dx || 1) * px;
      else p.z += Math.sign(dz || 1) * pz;
    }
  }
  // Story structures (club, kiosk, lairs…) are exact boxes, no canopy margin
  for (const o of PLACE_OBSTACLES) {
    const dx = p.x - o.x, dz = p.z - o.z;
    const px = o.hw + r - Math.abs(dx);
    if (px <= 0) continue;
    const pz = o.hd + r - Math.abs(dz);
    if (pz <= 0) continue;
    hit = true;
    if (px < pz) p.x += Math.sign(dx || 1) * px;
    else p.z += Math.sign(dz || 1) * pz;
  }
  const f = CITY.fountain;
  const fx = p.x - f.x, fz = p.z - f.z;
  const fd = Math.hypot(fx, fz), fr = f.r + r;
  if (fd < fr && fd > 1e-6) {
    p.x = f.x + (fx / fd) * fr;
    p.z = f.z + (fz / fd) * fr;
    hit = true;
  }
  p.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, p.x));
  p.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, p.z));
  return hit;
}

/** 0 at noon … 1 at night, smooth through dusk/dawn. */
export function nightFactor(hour: number): number {
  if (hour >= 7 && hour <= 18) return 0;
  if (hour >= 20 || hour <= 5) return 1;
  if (hour < 7) return (7 - hour) / 2;
  return (hour - 18) / 2;
}

/** Is (x, z) inside a building or story structure (grown by `margin`)? */
export function insideObstacle(x: number, z: number, margin = 0): boolean {
  for (const b of CITY.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin) return true;
  }
  for (const o of PLACE_OBSTACLES) {
    if (Math.abs(x - o.x) < o.hw + margin && Math.abs(z - o.z) < o.hd + margin) return true;
  }
  return false;
}

/** 2D line of sight between two points (shots don't go through buildings). */
export function lineOfSight(ax: number, az: number, bx: number, bz: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (insideObstacle(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}
