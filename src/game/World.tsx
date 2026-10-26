// ─────────────────────────────────────────────────────────────────────────────
// Mundo: la ciudad de Blender (edificios, mobiliario instanciado, farolas con
// luz real cerca del jugador) y los lugares de la historia colocados en sus
// solares libres: HQ, kiosco del Vendedor, Club Diamante, helipuerto, guaridas,
// ring, desguace y Torre de Hielo. Sus colisiones están en PLACE_OBSTACLES.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BUSINESSES, MAX_BUSINESS_LEVEL, PLACES } from "../lib/gameData";
import { useGame, formatMoney } from "../lib/gameStore";
import { CITY_MODEL, propModel } from "../lib/assets";
import { CITY, groundHeight, type PropInstance } from "../lib/city";
import { runtime } from "../lib/world";
import { textTexture } from "../lib/textures";
import { KitModel } from "./KitModel";

const CURB = CITY.curbHeight;

/** Materials whose emission should only show at night. */
const NIGHT_EMISSIVE = /^(facade_|storefront|lamp_bulb)/;

function useNightMaterials(root: THREE.Object3D) {
  return useMemo(() => {
    const out: { mat: THREE.MeshStandardMaterial; day: number; night: number }[] = [];
    const seen = new Set<THREE.Material>();
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        if (seen.has(mat) || !NIGHT_EMISSIVE.test(mat.name)) continue;
        seen.add(mat);
        const std = mat as THREE.MeshStandardMaterial;
        const facade = mat.name.startsWith("facade_");
        out.push({ mat: std, day: facade ? 0 : 0.15, night: facade ? 1.6 : mat.name === "lamp_bulb" ? 4 : 1.4 });
      }
    });
    return out;
  }, [root]);
}

function City() {
  const { scene } = useGLTF(CITY_MODEL);
  const night = useNightMaterials(scene);
  useMemo(() => {
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.receiveShadow = true;
      m.castShadow = true;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.map) std.map.anisotropy = 8;
        if (mat.name.startsWith("paint_")) {
          // road markings sit a hair above the asphalt
          std.polygonOffset = true;
          std.polygonOffsetFactor = -2;
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    const n = runtime.night;
    for (const e of night) e.mat.emissiveIntensity = e.day + (e.night - e.day) * n;
  });
  return <primitive object={scene} />;
}

/** Render every instance of a prop GLB with one InstancedMesh per sub-mesh. */
/** Canopy size of the props that can stand between the camera and the player. */
const CAMERA_OCCLUDERS: Record<string, { radius: number; near: number; top: number }> = {
  // radius: canopy/pole half-width on the camera→player line; near: hide it when the camera is this close
  tree: { radius: 2.8, near: 4.3, top: 6.6 },
  cypress: { radius: 1.2, near: 2.2, top: 6.5 },
  streetlight: { radius: 0.6, near: 2.8, top: 8 },
  traffic_light: { radius: 0.5, near: 2.4, top: 6 },
};

