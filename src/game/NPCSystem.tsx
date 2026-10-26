import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { NPC_CONFIGS, type NpcConfig } from "../lib/gameData";
import { useGame } from "../lib/gameStore";
import { groundHeight, resolveCollision } from "../lib/city";
import { CharacterModel, animateRig, type Rig } from "./Character";
import { runtime } from "./runtime";

interface NpcAI {
  dir: THREE.Vector3;
  facing: number;
  changeTimer: number;
  walk: number;
  attack: number;
}

function Npc({ cfg }: { cfg: NpcConfig }) {
  const group = useRef<THREE.Group>(null!);
  const rig = useRef<Rig | null>(null);
  const label = useRef<HTMLDivElement>(null);
  const hostile = cfg.type === "hostile" || cfg.type === "boss";
  // drei <Html> mounts its DOM root into the events target; mounting before R3F
  // connects its events makes it re-parent (unmount a root mid-render) once
  // they connect. Wait for the final target.
  const eventsConnected = useThree(s => !!s.events.connected);

  if (!runtime.npcs[cfg.id]) {
    runtime.npcs[cfg.id] = { pos: new THREE.Vector3(...cfg.pos), hp: cfg.health, dead: false, respawnAt: 0 };
  }
  const ai = useRef<NpcAI>({
    dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
    facing: Math.random() * Math.PI * 2,
    changeTimer: Math.random() * 3,
    walk: Math.random() * 10,
    attack: 0,
  });

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const s = runtime.npcs[cfg.id];
    const a = ai.current;
    const g = group.current;
    if (!g) return;
    const st = useGame.getState();

    if (s.dead) {
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -Math.PI / 2, 0.15);
      g.position.y = THREE.MathUtils.lerp(g.position.y, s.pos.y + 0.25, 0.15);
      if (label.current) label.current.style.display = "none";
      if (performance.now() > s.respawnAt) {
        s.dead = false;
        s.hp = cfg.health;
        s.pos.set(...cfg.pos);
        g.rotation.x = 0;
      }
      return;
    }
    if (label.current) label.current.style.display = "";

    const p = runtime.player;
    const toX = p.x - s.pos.x, toZ = p.z - s.pos.z;
    const dist = Math.hypot(toX, toZ);
    let speed = 1.2;
    a.changeTimer -= delta;

    if (hostile && dist < 30 && st.phase === "playing") {
      a.dir.set(toX / dist, 0, toZ / dist);
      speed = dist > 1.8 ? (cfg.type === "boss" ? 4.2 : 3.4) : 0;
      a.facing = Math.atan2(toX, toZ);
      // melee damage when in reach and the player is on foot
      if (dist < 2.2 && !st.inVehicle) {
        a.attack += delta;
        if (a.attack > 0.9) {
          a.attack = 0;
          st.takeDamage(cfg.type === "boss" ? 12 : 6);
        }
      }
    } else if (a.changeTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      a.dir.set(Math.sin(ang), 0, Math.cos(ang));
      a.facing = ang;
      a.changeTimer = 2 + Math.random() * 4;
      if (Math.random() < 0.3) a.dir.set(0, 0, 0); // idle a bit
    }
    // Stay near home
    const hx = cfg.pos[0] - s.pos.x, hz = cfg.pos[2] - s.pos.z;
    if (!hostile && Math.hypot(hx, hz) > 14) {
      const d = Math.hypot(hx, hz);
      a.dir.set(hx / d, 0, hz / d);
      a.facing = Math.atan2(hx, hz);
    }

    const moving = a.dir.lengthSq() > 0 && speed > 0;
    if (moving) {
      const q = { x: s.pos.x + a.dir.x * speed * delta, z: s.pos.z + a.dir.z * speed * delta };
      if (resolveCollision(q, 0.45)) a.changeTimer = 0;
      s.pos.x = q.x;
      s.pos.z = q.z;
    }
    s.pos.y = groundHeight(s.pos.x, s.pos.z);

    a.walk += delta * (moving ? speed * 1.9 : 0);
    animateRig(rig.current, a.walk, moving ? Math.min(1, speed / 3) : 0, hostile && dist < 2.2 ? Math.max(0, Math.sin(a.attack * 7)) : 0);

    g.position.lerp(s.pos, 0.3);
    let diff = a.facing - g.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * Math.min(1, delta * 6);
  });

  const scale = cfg.scale ?? 1;
  return (
    <group ref={group} position={cfg.pos}>
      <group scale={scale}>
        <CharacterModel modelKey={cfg.model} onRig={r => { rig.current = r; }} />
      </group>
      {hostile && eventsConnected && (
        <Html position={[0, 2.4 * scale, 0]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
          <div ref={label} style={{
            background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,60,60,0.4)",
            borderRadius: 4, padding: "2px 8px", fontSize: 12, color: "#ff8888",
            whiteSpace: "nowrap",
          }}>
            ⚠ {cfg.name}
          </div>
        </Html>
      )}
    </group>
  );
}

export function NPCSystem() {
  return (
    <>
      {NPC_CONFIGS.map(cfg => <Npc key={cfg.id} cfg={cfg} />)}
    </>
  );
}
