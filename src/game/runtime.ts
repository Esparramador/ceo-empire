import * as THREE from "three";

/**
 * Per-frame mutable game state shared between systems. Kept outside React /
 * zustand so 60 fps updates don't re-render the UI; the store is synced at a
 * lower rate for HUD/minimap/missions.
 */
export const runtime = {
  keys: {} as Record<string, boolean>,
  pointerLocked: false,
  camYaw: 0,
  player: new THREE.Vector3(0, 0, 26),
  playerFacing: 0,
  playerSpeed: 0,
  /** Live NPC state, written by NPCSystem, read by combat / vehicles / minimap. */
  npcs: {} as Record<string, { pos: THREE.Vector3; hp: number; dead: boolean; respawnAt: number }>,
};

/** Forget the previous game (keys held, NPC health/positions) before a new one starts. */
export function resetRuntime() {
  runtime.keys = {};
  runtime.camYaw = 0;
  runtime.player.set(0, 0, 26);
  runtime.playerFacing = 0;
  runtime.playerSpeed = 0;
  runtime.npcs = {};
}

export function damageNpc(id: string, amount: number): boolean {
  const n = runtime.npcs[id];
  if (!n || n.dead) return false;
  n.hp -= amount;
  if (n.hp <= 0) {
    n.dead = true;
    n.respawnAt = performance.now() + 25_000;
    return true;
  }
  return false;
}