function InstancedProp({ id, items, shadows = true }: { id: string; items: PropInstance[]; shadows?: boolean }) {
  const { scene } = useGLTF(propModel(id));
  const night = useNightMaterials(scene);
  const meshes = useMemo(() => {
    scene.updateMatrixWorld(true);
    const parts: { geo: THREE.BufferGeometry; mat: THREE.Material; local: THREE.Matrix4 }[] = [];
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) parts.push({ geo: m.geometry, mat: m.material as THREE.Material, local: m.matrixWorld.clone() });
    });
    const tmp = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    return parts.map(({ geo, mat, local }) => {
      const inst = new THREE.InstancedMesh(geo, mat, items.length);
      const bases: THREE.Matrix4[] = [];
      items.forEach(([x, z, rot], i) => {
        q.setFromAxisAngle(up, rot);
        tmp.compose(new THREE.Vector3(x, groundHeight(x, z), z), q, new THREE.Vector3(1, 1, 1)).multiply(local);
        inst.setMatrixAt(i, tmp);
        bases.push(tmp.clone());
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = shadows;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      inst.userData.bases = bases;
      return inst;
    });
  }, [scene, items, shadows]);

  // Trees standing between the camera and the player (or swallowing the
  // camera) are hidden until the view is clear again.
  const occluder = CAMERA_OCCLUDERS[id];
  const hidden = useRef<boolean[]>([]);
  const occTimer = useRef(0);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);

  useFrame(({ camera }, delta) => {
    if (night.length) {
      const n = runtime.night;
      for (const e of night) e.mat.emissiveIntensity = e.day + (e.night - e.day) * n;
    }
    if (!occluder) return;
    occTimer.current -= delta;
    if (occTimer.current > 0) return;
    occTimer.current = 0.08;
    const c = camera.position, p = runtime.player.pos;
    const sx = p.x - c.x, sz = p.z - c.z;
    const len2 = sx * sx + sz * sz || 1;
    const above = c.y > occluder.top + 1;
    let changed = false;
    items.forEach(([x, z], i) => {
      let hide = false;
      if (!above) {
        const t = Math.max(0, Math.min(1, ((x - c.x) * sx + (z - c.z) * sz) / len2));
        const dx = c.x + sx * t - x, dz = c.z + sz * t - z;
        const near = (x - c.x) ** 2 + (z - c.z) ** 2 < occluder.near ** 2; // canopy or pole right by the camera
        hide = near || (t < 0.97 && dx * dx + dz * dz < (occluder.radius + 0.4) ** 2);
      }
      if (hide !== !!hidden.current[i]) {
        hidden.current[i] = hide;
        changed = true;
        for (const m of meshes) m.setMatrixAt(i, hide ? zero : (m.userData.bases as THREE.Matrix4[])[i]);
      }
    });
    if (changed) for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  });

  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
}

/**
 * Real lights only for the few street lamps closest to the player — the rest
 * glow through their emissive bulbs. Keeps the shader light count fixed.
 */
function StreetLightPool({ count = 6 }: { count?: number }) {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const lamps = useMemo(() => CITY.props.streetlight.map(([x, z, rot]) =>
    new THREE.Vector3(x + Math.sin(rot) * 2.1, 7.2, z + Math.cos(rot) * 2.1)), []);
  const timer = useRef(0);

  useFrame((_, delta) => {
    const n = runtime.night;
    timer.current -= delta;
    if (timer.current <= 0) {
      timer.current = 0.5;
      const p = runtime.player.pos;
      const nearest = [...lamps].sort((a, b) => a.distanceToSquared(p) - b.distanceToSquared(p)).slice(0, count);
      nearest.forEach((v, i) => lights.current[i]?.position.copy(v));
    }
    for (const l of lights.current) if (l) l.intensity = n * 40;
  });

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <pointLight key={i} ref={el => { lights.current[i] = el; }} color="#ffd38a" distance={22} decay={1.5} intensity={0} />
      ))}
    </>
  );
}


