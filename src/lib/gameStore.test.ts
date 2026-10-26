import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGame } from "./gameStore";
import { BUSINESSES, MISSIONS } from "./gameData";

const store = () => useGame.getState();
const mission = (id: string) => MISSIONS.find(m => m.id === id)!;
const cafe = BUSINESSES.find(b => b.id === "cafe")!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
  store().reset();
});
afterEach(() => vi.useRealTimers());

describe("missions", () => {
  it("pays a mission once, even if completion fires again", () => {
    const money = store().money;
    store().completeMission(true, "ok");
    store().completeMission(true, "ok");
    expect(store().completedMissions).toEqual(["mission_1"]);
    expect(store().money).toBe(money + mission("mission_1").rewardMoney);
    expect(store().currentObjective).toBe("ok");
  });

  it("cannot restart a completed mission (no infinite money)", () => {
    store().completeMission(true);
    store().startMission("mission_1");
    expect(store().activeMissionId).toBeNull();
  });

  it("only starts the next mission in the story", () => {
    store().completeMission(true); // mission_1
    store().startMission("mission_5");
    expect(store().activeMissionId).toBeNull();
    store().startMission("mission_2");
    expect(store().activeMissionId).toBe("mission_2");
  });

  it("reaches mission 5 even though missions 4 and 5 share a marker", () => {
    for (const id of ["mission_1", "mission_2", "mission_3", "mission_4"]) {
      if (store().activeMissionId !== id) store().startMission(id);
      expect(store().activeMissionId).toBe(id);
      store().completeMission(true);
    }
    store().startMission("mission_5");
    expect(store().activeMissionId).toBe("mission_5");
  });

  it("a failed mission pays nothing and can be retried", () => {
    const money = store().money;
    store().completeMission(false);
    expect(store().money).toBe(money);
    store().startMission("mission_1");
    expect(store().activeMissionId).toBe("mission_1");
  });
});

describe("businesses and passive income", () => {
  it("does not pay income for the time before the first purchase", () => {
    vi.advanceTimersByTime(10 * 60_000); // ten minutes walking around
    store().buyBusiness("cafe");
    vi.advanceTimersByTime(1000);
    store().tickPassiveIncome();
    expect(store().money).toBe(5000 - cafe.price + cafe.incomePerSec);
  });

  it("does not charge twice for a business already owned", () => {
    store().addMoney(100_000);
    store().buyBusiness("cafe");
    const money = store().money;
    store().buyBusiness("cafe");
    expect(store().money).toBe(money);
    expect(store().ownedBusinesses).toEqual(["cafe"]);
    expect(store().passiveIncomePerSec).toBe(cafe.incomePerSec);
  });

  it("refuses a purchase without enough money", () => {
    store().buyBusiness("empire");
    expect(store().ownedBusinesses).toEqual([]);
    expect(store().money).toBe(5000);
  });
});

describe("vehicles", () => {
  it("entering a car clears on-foot prompts so they cannot act from inside", () => {
    store().setNearbyNpcId("npc_garcia");
    store().setNearbyBusinessId("cafe");
    store().setNearbyMissionId("mission_1");
    store().enterVehicle("car1");
    const s = store();
    expect([s.nearbyNpcId, s.nearbyBusinessId, s.nearbyMissionId, s.nearbyVehicleId]).toEqual([null, null, null, null]);
    expect(s.activeVehicleId).toBe("car1");
  });
});

describe("reset", () => {
  it("restores every field but keeps the chosen character", () => {
    store().setSelectedCharacter("chica_creativa");
    store().addMoney(1234);
    store().setNearbyNpcId("npc_lord");
    store().enterVehicle("car1");
    store().takeDamage(100);
    expect(store().phase).toBe("dead");

    store().reset();
    const s = store();
    expect(s.phase).toBe("menu");
    expect(s.money).toBe(5000);
    expect(s.health).toBe(100);
    expect(s.nearbyNpcId).toBeNull();
    expect(s.inVehicle).toBe(false);
    expect(s.activeMissionId).toBe("mission_1");
    expect(s.selectedCharacter).toBe("chica_creativa");
  });
});
