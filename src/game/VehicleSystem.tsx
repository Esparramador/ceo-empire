// ─────────────────────────────────────────────────────────────────────────────
// Vehículos: coches aparcados y conducción (aceleración, giro dependiente de la
// velocidad, freno de mano, colisiones con edificios y atropellos).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { VEHICLE_CONFIGS, CHASE_ROUTE, type VehicleConfig } from "../lib/gameData";
import { useGame } from "../lib/gameStore";
import { runtime, input, camera as camState, resolveCircle, dist2D, lerpAngle } from "../lib/world";
import { sfx, engine } from "../lib/audio";
import { allNpcs, damageNpc } from "./npcLogic";
import { kitUrl } from "./KitModel";

const KIT_CAR_SCALE = 5;
const KIT_CAR_YAW = 0; // los coches de KayKit miran hacia +Z

function KitCar({ cfg }: { cfg: VehicleConfig }) {
  const { scene } = useGLTF(kitUrl(cfg.model!));
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return c;
  }, [scene]);
  const wheels = useMemo(() => { const w: THREE.Object3D[] = []; obj.traverse(o => { if (/wheel/i.test(o.name)) w.push(o); }); return w; }, [obj]);
  useFrame(() => {
    const v = runtime.vehicles[cfg.id];
    if (!v) return;
    for (const w of wheels) w.rotation.x = v.wheelSpin;
  });
  return <primitive object={obj} scale={KIT_CAR_SCALE} rotation={[0, KIT_CAR_YAW, 0]} />;
}

function CarMesh({ cfg }: { cfg: VehicleConfig }) {
  const group = useRef<THREE.Group>(null!);
  const wheels = useRef<THREE.Mesh[]>([]);
  const headMat = useRef<THREE.MeshStandardMaterial>(null!);
  const spot = useRef<THREE.SpotLight>(null!);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: cfg.color, metalness: 0.6, roughness: 0.25 }), [cfg.color]);
  const sporty = cfg.maxSpeed >= 28;

  useFrame(() => {
    const v = runtime.vehicles[cfg.id];
    if (!v || !group.current) return;
    group.current.position.copy(v.pos);
    group.current.rotation.y = v.heading;
    for (const w of wheels.current) if (w) w.rotation.x = v.wheelSpin;
    const driven = runtime.player.inVehicleId === cfg.id;
    if (headMat.current) headMat.current.emissiveIntensity = driven || runtime.night > 0.5 ? 1.6 : 0.4;
    if (spot.current) {
      spot.current.visible = driven && runtime.night > 0.3;
      spot.current.intensity = runtime.night * 40;
    }
  });

  if (cfg.model) {
    return (
      <group ref={group} position={cfg.pos} rotation={[0, cfg.heading, 0]}>
        <KitCar cfg={cfg} />
        <mesh position={[0, 0.7, 2.25]}>
          <boxGeometry args={[1.6, 0.12, 0.05]} />
          <meshStandardMaterial ref={headMat} color="#fff" emissive="#ffeeaa" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.7, -2.25]}>
          <boxGeometry args={[1.6, 0.1, 0.05]} />
          <meshStandardMaterial color="#400" emissive="#ff2020" emissiveIntensity={0.9} />
        </mesh>
        <spotLight ref={spot} position={[0, 0.8, 2]} angle={0.5} penumbra={0.5} distance={40} color="#fff2cc" target={spotTarget} castShadow={false} visible={false} />
        <primitive object={spotTarget} position={[0, 0, 20]} />
      </group>
    );
  }
  return (
    <group ref={group} position={cfg.pos} rotation={[0, cfg.heading, 0]}>
      {/* Carrocería */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow material={body}>
        <boxGeometry args={[2.1, 0.7, 4.4]} />
      </mesh>
      <mesh position={[0, 1.05, -0.3]} castShadow material={body}>
        <boxGeometry args={[1.8, 0.55, sporty ? 2.0 : 2.5]} />
      </mesh>
      {/* Cristales */}
      <mesh position={[0, 1.08, -0.3]}>
        <boxGeometry args={[1.84, 0.4, sporty ? 2.04 : 2.54]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.2} roughness={0.05} transparent opacity={0.8} />
      </mesh>
      {sporty && (
        <mesh position={[0, 1.15, -2.0]} castShadow material={body}>
          <boxGeometry args={[1.9, 0.08, 0.4]} />
        </mesh>
      )}
      {cfg.id === "car6" && (
        <mesh position={[0, 1.42, -0.3]}>
          <boxGeometry args={[0.9, 0.2, 0.4]} />
          <meshStandardMaterial color="#fff" emissive="#ffd700" emissiveIntensity={0.8} />
        </mesh>
      )}
      {/* Ruedas */}
      {[[-1.05, 0.36, 1.4], [1.05, 0.36, 1.4], [-1.05, 0.36, -1.4], [1.05, 0.36, -1.4]].map(([x, y, z], i) => (
        <mesh key={i} ref={el => { if (el) wheels.current[i] = el; }} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 0.3, 14]} />
          <meshStandardMaterial color="#151515" roughness={0.9} />
        </mesh>
      ))}
      {/* Faros y pilotos */}
      <mesh position={[0, 0.6, 2.21]}>
        <boxGeometry args={[1.9, 0.18, 0.05]} />
        <meshStandardMaterial ref={headMat} color="#fff" emissive="#ffeeaa" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.6, -2.21]}>
        <boxGeometry args={[1.9, 0.14, 0.05]} />
        <meshStandardMaterial color="#400" emissive="#ff2020" emissiveIntensity={0.9} />
      </mesh>
      <spotLight ref={spot} position={[0, 0.8, 2]} angle={0.5} penumbra={0.5} distance={40} color="#fff2cc" target={spotTarget} castShadow={false} visible={false} />
      <primitive object={spotTarget} position={[0, 0, 20]} />
    </group>
  );
}

