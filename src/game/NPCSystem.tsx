// ─────────────────────────────────────────────────────────────────────────────
// NPCs: IA (patrulla, persecución, ataque, huida, regreso, muerte/reaparición),
// policía dinámica según el nivel de búsqueda, barras de vida y etiquetas.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NPC_CONFIGS, missionById, type NpcConfig } from "../lib/gameData";
import { useGame } from "../lib/gameStore";
import { runtime, resolveCircle, dist2D, lerpAngle, makeNpcRuntime, type NpcRuntime } from "../lib/world";
import { sfx } from "../lib/audio";
import { textTexture } from "../lib/textures";
import { Character, makeAnim, type AnimState } from "./Characters";

const POLICE_CFG: Omit<NpcConfig, "id" | "pos"> = {
  name: "Policía", variant: "police", type: "police", wanderRadius: 0, dialogue: [], health: 90, damage: 7, aggroRange: 60,
};

function labelColor(type: NpcConfig["type"]) {
  return type === "boss" ? "#ff4d4d" : type === "hostile" ? "#ff8a5c" : type === "police" ? "#7fb3ff" : type === "friendly" ? "#7dffb0" : "#e8e8e8";
}

function NpcView({ cfg, npc, anim }: { cfg: NpcConfig; npc: NpcRuntime; anim: AnimState }) {
  const group = useRef<THREE.Group>(null!);
  const bar = useRef<THREE.Sprite>(null!);
  const barBg = useRef<THREE.Sprite>(null!);
  const label = useRef<THREE.Sprite>(null!);
  const marker = useRef<THREE.Group>(null!);
  const hired = useGame(s => s.hiredNpcIds.includes(cfg.id));
  const giverOf = useGame(s => {
    const m = missionById(s.availableMissionId);
    return m && m.giverNpcId === cfg.id && !s.activeMissionId ? m : undefined;
  });
  const labelTex = useMemo(() => textTexture(hired ? `${cfg.name} · Empleado` : cfg.name, { color: hired ? "#ffd700" : labelColor(cfg.type), size: 44 }), [cfg.name, cfg.type, hired]);
  const isEnemy = cfg.type === "hostile" || cfg.type === "boss" || cfg.type === "police";
  const scale = cfg.scale ?? 1;
  const barY = 2.35 * scale;

  useFrame(({ camera, clock }) => {
    if (!group.current) return;
    group.current.position.copy(npc.pos);
    group.current.rotation.y = npc.facing;
    const d = camera.position.distanceTo(npc.pos);
    const showUi = d < 40 && npc.state !== "dead";
    if (label.current) label.current.visible = showUi && d < 26;
    if (bar.current && barBg.current) {
      const show = showUi && isEnemy && npc.hp < npc.maxHp;
      bar.current.visible = show; barBg.current.visible = show;
      const r = Math.max(0.001, npc.hp / npc.maxHp);
      bar.current.scale.set(2.2 * r, 0.22, 1);
      bar.current.position.x = -(1 - r) * 1.1;
    }
    if (marker.current) {
      marker.current.visible = !!giverOf && npc.state !== "dead";
      marker.current.position.y = barY + 1.4 + Math.sin(clock.elapsedTime * 3) * 0.2;
      marker.current.rotation.y = clock.elapsedTime * 2;
    }
  });

  return (
    <group ref={group} position={npc.pos}>
      <Character variant={cfg.variant} glb={cfg.glb} seed={cfg.id} anim={anim} scale={scale} />
      <sprite ref={label} position={[0, barY + 0.55, 0]} scale={[3.2, 0.8, 1]}>
        <spriteMaterial map={labelTex} transparent depthWrite={false} />
      </sprite>
      <sprite ref={barBg} position={[0, barY, 0]} scale={[2.3, 0.3, 1]}>
        <spriteMaterial color="#220000" transparent opacity={0.8} depthWrite={false} />
      </sprite>
      <sprite ref={bar} position={[0, barY, 0]} scale={[2.2, 0.22, 1]}>
        <spriteMaterial color={cfg.type === "police" ? "#4d8dff" : "#ff3b3b"} depthWrite={false} />
      </sprite>
      <group ref={marker} visible={false}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.28, 0.9, 0.28]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffb300" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffb300" emissiveIntensity={1.2} />
        </mesh>
        <pointLight intensity={2} distance={7} color="#ffd700" />
      </group>
    </group>
  );
}

let policeCounter = 0;