function Sign({ text, position, color = "#ffd700", icon, scale = 1 }: { text: string; position: [number, number, number]; color?: string; icon?: string; scale?: number }) {
  const tex = useMemo(() => textTexture(text, { color, icon }), [text, color, icon]);
  return (
    <sprite position={position} scale={[8 * scale, 2 * scale, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

/** Pulsing glow material for neon strips; intensity follows the night. */
function useNeon(count: number) {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    const on = 0.35 + runtime.night * 0.65;
    mats.current.forEach((m, i) => { if (m) m.emissiveIntensity = on * (1.4 + Math.sin(clock.elapsedTime * 4 + i) * 0.6); });
  });
  return (i: number, color: string) => (
    <meshStandardMaterial ref={el => { if (el && i < count) mats.current[i] = el; }} color={color} emissive={color} emissiveIntensity={1.5} />
  );
}

function BusinessMarker({ id }: { id: string }) {
  const b = BUSINESSES.find(x => x.id === id)!;
  const level = useGame(s => s.ownedBusinesses[id] ?? 0);
  const price = useGame(s => s.businessPrice(id));
  const owned = level > 0;
  const ring = useRef<THREE.Mesh>(null!);
  const beam = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.6;
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(t * 2) * 0.05;
  });
  const color = owned ? "#2dd49f" : "#ffd700";
  const label = owned ? `${b.name} · Nv ${level}${level >= MAX_BUSINESS_LEVEL ? " MAX" : ""}` : `${b.name} · ${formatMoney(price)}`;
  const y = groundHeight(b.pos[0], b.pos[2]);
  // Facade sign on the building, on the side that faces the marker
  const { x: bx, z: bz, w, d, h } = b.building;
  const dx = b.pos[0] - bx, dz = b.pos[2] - bz;
  const facade: [number, number, number] = Math.abs(dx) > Math.abs(dz)
    ? [bx + Math.sign(dx) * (w / 2 + 0.5), Math.min(h, 24) + 3, bz]
    : [bx, Math.min(h, 24) + 3, bz + Math.sign(dz) * (d / 2 + 0.5)];
  return (
    <>
      <group position={[b.pos[0], y, b.pos[2]]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} ref={ring}>
          <ringGeometry args={[2.2, 3, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} />
        </mesh>
        <mesh ref={beam} position={[0, 5, 0]}>
          <cylinderGeometry args={[0.35, 1.0, 10, 12, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <Sign text={label} position={[0, 7.5, 0]} color={color} icon={b.icon} />
      </group>
      {b.id !== "club" && <Sign text={b.name} position={facade} color={b.color} icon={b.icon} scale={1.4} />}
    </>
  );
}

function HQ() {
  const { x, z, h, entrance } = PLACES.hq;
  return (
    <group>
      <Sign text="SHOPY HQ" position={[x, h + 20, z]} color="#ffd700" icon="🏢" scale={2.6} />
      <Sign text="Shopy Crafter · Sede central" position={[entrance[0], 7, entrance[2] - 1.5]} color="#7fd1ff" scale={1.1} />
    </group>
  );
}

function VendorKiosk() {
  const { x, z } = PLACES.kiosk;
  return (
    // the counter faces east, where the Vendor stands
    <group position={[x, CURB, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 3.6, 0]} castShadow>
        <boxGeometry args={[4.4, 0.2, 6.4]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {[[-1.9, 2.9], [1.9, 2.9], [-1.9, -2.9], [1.9, -2.9]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 1.8, pz]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3.6, 6]} />
          <meshStandardMaterial color="#e8dcc0" />
        </mesh>
      ))}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 1.2, 5.6]} />
        <meshStandardMaterial color="#6b4226" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[3.8, 0.12, 5.8]} />
        <meshStandardMaterial color="#8a5a3a" />
      </mesh>
      <Sign text="Armería del Vendedor" position={[0, 5.6, 0]} color="#ff9f43" icon="🛒" />
    </group>
  );
}

