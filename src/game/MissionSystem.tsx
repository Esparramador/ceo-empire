// ─────────────────────────────────────────────────────────────────────────────
// Misiones: comprobación de objetivos, cronómetro, marcador 3D del objetivo y
// cálculo del objetivo más cercano (para minimapa).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUSINESSES, NPC_CONFIGS, missionById, type Mission } from "../lib/gameData";
import { useGame, availableSideMissions } from "../lib/gameStore";
import { runtime, dist2D } from "../lib/world";
import { textTexture } from "../lib/textures";

/** Punto objetivo actual (o null). */
export function objectivePoint(m: Mission | undefined, s: ReturnType<typeof useGame.getState>): THREE.Vector3 | null {
  const p = runtime.player.pos;
  if (!m) {
    const avail = missionById(s.availableMissionId) ?? availableSideMissions(s)[0];
    const giver = avail && NPC_CONFIGS.find(n => n.id === avail.giverNpcId);
    const g = giver && runtime.npcs[giver.id];
    return g ? g.pos.clone() : null;
  }
  switch (m.type) {
    case "race": case "waypoints": {
      const wp = m.waypoints?.[s.missionWaypoint];
      return wp ? new THREE.Vector3(wp[0], 0, wp[2]) : null;
    }
    case "chase": {
      const v = m.targetVehicleId ? runtime.vehicles[m.targetVehicleId] : null;
      return v ? v.pos.clone() : null;
    }
    case "invest": {
      const g = runtime.npcs[m.giverNpcId];
      return g ? g.pos.clone() : null;
    }
    case "goto": case "deliver": return m.markerPos ? new THREE.Vector3(m.markerPos[0], 0, m.markerPos[2]) : null;
    case "buy": { const b = BUSINESSES.find(x => x.id === m.targetBusiness); return b ? new THREE.Vector3(b.pos[0], 0, b.pos[2]) : null; }
    case "kill_group": {
      let best: THREE.Vector3 | null = null, bd = Infinity;
      for (const c of NPC_CONFIGS) {
        if (c.group !== m.targetGroup) continue;
        const n = runtime.npcs[c.id];
        if (!n || n.state === "dead") continue;
        const d = dist2D(n.pos, p);
        if (d < bd) { bd = d; best = n.pos.clone(); }
      }
      return best ?? (m.markerPos ? new THREE.Vector3(m.markerPos[0], 0, m.markerPos[2]) : null);
    }
    case "kill_boss": {
      let best: THREE.Vector3 | null = null, bd = Infinity;
      for (const id of m.targetBosses ?? []) {
        if (s.defeatedBosses.includes(id)) continue;
        const n = runtime.npcs[id];
        if (!n) continue;
        const d = dist2D(n.pos, p);
        if (d < bd) { bd = d; best = n.pos.clone(); }
      }
      return best;
    }
    case "own_count": {
      let best: THREE.Vector3 | null = null, bd = Infinity;
      for (const b of BUSINESSES) {
        if (s.ownedBusinesses[b.id]) continue;
        const d = Math.hypot(b.pos[0] - p.x, b.pos[2] - p.z);
        if (d < bd) { bd = d; best = new THREE.Vector3(b.pos[0], 0, b.pos[2]); }
      }
      return best;
    }
    case "collect": {
      let best: THREE.Vector3 | null = null, bd = Infinity;
      for (const pk of Object.values(runtime.pickups)) {
        if (!pk.isChip || !pk.active) continue;
        const d = dist2D(pk.pos, p);
        if (d < bd) { bd = d; best = pk.pos.clone(); }
      }
      return best;
    }
    case "hire": {
      let best: THREE.Vector3 | null = null, bd = Infinity;
      for (const c of NPC_CONFIGS) {
        if (c.type !== "neutral" || s.hiredNpcIds.includes(c.id)) continue;
        const n = runtime.npcs[c.id];
        if (!n || n.state === "dead") continue;
        const d = dist2D(n.pos, p);
        if (d < bd) { bd = d; best = n.pos.clone(); }
      }
      return best;
    }
  }
}