export function NPCSystem() {
  const anims = useMemo(() => {
    const map: Record<string, AnimState> = {};
    for (const c of NPC_CONFIGS) map[c.id] = makeAnim();
    return map;
  }, []);
  const policeAnims = useRef<Record<string, AnimState>>({});
  const [policeIds, setPoliceIds] = useState<string[]>([]);
  const sirenTimer = useRef(0);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => { runtime.police = []; }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    const p = runtime.player;
    const playerAlive = s.phase === "playing";
    const activeMission = missionById(s.activeMissionId);

    // ── Policía: aparición/desaparición según búsqueda ──────────────────────
    const wanted = s.phase === "playing" ? s.wantedLevel : 0;
    const alivePolice = runtime.police.filter(c => c.state !== "dead");
    if (alivePolice.length < wanted) {
      const angle = Math.random() * Math.PI * 2;
      const pos = new THREE.Vector3(p.pos.x + Math.cos(angle) * 38, 0, p.pos.z + Math.sin(angle) * 38);
      resolveCircle(pos, 0.6);
      const id = `police${++policeCounter}`;
      const n = makeNpcRuntime(id, [pos.x, 0, pos.z], POLICE_CFG.health);
      n.state = "chase"; n.alerted = true;
      runtime.police.push(n);
      policeAnims.current[id] = makeAnim();
      setPoliceIds(runtime.police.map(c => c.id));
      sfx.siren();
    }
    if (wanted === 0 && runtime.police.length > 0) {
      for (const c of runtime.police) if (c.state !== "dead") { c.state = "flee"; c.stateTimer = 999; }
      const far = runtime.police.filter(c => c.state === "dead" ? c.deadTimer > 30 : dist2D(c.pos, p.pos) > 70);
      if (far.length) {
        runtime.police = runtime.police.filter(c => !far.includes(c));
        for (const c of far) delete policeAnims.current[c.id];
        setPoliceIds(runtime.police.map(c => c.id));
      }
    }
    if (wanted > 0 && alivePolice.length) {
      sirenTimer.current -= dt;
      if (sirenTimer.current <= 0) { sirenTimer.current = 4; if (alivePolice.some(c => dist2D(c.pos, p.pos) < 40)) sfx.siren(); }
    }

    // ── Actualización de cada NPC ───────────────────────────────────────────
    let bossNear: { id: string; name: string; hp: number; maxHp: number } | null = null;

    const update = (cfg: Omit<NpcConfig, "id" | "pos">, n: NpcRuntime, anim: AnimState) => {
      n.hitFlash = Math.max(0, n.hitFlash - dt * 3);
      anim.hitFlash = n.hitFlash;
      n.attackAnim = Math.max(0, n.attackAnim - dt * 2.5);
      anim.attack = n.attackAnim;
      n.attackCd = Math.max(0, n.attackCd - dt);
      n.stateTimer -= dt;

      if (n.state === "dead") {
        n.deadTimer += dt;
        anim.dead = Math.min(1, anim.dead + dt * 2.2);
        anim.moving = 0;
        const respawns = cfg.respawn && cfg.type !== "boss";
        if (respawns && n.deadTimer > 50 && dist2D(n.home, p.pos) > 30) {
          n.hp = n.maxHp; n.state = "wander"; n.alerted = false; n.pos.copy(n.home); anim.dead = 0; n.deadTimer = 0;
        }
        return;
      }
      anim.dead = 0;

      const d = dist2D(n.pos, p.pos);
      const isEnemy = cfg.type === "hostile" || cfg.type === "boss" || cfg.type === "police";
      const aggro = cfg.aggroRange ?? 14;
      let speed = 0;
      const dir = tmpDir.set(0, 0, 0);

      if (isEnemy) {
        const bossMissionActive = cfg.type !== "boss" || !!activeMission?.targetBosses?.includes(n.id) || n.alerted;
        const engage = playerAlive && !p.inVehicleId || (playerAlive && !!p.inVehicleId && cfg.type === "police");
        if (engage && (d < aggro || (n.alerted && d < aggro * 3)) && (bossMissionActive || d < aggro * 0.5)) {
          if (!n.alerted && cfg.type !== "police") { n.alerted = true; }
          if (d > 1.9) {
            n.state = "chase";
            dir.set(p.pos.x - n.pos.x, 0, p.pos.z - n.pos.z).normalize();
            speed = cfg.type === "boss" ? 4.2 : cfg.type === "police" ? 5.2 : 4.4;
            n.facing = lerpAngle(n.facing, Math.atan2(dir.x, dir.z), Math.min(1, dt * 8));
          } else {
            n.state = "attack";
            n.facing = lerpAngle(n.facing, Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z), Math.min(1, dt * 10));
            if (n.attackCd <= 0) {
              n.attackCd = cfg.type === "boss" ? 1.35 : 1.1;
              n.attackAnim = 1;
              if (d < 2.6 && !p.inVehicleId) { s.takeDamage(cfg.damage, n.id); sfx.hurt(); }
            }
          }
          if (cfg.type === "boss") bossNear = { id: n.id, name: cfg.name, hp: n.hp, maxHp: n.maxHp };
        } else if (n.state === "chase" || n.state === "attack" || (n.alerted && d > aggro * 3)) {
          n.alerted = false;
          n.state = "return";
        } else if (n.state === "return") {
          const dh = dist2D(n.pos, n.home);
          if (dh < 1.5) { n.state = "wander"; n.stateTimer = 1; }
          else { dir.set(n.home.x - n.pos.x, 0, n.home.z - n.pos.z).normalize(); speed = 3.5; n.facing = lerpAngle(n.facing, Math.atan2(dir.x, dir.z), Math.min(1, dt * 6)); }
        } else if (n.state === "flee") {
          // la policía se retira cuando ya no te buscan
          dir.set(n.pos.x - p.pos.x, 0, n.pos.z - p.pos.z).normalize(); speed = 4; n.facing = Math.atan2(dir.x, dir.z);
        } else {
          wander(cfg, n, dir, dt, (v) => { speed = v; });
        }
      } else {
        // Civiles y asesores
        if (n.state === "flee") {
          if (n.stateTimer <= 0) { n.state = "return"; }
          dir.set(n.pos.x - p.pos.x, 0, n.pos.z - p.pos.z).normalize();
          speed = 5; n.facing = lerpAngle(n.facing, Math.atan2(dir.x, dir.z), Math.min(1, dt * 8));
        } else if (n.state === "return") {
          const dh = dist2D(n.pos, n.home);
          if (dh < 2) { n.state = "wander"; n.stateTimer = 1; }
          else { dir.set(n.home.x - n.pos.x, 0, n.home.z - n.pos.z).normalize(); speed = 2; n.facing = lerpAngle(n.facing, Math.atan2(dir.x, dir.z), Math.min(1, dt * 6)); }
        } else if (n.state === "idle") {
          if (n.stateTimer <= 0) n.state = "wander";
        } else {
          wander(cfg, n, dir, dt, (v) => { speed = v; });
        }
      }

      if (speed > 0) {
        n.pos.x += dir.x * speed * dt;
        n.pos.z += dir.z * speed * dt;
        resolveCircle(n.pos, 0.45);
        // Separación con el jugador
        const dp = dist2D(n.pos, p.pos);
        if (dp < 1.1 && !p.inVehicleId) { const k = (1.1 - dp); n.pos.x += (n.pos.x - p.pos.x) / (dp || 1) * k; n.pos.z += (n.pos.z - p.pos.z) / (dp || 1) * k; }
      }
      anim.moving += ((speed > 0.1 ? 1 : 0) - anim.moving) * Math.min(1, dt * 8);
      anim.speedMul = speed > 3 ? 1.7 : 1;
    };

    for (const cfg of NPC_CONFIGS) {
      const n = runtime.npcs[cfg.id];
      if (n) update(cfg, n, anims[cfg.id]);
    }
    for (const c of runtime.police) {
      const anim = policeAnims.current[c.id];
      if (anim) update(POLICE_CFG, c, anim);
    }
    s.setBossFight(bossNear);
  });

  return (
    <>
      {NPC_CONFIGS.map(cfg => {
        const n = runtime.npcs[cfg.id];
        return n ? <NpcView key={cfg.id} cfg={cfg} npc={n} anim={anims[cfg.id]} /> : null;
      })}
      {policeIds.map(id => {
        const n = runtime.police.find(c => c.id === id);
        const anim = policeAnims.current[id];
        return n && anim ? <NpcView key={id} cfg={{ ...POLICE_CFG, id, pos: [n.pos.x, 0, n.pos.z] }} npc={n} anim={anim} /> : null;
      })}
    </>
  );
}

function wander(cfg: Omit<NpcConfig, "id" | "pos">, n: NpcRuntime, dir: THREE.Vector3, dt: number, setSpeed: (v: number) => void) {
  if (cfg.wanderRadius <= 0) { n.state = "idle"; n.stateTimer = 999; return; }
  if (n.state !== "wander") { n.state = "wander"; n.stateTimer = 0; }
  if (n.stateTimer <= 0) {
    // Elige un nuevo destino dentro del radio; a veces se detiene
    if (Math.random() < 0.3) { n.state = "idle"; n.stateTimer = 1.5 + Math.random() * 3; return; }
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * cfg.wanderRadius;
    const tx = n.home.x + Math.cos(a) * r, tz = n.home.z + Math.sin(a) * r;
    n.facing = Math.atan2(tx - n.pos.x, tz - n.pos.z);
    n.stateTimer = 1.5 + Math.random() * 3;
  }
  dir.set(Math.sin(n.facing), 0, Math.cos(n.facing));
  setSpeed(cfg.type === "hostile" ? 1.6 : 1.3);
  void dt;
}
