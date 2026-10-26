import { beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { damageNpc, resetRuntime, runtime } from "./runtime";

beforeEach(() => {
  resetRuntime();
  runtime.npcs.npc_lord = { pos: new THREE.Vector3(), hp: 100, dead: false, respawnAt: 0 };
});

describe("combat", () => {
  it("knocks an NPC down only when its health runs out, and only once", () => {
    expect(damageNpc("npc_lord", 34)).toBe(false);
    expect(damageNpc("npc_lord", 34)).toBe(false);
    expect(damageNpc("npc_lord", 34)).toBe(true);
    expect(runtime.npcs.npc_lord.dead).toBe(true);
    expect(damageNpc("npc_lord", 34)).toBe(false); // no extra kill for hitting the body
  });

  it("ignores unknown NPCs", () => {
    expect(damageNpc("nobody", 999)).toBe(false);
  });
});

describe("new game", () => {
  it("forgets held keys and knocked-down NPCs", () => {
    runtime.keys.w = true;
    damageNpc("npc_lord", 999);
    resetRuntime();
    expect(runtime.keys).toEqual({});
    expect(runtime.npcs).toEqual({});
    expect(runtime.player.toArray()).toEqual([0, 0, 26]);
  });
});
