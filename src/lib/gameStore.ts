// ─────────────────────────────────────────────────────────────────────────────
// Store de Zustand: progreso del jugador, economía, misiones, UI y guardado.
// Los datos por frame (posiciones) viven en lib/world.ts, no aquí.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from "zustand";
import {
  BUSINESSES, MISSIONS, WEAPONS, SHOP_ITEMS, CHARACTERS, NPC_CONFIGS,
  MAX_BUSINESS_LEVEL, MAX_EMPLOYEES, HIRE_COST, EMPLOYEE_BONUS,
  businessIncome, upgradeCost, missionById, characterByKey, type Vec3,
} from "./gameData";
import { runtime, resetRuntime } from "./world";
import { sfx, setMuted } from "./audio";

export type Phase = "menu" | "playing" | "paused" | "dead" | "victory";
export type ItemType = "weapon" | "health" | "ammo" | "quest" | "perk";

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  icon: string;
  description?: string;
}

export interface DialogOption {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  hint?: string;
}

export interface Notification {
  id: number;
  text: string;
  kind: "info" | "success" | "warning" | "danger" | "money";
}

export interface Nearby {
  npcId: string | null;
  vehicleId: string | null;
  businessId: string | null;
}

export interface BossFight { id: string; name: string; hp: number; maxHp: number }

const SAVE_KEY = "ceo-empire-save-v2";
const START_MONEY = 5000;

const STARTER_INVENTORY: InventoryItem[] = [
  { id: "phone", name: "Teléfono Ejecutivo", type: "quest", quantity: 1, icon: "📱", description: "Tu arma de negocios más poderosa." },
  { id: "medkit", name: "Kit Médico CEO", type: "health", quantity: 2, icon: "💊", description: "Recupera 50 puntos de salud." },
];

interface Progress {
  selectedCharacter: string;
  health: number;
  maxHealth: number;
  money: number;
  karma: number;
  wantedLevel: number;
  inventory: InventoryItem[];
  weapons: string[];
  activeWeapon: string;
  ammo: number;
  armor: boolean;
  activeMissionId: string | null;
  availableMissionId: string | null;
  completedMissions: string[];
  missionKills: number;
  missionCollected: number;
  missionHiresAtStart: number;
  missionTimeLeft: number | null;
  ownedBusinesses: Record<string, number>;
  employees: number;
  hiredNpcIds: string[];
  defeatedBosses: string[];
  killCount: number;
  civiliansHarmed: number;
  totalEarned: number;
  playTime: number;
  deaths: number;
  savedPlayerPos: Vec3;
  savedHour: number;
}

interface SaveFile extends Progress { version: number; savedAt: number }

interface GameStore extends Progress {
  phase: Phase;
  hasSave: boolean;
  dialog: { open: boolean; npcId: string | null; name: string; text: string; options: DialogOption[] };
  notifications: Notification[];
  showInventory: boolean;
  showEmpire: boolean;
  showHelp: boolean;
  muted: boolean;
  nearby: Nearby;
  inVehicle: boolean;
  vehicleName: string;
  vehicleSpeed: number;
  bossFight: BossFight | null;
  lastMissionResult: { title: string; success: boolean; reward: number } | null;

  // partida
  newGame(characterKey: string): void;
  continueGame(): void;
  saveGame(): void;
  pause(): void;
  resume(): void;
  quitToMenu(): void;
  respawn(): void;
  tickPlayTime(dt: number): void;

  // estado vital / economía
  takeDamage(amount: number, sourceId?: string): void;
  heal(amount: number): void;
  addMoney(amount: number, silent?: boolean): void;
  spendMoney(amount: number): boolean;
  addKarma(k: number): void;
  setWantedLevel(level: number): void;
  addWanted(n: number): void;

  // negocios
  incomePerSec(): number;
  businessPrice(id: string): number;
  buyBusiness(id: string): boolean;
  upgradeBusiness(id: string): boolean;
  hireNpc(npcId: string): boolean;

