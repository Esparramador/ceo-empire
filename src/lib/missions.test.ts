import { describe, expect, it } from "vitest";
import { MISSIONS } from "./gameData";
import { canStartMission, checkMission, nextMission, type MissionContext } from "./missions";

const m = (id: string) => MISSIONS.find(x => x.id === id)!;
const ctx = (over: Partial<MissionContext> = {}): MissionContext => ({
  playerPos: [500, 0, 500], ownedBusinesses: [], defeatedNpcs: [], ...over,
});

describe("story order", () => {
  it("next mission is the first one not completed", () => {
    expect(nextMission([])?.id).toBe("mission_1");
    expect(nextMission(["mission_1", "mission_2"])?.id).toBe("mission_3");
    expect(nextMission(MISSIONS.map(x => x.id))).toBeNull();
  });

  it("only the next mission can start, and never while one is running", () => {
    expect(canStartMission("mission_2", ["mission_1"], null)).toBe(true);
    expect(canStartMission("mission_3", ["mission_1"], null)).toBe(false);
    expect(canStartMission("mission_2", ["mission_1"], "mission_2")).toBe(false);
    expect(canStartMission("mission_1", ["mission_1"], null)).toBe(false);
  });
});

describe("objectives", () => {
  it("mission 1 needs the player on the HQ marker", () => {
    expect(checkMission(m("mission_1"), ctx())).toBeNull();
    expect(checkMission(m("mission_1"), ctx({ playerPos: m("mission_1").markerPos }))).not.toBeNull();
  });

  it("mission 2 needs the café", () => {
    expect(checkMission(m("mission_2"), ctx({ ownedBusinesses: ["marketing"] }))).toBeNull();
    expect(checkMission(m("mission_2"), ctx({ ownedBusinesses: ["cafe"] }))).not.toBeNull();
  });

  it("mission 3 needs Lord Tuétano defeated, not just a visit to his lair", () => {
    expect(checkMission(m("mission_3"), ctx({ playerPos: m("mission_3").markerPos }))).toBeNull();
    expect(checkMission(m("mission_3"), ctx({ defeatedNpcs: ["npc_lord"] }))).not.toBeNull();
  });

  it("mission 4 needs four businesses", () => {
    expect(checkMission(m("mission_4"), ctx({ ownedBusinesses: ["a", "b", "c"] }))).toBeNull();
    expect(checkMission(m("mission_4"), ctx({ ownedBusinesses: ["a", "b", "c", "d"] }))).not.toBeNull();
  });

  it("mission 5 needs the player at the final marker", () => {
    expect(checkMission(m("mission_5"), ctx())).toBeNull();
    expect(checkMission(m("mission_5"), ctx({ playerPos: m("mission_5").markerPos }))).not.toBeNull();
  });
});
