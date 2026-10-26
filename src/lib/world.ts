// ─────────────────────────────────────────────────────────────────────────────
// Estado mutable en tiempo real (fuera de React para evitar re-renders por
// frame): posición del jugador, cámara, NPCs, vehículos, pickups e input.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import { NPC_CONFIGS, PICKUPS, VEHICLE_CONFIGS, DATA_CHIPS, type Vec3 } from "./gameData";
import { groundHeight, resolveCollision } from "./city";

export { insideObstacle, lineOfSight } from "./city";

export type NpcAiState = "idle" | "wander" | "chase" | "attack" | "flee" | "dead" | "return";

export interface NpcRuntime {
  id: string;
  pos: THREE.Vector3;
  home: THREE.Vector3;
  facing: number;
  hp: number;
  maxHp: number;
  state: NpcAiState;
  stateTimer: number;
  attackCd: number;
  hitFlash: number;
  deadTimer: number;
  moving: number;   // 0..1 para animación
  attackAnim: number;
  alerted: boolean;
  hired: boolean;
  dialogueIndex: number;
}

export interface VehicleRuntime {
  id: string;
  pos: THREE.Vector3;
  heading: number;
  speed: number;       // m/s, con signo
  steer: number;       // ángulo de las ruedas delanteras
  wheelSpin: number;
  braking: boolean;
  /** Medidas del modelo (se leen del GLB al cargarlo). */
  wheelbase: number;
  wheelRadius: number;
  length: number;
  width: number;
}

export interface PickupRuntime {
  id: string;
  kind: "money" | "medkit" | "ammo" | "data";
  pos: THREE.Vector3;
  value: number;
  active: boolean;
  respawnTimer: number;
  isChip?: boolean;
}

export interface PoliceRuntime extends NpcRuntime {}

export interface PlayerRuntime {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facing: number;
  onGround: boolean;
  moving: number;
  sprinting: boolean;
  attackAnim: number;
  attackCd: number;
  lastDamageAt: number;
  hitFlash: number;
  inVehicleId: string | null;
  distanceTravelled: number;
}

export const input = {
  keys: new Set<string>(),
  attackHeld: false,
  attackPressed: false,
  pointerLocked: false,
  mouseDX: 0,
  mouseDY: 0,
};

export const camera = { yaw: Math.PI, pitch: 0.28, dist: 9, shake: 0 };

export const runtime = {
  player: {
    pos: new THREE.Vector3(4, 0, 10),
    vel: new THREE.Vector3(),
    facing: Math.PI,
    onGround: true,
    moving: 0,
    sprinting: false,
    attackAnim: 0,
    attackCd: 0,
    lastDamageAt: -100,
    hitFlash: 0,
    inVehicleId: null,
    distanceTravelled: 0,
  } as PlayerRuntime,
  npcs: {} as Record<string, NpcRuntime>,
  police: [] as PoliceRuntime[],
  vehicles: {} as Record<string, VehicleRuntime>,
  pickups: {} as Record<string, PickupRuntime>,
  clock: 0,
  night: 0,            // 0 = día, 1 = noche (factor de iluminación)
  hour: 9.5,           // hora del día 0..24
  lastKillerId: null as string | null,
  wantedTimer: 0,
  nearestObjective: null as THREE.Vector3 | null,
  chase: { active: false, vehicleId: null as string | null, waypoint: 0, contact: 0, caught: false },
};

export function makeNpcRuntime(id: string, pos: Vec3, hp: number): NpcRuntime {
  return {
    id, pos: new THREE.Vector3(pos[0], 0, pos[2]), home: new THREE.Vector3(pos[0], 0, pos[2]),
    facing: Math.random() * Math.PI * 2, hp, maxHp: hp,
    state: "wander", stateTimer: Math.random() * 2, attackCd: 0, hitFlash: 0, deadTimer: 0,
    moving: 0, attackAnim: 0, alerted: false, hired: false, dialogueIndex: 0,
  };
}

/** Restablece todo el estado en tiempo real (nueva partida o carga). */
export function resetRuntime(playerPos: Vec3, opts?: { defeatedBosses?: string[]; hiredNpcIds?: string[]; hour?: number; hiddenNpcIds?: string[] }) {
  const p = runtime.player;
  p.pos.set(playerPos[0], groundHeight(playerPos[0], playerPos[2]), playerPos[2]);
  p.vel.set(0, 0, 0);
  p.facing = Math.PI; p.onGround = true; p.moving = 0; p.sprinting = false;
  p.attackAnim = 0; p.attackCd = 0; p.lastDamageAt = -100; p.hitFlash = 0;
  p.inVehicleId = null; p.distanceTravelled = 0;
  camera.yaw = Math.PI; camera.pitch = 0.28; camera.dist = 9; camera.shake = 0;

  runtime.npcs = {};
  for (const cfg of NPC_CONFIGS) {
    const n = makeNpcRuntime(cfg.id, cfg.pos, cfg.health);
    if (opts?.defeatedBosses?.includes(cfg.id) || opts?.hiddenNpcIds?.includes(cfg.id)) { n.state = "dead"; n.hp = 0; n.deadTimer = 9999; }
    if (opts?.hiredNpcIds?.includes(cfg.id)) n.hired = true;
    runtime.npcs[cfg.id] = n;
  }
  runtime.police = [];
  runtime.vehicles = {};
  for (const v of VEHICLE_CONFIGS) {
    runtime.vehicles[v.id] = {
      id: v.id, pos: new THREE.Vector3(v.pos[0], groundHeight(v.pos[0], v.pos[2]), v.pos[2]), heading: v.heading,
      speed: 0, steer: 0, wheelSpin: 0, braking: false, wheelbase: 2.7, wheelRadius: 0.35, length: 4.6, width: 2,
    };
  }
  runtime.pickups = {};
  for (const pk of PICKUPS) {
    const pos = snapToFree(new THREE.Vector3(pk.pos[0], 0, pk.pos[2]), 1.5);
    runtime.pickups[pk.id] = { id: pk.id, kind: pk.kind, pos, value: pk.value, active: true, respawnTimer: 0 };
  }
  DATA_CHIPS.forEach((c, i) => {
    const pos = snapToFree(new THREE.Vector3(c[0], 0, c[2]), 1.5);
    runtime.pickups[`chip${i}`] = { id: `chip${i}`, kind: "data", pos, value: 1, active: false, respawnTimer: 0, isChip: true };
  });
  runtime.clock = 0;
  runtime.hour = opts?.hour ?? 9.5;
  runtime.lastKillerId = null;
  runtime.wantedTimer = 0;
  runtime.nearestObjective = null;
  runtime.chase = { active: false, vehicleId: null, waypoint: 0, contact: 0, caught: false };
  input.keys.clear();
  input.attackHeld = false; input.attackPressed = false;
  input.mouseDX = 0; input.mouseDY = 0;
}

// ── Colisiones (la ciudad de Blender + las construcciones de la historia) ────

/** Empuja un círculo fuera de edificios, fuente y construcciones, y lo deja dentro del mundo. */
export function resolveCircle(pos: THREE.Vector3, radius: number) {
  resolveCollision(pos, radius);
}

/** Devuelve una posición libre cercana a la dada. */
export function snapToFree(pos: THREE.Vector3, margin = 1): THREE.Vector3 {
  const p = pos.clone();
  resolveCircle(p, margin);
  p.y = groundHeight(p.x, p.z);
  return p;
}

export const dist2D = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

export function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