  // tienda / inventario / armas
  buyShopItem(itemId: string): boolean;
  useItem(id: string): void;
  addItem(item: InventoryItem): void;
  setActiveWeapon(id: string): void;
  cycleWeapon(dir: 1 | -1): void;
  consumeAmmo(): boolean;

  // misiones
  acceptMission(id: string): void;
  completeMission(): void;
  failMission(reason: string): void;
  abandonMission(): void;
  setMissionTimeLeft(t: number | null): void;
  addMissionKill(): void;
  addMissionCollected(): void;
  registerKill(npcId: string): void;
  clearMissionResult(): void;

  // UI
  openDialog(npcId: string | null, name: string, text: string, options?: DialogOption[]): void;
  closeDialog(): void;
  notify(text: string, kind?: Notification["kind"]): void;
  dismissNotification(id: number): void;
  toggleInventory(): void;
  toggleEmpire(): void;
  toggleHelp(): void;
  toggleMuted(): void;
  setNearby(n: Nearby): void;
  setInVehicle(v: boolean, name?: string): void;
  setVehicleSpeed(s: number): void;
  setBossFight(b: BossFight | null): void;
}

let notifId = 0;

function freshProgress(characterKey: string): Progress {
  const ch = characterByKey(characterKey);
  const maxHealth = ch.key === "ejecutiva" ? 120 : 100;
  return {
    selectedCharacter: ch.key,
    health: maxHealth,
    maxHealth,
    money: START_MONEY,
    karma: 0,
    wantedLevel: 0,
    inventory: STARTER_INVENTORY.map(i => ({ ...i })),
    weapons: ["fists"],
    activeWeapon: "fists",
    ammo: 0,
    armor: false,
    activeMissionId: null,
    availableMissionId: "m1",
    completedMissions: [],
    missionKills: 0,
    missionCollected: 0,
    missionHiresAtStart: 0,
    missionTimeLeft: null,
    ownedBusinesses: {},
    employees: 0,
    hiredNpcIds: [],
    defeatedBosses: [],
    killCount: 0,
    civiliansHarmed: 0,
    totalEarned: 0,
    playTime: 0,
    deaths: 0,
    savedPlayerPos: [4, 0, 10],
    savedHour: 9.5,
  };
}

function loadSave(): SaveFile | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveFile;
    if (!data || data.version !== 2) return null;
    return data;
  } catch { return null; }
}

function pickProgress(s: GameStore): Progress {
  return {
    selectedCharacter: s.selectedCharacter, health: s.health, maxHealth: s.maxHealth, money: s.money, karma: s.karma,
    wantedLevel: s.wantedLevel, inventory: s.inventory, weapons: s.weapons, activeWeapon: s.activeWeapon, ammo: s.ammo,
    armor: s.armor, activeMissionId: s.activeMissionId, availableMissionId: s.availableMissionId,
    completedMissions: s.completedMissions, missionKills: s.missionKills, missionCollected: s.missionCollected,
    missionHiresAtStart: s.missionHiresAtStart, missionTimeLeft: s.missionTimeLeft, ownedBusinesses: s.ownedBusinesses,
    employees: s.employees, hiredNpcIds: s.hiredNpcIds, defeatedBosses: s.defeatedBosses, killCount: s.killCount,
    civiliansHarmed: s.civiliansHarmed, totalEarned: s.totalEarned, playTime: s.playTime, deaths: s.deaths,
    savedPlayerPos: s.savedPlayerPos, savedHour: s.savedHour,
  };
}