function Helipad() {
  const { x, z, r } = PLACES.helipad;
  const rotor = useRef<THREE.Group>(null!);
  const finale = useGame(s => s.activeMissionId === "m14");
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.y += dt * (finale ? 14 : 2); });
  return (
    <group position={[x, CURB, z]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r, 40]} />
        <meshStandardMaterial color="#3a3f4a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 1.4, r - 0.5, 40]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* the big H */}
      {[-2.6, 2.6].map(dx => (
        <mesh key={dx} position={[dx, 0.05, 4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.3, 7]} /><meshStandardMaterial color="#fff" /></mesh>
      ))}
      <mesh position={[0, 0.05, 4]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}><planeGeometry args={[1.3, 4]} /><meshStandardMaterial color="#fff" /></mesh>
      {/* helicopter, parked at the back of the pad */}
      <group position={[0, 0, -2]}>
        <mesh position={[0, 1.6, 0]} castShadow><sphereGeometry args={[1.6, 14, 10]} /><meshStandardMaterial color="#1b1d22" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 1.7, 0.9]}><sphereGeometry args={[1.2, 12, 8]} /><meshStandardMaterial color="#9fd0ff" transparent opacity={0.7} roughness={0.1} /></mesh>
        <mesh position={[0, 1.8, -4]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.25, 0.5, 6, 8]} /><meshStandardMaterial color="#1b1d22" /></mesh>
        <mesh position={[0, 2.6, -6.6]} castShadow><boxGeometry args={[0.1, 1.4, 1]} /><meshStandardMaterial color="#ffd700" /></mesh>
        {[-1, 1].map(sx => <mesh key={sx} position={[sx * 1.1, 0.25, 0]} castShadow><boxGeometry args={[0.15, 0.15, 4]} /><meshStandardMaterial color="#555" /></mesh>)}
        <group ref={rotor} position={[0, 3.35, 0]}>
          <mesh castShadow><boxGeometry args={[9, 0.08, 0.35]} /><meshStandardMaterial color="#444" /></mesh>
          <mesh castShadow rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[9, 0.08, 0.35]} /><meshStandardMaterial color="#444" /></mesh>
        </group>
      </group>
      <Sign text="Helipuerto" position={[0, 9, 0]} color="#7fd1ff" icon="🚁" />
    </group>
  );
}

