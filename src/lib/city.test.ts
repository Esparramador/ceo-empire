import { describe, expect, it } from "vitest";
import { CITY, cameraRayHit, groundHeight, insideObstacle, lineOfSight, nightFactor, resolveCollision, WORLD_LIMIT } from "./city";
import { BUSINESSES, DATA_CHIPS, MISSIONS, NPC_CONFIGS, PICKUPS, PLACES, VEHICLE_CONFIGS, CHASE_ROUTE } from "./gameData";

/** Reachable on foot: not inside a building, a story structure or the fountain, and inside the world. */
const free = (x: number, z: number, r = 0.45) => {
  const p = { x, z };
  return !resolveCollision(p, r);
};

describe("city layout", () => {
  it("has the roads, blocks and buildings the game expects", () => {
    expect(CITY.roads.centers).toEqual([-60, -20, 20, 60]);
    expect(CITY.buildings.length).toBeGreaterThanOrEqual(50);
  });

  it("keeps the parks off the roads", () => {
    for (const p of CITY.parks) {
      for (const r of CITY.roads.centers) {
        const h = p.size / 2, road = CITY.roads.halfWidth;
        const overlapsX = p.x - h < r + road && p.x + h > r - road;
        const overlapsZ = p.z - h < r + road && p.z + h > r - road;
        expect(overlapsX || overlapsZ, `park at ${p.x},${p.z} crosses road ${r}`).toBe(false);
      }
    }
  });
});

describe("everything in the story is placed on free ground", () => {
  it.each(NPC_CONFIGS.filter(n => n.wanderRadius > 0).map(n => [n.id, n.pos] as const))("NPC %s", (_, pos) => {
    expect(free(pos[0], pos[2])).toBe(true);
  });
  it.each(BUSINESSES.map(b => [b.id, b.pos] as const))("business marker %s", (_, pos) => {
    expect(free(pos[0], pos[2], 1)).toBe(true);
  });
  it.each(VEHICLE_CONFIGS.map(v => [v.id, v.pos] as const))("car %s", (_, pos) => {
    expect(free(pos[0], pos[2], 1)).toBe(true);
    expect(groundHeight(pos[0], pos[2])).toBe(0); // parked on the road, not the sidewalk
  });
  it.each([...PICKUPS.map(p => [p.id, p.pos] as const), ...DATA_CHIPS.map((c, i) => [`chip${i}`, c] as const)])("pickup %s", (_, pos) => {
    expect(free(pos[0], pos[2], 1.5)).toBe(true);
  });
  it.each(MISSIONS.filter(m => m.markerPos && (m.type === "goto" || m.type === "deliver")).map(m => [m.id, m.markerPos!] as const))("goal of %s", (_, pos) => {
    expect(free(pos[0], pos[2])).toBe(true);
  });
  it.each(MISSIONS.flatMap(m => (m.waypoints ?? []).map((w, i) => [`${m.id} #${i + 1}`, w] as const)))("waypoint %s", (_, pos) => {
    expect(free(pos[0], pos[2])).toBe(true);
  });

  it("race checkpoints and the mole's escape route are on the roads", () => {
    for (const m of MISSIONS.filter(x => x.type === "race")) {
      for (const w of m.waypoints!) expect(groundHeight(w[0], w[2]), `${m.id} ${w}`).toBe(0);
    }
    for (const w of CHASE_ROUTE) expect(groundHeight(w[0], w[2])).toBe(0);
  });

  it("story structures stand on their own lots, clear of the city's buildings", () => {
    const { facade } = PLACES.club;
    for (const b of CITY.buildings) {
      const hit = Math.abs(b.x - facade.x) < (b.w + facade.w) / 2 && Math.abs(b.z - facade.z) < (b.d + facade.d) / 2;
      expect(hit).toBe(false);
    }
    expect(free(PLACES.helipad.x, PLACES.helipad.z + 6)).toBe(true);
    expect(free(PLACES.iceTower.arena[0], PLACES.iceTower.arena[2])).toBe(true);
  });
});

describe("collisions and line of sight", () => {
  it("pushes a point out of a building and out of the club", () => {
    const b = CITY.buildings[0];
    const p = { x: b.x, z: b.z };
    expect(resolveCollision(p, 0.45)).toBe(true);
    expect(insideObstacle(p.x, p.z)).toBe(false);
    const c = { x: PLACES.club.facade.x, z: PLACES.club.facade.z };
    expect(resolveCollision(c, 0.45)).toBe(true);
  });

  it("keeps the player inside the world", () => {
    const p = { x: 10_000, z: -10_000 };
    resolveCollision(p, 0.45);
    expect(p.x).toBe(WORLD_LIMIT);
    expect(p.z).toBe(-WORLD_LIMIT);
  });

  it("shots don't go through buildings", () => {
    const b = CITY.buildings[0];
    expect(lineOfSight(b.x - b.w, b.z, b.x + b.w, b.z)).toBe(false);
    expect(lineOfSight(0, 20, 0, 22)).toBe(true);
  });

  it("sidewalks are raised, roads are not", () => {
    expect(groundHeight(CITY.roads.centers[0], 0)).toBe(0);
    const blk = CITY.blocks[0];
    expect(groundHeight((blk.x0 + blk.x1) / 2, (blk.z0 + blk.z1) / 2)).toBe(CITY.curbHeight);
  });
});

describe("camera", () => {
  it("is stopped by a building between the player and the camera", () => {
    const b = CITY.buildings[0];
    const t = cameraRayHit(b.x - b.w, 1.7, b.z, b.x + b.w, 3, b.z);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(0.5);
  });

  it("passes over low structures (the club's stage and bar) and above rooftops", () => {
    const { stage } = PLACES.club;
    expect(cameraRayHit(stage[0], 1.7, stage[2] - 5, stage[0], 3, stage[2] + 4)).toBe(1);
    const b = CITY.buildings[0];
    expect(cameraRayHit(b.x - b.w, b.h + 5, b.z, b.x + b.w, b.h + 5, b.z)).toBe(1);
  });

  it("is clear in an open street", () => {
    expect(cameraRayHit(0, 1.7, 20, 0, 3.2, 26)).toBe(1);
  });
});

describe("day/night", () => {
  it("is day at noon, night at midnight, and blends at dusk", () => {
    expect(nightFactor(12)).toBe(0);
    expect(nightFactor(0)).toBe(1);
    expect(nightFactor(19)).toBeCloseTo(0.5);
  });
});
