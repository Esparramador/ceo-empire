// ─────────────────────────────────────────────────────────────────────────────
// Lógica compartida de combate sobre NPCs (usada por jugador y vehículos).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { NPC_CONFIGS } from "../lib/gameData";
import { runtime, type NpcRuntime } from "../lib/world";
import { useGame } from "../lib/gameStore";
import { sfx } from "../lib/audio";

let lootCounter = 0;

export function allNpcs(): NpcRuntime[] {
  return [...Object.values(runtime.npcs), ...runtime.police];
}

export function npcConfig(id: string) {
  return NPC_CONFIGS.find(n => n.id === id);
}

export function isPolice(id: string) { return id.startsWith("police"); }

/** Aplica daño a un NPC. `source` = "player" | "vehicle". */
export function damageNpc(npc: NpcRuntime, amount: number, source: "player" | "vehicle", knockFrom?: THREE.Vector3) {
  if (npc.state === "dead") return;
  const cfg = npcConfig(npc.id);
  npc.hp = Math.max(0, npc.hp - amount);
  npc.hitFlash = 1;
  npc.alerted = true;
  const store = useGame.getState();
  if (knockFrom) {
    const dx = npc.pos.x - knockFrom.x, dz = npc.pos.z - knockFrom.z;
    const d = Math.hypot(dx, dz) || 1;
    npc.pos.x += (dx / d) * 0.6; npc.pos.z += (dz / d) * 0.6;
  }
  if (cfg && (cfg.type === "neutral" || cfg.type === "friendly")) {
    if (npc.hp > 0) {
      npc.state = "flee"; npc.stateTimer = 6;
      if (source === "player") { store.addKarma(-2); store.addWanted(1); }
    }
  }
  if (npc.hp <= 0) {
    npc.state = "dead";
    npc.deadTimer = 0;
    npc.attackAnim = 0;
    sfx.enemyDown();
    store.registerKill(npc.id);
    if (cfg?.type === "boss") store.setBossFight(null);
    // Botín
    const isEnemy = cfg?.type === "hostile" || cfg?.type === "boss";
    if (isEnemy) {
      const value = cfg?.type === "boss" ? 2500 + Math.round(Math.random() * 2500) : 150 + Math.round(Math.random() * 350);
      const id = `loot${++lootCounter}`;
      runtime.pickups[id] = { id, kind: "money", pos: npc.pos.clone(), value, active: true, respawnTimer: -1 };
      if (Math.random() < 0.35) {
        const id2 = `loot${++lootCounter}`;
        runtime.pickups[id2] = { id: id2, kind: Math.random() < 0.5 ? "medkit" : "ammo", pos: npc.pos.clone().add(new THREE.Vector3(1.2, 0, 0.4)), value: 10, active: true, respawnTimer: -1 };
      }
    }
  }
}
