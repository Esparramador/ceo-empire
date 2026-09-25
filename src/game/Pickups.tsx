// ─────────────────────────────────────────────────────────────────────────────
// Objetos del mundo: maletines de dinero, kits médicos, munición y chips.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtime, type PickupRuntime } from "../lib/world";

function PickupMesh({ pk }: { pk: PickupRuntime }) {
  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.visible = pk.active;
    if (!pk.active) return;
    group.current.position.set(pk.pos.x, 0.6 + Math.sin(clock.elapsedTime * 2.5 + pk.pos.x) * 0.15, pk.pos.z);
    group.current.rotation.y = clock.elapsedTime * 1.5;
  });
  return (
    <group ref={group} position={pk.pos}>
      {pk.kind === "money" && (
        <>
          <mesh castShadow><boxGeometry args={[0.9, 0.6, 0.3]} /><meshStandardMaterial color="#c9a227" metalness={0.7} roughness={0.3} emissive="#ffb300" emissiveIntensity={0.25} /></mesh>
          <mesh position={[0, 0.38, 0]}><boxGeometry args={[0.4, 0.12, 0.1]} /><meshStandardMaterial color="#5a4a1a" /></mesh>
        </>
      )}
      {pk.kind === "medkit" && (
        <>
          <mesh castShadow><boxGeometry args={[0.7, 0.5, 0.5]} /><meshStandardMaterial color="#f5f5f5" /></mesh>
          <mesh position={[0, 0, 0.26]}><boxGeometry args={[0.36, 0.1, 0.02]} /><meshStandardMaterial color="#e11" emissive="#e11" emissiveIntensity={0.5} /></mesh>
          <mesh position={[0, 0, 0.26]}><boxGeometry args={[0.1, 0.36, 0.02]} /><meshStandardMaterial color="#e11" emissive="#e11" emissiveIntensity={0.5} /></mesh>
        </>
      )}
      {pk.kind === "ammo" && (
        <mesh castShadow><boxGeometry args={[0.6, 0.4, 0.4]} /><meshStandardMaterial color="#3a6b2a" emissive="#5cff5c" emissiveIntensity={0.2} /></mesh>
      )}
      {pk.kind === "data" && (
        <>
          <mesh castShadow><octahedronGeometry args={[0.45, 0]} /><meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.4} /></mesh>
          <pointLight color="#00ff88" intensity={2} distance={6} />
        </>
      )}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.8, 24]} />
        <meshBasicMaterial color={pk.kind === "data" ? "#00ff88" : pk.kind === "medkit" ? "#ff5555" : "#ffd700"} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Pickups() {
  const [ids, setIds] = useState<string[]>(() => Object.keys(runtime.pickups));
  const acc = useRef(0);
  useEffect(() => { setIds(Object.keys(runtime.pickups)); }, []);
  useFrame((_, dt) => {
    // Reaparición
    for (const pk of Object.values(runtime.pickups)) {
      if (!pk.active && pk.respawnTimer > 0) {
        pk.respawnTimer -= dt;
        if (pk.respawnTimer <= 0 && !pk.isChip) pk.active = true;
      }
    }
    acc.current += dt;
    if (acc.current > 0.5) {
      acc.current = 0;
      const keys = Object.keys(runtime.pickups);
      if (keys.length !== ids.length || keys.some((k, i) => k !== ids[i])) setIds(keys);
    }
  });
  return (
    <>
      {ids.map(id => runtime.pickups[id] ? <PickupMesh key={id} pk={runtime.pickups[id]} /> : null)}
    </>
  );
}
