// ─────────────────────────────────────────────────────────────────────────────
// Vehículos: coches modelados en Blender (blender/cars.py) con física arcade de
// bicicleta (giro según batalla y velocidad, freno de mano), luces, colisiones
// con la ciudad, choques que hacen daño, atropellos y la huida de El Topo.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useGame, isUiBlocking } from "../lib/gameStore";
import { VEHICLE_CONFIGS, CHASE_ROUTE, type VehicleConfig } from "../lib/gameData";
import { vehicleModel } from "../lib/assets";
import { groundHeight, resolveCollision } from "../lib/city";
import { runtime, input, camera as camState, dist2D, lerpAngle, type VehicleRuntime } from "../lib/world";
import { sfx, engine } from "../lib/audio";
import { allNpcs, damageNpc } from "./npcLogic";

const MAX_STEER = 0.6;

/** Cartel de taxi o luces de patrulla sobre el techo. */
function RoofExtra({ kind, height }: { kind: "taxi" | "police"; height: number }) {
  const red = useRef<THREE.MeshStandardMaterial>(null!);
  const blue = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (kind !== "police" || !red.current || !blue.current) return;
    const on = useGame.getState().wantedLevel > 0;
    const flip = Math.sin(clock.elapsedTime * 12) > 0;
    red.current.emissiveIntensity = on ? (flip ? 4 : 0.2) : 0.6;
    blue.current.emissiveIntensity = on ? (flip ? 0.2 : 4) : 0.6;
  });
  if (kind === "taxi") {
    return (
      <mesh position={[0, height + 0.12, -0.3]}>
        <boxGeometry args={[0.8, 0.22, 0.32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffd23f" emissiveIntensity={1.2} />
      </mesh>
    );
  }
  return (
    <group position={[0, height + 0.08, -0.2]}>
      <mesh position={[-0.28, 0, 0]}><boxGeometry args={[0.5, 0.14, 0.26]} /><meshStandardMaterial ref={red} color="#ff2020" emissive="#ff2020" emissiveIntensity={0.6} /></mesh>
      <mesh position={[0.28, 0, 0]}><boxGeometry args={[0.5, 0.14, 0.26]} /><meshStandardMaterial ref={blue} color="#2050ff" emissive="#2050ff" emissiveIntensity={0.6} /></mesh>
    </group>
  );
}

function Car({ cfg }: { cfg: VehicleConfig }) {
  const { scene } = useGLTF(vehicleModel(cfg.model));
  const group = useRef<THREE.Group>(null!);
  const headlight = useRef<THREE.SpotLight>(null!);

  const { obj, wheels, body, lights, extras, roofY } = useMemo(() => {
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
    const wheels = ["FL", "FR", "RL", "RR"].map(k => obj.getObjectByName(`wheel_${k}`)).filter((w): w is THREE.Object3D => !!w);
    wheels.forEach(w => { w.rotation.order = "YXZ"; });
    const box = new THREE.Box3().setFromObject(obj);
    return {
      obj, wheels, lights,
      body: obj.getObjectByName("body") ?? obj,
      extras: (scene.userData ?? {}) as Record<string, number>,
      roofY: box.max.y,
    };
  }, [scene]);

  useEffect(() => {
    if (headlight.current) {
      headlight.current.target.position.set(0, 0, 25);
      headlight.current.add(headlight.current.target);
    }
  }, []);

  useFrame(() => {
    const g = group.current;
    const s = runtime.vehicles[cfg.id];
    if (!g || !s) return;
    // measurements from the GLB drive the physics (wheelbase, wheel size, footprint)
    if (extras.wheelbase) s.wheelbase = extras.wheelbase;
    if (extras.wheelRadius) s.wheelRadius = extras.wheelRadius;
    if (extras.length) s.length = extras.length;
    if (extras.width) s.width = extras.width;
    g.position.copy(s.pos);
    g.rotation.y = s.heading;
    for (const w of wheels) {
      w.rotation.x = s.wheelSpin;
      if (w.name.startsWith("wheel_F")) w.rotation.y = s.steer;
    }
    body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -s.steer * s.speed * 0.004, 0.1);
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, s.braking ? 0.015 : 0, 0.1);

    const night = runtime.night;
    const active = runtime.player.inVehicleId === cfg.id || (cfg.ai && runtime.chase.active);
    for (const m of lights.head) m.emissiveIntensity = active ? 0.6 + night * 2.5 : 0.25;
    for (const m of lights.tail) m.emissiveIntensity = s.braking ? 4 : active ? 0.6 + night : 0.3;
    if (headlight.current) headlight.current.intensity = active && night > 0.2 ? 60 * night : 0;
  });

  return (
    <group ref={group} position={cfg.pos} rotation={[0, cfg.heading, 0]}>
      <primitive object={obj} />
      {cfg.roof && <RoofExtra kind={cfg.roof} height={roofY} />}
      <spotLight ref={headlight} position={[0, 0.8, 2.2]} angle={0.55} penumbra={0.6} distance={45} decay={1.4} color="#fff1d6" intensity={0} />
    </group>
  );
}

