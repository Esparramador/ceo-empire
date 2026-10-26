// ─────────────────────────────────────────────────────────────────────────────
// Carga de modelos del kit (public/assets/kit, CC0/MIT): instancias sueltas y
// mallas instanciadas para props repetidos (farolas, árboles, semáforos…).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const kitUrl = (name: string) => `${import.meta.env.BASE_URL}assets/kit/${name}.glb`;

function prepare(obj: THREE.Object3D) {
  obj.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
  });
  return obj;
}

/** Un modelo del kit colocado en el mundo (clon independiente). */
export function KitModel({ name, position, rotation = 0, scale = 1, shadow = true }: {
  name: string; position: [number, number, number]; rotation?: number; scale?: number; shadow?: boolean;
}) {
  const { scene } = useGLTF(kitUrl(name));
  const obj = useMemo(() => { const c = scene.clone(true); if (shadow) prepare(c); return c; }, [scene, shadow]);
  return <primitive object={obj} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

export interface KitTransform { x: number; y?: number; z: number; rotation?: number; scale?: number }

/** Varias copias de un modelo del kit como InstancedMesh (una por malla del modelo). */
export function KitInstances({ name, transforms, scale = 1 }: { name: string; transforms: KitTransform[]; scale?: number }) {
  const { scene } = useGLTF(kitUrl(name));
  const parts = useMemo(() => {
    const out: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 }> = [];
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) out.push({ geometry: m.geometry, material: m.material as THREE.Material, matrix: m.matrixWorld.clone() });
    });
    return out;
  }, [scene]);
  const refs = useRef<THREE.InstancedMesh[]>([]);
  useEffect(() => {
    const mat = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    parts.forEach((part, pi) => {
      const im = refs.current[pi];
      if (!im) return;
      transforms.forEach((t, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rotation ?? 0);
        const sc = (t.scale ?? 1) * scale;
        local.compose(v.set(t.x, t.y ?? 0, t.z), q, s.set(sc, sc, sc));
        mat.multiplyMatrices(local, part.matrix);
        im.setMatrixAt(i, mat);
      });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    });
  }, [parts, transforms, scale]);
  return (
    <group>
      {parts.map((part, i) => (
        <instancedMesh key={i} ref={el => { if (el) refs.current[i] = el; }} args={[part.geometry, part.material, transforms.length]} castShadow receiveShadow frustumCulled={false} />
      ))}
    </group>
  );
}

export const KIT_PRELOAD = [
  "kk_building_A", "kk_building_B", "kk_building_C", "kk_building_D", "kk_building_E", "kk_building_F", "kk_building_G", "kk_building_H",
  "ke_building-small-a", "ke_building-small-b", "ke_building-small-c", "ke_building-small-d", "ke_building-garage",
  "kk_car_sedan", "kk_car_taxi", "kk_car_hatchback", "kk_car_stationwagon", "kk_car_police",
  "kk_streetlight", "kk_bench", "kk_dumpster", "kk_firehydrant", "kk_trafficlight_A", "kk_bush", "kk_box_A", "kk_trash_A", "kk_watertower",
  "ke_pavement-fountain", "ke_grass-trees", "ke_grass-trees-tall",
];
for (const n of KIT_PRELOAD) useGLTF.preload(kitUrl(n));