export const useGame = create<GameStore>((set, get) => ({
  ...freshProgress("alec"),
  phase: "menu",
  hasSave: loadSave() !== null,
  dialog: { open: false, npcId: null, name: "", text: "", options: [] },
  notifications: [],
  showInventory: false,
  showEmpire: false,
  showHelp: false,
  muted: false,
  nearby: { npcId: null, vehicleId: null, businessId: null },
  inVehicle: false,
  vehicleName: "",
  vehicleSpeed: 0,
  bossFight: null,
  lastMissionResult: null,

  // ── Partida ────────────────────────────────────────────────────────────────
  newGame: (characterKey) => {
    const p = freshProgress(characterKey);
    resetRuntime(p.savedPlayerPos, { hour: p.savedHour });
    set({
      ...p, phase: "playing", showInventory: false, showEmpire: false, showHelp: false,
      dialog: { open: false, npcId: null, name: "", text: "", options: [] },
      notifications: [], inVehicle: false, bossFight: null, lastMissionResult: null,
      nearby: { npcId: null, vehicleId: null, businessId: null },
    });
    get().notify("Habla con el Director García (marcador ! amarillo) para tu primera misión.", "info");
    get().saveGame();
  },

  continueGame: () => {
    const save = loadSave();
    if (!save) return;
    const { version: _v, savedAt: _a, ...progress } = save;
    void _v; void _a;
    resetRuntime(progress.savedPlayerPos, { defeatedBosses: progress.defeatedBosses, hiredNpcIds: progress.hiredNpcIds, hour: progress.savedHour });
    // Una misión cronometrada no sobrevive a la recarga: se reinicia como disponible
    let activeMissionId = progress.activeMissionId;
    let availableMissionId = progress.availableMissionId;
    const m = missionById(activeMissionId);
    if (m && (m.type === "deliver" || m.type === "collect")) { availableMissionId = m.id; activeMissionId = null; }
    set({
      ...progress, activeMissionId, availableMissionId, missionTimeLeft: null,
      health: Math.max(progress.health, 30),
      phase: "playing", showInventory: false, showEmpire: false, showHelp: false,
      dialog: { open: false, npcId: null, name: "", text: "", options: [] },
      notifications: [], inVehicle: false, bossFight: null, lastMissionResult: null,
      nearby: { npcId: null, vehicleId: null, businessId: null },
    });
    get().notify("Partida cargada. ¡Bienvenido de nuevo, CEO!", "success");
  },

  saveGame: () => {
    const s = get();
    const p = pickProgress(s);
    const pos = runtime.player.pos;
    const file: SaveFile = {
      ...p, version: 2, savedAt: Date.now(),
      savedPlayerPos: [pos.x, 0, pos.z], savedHour: runtime.hour,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(file)); set({ hasSave: true, savedPlayerPos: file.savedPlayerPos, savedHour: file.savedHour }); } catch { /* almacenamiento no disponible */ }
  },

  pause: () => { if (get().phase === "playing") set({ phase: "paused" }); },
  resume: () => { if (get().phase === "paused") set({ phase: "playing" }); },
  quitToMenu: () => { get().saveGame(); set({ phase: "menu", inVehicle: false, bossFight: null }); },

  respawn: () => {
    const s = get();
    const fee = Math.floor(s.money * 0.1);
    resetRuntime([4, 0, 10], { defeatedBosses: s.defeatedBosses, hiredNpcIds: s.hiredNpcIds, hour: runtime.hour });
    const m = missionById(s.activeMissionId);
    const resetMission = m && (m.type === "deliver" || m.type === "collect" || m.type === "kill_group" || m.type === "kill_boss");
    set({
      phase: "playing", health: s.maxHealth, wantedLevel: 0, money: s.money - fee, deaths: s.deaths + 1,
      inVehicle: false, bossFight: null, missionTimeLeft: null,
      activeMissionId: resetMission ? null : s.activeMissionId,
      availableMissionId: resetMission ? s.activeMissionId : s.availableMissionId,
      missionKills: 0, missionCollected: 0,
    });
    get().notify(`Has despertado en el hospital. Factura: $${fee.toLocaleString("es-ES")}.`, "warning");
    if (resetMission) get().notify("La misión se ha cancelado. Vuelve a hablar con quien te la encargó.", "info");
    get().saveGame();
  },

  tickPlayTime: (dt) => set(s => ({ playTime: s.playTime + dt })),

  // ── Vitales / economía ─────────────────────────────────────────────────────
  takeDamage: (amount, sourceId) => {
    const s = get();
    if (s.phase !== "playing" || amount <= 0) return;
    const dmg = s.armor ? amount * 0.6 : amount;
    const health = Math.max(0, s.health - dmg);
    runtime.player.lastDamageAt = runtime.clock;
    runtime.player.hitFlash = 1;
    if (sourceId) runtime.lastKillerId = sourceId;
    if (health <= 0) {
      sfx.death();
      set({ health: 0, phase: "dead" });
    } else {
      set({ health });
    }
  },

  heal: (amount) => set(s => ({ health: Math.min(s.maxHealth, s.health + amount) })),

  addMoney: (amount, silent) => {
    if (amount === 0) return;
    set(s => ({ money: s.money + amount, totalEarned: amount > 0 ? s.totalEarned + amount : s.totalEarned }));
    if (!silent && amount > 0) sfx.cash();
  },

  spendMoney: (amount) => {
    if (get().money < amount) { sfx.error(); return false; }
    set(s => ({ money: s.money - amount }));
    return true;
  },

  addKarma: (k) => set(s => ({ karma: Math.max(-100, Math.min(100, s.karma + k)) })),

  setWantedLevel: (level) => {
    const l = Math.max(0, Math.min(5, Math.round(level)));
    if (l !== get().wantedLevel) set({ wantedLevel: l });
  },
  addWanted: (n) => {
    const s = get();
    const l = Math.max(0, Math.min(5, s.wantedLevel + n));
    if (l > s.wantedLevel) { sfx.wanted(); runtime.wantedTimer = 0; }
    if (l !== s.wantedLevel) set({ wantedLevel: l });
  },

  // ── Negocios ───────────────────────────────────────────────────────────────
  incomePerSec: () => {
    const s = get();
    let total = 0;
    for (const b of BUSINESSES) {
      const lvl = s.ownedBusinesses[b.id];
      if (lvl) total += businessIncome(b, lvl);
    }
    total *= 1 + s.employees * EMPLOYEE_BONUS;
    if (s.selectedCharacter === "alec") total *= 1.1;
    return total;
  },

  businessPrice: (id) => {
    const b = BUSINESSES.find(x => x.id === id);
    if (!b) return 0;
    return get().selectedCharacter === "formal" ? Math.round(b.price * 0.9) : b.price;
  },

  buyBusiness: (id) => {
    const s = get();
    const b = BUSINESSES.find(x => x.id === id);
    if (!b) return false;
    if (s.ownedBusinesses[id]) { get().notify("Ya eres dueño de este negocio. Pulsa U para mejorarlo.", "info"); return false; }
    const price = get().businessPrice(id);
    if (s.money < price) { sfx.error(); get().notify(`Te faltan $${(price - s.money).toLocaleString("es-ES")} para comprar ${b.name}.`, "warning"); return false; }
    set({ money: s.money - price, ownedBusinesses: { ...s.ownedBusinesses, [id]: 1 } });
    sfx.bigCash();
    get().notify(`${b.icon} ¡${b.name} es tuyo! +$${businessIncome(b, 1).toFixed(0)}/s`, "success");
    get().saveGame();
    return true;
  },

  upgradeBusiness: (id) => {
    const s = get();
    const b = BUSINESSES.find(x => x.id === id);
    const lvl = s.ownedBusinesses[id];
    if (!b || !lvl) return false;
    if (lvl >= MAX_BUSINESS_LEVEL) { get().notify(`${b.name} ya está al nivel máximo.`, "info"); return false; }
    const cost = upgradeCost(b, lvl);
    if (s.money < cost) { sfx.error(); get().notify(`Mejorar ${b.name} cuesta $${cost.toLocaleString("es-ES")}.`, "warning"); return false; }
    set({ money: s.money - cost, ownedBusinesses: { ...s.ownedBusinesses, [id]: lvl + 1 } });
    sfx.levelUp();
    get().notify(`⬆️ ${b.name} mejorado a nivel ${lvl + 1}: +$${businessIncome(b, lvl + 1).toFixed(0)}/s`, "success");
    get().saveGame();
    return true;
  },

  hireNpc: (npcId) => {
    const s = get();
    if (s.hiredNpcIds.includes(npcId)) return false;
    if (s.employees >= MAX_EMPLOYEES) { get().notify("Tu plantilla está completa (6 empleados).", "info"); return false; }
    if (s.money < HIRE_COST) { sfx.error(); get().notify(`Contratar cuesta $${HIRE_COST.toLocaleString("es-ES")}.`, "warning"); return false; }
    const n = runtime.npcs[npcId];
    if (n) n.hired = true;
    set({ money: s.money - HIRE_COST, employees: s.employees + 1, hiredNpcIds: [...s.hiredNpcIds, npcId] });
    sfx.levelUp();
    const cfg = NPC_CONFIGS.find(c => c.id === npcId);
    get().notify(`🤝 ${cfg?.name ?? "Empleado"} se une a tu empresa. Ingresos +${Math.round(EMPLOYEE_BONUS * 100)} %`, "success");
    get().addKarma(3);
    return true;
  },

  // ── Tienda / inventario / armas ────────────────────────────────────────────
  buyShopItem: (itemId) => {
    const s = get();
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;
    if (item.kind === "weapon" && s.weapons.includes(itemId)) { get().notify("Ya tienes esta arma.", "info"); return false; }
    if (item.kind === "perk" && s.armor) { get().notify("Ya llevas el traje blindado.", "info"); return false; }
    if (!get().spendMoney(item.price)) { get().notify(`Te faltan $${(item.price - s.money).toLocaleString("es-ES")}.`, "warning"); return false; }
    if (item.kind === "consumable") {
      get().addItem({ id: "medkit", name: "Kit Médico CEO", type: "health", quantity: 1, icon: "💊", description: "Recupera 50 puntos de salud." });
    } else if (item.kind === "ammo") {
      set(st => ({ ammo: st.ammo + 20 }));
    } else if (item.kind === "weapon") {
      set(st => ({ weapons: [...st.weapons, itemId], activeWeapon: itemId, ammo: itemId === "pistol" ? st.ammo + 20 : st.ammo }));
    } else if (item.kind === "perk") {
      set({ armor: true });
      get().addItem({ id: "armor", name: "Traje Blindado", type: "perk", quantity: 1, icon: "🦺", description: "Daño recibido −40 %." });
    }
    sfx.cash();
    get().notify(`${item.icon} Has comprado ${item.name}.`, "money");
    return true;
  },

  useItem: (id) => {
    const s = get();
    const item = s.inventory.find(i => i.id === id);
    if (!item) return;
    if (item.type === "health") {
      if (s.health >= s.maxHealth) { get().notify("Ya tienes la salud al máximo.", "info"); return; }
      get().heal(50);
      sfx.heal();
      set(st => ({ inventory: st.inventory.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0) }));
      get().notify("💊 +50 de salud.", "success");
    }
  },

  addItem: (item) => set(s => ({
    inventory: s.inventory.some(i => i.id === item.id)
      ? s.inventory.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i)
      : [...s.inventory, item],
  })),

  setActiveWeapon: (id) => {
    const s = get();
    if (!s.weapons.includes(id) || s.activeWeapon === id) return;
    set({ activeWeapon: id });
    sfx.select();
  },

  cycleWeapon: (dir) => {
    const s = get();
    const order = ["fists", "bat", "pistol"].filter(w => s.weapons.includes(w));
    const idx = order.indexOf(s.activeWeapon);
    const next = order[(idx + dir + order.length) % order.length];
    get().setActiveWeapon(next);
  },

  consumeAmmo: () => {
    const s = get();
    if (s.ammo <= 0) { sfx.error(); get().notify("Sin munición. El Vendedor vende cajas de balas.", "warning"); return false; }
    set({ ammo: s.ammo - 1 });
    return true;
  },

  // ── Misiones ───────────────────────────────────────────────────────────────
  acceptMission: (id) => {
    const m = missionById(id);
    if (!m) return;
    const s = get();
    // activa los chips de datos si es la misión de recolección
    if (m.type === "collect") {
      for (const p of Object.values(runtime.pickups)) if (p.isChip) { p.active = true; p.respawnTimer = 0; }
    }
    set({
      activeMissionId: id, availableMissionId: null, missionKills: 0, missionCollected: 0,
      missionHiresAtStart: s.employees, missionTimeLeft: m.timeLimit ?? null, lastMissionResult: null,
    });
    sfx.missionStart();
    get().notify(`🎯 Misión aceptada: ${m.title}`, "info");
  },

  completeMission: () => {
    const s = get();
    const m = missionById(s.activeMissionId);
    if (!m) return;
    const nextId = m.nextMissionId;
    set({
      completedMissions: [...s.completedMissions, m.id],
      activeMissionId: null,
      availableMissionId: nextId,
      missionTimeLeft: null,
      missionKills: 0, missionCollected: 0,
      lastMissionResult: { title: m.title, success: true, reward: m.rewardMoney },
    });
    get().addMoney(m.rewardMoney, true);
    get().addKarma(m.rewardKarma);
    if (m.id === "m1") get().addItem({ id: "briefcase", name: "Maletín de Negocios", type: "quest", quantity: 1, icon: "💼", description: "Contiene los datos del inversor." });
    if (m.type === "collect") for (const p of Object.values(runtime.pickups)) if (p.isChip) p.active = false;
    if (nextId === null) {
      sfx.victory();
      set({ phase: "victory" });
    } else {
      sfx.missionComplete();
      get().notify(`✅ ${m.completeText} +$${m.rewardMoney.toLocaleString("es-ES")}`, "success");
      const next = missionById(nextId);
      const giver = NPC_CONFIGS.find(n => n.id === next?.giverNpcId);
      if (next && giver) get().notify(`Nueva misión disponible: habla con ${giver.name}.`, "info");
    }
    get().saveGame();
  },

  failMission: (reason) => {
    const s = get();
    const m = missionById(s.activeMissionId);
    if (!m) return;
    if (m.type === "collect") for (const p of Object.values(runtime.pickups)) if (p.isChip) p.active = false;
    set({ activeMissionId: null, availableMissionId: m.id, missionTimeLeft: null, missionKills: 0, missionCollected: 0, lastMissionResult: { title: m.title, success: false, reward: 0 } });
    sfx.missionFail();
    get().notify(`❌ Misión fallida: ${reason}. Vuelve a hablar con quien te la encargó.`, "danger");
  },

  abandonMission: () => {
    const s = get();
    const m = missionById(s.activeMissionId);
    if (!m) return;
    if (m.type === "collect") for (const p of Object.values(runtime.pickups)) if (p.isChip) p.active = false;
    set({ activeMissionId: null, availableMissionId: m.id, missionTimeLeft: null, missionKills: 0, missionCollected: 0 });
    get().notify(`Misión abandonada: ${m.title}.`, "warning");
  },

  setMissionTimeLeft: (t) => set({ missionTimeLeft: t }),
  addMissionKill: () => set(s => ({ missionKills: s.missionKills + 1 })),
  addMissionCollected: () => set(s => ({ missionCollected: s.missionCollected + 1 })),
  clearMissionResult: () => set({ lastMissionResult: null }),

  registerKill: (npcId) => {
    const s = get();
    const cfg = NPC_CONFIGS.find(n => n.id === npcId);
    const m = missionById(s.activeMissionId);
    const patch: Partial<GameStore> = { killCount: s.killCount + 1 };
    if (cfg?.type === "boss") {
      patch.defeatedBosses = [...s.defeatedBosses, npcId];
      get().notify(`👑 ¡${cfg.name} derrotado!`, "success");
      get().addMoney(Math.round(cfg.health * 20), true);
    } else if (cfg?.type === "neutral" || cfg?.type === "friendly") {
      patch.civiliansHarmed = s.civiliansHarmed + 1;
      get().addKarma(-10);
      get().addWanted(2);
      get().notify("Has atacado a un civil. Tu karma cae y la policía te busca.", "danger");
    } else if (cfg?.type === "hostile" || npcId.startsWith("police")) {
      get().addKarma(npcId.startsWith("police") ? -4 : -1);
      if (npcId.startsWith("police")) get().addWanted(1);
    }
    if (m) {
      if (m.type === "kill_group" && cfg?.group === m.targetGroup) patch.missionKills = s.missionKills + 1;
    }
    set(patch);
  },

  // ── UI ─────────────────────────────────────────────────────────────────────
  openDialog: (npcId, name, text, options = []) => set({ dialog: { open: true, npcId, name, text, options } }),
  closeDialog: () => set({ dialog: { open: false, npcId: null, name: "", text: "", options: [] } }),

  notify: (text, kind = "info") => {
    const id = ++notifId;
    set(s => ({ notifications: [...s.notifications.slice(-4), { id, text, kind }] }));
    setTimeout(() => get().dismissNotification(id), 5000);
  },
  dismissNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  toggleInventory: () => set(s => ({ showInventory: !s.showInventory, showEmpire: false, showHelp: false })),
  toggleEmpire: () => set(s => ({ showEmpire: !s.showEmpire, showInventory: false, showHelp: false })),
  toggleHelp: () => set(s => ({ showHelp: !s.showHelp, showInventory: false, showEmpire: false })),
  toggleMuted: () => { const m = !get().muted; setMuted(m); set({ muted: m }); },

  setNearby: (n) => {
    const c = get().nearby;
    if (c.npcId !== n.npcId || c.vehicleId !== n.vehicleId || c.businessId !== n.businessId) set({ nearby: n });
  },
  setInVehicle: (v, name = "") => set({ inVehicle: v, vehicleName: name, vehicleSpeed: 0 }),
  setVehicleSpeed: (s) => { const r = Math.round(s); if (r !== get().vehicleSpeed) set({ vehicleSpeed: r }); },
  setBossFight: (b) => {
    const c = get().bossFight;
    if (b === null && c === null) return;
    if (b && c && b.id === c.id && Math.round(b.hp) === Math.round(c.hp)) return;
    set({ bossFight: b });
  },
}));

export const isUiBlocking = (s: GameStore) => s.dialog.open || s.showInventory || s.showEmpire || s.showHelp || s.phase !== "playing";

export const formatMoney = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.floor(abs).toLocaleString("es-ES")}`;
};

export const missionProgressText = (s: GameStore): string | null => {
  const m = missionById(s.activeMissionId);
  if (!m) return null;
  switch (m.type) {
    case "kill_group": return `${s.missionKills}/${m.targetCount}`;
    case "collect": return `${s.missionCollected}/${m.targetCount}`;
    case "own_count": return `${Object.keys(s.ownedBusinesses).length}/${m.targetCount}`;
    case "hire": return `${Math.min(m.targetCount ?? 0, s.employees - s.missionHiresAtStart)}/${m.targetCount}`;
    case "kill_boss": return `${(m.targetBosses ?? []).filter(b => s.defeatedBosses.includes(b)).length}/${m.targetBosses?.length ?? 1}`;
    default: return null;
  }
};

export { MISSIONS, WEAPONS, CHARACTERS };
