import { beforeEach, describe, expect, it } from "vitest";
import { useGame, availableSideMissions } from "./gameStore";
import { BUSINESSES, MISSIONS, HIRE_COST } from "./gameData";
import { runtime } from "./world";

// In-memory localStorage so saveGame / continueGame run in Node
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: k => mem.get(k) ?? null,
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
};

const store = () => useGame.getState();
const mission = (id: string) => MISSIONS.find(m => m.id === id)!;
const cafe = BUSINESSES.find(b => b.id === "cafe")!;

beforeEach(() => {
  mem.clear();
  store().newGame("crafter");
  store().startPlaying();
});

describe("new game", () => {
  it("starts in the plaza with the first story mission on offer", () => {
    expect(store().phase).toBe("playing");
    expect(store().money).toBe(5000);
    expect(store().availableMissionId).toBe("m1");
    expect(runtime.player.pos.x).toBe(4);
  });

  it("applies each CEO's perk", () => {
    store().newGame("magnate");
    expect(store().money).toBe(7500);
    store().newGame("ejecutiva");
    expect(store().maxHealth).toBe(120);
    store().newGame("formal");
    expect(store().businessPrice("cafe")).toBe(Math.round(cafe.price * 0.9));
  });
});

describe("missions", () => {
  it("pays a mission once and moves the story on", () => {
    store().acceptMission("m1");
    store().completeMission();
    store().completeMission();
    expect(store().completedMissions).toEqual(["m1"]);
    expect(store().money).toBe(5000 + mission("m1").rewardMoney);
    expect(store().availableMissionId).toBe("m2");
  });

  it("cannot accept a main mission the story has not reached, or one already done", () => {
    store().acceptMission("m14");
    expect(store().activeMissionId).toBeNull();
    store().acceptMission("m1");
    store().completeMission();
    store().acceptMission("m1");
    expect(store().activeMissionId).toBeNull();
  });

  it("keeps side missions locked until their main mission is done", () => {
    store().acceptMission("s_express");
    expect(store().activeMissionId).toBeNull();
    useGame.setState({ completedMissions: ["m1", "m2"], availableMissionId: "m3" });
    expect(availableSideMissions(store()).map(m => m.id)).toContain("s_express");
    store().acceptMission("s_express");
    expect(store().activeMissionId).toBe("s_express");
  });

  it("a failed main mission pays nothing and is offered again", () => {
    useGame.setState({ completedMissions: ["m1", "m2"], availableMissionId: "m3" });
    store().acceptMission("m3");
    const money = store().money;
    store().failMission("se acabó el tiempo");
    expect(store().money).toBe(money);
    expect(store().availableMissionId).toBe("m3");
  });

  it("the last main mission ends the game in victory", () => {
    useGame.setState({ completedMissions: MISSIONS.filter(m => m.category === "main" && m.id !== "m14").map(m => m.id), availableMissionId: "m14" });
    store().acceptMission("m14");
    store().completeMission();
    expect(store().phase).toBe("victory");
  });

  it("an investment charges its cost up front", () => {
    useGame.setState({ completedMissions: ["m1", "m2", "m3", "m4", "m5", "m6"], availableMissionId: "m7", money: 30000 });
    store().acceptMission("s_angel");
    expect(store().activeMissionId).toBe("s_angel");
    expect(store().money).toBe(10000);
  });
});

describe("businesses", () => {
  it("buys once, never charges twice, and refuses without money", () => {
    expect(store().buyBusiness("cafe")).toBe(true);
    const money = store().money;
    expect(store().buyBusiness("cafe")).toBe(false);
    expect(store().money).toBe(money);
    expect(store().buyBusiness("empire")).toBe(false);
  });

  it("income grows with level, employees and the CEO Crafter perk; the club doubles at night", () => {
    useGame.setState({ money: 1_000_000 });
    store().buyBusiness("cafe");
    expect(store().incomePerSec()).toBeCloseTo(cafe.incomePerSec * 1.1);
    store().upgradeBusiness("cafe");
    expect(store().incomePerSec()).toBeCloseTo(cafe.incomePerSec * 1.6 * 1.1);
    store().hireNpc("npc_cit1");
    expect(store().employees).toBe(1);
    expect(store().money).toBe(1_000_000 - cafe.price - Math.round(cafe.price * 0.6) - HIRE_COST);
    const club = BUSINESSES.find(b => b.id === "club")!;
    useGame.setState({ ownedBusinesses: { club: 1 }, employees: 0 });
    runtime.night = 0;
    const day = store().incomePerSec();
    runtime.night = 1;
    expect(store().incomePerSec()).toBeCloseTo(day * 2);
    expect(day).toBeCloseTo(club.incomePerSec * 1.1);
    runtime.night = 0;
  });
});

describe("life, police and saving", () => {
  it("dying sends you to hospital with a 10 % bill and clears the stars", () => {
    useGame.setState({ money: 10000, wantedLevel: 3 });
    store().takeDamage(999);
    expect(store().phase).toBe("dead");
    store().respawn();
    expect(store().phase).toBe("playing");
    expect(store().money).toBe(9000);
    expect(store().wantedLevel).toBe(0);
    expect(store().health).toBe(store().maxHealth);
  });

  it("the armoured suit cuts damage by 40 %", () => {
    useGame.setState({ armor: true });
    store().takeDamage(50);
    expect(store().health).toBe(70);
  });

  it("saves and continues the same game", () => {
    useGame.setState({ money: 123456 });
    store().acceptMission("m1");
    store().completeMission();
    store().quitToMenu(); // saves
    useGame.setState({ completedMissions: [], money: 0, selectedCharacter: "formal" });
    store().continueGame();
    expect(store().phase).toBe("playing");
    expect(store().completedMissions).toEqual(["m1"]);
    expect(store().selectedCharacter).toBe("crafter");
  });
});
