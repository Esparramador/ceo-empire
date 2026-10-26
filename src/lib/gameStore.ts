import { create } from "zustand";
import { BUSINESSES, MISSIONS } from "./gameData";
import { canStartMission } from "./missions";

export interface InventoryItem {
  id: string;
  name: string;
  type: "weapon" | "health" | "money" | "quest";
  quantity: number;
  icon: string;
  description?: string;
}

interface GameStore {
  phase: "menu" | "playing" | "dead";
  health: number;
  money: number;
  karma: number;
  wantedLevel: number;
  dayTime: number;
  playerPos: [number, number, number];
  playerFacing: number;
  inVehicle: boolean;
  activeVehicleId: string | null;
  vehicleSpeed: number;
  selectedCharacter: string;
  inventory: InventoryItem[];
  activeMissionId: string | null;
  completedMissions: string[];
  currentObjective: string | null;
  missionTimer: number;
  ownedBusinesses: string[];
  passiveIncomePerSec: number;
  lastIncomeTime: number;
  dialogOpen: boolean;
  dialogNpcName: string;
  dialogText: string;
  dialogLoading: boolean;
  showInventory: boolean;
  killCount: number;
  nearbyNpcId: string | null;
  nearbyVehicleId: string | null;
  nearbyBusinessId: string | null;
  nearbyMissionId: string | null;
  activeWeapon: string;

  // Actions
  setPhase(p: GameStore["phase"]): void;
  reset(): void;
  takeDamage(d: number): void;
  heal(h: number): void;
  addMoney(m: number): void;
  addKarma(k: number): void;
  setWantedLevel(level: number): void;
  tickDayTime(delta: number): void;
  setPlayerPos(pos: [number, number, number]): void;
  setPlayerFacing(f: number): void;
  setInVehicle(v: boolean): void;
  enterVehicle(id: string): void;
  exitVehicle(): void;
  setVehicleSpeed(kmh: number): void;
  setSelectedCharacter(c: string): void;
  addItem(item: InventoryItem): void;
  removeItem(id: string): void;
  startMission(id: string): void;
  /** Ends the active mission once: pays the reward on success and shows `message`. */
  completeMission(success: boolean, message?: string): void;
  setCurrentObjective(obj: string | null): void;
  setMissionTimer(t: number): void;
  buyBusiness(id: string): void;
  openDialog(npcId: string, npcName: string, text: string): void;
  closeDialog(): void;
  setDialogLoading(l: boolean): void;
  toggleInventory(): void;
  addKill(): void;
  setNearbyNpcId(id: string | null): void;
  setNearbyVehicleId(id: string | null): void;
  setNearbyBusinessId(id: string | null): void;
  setNearbyMissionId(id: string | null): void;
  setActiveWeapon(w: string): void;
  tickPassiveIncome(): void;
}

/** The data half of the store (everything that is not an action). */
type GameState = { [K in keyof GameStore as GameStore[K] extends (...args: never[]) => unknown ? never : K]: GameStore[K] };

const START_OBJECTIVE = "Ve al marcador azul y recoge el maletín de datos";

/** Fresh game state; used at load and by reset() so both always agree. */
function initialState(): GameState {
  return {
    phase: "menu",
    health: 100,
    money: 5000,
    karma: 0,
    wantedLevel: 0,
    dayTime: 10,
    playerPos: [0, 0, 26],
    playerFacing: 0,
    inVehicle: false,
    activeVehicleId: null,
    vehicleSpeed: 0,
    selectedCharacter: "alec_monopoly",
    inventory: [
      { id: "phone", name: "Teléfono Ejecutivo", type: "quest", quantity: 1, icon: "📱", description: "Tu arma de negocios más poderosa" },
      { id: "briefcase", name: "Maletín de Negocios", type: "quest", quantity: 1, icon: "💼", description: "Contiene los datos del inversor" },
      { id: "medkit", name: "Kit Médico CEO", type: "health", quantity: 3, icon: "💊", description: "Recupera 50 puntos de salud" },
    ],
    activeMissionId: "mission_1",
    completedMissions: [],
    currentObjective: START_OBJECTIVE,
    missionTimer: 0,
    ownedBusinesses: [],
    passiveIncomePerSec: 0,
    lastIncomeTime: Date.now(),
    dialogOpen: false,
    dialogNpcName: "",
    dialogText: "",
    dialogLoading: false,
    showInventory: false,
    killCount: 0,
    nearbyNpcId: null,
    nearbyVehicleId: null,
    nearbyBusinessId: null,
    nearbyMissionId: null,
    activeWeapon: "fists",
  };
}