export function VehicleSystem() {
  const lastCrash = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    const p = runtime.player;
    const playing = s.phase === "playing" && !s.dialog.open && !s.showInventory && !s.showEmpire && !s.showHelp;

    for (const cfg of VEHICLE_CONFIGS) {
      const v = runtime.vehicles[cfg.id];
      if (!v) continue;
      const driven = p.inVehicleId === cfg.id;

      if (driven) {
        let throttle = 0, steer = 0, brake = false;
        if (playing) {
          if (input.keys.has("w") || input.keys.has("arrowup")) throttle = 1;
          if (input.keys.has("s") || input.keys.has("arrowdown")) throttle = -1;
          if (input.keys.has("a") || input.keys.has("arrowleft")) steer = 1;
          if (input.keys.has("d") || input.keys.has("arrowright")) steer = -1;
          brake = input.keys.has(" ");
        }
        if (throttle > 0) v.speed += cfg.accel * dt;
        else if (throttle < 0) v.speed -= (v.speed > 0 ? cfg.accel * 1.6 : cfg.accel * 0.6) * dt;
        else v.speed -= v.speed * 0.8 * dt;
        if (brake) v.speed -= v.speed * 4 * dt;
        v.speed = Math.max(-cfg.maxSpeed * 0.4, Math.min(cfg.maxSpeed, v.speed));
        if (Math.abs(v.speed) < 0.05 && throttle === 0) v.speed = 0;

        const steerAmount = steer * cfg.handling * Math.max(-1, Math.min(1, v.speed / 9)) * (brake ? 1.6 : 1);
        v.steer += (steerAmount - v.steer) * Math.min(1, dt * 8);
        v.heading += v.steer * dt;

        const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
        const before = v.pos.clone();
        v.pos.x += fx * v.speed * dt;
        v.pos.z += fz * v.speed * dt;
        const desired = v.pos.clone();
        resolveCircle(v.pos, 1.5);
        if (dist2D(desired, v.pos) > 0.01) {
          // Choque
          if (Math.abs(v.speed) > 7 && runtime.clock - lastCrash.current > 0.5) {
            lastCrash.current = runtime.clock;
            sfx.crash();
            camState.shake = 0.4;
            s.takeDamage(Math.min(15, Math.abs(v.speed) * 0.35), "crash");
          }
          v.speed *= -0.25;
        }
        p.distanceTravelled += dist2D(before, v.pos);
        v.wheelSpin += v.speed * dt * 2.8;

        // Atropellos
        if (Math.abs(v.speed) > 4) {
          for (const n of allNpcs()) {
            if (n.state === "dead") continue;
            if (dist2D(n.pos, v.pos) < 2.3) {
              damageNpc(n, Math.abs(v.speed) * 3.2, "vehicle", v.pos);
              sfx.punch();
              v.speed *= 0.7;
            }
          }
        }
        engine.update(Math.abs(v.speed) / cfg.maxSpeed);
        s.setVehicleSpeed(Math.abs(v.speed) * 3.6);
      } else if (cfg.ai && runtime.chase.active && runtime.chase.vehicleId === cfg.id) {
        // IA de huida: sigue la ruta en bucle
        const route = CHASE_ROUTE;
        const wp = route[runtime.chase.waypoint % route.length];
        const dx = wp[0] - v.pos.x, dz = wp[2] - v.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 7) runtime.chase.waypoint = (runtime.chase.waypoint + 1) % route.length;
        const target = Math.atan2(dx, dz);
        v.heading = lerpAngle(v.heading, target, Math.min(1, dt * 2.2));
        const turning = Math.abs(((target - v.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const maxS = turning > 0.6 ? 9 : 17;
        v.speed += (maxS - v.speed) * Math.min(1, dt * 1.5);
        v.pos.x += Math.sin(v.heading) * v.speed * dt;
        v.pos.z += Math.cos(v.heading) * v.speed * dt;
        resolveCircle(v.pos, 1.5);
        v.wheelSpin += v.speed * dt * 2.8;
        // ¿Le ha alcanzado el jugador?
        const dp = dist2D(v.pos, p.pos);
        if (dp < 6.5) {
          runtime.chase.contact += dt;
          const pv = p.inVehicleId ? runtime.vehicles[p.inVehicleId] : null;
          if (pv && Math.abs(pv.speed) > 8 && dp < 3.6) runtime.chase.contact += 1.5;
        }
        if (runtime.chase.contact >= 2.5) { runtime.chase.active = false; runtime.chase.caught = true; v.speed = 0; }
      } else if (v.speed !== 0) {
        v.speed -= v.speed * 3 * dt;
        if (Math.abs(v.speed) < 0.05) v.speed = 0;
        v.pos.x += Math.sin(v.heading) * v.speed * dt;
        v.pos.z += Math.cos(v.heading) * v.speed * dt;
        resolveCircle(v.pos, 1.5);
      }
    }
  });

  return (
    <>
      {VEHICLE_CONFIGS.map(cfg => <CarMesh key={cfg.id} cfg={cfg} />)}
    </>
  );
}
