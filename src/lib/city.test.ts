import { describe, expect, it } from "vitest";
import { CITY, groundHeight, nightFactor, resolveCollision, WORLD_LIMIT } from "./city";
import { BUSINESSES, MISSIONS, NPC_CONFIGS, VEHICLE_CONFIGS } from "./gameData";
import { useGame } from "./gameStore";

/** A point is reachable on foot when the collision solver leaves it where it is. */
const freeSpot = (x: number, z: number, r = 0.45) => {
  const p = { x, z };
  return !resolveCollision(p, r);
};

describe("city layout", () => {
  it("has the roads, blocks and buildings the game expects", () => {
    expect(CITY.roads.centers.length).toBeGreaterThan(0);
    expect(CITY.blocks.length).toBeGreaterThan(0);
    expect(CITY.buildings.length).toBeGreaterThanOrEqual(30);
  });

  it.each([
    ...MISSIONS.map(m => [`mission ${m.id}`, m.markerPos] as const),
    ...BUSINESSES.map(b => [`business ${b.id}`, b.pos] as const),
    ...NPC_CONFIGS.map(n => [`npc ${n.id}`, n.pos] as const),
    ["player spawn", useGame.getState().playerPos] as const,
  ])("%s is not inside a building", (_, pos) => {
    expect(freeSpot(pos[0], pos[2])).toBe(true);
  });

  it.each(VEHICLE_CONFIGS.map(v => [v.id, v.pos] as const))("car %s spawns on free ground", (_, pos) => {
    expect(freeSpot(pos[0], pos[2], 1)).toBe(true);
  });
});

describe("collisions", () => {
  it("pushes a point out of a building", () => {
    const b = CITY.buildings[0];
    const p = { x: b.x, z: b.z };
    expect(resolveCollision(p, 0.45)).toBe(true);
    expect(Math.abs(p.x - b.x) >= b.w / 2 || Math.abs(p.z - b.z) >= b.d / 2).toBe(true);
  });

  it("keeps the player inside the world", () => {
    const p = { x: 10_000, z: -10_000 };
    resolveCollision(p, 0.45);
    expect(p.x).toBe(WORLD_LIMIT);
    expect(p.z).toBe(-WORLD_LIMIT);
  });

  it("sidewalks are raised, roads are not", () => {
    const road = CITY.roads.centers[0];
    expect(groundHeight(road, 0)).toBe(0);
    const blk = CITY.blocks[0];
    expect(groundHeight((blk.x0 + blk.x1) / 2, (blk.z0 + blk.z1) / 2)).toBe(CITY.curbHeight);
  });
});

describe("day/night", () => {
  it("is day at noon, night at midnight, and blends at dusk", () => {
    expect(nightFactor(12)).toBe(0);
    expect(nightFactor(0)).toBe(1);
    expect(nightFactor(19)).toBeCloseTo(0.5);
    expect(nightFactor(6)).toBeCloseTo(0.5);
  });
});