export const useGame = create<GameStore>((set, get) => ({
  ...initialState(),

  setPhase: (p) => set({ phase: p }),

  // Keep the chosen character so "try again" replays with it.
  reset: () => set(s => ({ ...initialState(), selectedCharacter: s.selectedCharacter })),

  takeDamage: (d) =>
    set((s) => {
      const health = Math.max(0, s.health - d);
      return { health, phase: health <= 0 ? "dead" : s.phase };
    }),

  heal: (h) => set((s) => ({ health: Math.min(100, s.health + h) })),

  addMoney: (m) => set((s) => ({ money: s.money + m })),

  addKarma: (k) =>
    set((s) => ({ karma: Math.max(-100, Math.min(100, s.karma + k)) })),

  setWantedLevel: (level) => set({ wantedLevel: Math.max(0, Math.min(5, level)) }),

  tickDayTime: (delta) =>
    set((s) => ({ dayTime: (s.dayTime + delta) % 24 })),

  setPlayerPos: (pos) => set({ playerPos: pos }),
  setPlayerFacing: (f) => set({ playerFacing: f }),
  setInVehicle: (v) => set(v ? { inVehicle: true } : { inVehicle: false, activeVehicleId: null, vehicleSpeed: 0 }),
  // On-foot proximity is not tracked while driving: clear it so no stale prompt
  // ("F Hablar", "B Comprar") stays on screen or acts from inside the car.
  enterVehicle: (id) => set({
    inVehicle: true, activeVehicleId: id,
    nearbyVehicleId: null, nearbyNpcId: null, nearbyBusinessId: null, nearbyMissionId: null,
  }),
  exitVehicle: () => set({ inVehicle: false, activeVehicleId: null, vehicleSpeed: 0 }),
  setVehicleSpeed: (kmh) => set({ vehicleSpeed: kmh }),
  setSelectedCharacter: (c) => set({ selectedCharacter: c }),

  addItem: (item) =>
    set((s) => ({
      inventory: s.inventory.find((i) => i.id === item.id)
        ? s.inventory.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
          )
        : [...s.inventory, item],
    })),

  removeItem: (id) =>
    set((s) => ({
      inventory: s.inventory.map(i => i.id === id
        ? { ...i, quantity: i.quantity - 1 }
        : i
      ).filter(i => i.quantity > 0),
    })),

  startMission: (id) => {
    const { completedMissions, activeMissionId } = get();
    if (!canStartMission(id, completedMissions, activeMissionId)) return;
    const m = MISSIONS.find(m => m.id === id);
    set({
      activeMissionId: id,
      currentObjective: m?.objective ?? null,
      missionTimer: 0,
    });
  },

  completeMission: (success, message) =>
    set((s) => {
      const mission = MISSIONS.find(m => m.id === s.activeMissionId);
      if (!mission || s.completedMissions.includes(mission.id)) return {};
      if (!success) {
        return { activeMissionId: null, missionTimer: 0, currentObjective: message ?? "❌ Misión fallida." };
      }
      return {
        completedMissions: [...s.completedMissions, mission.id],
        activeMissionId: null,
        money: s.money + mission.rewardMoney,
        karma: Math.max(-100, Math.min(100, s.karma + mission.rewardKarma)),
        currentObjective: message ?? "✅ Misión completada. Busca la siguiente.",
        missionTimer: 0,
      };
    }),

  setCurrentObjective: (obj) => set({ currentObjective: obj }),
  setMissionTimer: (t) => set({ missionTimer: t }),

  buyBusiness: (id) => {
    const biz = BUSINESSES.find(b => b.id === id);
    if (!biz) return;
    const { money, ownedBusinesses } = get();
    if (money < biz.price || ownedBusinesses.includes(id)) return;
    set((s) => ({
      // the first business starts the income clock now, not at page load
      lastIncomeTime: s.ownedBusinesses.length === 0 ? Date.now() : s.lastIncomeTime,
      money: s.money - biz.price,
      ownedBusinesses: [...s.ownedBusinesses, id],
      passiveIncomePerSec: s.passiveIncomePerSec + biz.incomePerSec,
    }));
  },

  openDialog: (_npcId, npcName, text) =>
    set({ dialogOpen: true, dialogNpcName: npcName, dialogText: text }),

  closeDialog: () =>
    set({ dialogOpen: false, dialogNpcName: "", dialogText: "" }),

  setDialogLoading: (l) => set({ dialogLoading: l }),

  toggleInventory: () => set((s) => ({ showInventory: !s.showInventory })),

  addKill: () => set((s) => ({ killCount: s.killCount + 1 })),

  setNearbyNpcId: (id) => set({ nearbyNpcId: id }),
  setNearbyVehicleId: (id) => set({ nearbyVehicleId: id }),
  setNearbyBusinessId: (id) => set({ nearbyBusinessId: id }),
  setNearbyMissionId: (id) => set({ nearbyMissionId: id }),

  setActiveWeapon: (w) => set({ activeWeapon: w }),

  tickPassiveIncome: () => {
    const { ownedBusinesses, passiveIncomePerSec, lastIncomeTime } = get();
    if (ownedBusinesses.length === 0) return;
    const now = Date.now();
    const elapsed = (now - lastIncomeTime) / 1000;
    if (elapsed >= 1) {
      set((s) => ({
        money: s.money + Math.floor(passiveIncomePerSec * elapsed),
        lastIncomeTime: now,
      }));
    }
  },
}));
