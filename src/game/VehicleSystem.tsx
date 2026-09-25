// ─────────────────────────────────────────────────────────────────────────────
// Vehículos: coches aparcados y conducción (aceleración, giro dependiente de la
// velocidad, freno de mano, colisiones con edificios y atropellos).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VEHICLE_CONFIGS, type VehicleConfig } from "../lib/gameData";
import { useGame } from "../lib/gameStore";
import { runtime, input, camera as camState, resolveCircle, dist2D } from "../lib/world";
import { sfx, engine } from "../lib/audio";
import { allNpcs, damageNpc } from "./npcLogic";

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
