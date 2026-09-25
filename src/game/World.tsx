// ─────────────────────────────────────────────────────────────────────────────
// La ciudad: suelo, calles, aceras, edificios con ventanas, parques, farolas,
// HQ, helipuerto, guaridas, kiosco, marcadores de negocios y horizonte.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUSINESSES, CITY_BUILDINGS, SPECIAL_BUILDINGS, PARKS, ROAD_LINES, WORLD, blockCenter, CLUB,
  MAX_BUSINESS_LEVEL, type BuildingDef,
} from "../lib/gameData";
import { KitModel, KitInstances, type KitTransform } from "./KitModel";
import { useGame, formatMoney } from "../lib/gameStore";
import { runtime } from "../lib/world";
import { windowTexture, asphaltTexture, sidewalkTexture, grassTexture, textTexture } from "../lib/textures";

// Materiales de fachada compartidos; su emisión se ajusta con la noche.
const facadeMaterials: THREE.MeshStandardMaterial[] = [];
const facadeCache = new Map<string, THREE.MeshStandardMaterial>();

function facadeMaterial(color: string, style: number) {
  const key = `${color}|${style}`;
  let m = facadeCache.get(key);
  if (!m) {
    const { map, emissive } = windowTexture(style);
    m = new THREE.MeshStandardMaterial({ color, map, emissiveMap: emissive, emissive: new THREE.Color("#ffd9a0"), emissiveIntensity: 0, roughness: 0.7, metalness: 0.1 });
    facadeCache.set(key, m);
    facadeMaterials.push(m);
  }
  return m;
}

function Building({ b }: { b: BuildingDef }) {
  if (b.kit) return <KitModel name={b.kit} position={[b.x, 0, b.z]} rotation={b.rotation ?? 0} scale={b.kitScale ?? 1} />;
  return <BoxBuilding b={b} />;
}

function BoxBuilding({ b }: { b: BuildingDef }) {
  const mat = useMemo(() => facadeMaterial(b.color, b.style), [b.color, b.style]);
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d);
    // Repetición de la textura por cara según tamaño (4 unidades por baldosa)
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const faces = [b.d, b.d, b.w, b.w, b.w, b.w]; // +x,-x,+y,-y,+z,-z
    for (let f = 0; f < 6; f++) {
      const rx = Math.max(1, Math.round(faces[f] / 4));
      const ry = f === 2 || f === 3 ? Math.max(1, Math.round(b.d / 4)) : Math.max(1, Math.round(b.h / 4));
      for (let i = 0; i < 4; i++) {
        const idx = f * 4 + i;
        uv.setXY(idx, uv.getX(idx) * rx, uv.getY(idx) * ry);
      }
    }
    uv.needsUpdate = true;
    return g;
  }, [b.w, b.h, b.d]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh geometry={geo} material={mat} position={[0, b.h / 2, 0]} castShadow receiveShadow />
      {/* Cornisa */}
      <mesh position={[0, b.h + 0.15, 0]} receiveShadow>
        <boxGeometry args={[b.w + 0.4, 0.3, b.d + 0.4]} />
        <meshStandardMaterial color="#2c2f38" roughness={0.9} />
      </mesh>
      {b.roof === "antenna" && (
        <mesh position={[0, b.h + 3, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.2, 6, 6]} />
          <meshStandardMaterial color="#bbb" metalness={0.8} roughness={0.3} />
        </mesh>
      )}
      {b.roof === "antenna" && <AntennaLight y={b.h + 6} />}
    </group>
  );
}

function AntennaLight({ y }: { y: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + Math.sin(clock.elapsedTime * 3) * 1;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <sphereGeometry args={[0.25, 8, 8]} />
      <meshStandardMaterial color="#ff2222" emissive="#ff2222" emissiveIntensity={1.5} />
    </mesh>
  );
}