/** Torches and a sign in front of a boss's base. */
function Lair({ position, name, color }: { position: [number, number, number]; name: string; color: string }) {
  return (
    <group position={position}>
      <Sign text={name} position={[0, 16, 0]} color={color} icon="☠️" scale={1.3} />
      {[-6, 6].map(x => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 3, 6]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <sphereGeometry args={[0.45, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A dark stronghold for Titán's mercenaries (its footprint collides via PLACE_OBSTACLES). */
function Stronghold({ x, z, w, d, h, color, name }: { x: number; z: number; w: number; d: number; h: number; color: string; name: string }) {
  const neon = useNeon(2);
  return (
    <group position={[x, CURB, z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#1e1824" roughness={0.7} metalness={0.2} />
      </mesh>
      {[-1, 1].map((sx, i) => (
        <mesh key={sx} position={[sx * (w / 2 - 1), h / 2, d / 2 + 0.05]}>
          <boxGeometry args={[0.3, h * 0.9, 0.1]} />
          {neon(i, color)}
        </mesh>
      ))}
      {[-w / 2 + 1, w / 2 - 1].map(cx => [-d / 2 + 1, d / 2 - 1].map(cz => (
        <mesh key={`${cx}${cz}`} position={[cx, h + 1.2, cz]} castShadow>
          <boxGeometry args={[1.6, 2.4, 1.6]} />
          <meshStandardMaterial color="#2a2030" />
        </mesh>
      )))}
      <Lair position={[0, 0, d / 2 + 2.5]} name={name} color={color} />
    </group>
  );
}

function FightRing() {
  const { x, z, size } = PLACES.ring;
  const h = size / 2;
  return (
    <group position={[x, CURB, z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#2a4d8f" roughness={0.9} />
      </mesh>
      {[[-h, -h], [h, -h], [h, h], [-h, h]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.9, pz]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 1.8, 8]} />
          <meshStandardMaterial color={i % 2 ? "#c0392b" : "#2a4d8f"} />
        </mesh>
      ))}
      {[0.7, 1.15, 1.6].map(y => [0, 1, 2, 3].map(side => {
        const horizontal = side % 2 === 0;
        const off = side < 2 ? -h : h;
        return (
          <mesh key={`${y}${side}`} position={horizontal ? [0, y, off] : [off, y, 0]} rotation={horizontal ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, size, 6]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
        );
      }))}
      <Sign text="Ring de Don Rufo" position={[0, 6, 0]} color="#ff5050" icon="🥊" />
    </group>
  );
}

function Scrapyard() {
  const { x, z, w, d } = PLACES.scrapyard;
  const wrecks = useMemo(() => [
    [-8, -4, 0.3, "#7a4a2a"], [-4, 3, 1.2, "#5a5f66"], [3, -5, 2.1, "#8a3a2a"], [7, 2, 0.8, "#6a6a40"], [0, 5, 2.6, "#4a5560"],
  ] as Array<[number, number, number, string]>, []);
  return (
    <group position={[x, CURB, z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#5b5348" roughness={1} />
      </mesh>
      {wrecks.map(([wx, wz, rot, c], i) => (
        <group key={i} position={[wx, 0, wz]} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[2, 1, 4.2]} /><meshStandardMaterial color={c} roughness={0.95} metalness={0.3} /></mesh>
          {i % 2 === 0 && <mesh position={[0, 1.7, 0.2]} rotation={[0, 0.4, 0.08]} castShadow><boxGeometry args={[1.9, 0.9, 4]} /><meshStandardMaterial color="#6e5a48" roughness={0.95} /></mesh>}
        </group>
      ))}
      <KitModel name="kk_dumpster" position={[-10, 0, 5]} scale={5} />
      <KitModel name="kk_box_A" position={[9, 0, -5]} scale={5} />
      <Sign text="Desguace del Chatarrero" position={[0, 7, 0]} color="#7fb3ff" icon="🔧" scale={1.2} />
    </group>
  );
}

function IceTower() {
  const { x, z, h, arena, name, color } = PLACES.iceTower;
  const crystals = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    return { x: arena[0] + Math.cos(a) * 11, z: arena[2] + Math.sin(a) * 9, s: 1.2 + (i % 3) * 0.5, r: a };
  }), [arena]);
  return (
    <group>
      <Sign text={name} position={[x, h + 8, z]} color={color} icon="🧊" scale={2} />
      <mesh position={[arena[0], CURB + 0.02, arena[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[13, 40]} />
        <meshStandardMaterial color="#bfe6f5" roughness={0.15} metalness={0.2} />
      </mesh>
      {crystals.map((c, i) => (
        <mesh key={i} position={[c.x, CURB + c.s, c.z]} rotation={[0.2, c.r, 0.1]} castShadow>
          <octahedronGeometry args={[c.s, 0]} />
          <meshStandardMaterial color="#9fdcff" emissive="#5ac8ff" emissiveIntensity={0.9} metalness={0.6} roughness={0.2} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function ClubDiamante() {
  const owned = useGame(s => !!s.ownedBusinesses.club);
  const { facade, terrace, stage, bar, dj } = PLACES.club;
  const neonLights = useRef<THREE.PointLight[]>([]);
  const ball = useRef<THREE.Mesh>(null!);
  const strip = useNeon(10);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const on = 0.35 + runtime.night * 0.65;
    neonLights.current.forEach((l, i) => { if (l) l.intensity = on * (12 + Math.sin(t * 3 + i * 1.7) * 6); });
    if (ball.current) ball.current.rotation.y = t * 0.8;
  });
  const front = facade.z - facade.d / 2;  // street-facing wall of the club building
  const t0 = terrace.z - terrace.d / 2;   // terrace entrance (south)
  const fenceH = 1.1;
  return (
    <group position={[0, CURB, 0]}>
      {/* club building */}
      <mesh position={[facade.x, facade.h / 2, facade.z]} castShadow receiveShadow>
        <boxGeometry args={[facade.w, facade.h, facade.d]} />
        <meshStandardMaterial color="#2a1533" roughness={0.45} metalness={0.35} />
      </mesh>
      {/* glazed lounge window and the lit doorway on the street side */}
      <mesh position={[facade.x - 5, 4.6, front - 0.06]}>
        <planeGeometry args={[9, 3.2]} />
        <meshStandardMaterial color="#1b0f2a" emissive="#ff4fb0" emissiveIntensity={0.35} metalness={0.6} roughness={0.15} />
      </mesh>
      <mesh position={[facade.x + 5, 4.6, front - 0.06]}>
        <planeGeometry args={[9, 3.2]} />
        <meshStandardMaterial color="#1b0f2a" emissive="#28e0ff" emissiveIntensity={0.3} metalness={0.6} roughness={0.15} />
      </mesh>
      <mesh position={[facade.x, 1.5, front - 0.06]}>
        <planeGeometry args={[2.6, 3]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffb35c" emissiveIntensity={0.9} />
      </mesh>
      {/* terrace floor and red carpet */}
      <mesh position={[terrace.x, 0.03, terrace.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[terrace.w, terrace.d]} />
        <meshStandardMaterial color="#1a0f24" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[terrace.x, 0.04, t0 - 1.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 2.8]} />
        <meshStandardMaterial color="#8a0f1f" roughness={0.9} />
      </mesh>
      {[-2.6, 2.6].map(dx => [0.4, 2.2].map(dz => (
        <mesh key={`${dx}${dz}`} position={[terrace.x + dx, 0.5, t0 - dz]} castShadow>
          <cylinderGeometry args={[0.06, 0.1, 1, 8]} />
          <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
        </mesh>
      )))}
      {/* neon fence with a gap at the entrance */}
      {([
        [terrace.x - terrace.w / 2, terrace.z, 0.3, terrace.d],
        [terrace.x + terrace.w / 2, terrace.z, 0.3, terrace.d],
        [terrace.x - terrace.w / 4 - 1.5, t0, terrace.w / 2 - 3, 0.3],
        [terrace.x + terrace.w / 4 + 1.5, t0, terrace.w / 2 - 3, 0.3],
      ] as Array<[number, number, number, number]>).map(([fx, fz, w, d], i) => (
        <group key={i}>
          <mesh position={[fx, fenceH / 2, fz]} castShadow receiveShadow>
            <boxGeometry args={[w, fenceH, d]} />
            <meshStandardMaterial color="#2a1a35" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[fx, fenceH + 0.05, fz]}>
            <boxGeometry args={[w + 0.05, 0.08, d + 0.05]} />
            {strip(i, i % 2 ? "#ff2d95" : "#28e0ff")}
          </mesh>
        </group>
      ))}
      {/* stage with poles and a mirror ball */}
      <mesh position={[stage[0], 0.3, stage[2]]} castShadow receiveShadow>
        <cylinderGeometry args={[3.6, 3.8, 0.6, 32]} />
        <meshStandardMaterial color="#3a1f4a" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[stage[0], 0.61, stage[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.6, 32]} />
        {strip(4, "#ff2d95")}
      </mesh>
      {[-2.2, 2.2].map(dx => (
        <mesh key={dx} position={[stage[0] + dx, 2.3, stage[2]]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 3.4, 10]} />
          <meshStandardMaterial color="#e8e8f0" metalness={1} roughness={0.15} />
        </mesh>
      ))}
      <mesh ref={ball} position={[stage[0], 4.8, stage[2]]} castShadow>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} flatShading />
      </mesh>
      {/* bar and DJ booth (their footprints collide) */}
      <mesh position={[bar[0], 0.6, bar[2]]} castShadow><boxGeometry args={[5, 1.2, 2]} /><meshStandardMaterial color="#2a1a2a" /></mesh>
      <mesh position={[bar[0], 1.25, bar[2]]}><boxGeometry args={[5.1, 0.1, 2.1]} />{strip(5, "#28e0ff")}</mesh>
      {[-1.6, -0.5, 0.6, 1.7].map((dx, i) => (
        <mesh key={dx} position={[bar[0] + dx, 1.5, bar[2] + 0.6]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
          <meshStandardMaterial color={["#3aa", "#fa3", "#a3f", "#3f8"][i]} transparent opacity={0.85} />
        </mesh>
      ))}
      <mesh position={[dj[0], 0.6, dj[2]]} castShadow><boxGeometry args={[4, 1.2, 2]} /><meshStandardMaterial color="#2a1a2a" /></mesh>
      <mesh position={[dj[0], 1.25, dj[2]]}><boxGeometry args={[4.1, 0.1, 2.1]} />{strip(6, "#ff2d95")}</mesh>
      {[-1.2, 1.2].map(dx => (
        <mesh key={dx} position={[dj[0] + dx, 2.1, dj[2] - 0.4]} castShadow>
          <boxGeometry args={[0.9, 1.2, 0.5]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      {/* tables and stools */}
      {[[-8, 41], [8, 41], [-6, 31.5], [7.5, 29.5]].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.08, 0.12, 1, 8]} /><meshStandardMaterial color="#c0c0c0" metalness={0.8} /></mesh>
          <mesh position={[0, 1, 0]} castShadow><cylinderGeometry args={[0.7, 0.7, 0.06, 16]} /><meshStandardMaterial color="#2a2a30" metalness={0.5} roughness={0.2} /></mesh>
          {[0, 1, 2].map(k => (
            <mesh key={k} position={[Math.cos(k * 2.1) * 1.1, 0.3, Math.sin(k * 2.1) * 1.1]} castShadow>
              <cylinderGeometry args={[0.25, 0.25, 0.6, 10]} />
              <meshStandardMaterial color="#5a1f4a" />
            </mesh>
          ))}
        </group>
      ))}
      {/* facade neon and signs */}
      {[-facade.w / 2 + 0.5, facade.w / 2 - 0.5].map((dx, i) => (
        <mesh key={i} position={[facade.x + dx, facade.h / 2, front - 0.1]}>
          <boxGeometry args={[0.15, facade.h - 0.4, 0.15]} />
          {strip(7 + i, "#ff2d95")}
        </mesh>
      ))}
      <mesh position={[facade.x, facade.h - 0.2, front - 0.1]}>
        <boxGeometry args={[facade.w - 0.5, 0.15, 0.15]} />
        {strip(9, "#28e0ff")}
      </mesh>
      <Sign text="CLUB DIAMANTE" position={[facade.x, facade.h + 2.5, front]} color="#ff2d95" icon="💎" scale={2.2} />
      {owned && <Sign text="Propiedad de Shopy Crafter" position={[facade.x, facade.h + 4.5, front]} color="#ffd700" scale={1.2} />}
      {[["#ff2d95", -8, 4, -2], ["#28e0ff", 8, 4, -2], ["#ff2d95", 0, 5, 6], ["#a13cff", -10, 3, 6], ["#28e0ff", 10, 3, 6]].map(([c, dx, y, dz], i) => (
        <pointLight key={i} ref={el => { if (el) neonLights.current[i] = el; }} position={[terrace.x + (dx as number), y as number, terrace.z + (dz as number)]} color={c as string} intensity={10} distance={22} decay={2} />
      ))}
      {[-13.5, 13.5].map(bx => <KitModel key={bx} name="kk_bush" position={[bx, 0, t0 - 1.5]} scale={5} />)}
    </group>
  );
}

export function World() {
  const t = PLACES.tuetanoLair;
  return (
    <group>
      <City />
      {Object.entries(CITY.props).map(([id, items]) =>
        items.length ? <InstancedProp key={id} id={id} items={items} shadows={id !== "hydrant" && id !== "trash_bin"} /> : null,
      )}
      <StreetLightPool />
      {BUSINESSES.map(b => <BusinessMarker key={b.id} id={b.id} />)}
      <HQ />
      <VendorKiosk />
      <ClubDiamante />
      <Helipad />
      <Lair position={[t.x, CURB, t.z]} name={t.name} color={t.color} />
      <KitModel name="kk_watertower" position={[116, 17.5, -102]} scale={5} />
      <FightRing />
      <Stronghold {...PLACES.crimsonFort} />
      <Stronghold {...PLACES.shadowBastion} />
      <Scrapyard />
      <IceTower />
    </group>
  );
}

useGLTF.preload(CITY_MODEL);
Object.keys(CITY.props).forEach(id => useGLTF.preload(propModel(id)));