function ObjectiveBeacon() {
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const color = useGame(s => missionById(s.activeMissionId)?.color ?? "#ffd700");
  const active = useGame(s => !!s.activeMissionId);
  const tex = useMemo(() => textTexture("OBJETIVO", { color, size: 40 }), [color]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = runtime.nearestObjective;
    group.current.visible = active && !!t;
    if (t) group.current.position.set(t.x, 0, t.z);
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.12);
    if (mat.current) mat.current.opacity = 0.22 + Math.sin(clock.elapsedTime * 2) * 0.08;
  });
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 12, 0]}>
        <cylinderGeometry args={[0.4, 1.4, 24, 12, 1, true]} />
        <meshBasicMaterial ref={mat} color={color} transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 3.2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <sprite position={[0, 6, 0]} scale={[6, 1.5, 1]}>
        <spriteMaterial map={tex} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

function Checkpoints() {
  const active = useGame(s => missionById(s.activeMissionId));
  const idx = useGame(s => s.missionWaypoint);
  const wps = active?.waypoints;
  if (!wps || (active.type !== "race" && active.type !== "waypoints")) return null;
  return (
    <group>
      {wps.map((w, i) => i >= idx && (
        <group key={i} position={[w[0], 0, w[2]]}>
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4.5, 5.5, 32]} />
            <meshBasicMaterial color={i === idx ? active.color : "#ffffff"} transparent opacity={i === idx ? 0.9 : 0.3} side={THREE.DoubleSide} />
          </mesh>
          {i === idx && (
            <mesh position={[0, 6, 0]}>
              <cylinderGeometry args={[4.6, 5.4, 12, 24, 1, true]} />
              <meshBasicMaterial color={active.color} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

export function MissionSystem() {
  const timerAcc = useRef(0);
  const objAcc = useRef(0);
  const hintShown = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useGame.getState();
    if (s.phase !== "playing") return;
    const m = missionById(s.activeMissionId);

    objAcc.current += dt;
    if (objAcc.current > 0.2) { objAcc.current = 0; runtime.nearestObjective = objectivePoint(m, s); }
    if (!m) return;

    // Cronómetro
    if (s.missionTimeLeft !== null) {
      timerAcc.current += dt;
      if (timerAcc.current >= 0.25) {
        const left = s.missionTimeLeft - timerAcc.current;
        timerAcc.current = 0;
        if (left <= 0) {
          if (m.type === "invest") { s.completeMission(); return; }
          s.failMission("se acabó el tiempo"); return;
        }
        s.setMissionTimeLeft(left);
      }
    }

    const p = runtime.player.pos;
    let done = false;
    switch (m.type) {
      case "goto": case "deliver":
        if (m.markerPos && Math.hypot(m.markerPos[0] - p.x, m.markerPos[2] - p.z) < 4.5) {
          if (m.requireVehicleId && runtime.player.inVehicleId !== m.requireVehicleId) {
            if (!hintShown.current) { hintShown.current = true; s.notify("Tienes que llegar conduciendo el vehículo indicado.", "warning"); }
          } else done = true;
        }
        break;
      case "race": case "waypoints": {
        const wp = m.waypoints?.[s.missionWaypoint];
        if (!wp) { done = true; break; }
        if (Math.hypot(wp[0] - p.x, wp[2] - p.z) < 6) {
          if (m.requireVehicle && !runtime.player.inVehicleId) {
            if (!hintShown.current) { hintShown.current = true; s.notify("Los puntos de control solo cuentan en coche.", "warning"); }
          } else {
            s.addMissionWaypoint();
            if (s.missionWaypoint + 1 >= (m.waypoints?.length ?? 0)) done = true;
            else s.notify(`Punto de control ${s.missionWaypoint + 1}/${m.waypoints?.length}`, "info");
          }
        }
        break;
      }
      case "chase": done = runtime.chase.caught; break;
      case "invest": break;
      case "buy": done = !!s.ownedBusinesses[m.targetBusiness ?? ""]; break;
      case "kill_group": done = s.missionKills >= (m.targetCount ?? 1); break;
      case "kill_boss": done = (m.targetBosses ?? []).every(b => s.defeatedBosses.includes(b)); break;
      case "own_count": done = Object.keys(s.ownedBusinesses).length >= (m.targetCount ?? 1); break;
      case "collect": done = s.missionCollected >= (m.targetCount ?? 1); break;
      case "hire": done = s.employees - s.missionHiresAtStart >= (m.targetCount ?? 1); break;
    }
    if (done) { hintShown.current = false; s.completeMission(); }
  });

  return <><ObjectiveBeacon /><Checkpoints /></>;
}