function Roads() {
  const asphalt = useMemo(() => asphaltTexture(), []);
  const len = WORLD.blockSize * WORLD.blocksPerSide + WORLD.blockSize + 20;
  const texX = useMemo(() => { const t = asphalt.clone(); t.needsUpdate = true; t.repeat.set(1, len / 10); t.rotation = 0; return t; }, [asphalt, len]);
  const texZ = useMemo(() => { const t = asphalt.clone(); t.needsUpdate = true; t.repeat.set(1, len / 10); t.rotation = Math.PI / 2; t.center.set(0.5, 0.5); return t; }, [asphalt, len]);
  return (
    <group>
      {ROAD_LINES.map(x => (
        <mesh key={`rz${x}`} position={[x, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[WORLD.roadWidth, len]} />
          <meshStandardMaterial map={texX} roughness={0.95} />
        </mesh>
      ))}
      {ROAD_LINES.map(z => (
        <mesh key={`rx${z}`} position={[0, 0.021, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[len, WORLD.roadWidth]} />
          <meshStandardMaterial map={texZ} roughness={0.95} />
        </mesh>
      ))}
      {/* Cruces sin marcas */}
      {ROAD_LINES.map(x => ROAD_LINES.map(z => (
        <mesh key={`c${x}_${z}`} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[WORLD.roadWidth, WORLD.roadWidth]} />
          <meshStandardMaterial color="#2b2b33" roughness={0.95} />
        </mesh>
      )))}
    </group>
  );
}

function Sidewalks() {
  const tex = useMemo(() => { const t = sidewalkTexture(); t.repeat.set(8, 8); return t; }, []);
  const half = Math.floor(WORLD.blocksPerSide / 2);
  const blocks: Array<[number, number]> = [];
  for (let i = -half; i <= half; i++) for (let j = -half; j <= half; j++) blocks.push([i, j]);
  const parkKeys = new Set(PARKS.map(p => `${p[0]},${p[2]}`));
  return (
    <group>
      {blocks.map(([i, j]) => {
        const [x, , z] = blockCenter(i, j);
        if (parkKeys.has(`${x},${z}`)) return null;
        return (
          <mesh key={`${i},${j}`} position={[x, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[WORLD.blockSize - WORLD.roadWidth, WORLD.blockSize - WORLD.roadWidth]} />
            <meshStandardMaterial map={tex} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 3.2, 7]} />
        <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <sphereGeometry args={[2, 9, 7]} />
        <meshStandardMaterial color="#2f7a2f" roughness={0.85} />
      </mesh>
      <mesh position={[0.8, 3.4, 0.5]} castShadow>
        <sphereGeometry args={[1.3, 8, 6]} />
        <meshStandardMaterial color="#3a8f34" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Park({ center }: { center: [number, number, number] }) {
  const grass = useMemo(() => { const t = grassTexture(); t.repeat.set(6, 6); return t; }, []);
  const trees: Array<[number, number, number]> = [[-10, 0, -10], [10, 0, -10], [-10, 0, 10], [10, 0, 10], [0, 0, -11], [11, 0, 0], [-11, 0, 0], [0, 0, 11]];
  return (
    <group position={center}>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial map={grass} roughness={0.95} />
      </mesh>
      {/* Caminos */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3, 30]} />
        <meshStandardMaterial color="#b9a78a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[3, 30]} />
        <meshStandardMaterial color="#b9a78a" roughness={0.95} />
      </mesh>
      {/* Fuente (Kenney) */}
      <KitModel name="ke_pavement-fountain" position={[0, 0.05, 0]} scale={8} />
      {trees.map((t, i) => <Tree key={i} position={t} scale={0.9 + (i % 3) * 0.15} />)}
      {/* Bancos y papeleras (KayKit) */}
      {[[-5, 6, 0], [5, 6, Math.PI], [6, -5, Math.PI / 2], [-6, -5, -Math.PI / 2]].map(([x, z, r], i) => (
        <KitModel key={i} name="kk_bench" position={[x, 0.05, z]} rotation={r} scale={5} />
      ))}
      {[[-3, 8], [8, 3]].map(([x, z], i) => <KitModel key={`t${i}`} name="kk_trash_A" position={[x, 0.05, z]} scale={5} />)}
    </group>
  );
}

function StreetTrees() {
  const half = Math.floor(WORLD.blocksPerSide / 2);
  const parkKeys = useMemo(() => new Set(PARKS.map(p => `${p[0]},${p[2]}`)), []);
  const { short, tall, hydrants, dumpsters, lights } = useMemo(() => {
    const short: KitTransform[] = [], tall: KitTransform[] = [], hydrants: KitTransform[] = [], dumpsters: KitTransform[] = [], lights: KitTransform[] = [];
    const off = WORLD.blockSize / 2 - WORLD.roadWidth / 2 - 1.9;
    let i = 0;
    for (let bi = -half; bi <= half; bi++) for (let bj = -half; bj <= half; bj++) {
      const [x, , z] = blockCenter(bi, bj);
      if (parkKeys.has(`${x},${z}`) || (bi === 0 && bj === 0) || (bi === -1 && bj === 2)) continue;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const t = { x: x + sx * off, z: z + sz * off, rotation: (i % 4) * Math.PI / 2 };
        (i % 3 === 0 ? tall : short).push(t);
        i++;
      }
      if ((bi + bj) % 2 === 0) hydrants.push({ x: x - off - 1.2, z: z + 4, rotation: Math.PI / 2 });
      if ((bi * 3 + bj) % 4 === 0) dumpsters.push({ x: x + off + 0.2, z: z - 6, rotation: Math.PI / 2 });
    }
    // Semáforos en los cruces
    for (const lx of ROAD_LINES) for (const lz of ROAD_LINES) {
      lights.push({ x: lx + 5.6, z: lz - 5.6, rotation: 0 });
      lights.push({ x: lx - 5.6, z: lz + 5.6, rotation: Math.PI });
    }
    return { short, tall, hydrants, dumpsters, lights };
  }, [half, parkKeys]);
  return (
    <group>
      <KitInstances name="ke_grass-trees" transforms={short} scale={3.6} />
      <KitInstances name="ke_grass-trees-tall" transforms={tall} scale={3.6} />
      <KitInstances name="kk_firehydrant" transforms={hydrants} scale={5} />
      <KitInstances name="kk_dumpster" transforms={dumpsters} scale={5} />
      <KitInstances name="kk_trafficlight_A" transforms={lights} scale={5} />
    </group>
  );
}

const LAMP_LIGHT_COUNT = 10;

function StreetLights() {
  const lights = useRef<THREE.PointLight[]>([]);
  const lightAcc = useRef(1);
  const transforms = useMemo(() => {
    const out: KitTransform[] = [];
    const half = Math.floor(WORLD.blocksPerSide / 2);
    for (const line of ROAD_LINES) {
      for (let k = -half; k <= half; k++) {
        const c = k * WORLD.blockSize;
        out.push({ x: line + WORLD.roadWidth / 2 + 0.9, z: c + 8, rotation: 0 });            // brazo hacia -x (la calle)
        out.push({ x: c + 8, z: line + WORLD.roadWidth / 2 + 0.9, rotation: -Math.PI / 2 }); // brazo hacia -z
      }
    }
    return out;
  }, []);
  const positions = useMemo(() => transforms.map(t => [t.x, 0, t.z] as [number, number, number]), [transforms]);
  useFrame((_, dt) => {
    lightAcc.current += dt;
    if (lightAcc.current > 0.3) {
      lightAcc.current = 0;
      const p = runtime.player.pos;
      const nearest = positions
        .map(pos => ({ pos, d: (pos[0] - p.x) ** 2 + (pos[2] - p.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, LAMP_LIGHT_COUNT);
      nearest.forEach((n, i) => {
        const l = lights.current[i];
        if (l) l.position.set(n.pos[0] - 1, 4.4, n.pos[2]);
      });
    }
    for (const l of lights.current) if (l) l.intensity = runtime.night * 55;
  });
  return (
    <group>
      {Array.from({ length: LAMP_LIGHT_COUNT }).map((_, i) => (
        <pointLight key={i} ref={el => { if (el) lights.current[i] = el; }} position={[0, -50, 0]} intensity={0} distance={26} decay={2} color="#ffd98a" />
      ))}
      <KitInstances name="kk_streetlight" transforms={transforms} scale={5} />
    </group>
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
  return (
    <group position={b.pos}>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} ref={ring}>
        <ringGeometry args={[2.2, 3, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
      <mesh ref={beam} position={[0, 5, 0]}>
        <cylinderGeometry args={[0.35, 1.0, 10, 12, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <Sign text={label} position={[0, 7.5, 0]} color={color} icon={b.icon} />
      {/* Rótulo en fachada */}
      <Sign text={b.name} position={[0, b.size[1] + 2.5, -14]} color={b.color} icon={b.icon} scale={1.4} />
    </group>
  );
}

function HQ() {
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7fb3ff", metalness: 0.6, roughness: 0.15, transparent: true, opacity: 0.85 }), []);
  return (
    <group>
      {/* Plaza */}
      <mesh position={[0, 0.06, 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 40]} />
        <meshStandardMaterial color="#5a5f6e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.07, 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[9, 9.6, 40]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.3} />
      </mesh>
      {/* Bandas de cristal en el HQ */}
      {[10, 25, 40, 55].map(y => (
        <mesh key={y} position={[0, y, -4]} material={glass}>
          <boxGeometry args={[16.3, 3, 14.3]} />
        </mesh>
      ))}
      <Sign text="SHOPY HQ" position={[0, 76, -4]} color="#ffd700" icon="🏢" scale={2.2} />
      {/* Estatua */}
      <mesh position={[0, 1.2, 12]} castShadow>
        <boxGeometry args={[2.4, 2.4, 2.4]} />
        <meshStandardMaterial color="#8d949c" />
      </mesh>
      <mesh position={[0, 4, 12]} castShadow>
        <dodecahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} emissive="#ffb300" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Helipad() {
  const [x, , z] = WORLD.helipadPos;
  const rotor = useRef<THREE.Group>(null!);
  const complete = useGame(s => s.activeMissionId === "m12");
  useFrame((_, dt) => { if (rotor.current) rotor.current.rotation.y += dt * (complete ? 14 : 2); });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[12, 36]} />
        <meshStandardMaterial color="#3a3f4a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10.5, 11.5, 36]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.4, 8]} /><meshStandardMaterial color="#fff" /></mesh>
      <mesh position={[-3, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.4, 8]} /><meshStandardMaterial color="#fff" /></mesh>
      <mesh position={[3, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.4, 8]} /><meshStandardMaterial color="#fff" /></mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}><planeGeometry args={[1.4, 6]} /><meshStandardMaterial color="#fff" /></mesh>
      {/* Helicóptero */}
      <group position={[0, 0, -2]}>
        <mesh position={[0, 1.6, 0]} castShadow><sphereGeometry args={[1.6, 14, 10]} /><meshStandardMaterial color="#222" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, 1.7, 0.9]}><sphereGeometry args={[1.2, 12, 8]} /><meshStandardMaterial color="#9fd0ff" transparent opacity={0.7} roughness={0.1} /></mesh>
        <mesh position={[0, 1.8, -4]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.25, 0.5, 6, 8]} /><meshStandardMaterial color="#222" /></mesh>
        <mesh position={[0, 2.6, -6.6]} castShadow><boxGeometry args={[0.1, 1.4, 1]} /><meshStandardMaterial color="#ffd700" /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * 1.1, 0.25, 0]} castShadow><boxGeometry args={[0.15, 0.15, 4]} /><meshStandardMaterial color="#555" /></mesh>)}
        <group ref={rotor} position={[0, 3.35, 0]}>
          <mesh castShadow><boxGeometry args={[9, 0.08, 0.35]} /><meshStandardMaterial color="#444" /></mesh>
          <mesh castShadow rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[9, 0.08, 0.35]} /><meshStandardMaterial color="#444" /></mesh>
        </group>
      </group>
      <Sign text="Helipuerto" position={[0, 9, 0]} color="#7fd1ff" icon="🚁" />
    </group>
  );
}

function Lair({ position, name, color }: { position: [number, number, number]; name: string; color: string }) {
  return (
    <group position={position}>
      <Sign text={name} position={[0, 16, 0]} color={color} icon="☠️" scale={1.3} />
      {[-7, 7].map(x => (
        <mesh key={x} position={[x, 1.5, 8]} castShadow>
          <cylinderGeometry args={[0.25, 0.3, 3, 6]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
      {[-7, 7].map(x => (
        <mesh key={`f${x}`} position={[x, 3.2, 8]}>
          <sphereGeometry args={[0.45, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}

function VendorKiosk() {
  return (
    <group position={[-40, 0, 34]}>
      <mesh position={[0, 3.6, 0]} castShadow>
        <boxGeometry args={[7, 0.2, 5]} />
        <meshStandardMaterial color="#c0392b" />
      </mesh>
      {[[-3, 2.6], [3, 2.6], [-3, -2.6], [3, -2.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.8, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3.6, 6]} />
          <meshStandardMaterial color="#e8dcc0" />
        </mesh>
      ))}
      <mesh position={[0, 1.2, 2.3]} castShadow>
        <boxGeometry args={[6, 0.15, 0.9]} />
        <meshStandardMaterial color="#8a5a3a" />
      </mesh>
      <Sign text="Armería del Vendedor" position={[0, 5.6, 0]} color="#ff9f43" icon="🛒" />
    </group>
  );
}

function ClubDiamante() {
  const owned = useGame(s => !!s.ownedBusinesses.club);
  const neon = useRef<THREE.PointLight[]>([]);
  const ball = useRef<THREE.Mesh>(null!);
  const strips = useRef<THREE.MeshStandardMaterial[]>([]);
  const { terrace, stage, bar, dj, building } = CLUB;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const on = 0.35 + runtime.night * 0.65;
    neon.current.forEach((l, i) => { if (l) l.intensity = on * (12 + Math.sin(t * 3 + i * 1.7) * 6); });
    if (ball.current) ball.current.rotation.y = t * 0.8;
    strips.current.forEach((m, i) => { if (m) m.emissiveIntensity = on * (1.4 + Math.sin(t * 4 + i) * 0.6); });
  });
  const stripMat = (i: number, color: string) => (
    <meshStandardMaterial ref={el => { if (el) strips.current[i] = el; }} color={color} emissive={color} emissiveIntensity={1.5} />
  );
  const fenceH = 1.1;
  return (
    <group>
      {/* Suelo de la terraza */}
      <mesh position={[terrace.x, 0.06, terrace.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[terrace.w, terrace.d]} />
        <meshStandardMaterial color="#1a0f24" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Alfombra roja desde la calle */}
      <mesh position={[building[0], 0.07, terrace.z - terrace.d / 2 - 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 8]} />
        <meshStandardMaterial color="#8a0f1f" roughness={0.9} />
      </mesh>
      {/* Postes de cordón */}
      {[-2.6, 2.6].map(dx => [0, 3, 6].map(dz => (
        <mesh key={`${dx}${dz}`} position={[building[0] + dx, 0.5, terrace.z - terrace.d / 2 - 1 - dz]} castShadow>
          <cylinderGeometry args={[0.06, 0.1, 1, 8]} />
          <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.2} />
        </mesh>
      )))}
      {/* Valla con neón (hueco en la entrada) */}
      {([
        [terrace.x - terrace.w / 2, terrace.z, 0.3, terrace.d],
        [terrace.x + terrace.w / 2, terrace.z, 0.3, terrace.d],
        [terrace.x - terrace.w / 4 - 1.5, terrace.z - terrace.d / 2, terrace.w / 2 - 3, 0.3],
        [terrace.x + terrace.w / 4 + 1.5, terrace.z - terrace.d / 2, terrace.w / 2 - 3, 0.3],
      ] as Array<[number, number, number, number]>).map(([x, z, w, d], i) => (
        <group key={i}>
          <mesh position={[x, fenceH / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[w, fenceH, d]} />
            <meshStandardMaterial color="#2a1a35" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[x, fenceH + 0.05, z]}>
            <boxGeometry args={[w + 0.05, 0.08, d + 0.05]} />
            {stripMat(i, i % 2 ? "#ff2d95" : "#28e0ff")}
          </mesh>
        </group>
      ))}
      {/* Escenario con barras y bola de espejos */}
      <mesh position={[stage[0], 0.3, stage[2]]} castShadow receiveShadow>
        <cylinderGeometry args={[3.6, 3.8, 0.6, 32]} />
        <meshStandardMaterial color="#3a1f4a" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[stage[0], 0.61, stage[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.6, 32]} />
        {stripMat(4, "#ff2d95")}
      </mesh>
      {[-2.2, 2.2].map(dx => (
        <mesh key={dx} position={[stage[0] + dx, 2.3, stage[2]]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 3.4, 10]} />
          <meshStandardMaterial color="#e8e8f0" metalness={1} roughness={0.15} />
        </mesh>
      ))}
      <mesh position={[stage[0], 6.2, stage[2]]}>
        <cylinderGeometry args={[0.02, 0.02, 2.4, 6]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      <mesh ref={ball} position={[stage[0], 4.8, stage[2]]} castShadow>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} flatShading />
      </mesh>
      {/* Barra y cabina del DJ (encima de los bloques de colisión) */}
      <mesh position={[bar[0], 1.25, bar[2]]}>
        <boxGeometry args={[5.1, 0.1, 2.1]} />
        {stripMat(5, "#28e0ff")}
      </mesh>
      {[-1.6, -0.5, 0.6, 1.7].map(dx => (
        <mesh key={dx} position={[bar[0] + dx, 1.5, bar[2] - 0.6]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
          <meshStandardMaterial color={["#3aa", "#fa3", "#a3f", "#3f8"][Math.abs(Math.round(dx * 2)) % 4]} transparent opacity={0.85} />
        </mesh>
      ))}
      <mesh position={[dj[0], 1.25, dj[2]]}>
        <boxGeometry args={[4.1, 0.1, 2.1]} />
        {stripMat(6, "#ff2d95")}
      </mesh>
      {[-1.2, 1.2].map(dx => (
        <mesh key={dx} position={[dj[0] + dx, 2.1, dj[2] + 0.4]} castShadow>
          <boxGeometry args={[0.9, 1.2, 0.5]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      {/* Mesas y taburetes */}
      {[[-48, 80], [-32, 80], [-48, 71], [-33, 68.5]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
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
      {/* Neones de la fachada y rótulo */}
      {[-9.5, 9.5].map((dx, i) => (
        <mesh key={i} position={[building[0] + dx, 4.5, building[2] - 6.1]}>
          <boxGeometry args={[0.15, 8.6, 0.15]} />
          {stripMat(7 + i, "#ff2d95")}
        </mesh>
      ))}
      <mesh position={[building[0], 8.8, building[2] - 6.1]}>
        <boxGeometry args={[19.5, 0.15, 0.15]} />
        {stripMat(9, "#28e0ff")}
      </mesh>
      <Sign text="CLUB DIAMANTE" position={[building[0], 11.5, building[2] - 6]} color="#ff2d95" icon="💎" scale={2.2} />
      {owned && <Sign text="Propiedad de Shopy Crafter" position={[building[0], 13.5, building[2] - 6]} color="#ffd700" scale={1.2} />}
      {/* Luces de neón */}
      {[["#ff2d95", -8, 4, 74], ["#28e0ff", 8, 4, 74], ["#ff2d95", 0, 5, 82], ["#a13cff", -10, 3, 82], ["#28e0ff", 10, 3, 82]].map(([c, dx, y, z], i) => (
        <pointLight key={i} ref={el => { if (el) neon.current[i] = el; }} position={[terrace.x + (dx as number), y as number, z as number]} color={c as string} intensity={10} distance={22} decay={2} />
      ))}
      {/* Arbustos decorativos */}
      {[[-56, 66], [-24, 66], [-56, 86], [-24, 86]].map(([x, z], i) => <KitModel key={i} name="kk_bush" position={[x, 0.05, z]} scale={5} />)}
    </group>
  );
}

function Horizon() {
  const hills = useMemo(() => {
    const out: Array<{ a: number; r: number; h: number; w: number }> = [];
    for (let i = 0; i < 26; i++) out.push({ a: (i / 26) * Math.PI * 2, r: 270 + (i % 3) * 25, h: 30 + ((i * 13) % 7) * 8, w: 60 + ((i * 7) % 5) * 15 });
    return out;
  }, []);
  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={i} position={[Math.cos(h.a) * h.r, -2, Math.sin(h.a) * h.r]} receiveShadow>
          <coneGeometry args={[h.w, h.h, 7]} />
          <meshStandardMaterial color="#2c4a3a" roughness={1} />
        </mesh>
      ))}
      {/* Valla perimetral */}
      {[[0, -WORLD.bounds - 2, Math.PI / 2], [0, WORLD.bounds + 2, Math.PI / 2], [-WORLD.bounds - 2, 0, 0], [WORLD.bounds + 2, 0, 0]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 1, z]} rotation={[0, r, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.4, 2, WORLD.bounds * 2 + 4]} />
          <meshStandardMaterial color="#556" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function World() {
  const grass = useMemo(() => { const t = grassTexture(); t.repeat.set(80, 80); return t; }, []);

  useFrame(() => {
    const e = runtime.night * 1.1;
    for (const m of facadeMaterials) if (Math.abs(m.emissiveIntensity - e) > 0.01) m.emissiveIntensity = e;
  });

  return (
    <group>
      {/* Suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <Roads />
      <Sidewalks />
      {CITY_BUILDINGS.map((b, i) => <Building key={`c${i}`} b={b} />)}
      {SPECIAL_BUILDINGS.map((b, i) => <Building key={`s${i}`} b={b} />)}
      {BUSINESSES.map(b => <Building key={b.id} b={{ x: b.buildingPos[0], z: b.buildingPos[2], w: b.size[0], d: b.size[2], h: b.size[1], color: b.color, style: 1 }} />)}
      {BUSINESSES.map(b => <BusinessMarker key={`m${b.id}`} id={b.id} />)}
      {PARKS.map((p, i) => <Park key={i} center={p} />)}
      <StreetTrees />
      <StreetLights />
      <HQ />
      <Helipad />
      <VendorKiosk />
      <Lair position={[80, 0, -92]} name="Guarida de Tuétano" color="#ff3030" />
      <KitModel name="kk_watertower" position={[86, 12.3, -95]} scale={5} />
      <ClubDiamante />
      {/* Bancos de la plaza */}
      {[[-10, 16, 0.6], [10, 16, -0.6], [-12, 4, Math.PI / 2], [12, 4, -Math.PI / 2]].map(([x, z, r], i) => (
        <KitModel key={`pb${i}`} name="kk_bench" position={[x, 0.07, z]} rotation={r} scale={5} />
      ))}
      <Lair position={[-120, 0, 30]} name="Fortaleza Carmesí" color="#ff5050" />
      <Lair position={[120, 0, -90]} name="Bastión Sombrío" color="#c040ff" />
      <Lair position={[0, 0, -128]} name="Torre de Hielo" color="#5ac8ff" />
      <Horizon />
    </group>
  );
}
