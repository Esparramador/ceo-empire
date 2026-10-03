import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../lib/gameStore";
import { VEHICLE_CONFIGS, NPC_CONFIGS, type VehicleConfig } from "../lib/gameData";
import { vehicleModel } from "../lib/assets";
import { groundHeight, nightFactor, resolveCollision } from "../lib/city";
import { runtime, damageNpc } from "./runtime";

const ENTER_RANGE = 4.5;
const MAX_STEER = 0.6;
const CAM_DIST = 9;
const CAM_HEIGHT = 3.6;

interface CarState {
  pos: THREE.Vector3;
  heading: number;
  speed: number; // m/s, signed
  steer: number;
  spin: number;
  braking: boolean;
  wheelbase: number;
  wheelRadius: number;
  length: number;
  width: number;
}

export const carStates: Record<string, CarState> = {};

function initState(cfg: VehicleConfig): CarState {
  return {
    pos: new THREE.Vector3(...cfg.pos),
    heading: cfg.heading,
    speed: 0, steer: 0, spin: 0, braking: false,
    wheelbase: 2.7, wheelRadius: 0.35, length: 4.6, width: 2,
  };
}
VEHICLE_CONFIGS.forEach(c => { carStates[c.id] = initState(c); });

function Car({ cfg }: { cfg: VehicleConfig }) {
  const { scene } = useGLTF(vehicleModel(cfg.model));
  const group = useRef<THREE.Group>(null!);
  const headlight = useRef<THREE.SpotLight>(null!);
  const state = carStates[cfg.id];

  const { obj, wheels, body, lights } = useMemo(() => {
    const obj = scene.clone(true);
    const lights: { head: THREE.MeshStandardMaterial[]; tail: THREE.MeshStandardMaterial[] } = { head: [], tail: [] };
    obj.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      // per-car copies of the light materials so brake lights are independent
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const cloned = mats.map(mat => {
        if (mat.name === "headlight" || mat.name === "taillight") {
          const c = (mat as THREE.MeshStandardMaterial).clone();
          (mat.name === "headlight" ? lights.head : lights.tail).push(c);
          return c;
        }
        return mat;
      });
      m.material = Array.isArray(m.material) ? cloned : cloned[0];
    });
    const wheels = ["FL", "FR", "RL", "RR"].map(k => obj.getObjectByName(`wheel_${k}`)!).filter(Boolean);
    wheels.forEach(w => { w.rotation.order = "YXZ"; });
    const extras = (scene.userData ?? {}) as Record<string, number>;
    if (extras.wheelbase) state.wheelbase = extras.wheelbase;
    if (extras.wheelRadius) state.wheelRadius = extras.wheelRadius;
    if (extras.length) state.length = extras.length;
    if (extras.width) state.width = extras.width;
    return { obj, wheels, body: obj.getObjectByName("body") ?? obj, lights };
  }, [scene, state]);

  useEffect(() => {
    if (headlight.current) {
      headlight.current.target.position.set(0, 0, 25);
      headlight.current.add(headlight.current.target);
    }
  }, []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(state.pos);
    g.rotation.y = state.heading;
    for (const w of wheels) {
      w.rotation.x = state.spin;
      if (w.name.startsWith("wheel_F")) w.rotation.y = state.steer;
    }
    // subtle body roll/pitch
    body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -state.steer * state.speed * 0.004, 0.1);
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, state.braking ? 0.015 : 0, 0.1);

    const night = nightFactor(useGame.getState().dayTime);
    const active = useGame.getState().activeVehicleId === cfg.id;
    for (const m of lights.head) m.emissiveIntensity = active ? 0.6 + night * 2.5 : 0.25;
    for (const m of lights.tail) m.emissiveIntensity = state.braking ? 4 : active ? 0.6 + night : 0.3;
    if (headlight.current) headlight.current.intensity = active && night > 0.2 ? 60 * night : 0;
  });

  return (
    <group ref={group}>
      <primitive object={obj} />
      <spotLight ref={headlight} position={[0, 0.8, 2.2]} angle={0.55} penumbra={0.6} distance={45} decay={1.4} color="#fff1d6" intensity={0} />
    </group>
  );
}

