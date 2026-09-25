// ─────────────────────────────────────────────────────────────────────────────
// La ciudad: suelo, calles, aceras, edificios con ventanas, parques, farolas,
// HQ, helipuerto, guaridas, kiosco, marcadores de negocios y horizonte.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUSINESSES, CITY_BUILDINGS, SPECIAL_BUILDINGS, PARKS, ROAD_LINES, WORLD, blockCenter,
  MAX_BUSINESS_LEVEL, type BuildingDef,
} from "../lib/gameData";
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
      {/* Fuente */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3, 3.2, 0.8, 20]} />
        <meshStandardMaterial color="#8d949c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[2.7, 2.7, 0.1, 20]} />
        <meshStandardMaterial color="#3aa0d8" roughness={0.1} metalness={0.3} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.5, 1.6, 10]} />
        <meshStandardMaterial color="#9aa0a8" />
      </mesh>
      {trees.map((t, i) => <Tree key={i} position={t} scale={0.9 + (i % 3) * 0.15} />)}
      {/* Bancos */}
      {[[-5, 0, 5], [5, 0, -5]].map(([x, , z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[2, 0.12, 0.6]} /><meshStandardMaterial color="#7a4a2a" /></mesh>
          <mesh position={[0, 0.85, -0.25]} castShadow><boxGeometry args={[2, 0.5, 0.1]} /><meshStandardMaterial color="#7a4a2a" /></mesh>
        </group>
      ))}
    </group>
  );
}

function StreetTrees() {
  // Árboles en las esquinas de cada bloque (instanciados)
  const half = Math.floor(WORLD.blocksPerSide / 2);
  const parkKeys = new Set(PARKS.map(p => `${p[0]},${p[2]}`));
  const positions = useMemo(() => {
    const out: THREE.Vector3[] = [];
    const off = WORLD.blockSize / 2 - WORLD.roadWidth / 2 - 1.2;
    for (let i = -half; i <= half; i++) for (let j = -half; j <= half; j++) {
      const [x, , z] = blockCenter(i, j);
      if (parkKeys.has(`${x},${z}`) || (i === 0 && j === 0)) continue;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) out.push(new THREE.Vector3(x + sx * off, 0, z + sz * off));
    }
    return out;
  }, [half, parkKeys]);
  const trunk = useRef<THREE.InstancedMesh>(null!);
  const crown = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => {
      const s = 0.8 + ((i * 7) % 5) * 0.08;
      m.compose(new THREE.Vector3(p.x, 1.4 * s, p.z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      trunk.current.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, 3.6 * s, p.z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
      crown.current.setMatrixAt(i, m);
    });
    trunk.current.instanceMatrix.needsUpdate = true;
    crown.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, positions.length]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 2.8, 6]} />
        <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[undefined, undefined, positions.length]} castShadow>
        <sphereGeometry args={[1.7, 8, 6]} />
        <meshStandardMaterial color="#2e7a30" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

const LAMP_LIGHT_COUNT = 10;

function StreetLights() {
  const lights = useRef<THREE.PointLight[]>([]);
  const lightAcc = useRef(1);
  const positions = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    const half = Math.floor(WORLD.blocksPerSide / 2);
    for (const line of ROAD_LINES) {
      for (let k = -half; k <= half; k++) {
        const c = k * WORLD.blockSize;
        out.push([line + WORLD.roadWidth / 2 + 0.8, 0, c]);
        out.push([c, 0, line + WORLD.roadWidth / 2 + 0.8]);
      }
    }
    return out;
  }, []);
  const poles = useRef<THREE.InstancedMesh>(null!);
  const bulbs = useRef<THREE.InstancedMesh>(null!);
  const bulbMat = useRef<THREE.MeshStandardMaterial>(null!);
  useEffect(() => {
    const m = new THREE.Matrix4();
    positions.forEach((p, i) => {
      m.makeTranslation(p[0], 3.5, p[2]);
      poles.current.setMatrixAt(i, m);
      m.makeTranslation(p[0], 7.1, p[2]);
      bulbs.current.setMatrixAt(i, m);
    });
    poles.current.instanceMatrix.needsUpdate = true;
    bulbs.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  useFrame((_, dt) => {
    if (bulbMat.current) bulbMat.current.emissiveIntensity = 0.15 + runtime.night * 2.2;
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
        if (l) l.position.set(n.pos[0], 6.6, n.pos[2]);
      });
    }
    for (const l of lights.current) if (l) l.intensity = runtime.night * 55;
  });
  return (
    <group>
      {Array.from({ length: LAMP_LIGHT_COUNT }).map((_, i) => (
        <pointLight key={i} ref={el => { if (el) lights.current[i] = el; }} position={[0, -50, 0]} intensity={0} distance={26} decay={2} color="#ffd98a" />
      ))}
      <instancedMesh ref={poles} args={[undefined, undefined, positions.length]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 7, 6]} />
        <meshStandardMaterial color="#6a6f78" metalness={0.7} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[0.32, 8, 6]} />
        <meshStandardMaterial ref={bulbMat} color="#fff2c0" emissive="#ffd777" emissiveIntensity={0.2} />
      </instancedMesh>
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
      <Lair position={[-120, 0, 30]} name="Nido de Illidan" color="#3cff8a" />
      <Lair position={[120, 0, -90]} name="Templo Majin" color="#ff66cc" />
      <Lair position={[0, 0, -128]} name="Torre Exánime" color="#5ac8ff" />
      <Horizon />
    </group>
  );
}