/** Push the car's front, middle and rear out of the city; true when it hit something. */
function collideCar(s: VehicleRuntime): boolean {
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
  return hit;
}

export function VehicleSystem() {
  const lastCrash = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useGame.getState();
    const k = input.keys;
    const playing = store.phase === "playing" && !isUiBlocking(store);

    for (const cfg of VEHICLE_CONFIGS) {
      const s = runtime.vehicles[cfg.id];
      if (!s) continue;
      const driving = runtime.player.inVehicleId === cfg.id;
      const fleeing = !!cfg.ai && runtime.chase.active && runtime.chase.vehicleId === cfg.id;

      if (fleeing) {
        // El Topo: sigue la ruta de huida en bucle, frena en las curvas
        const wp = CHASE_ROUTE[runtime.chase.waypoint % CHASE_ROUTE.length];
        const dx = wp[0] - s.pos.x, dz = wp[2] - s.pos.z;
        if (Math.hypot(dx, dz) < 7) runtime.chase.waypoint = (runtime.chase.waypoint + 1) % CHASE_ROUTE.length;
        const target = Math.atan2(dx, dz);
        const turning = Math.abs(Math.atan2(Math.sin(target - s.heading), Math.cos(target - s.heading)));
        s.steer = THREE.MathUtils.clamp(Math.atan2(Math.sin(target - s.heading), Math.cos(target - s.heading)), -MAX_STEER, MAX_STEER);
        s.heading = lerpAngle(s.heading, target, Math.min(1, delta * 2.2));
        const maxS = turning > 0.6 ? 9 : 17;
        s.speed += (maxS - s.speed) * Math.min(1, delta * 1.5);
        s.braking = turning > 0.6;
        s.pos.x += Math.sin(s.heading) * s.speed * delta;
        s.pos.z += Math.cos(s.heading) * s.speed * delta;
        collideCar(s);
        // ¿Le ha alcanzado el jugador? (pegado a él, o embistiéndolo con fuerza)
        const p = runtime.player;
        const dp = dist2D(s.pos, p.pos);
        if (dp < 6.5) {
          runtime.chase.contact += delta;
          const pv = p.inVehicleId ? runtime.vehicles[p.inVehicleId] : null;
          if (pv && Math.abs(pv.speed) > 8 && dp < 3.6) runtime.chase.contact += 1.5;
        }
        if (runtime.chase.contact >= 2.5) { runtime.chase.active = false; runtime.chase.caught = true; s.speed = 0; }
      } else {
        // --- input ---------------------------------------------------------------
        const on = driving && playing;
        const throttle = on ? (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0) : 0;
        const steerIn = on ? (k.has("a") || k.has("arrowleft") ? 1 : 0) - (k.has("d") || k.has("arrowright") ? 1 : 0) : 0;
        const handbrake = on && k.has(" ");

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
        s.heading += (s.speed * Math.tan(s.steer)) / s.wheelbase * (handbrake ? 1.6 : 1) * delta;

        if (Math.abs(s.speed) > 0.01) {
          const before = s.pos.clone();
          s.pos.x += Math.sin(s.heading) * s.speed * delta;
          s.pos.z += Math.cos(s.heading) * s.speed * delta;
          if (collideCar(s)) {
            // a real crash hurts the driver and shakes the camera
            if (driving && Math.abs(s.speed) > 7 && runtime.clock - lastCrash.current > 0.5) {
              lastCrash.current = runtime.clock;
              sfx.crash();
              camState.shake = 0.4;
              store.takeDamage(Math.min(15, Math.abs(s.speed) * 0.35), "crash");
            }
            s.speed *= -0.25;
          }
          if (driving) runtime.player.distanceTravelled += dist2D(before, s.pos);

          // Atropellos
          if (driving && Math.abs(s.speed) > 4) {
            for (const n of allNpcs()) {
              if (n.state === "dead") continue;
              if (dist2D(n.pos, s.pos) < s.width * 0.85) {
                damageNpc(n, Math.abs(s.speed) * 3.2, "vehicle", s.pos);
                sfx.punch();
                s.speed *= 0.7;
              }
            }
          }
        }
        if (driving) {
          engine.update(Math.abs(s.speed) / cfg.speed);
          store.setVehicleSpeed(Math.abs(s.speed) * 3.6);
        }
      }
      s.pos.y = THREE.MathUtils.lerp(s.pos.y, groundHeight(s.pos.x, s.pos.z), 0.3);
      s.wheelSpin += (s.speed * delta) / s.wheelRadius;
    }
  });

  return (
    <>
      {VEHICLE_CONFIGS.map(cfg => <Car key={cfg.id} cfg={cfg} />)}
    </>
  );
}

VEHICLE_CONFIGS.forEach(c => useGLTF.preload(vehicleModel(c.model)));
