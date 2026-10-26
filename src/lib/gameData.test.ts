import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  BUSINESSES, CHARACTERS, MAIN_MISSIONS, MISSIONS, NPC_CONFIGS, SIDE_MISSIONS, STORY, VEHICLE_CONFIGS,
} from "./gameData";

const npc = (id: string) => NPC_CONFIGS.find(n => n.id === id);

describe("one coherent story", () => {
  it("chains the 14 main missions from m1 to the finale", () => {
    expect(MAIN_MISSIONS).toHaveLength(14);
    let m = MAIN_MISSIONS[0];
    const seen = [m.id];
    while (m.nextMissionId) {
      m = MISSIONS.find(x => x.id === m.nextMissionId)!;
      seen.push(m.id);
    }
    expect(seen).toEqual(MAIN_MISSIONS.map(x => x.id));
  });

  it("puts every main mission in exactly one act", () => {
    const inActs = STORY.acts.flatMap(a => a.missions);
    expect(inActs.sort()).toEqual(MAIN_MISSIONS.map(m => m.id).sort());
  });

  it("keeps the five original missions inside the campaign", () => {
    const originals = MISSIONS.filter(m => m.original).map(m => m.title);
    expect(originals).toEqual(["El Inicio del Imperio", "Expansión de Mercado", "El Rival Amenaza", "Imperio Imparable", "CEO del Año"]);
  });

  it("has 11 side missions, each unlocked by a main mission", () => {
    expect(SIDE_MISSIONS).toHaveLength(11);
    for (const m of SIDE_MISSIONS) expect(MAIN_MISSIONS.some(x => x.id === m.unlockAfter), m.id).toBe(true);
  });
});

describe("every reference resolves", () => {
  it.each(MISSIONS.map(m => [m.id, m] as const))("%s", (_, m) => {
    expect(npc(m.giverNpcId), "giver").toBeDefined();
    if (m.targetBusiness) expect(BUSINESSES.some(b => b.id === m.targetBusiness)).toBe(true);
    for (const b of m.targetBosses ?? []) expect(npc(b)?.type, b).toBe("boss");
    if (m.targetGroup) expect(NPC_CONFIGS.filter(n => n.group === m.targetGroup).length).toBeGreaterThanOrEqual(m.targetCount ?? 1);
    for (const v of [m.requireVehicleId, m.targetVehicleId].filter(Boolean)) expect(VEHICLE_CONFIGS.some(c => c.id === v)).toBe(true);
    if (m.type === "goto" || m.type === "deliver") expect(m.markerPos).toBeDefined();
    if (m.type === "race" || m.type === "waypoints") expect(m.waypoints?.length).toBeGreaterThan(0);
  });

  it("the chase car is AI-driven", () => {
    const chase = MISSIONS.find(m => m.type === "chase")!;
    expect(VEHICLE_CONFIGS.find(v => v.id === chase.targetVehicleId)?.ai).toBe(true);
  });

  it("has a unique id for every NPC, car, business and playable CEO", () => {
    for (const list of [NPC_CONFIGS, VEHICLE_CONFIGS, BUSINESSES, MISSIONS]) {
      const ids = list.map(x => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(new Set(CHARACTERS.map(c => c.key)).size).toBe(CHARACTERS.length);
  });
});

describe("no third-party characters", () => {
  it("uses no names from other franchises in the game data", () => {
    const src = readFileSync(new URL("./gameData.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/arthas|illidan|majin|bowser|goku|monopoly|ferrari|lamborghini|tesla|porsche|rolls/i);
  });
});
