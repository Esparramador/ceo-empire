import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BUSINESSES, MISSIONS } from "../lib/gameData";
import { useGame } from "../lib/gameStore";
import { CITY_MODEL, propModel } from "../lib/assets";
import { CITY, groundHeight, nightFactor, type PropInstance } from "../lib/city";
import { runtime } from "./runtime";

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
    const n = nightFactor(useGame.getState().dayTime);
    for (const e of night) e.mat.emissiveIntensity = e.day + (e.night - e.day) * n;
  });
  return <primitive object={scene} />;
}

/** Render every instance of a prop GLB with one InstancedMesh per sub-mesh. */
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
      items.forEach(([x, z, rot], i) => {
        q.setFromAxisAngle(up, rot);
        tmp.compose(new THREE.Vector3(x, groundHeight(x, z), z), q, new THREE.Vector3(1, 1, 1)).multiply(local);
        inst.setMatrixAt(i, tmp);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = shadows;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      return inst;
    });
  }, [scene, items, shadows]);

  useFrame(() => {
    if (!night.length) return;
    const n = nightFactor(useGame.getState().dayTime);
    for (const e of night) e.mat.emissiveIntensity = e.day + (e.night - e.day) * n;
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
    const n = nightFactor(useGame.getState().dayTime);
    timer.current -= delta;
    if (timer.current <= 0) {
      timer.current = 0.5;
      const p = runtime.player;
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

function Beacon({ color, height = 40, opacity = 0.18 }: { color: string; height?: number; opacity?: number }) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[0.9, 0.9, height, 16, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function BusinessMarker({ business }: { business: typeof BUSINESSES[0] }) {
  const owned = useGame(s => s.ownedBusinesses.includes(business.id));
  const ring = useRef<THREE.Mesh>(null!);
  const color = owned ? "#2dd49f" : "#ffd700";
  const y = groundHeight(business.pos[0], business.pos[2]);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.6;
  });
  return (
    <group position={[business.pos[0], y, business.pos[2]]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[2.4, 3, 48, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <Beacon color={color} height={owned ? 8 : 30} />
    </group>
  );
}

function MissionMarker({ mission }: { mission: typeof MISSIONS[0] }) {
  const active = useGame(s => s.activeMissionId === mission.id);
  const disc = useRef<THREE.Mesh>(null!);
  const y = groundHeight(mission.markerPos[0], mission.markerPos[2]);
  useFrame(({ clock }) => {
    if (disc.current) disc.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 2) * 0.25;
  });
  return (
    <group position={[mission.markerPos[0], y, mission.markerPos[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[2.5, 48]} />
        <meshBasicMaterial color={mission.color} transparent opacity={active ? 0.55 : 0.2} />
      </mesh>
      {active && (
        <>
          <mesh ref={disc}>
            <octahedronGeometry args={[0.6]} />
            <meshStandardMaterial color={mission.color} emissive={mission.color} emissiveIntensity={1.5} />
          </mesh>
          <Beacon color={mission.color} height={60} opacity={0.25} />
        </>
      )}
    </group>
  );
}

export function World() {
  return (
    <group>
      <City />
      {Object.entries(CITY.props).map(([id, items]) =>
        items.length ? <InstancedProp key={id} id={id} items={items} shadows={id !== "hydrant" && id !== "trash_bin"} /> : null,
      )}
      <StreetLightPool />
      {BUSINESSES.map(b => <BusinessMarker key={b.id} business={b} />)}
      {MISSIONS.map(m => <MissionMarker key={m.id} mission={m} />)}
    </group>
  );
}

useGLTF.preload(CITY_MODEL);
Object.keys(CITY.props).forEach(id => useGLTF.preload(propModel(id)));