export function VehicleSystem() {
  const { camera } = useThree();
  const syncTimer = useRef(0);
  const camPos = useRef(new THREE.Vector3());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useGame.getState();
    const k = runtime.keys;

    // Nearby car for the "E" prompt
    if (!store.inVehicle) {
      let best: string | null = null;
      let bestD = ENTER_RANGE;
      for (const cfg of VEHICLE_CONFIGS) {
        const d = carStates[cfg.id].pos.distanceTo(runtime.player);
        if (d < bestD) { bestD = d; best = cfg.id; }
      }
      if (best !== store.nearbyVehicleId) store.setNearbyVehicleId(best);
    }

    for (const cfg of VEHICLE_CONFIGS) {
      const s = carStates[cfg.id];
      const driving = store.activeVehicleId === cfg.id && store.phase === "playing" && !store.dialogOpen;

      // --- input -------------------------------------------------------------
      const throttle = driving ? (k["w"] || k["arrowup"] ? 1 : 0) - (k["s"] || k["arrowdown"] ? 1 : 0) : 0;
      const steerIn = driving ? (k["a"] || k["arrowleft"] ? 1 : 0) - (k["d"] || k["arrowright"] ? 1 : 0) : 0;
      const handbrake = driving && !!k[" "];

      // --- longitudinal --------------------------------------------------------
      s.braking = false;
      if (throttle > 0) {
        if (s.speed < -0.5) { s.speed += 30 * delta; s.braking = true; }
        else s.speed += cfg.accel * delta * (1 - Math.max(0, s.speed) / cfg.speed);
      } else if (throttle < 0) {
        if (s.speed > 0.5) { s.speed -= 30 * delta; s.braking = true; }
        else s.speed = Math.max(-cfg.speed * 0.3, s.speed - cfg.accel * 0.6 * delta);
      } else {
        // engine braking; an abandoned car stops quickly
        const decel = driving ? 2.5 + Math.abs(s.speed) * 0.08 : 9;
        s.speed -= Math.sign(s.speed) * Math.min(Math.abs(s.speed), decel * delta);
      }
      if (handbrake) {
        s.speed -= Math.sign(s.speed) * Math.min(Math.abs(s.speed), 22 * delta);
        s.braking = true;
      }

      // --- steering (bicycle model, less lock at speed) -------------------------
      const lock = MAX_STEER * (1 - Math.min(Math.abs(s.speed) / cfg.speed, 1) * 0.6);
      s.steer = THREE.MathUtils.lerp(s.steer, steerIn * lock, Math.min(1, delta * 6));
      const yawRate = (s.speed * Math.tan(s.steer)) / s.wheelbase * (handbrake ? 1.6 : 1);
      s.heading += yawRate * delta;

      if (Math.abs(s.speed) > 0.01) {
        s.pos.x += Math.sin(s.heading) * s.speed * delta;
        s.pos.z += Math.cos(s.heading) * s.speed * delta;

        // Collide front, middle and rear of the body against the city
        const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
        const off = s.length / 2 - s.width / 2;
        let hit = false;
        for (const o of [off, 0, -off]) {
          const p = { x: s.pos.x + fx * o, z: s.pos.z + fz * o };
          if (resolveCollision(p, s.width / 2)) {
            s.pos.x = p.x - fx * o;
            s.pos.z = p.z - fz * o;
            hit = true;
          }
        }
        if (hit) s.speed *= -0.25;

        // Run-over: knock down NPCs in the way
        if (Math.abs(s.speed) > 6) {
          for (const n of NPC_CONFIGS) {
            const st = runtime.npcs[n.id];
            if (!st || st.dead) continue;
            if (Math.hypot(st.pos.x - s.pos.x, st.pos.z - s.pos.z) < s.width * 0.75) {
              if (damageNpc(n.id, 999)) {
                store.addKill();
                if (n.type !== "hostile" && n.type !== "boss") {
                  store.setWantedLevel(useGame.getState().wantedLevel + 1);
                  store.addKarma(-5);
                }
              }
            }
          }
        }
      }
      s.pos.y = THREE.MathUtils.lerp(s.pos.y, groundHeight(s.pos.x, s.pos.z), 0.3);
      s.spin += (s.speed * delta) / s.wheelRadius;

      // --- driver follows the car, chase camera -----------------------------
      if (driving) {
        runtime.player.copy(s.pos);
        runtime.playerFacing = s.heading;
        runtime.playerSpeed = Math.abs(s.speed);
        const back = new THREE.Vector3(-Math.sin(s.heading), 0, -Math.cos(s.heading));
        const speedPull = Math.min(Math.abs(s.speed) / cfg.speed, 1) * 2.5;
        const target = s.pos.clone().addScaledVector(back, CAM_DIST + speedPull).add(new THREE.Vector3(0, CAM_HEIGHT, 0));
        camPos.current.lerp(target, 1 - Math.pow(0.002, delta));
        if (camPos.current.lengthSq() === 0) camPos.current.copy(target);
        camera.position.copy(camPos.current);
        camera.lookAt(s.pos.x, s.pos.y + 1.2, s.pos.z);
        runtime.camYaw = s.heading;

        syncTimer.current -= delta;
        if (syncTimer.current <= 0) {
          syncTimer.current = 0.1;
          store.setPlayerPos([s.pos.x, s.pos.y, s.pos.z]);
          store.setPlayerFacing(s.heading);
          store.setVehicleSpeed(Math.round(Math.abs(s.speed) * 3.6));
        }
      }
    }
    if (!store.inVehicle) camPos.current.copy(camera.position);
  });

  return (
    <>
      {VEHICLE_CONFIGS.map(cfg => <Car key={cfg.id} cfg={cfg} />)}
    </>
  );
}

export function exitPosition(id: string): THREE.Vector3 {
  const s = carStates[id];
  const left = new THREE.Vector3(Math.cos(s.heading), 0, -Math.sin(s.heading));
  const p = s.pos.clone().addScaledVector(left, s.width / 2 + 0.9);
  const q = { x: p.x, z: p.z };
  resolveCollision(q, 0.4);
  return new THREE.Vector3(q.x, groundHeight(q.x, q.z), q.z);
}

VEHICLE_CONFIGS.forEach(c => useGLTF.preload(vehicleModel(c.model)));
