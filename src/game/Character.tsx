import { Component, Suspense, use, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { generatedCharacterModel, originalCharacterModel } from "../lib/assets";

/** Limb nodes exported by blender/characters.py, animated procedurally. */
export interface Rig {
  root: THREE.Object3D;
  legL?: THREE.Object3D;
  legR?: THREE.Object3D;
  armL?: THREE.Object3D;
  armR?: THREE.Object3D;
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function GltfCharacter({ url, onRig }: { url: string; onRig?: (rig: Rig) => void }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = cloneSkinned(scene);
    c.traverse(o => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    onRig?.({
      root: c,
      legL: c.getObjectByName("leg_L"),
      legR: c.getObjectByName("leg_R"),
      armL: c.getObjectByName("arm_L"),
      armR: c.getObjectByName("arm_R"),
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);
  return <primitive object={obj} />;
}

const probes = new Map<string, Promise<boolean>>();

/** Does `url` serve a real GLB? (Dev/preview servers answer missing files with index.html.) */
function probeGlb(url: string): Promise<boolean> {
  let p = probes.get(url);
  if (!p) {
    p = fetch(url, { method: "HEAD" })
      .then(r => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"))
      .catch(() => false);
    probes.set(url, p);
  }
  return p;
}

function ResolvedCharacter({ modelKey, onRig }: { modelKey: string; onRig?: (rig: Rig) => void }) {
  const original = originalCharacterModel(modelKey);
  const hasOriginal = use(probeGlb(original));
  return <GltfCharacter url={hasOriginal ? original : generatedCharacterModel(modelKey)} onRig={onRig} />;
}

/**
 * Loads the original character GLB when the project ships it, otherwise the
 * Blender-generated stand-in (public/assets/generated/characters).
 */
export function CharacterModel({ modelKey, onRig }: { modelKey: string; onRig?: (rig: Rig) => void }) {
  const generated = <GltfCharacter url={generatedCharacterModel(modelKey)} onRig={onRig} />;
  return (
    <ModelBoundary fallback={<Suspense fallback={null}>{generated}</Suspense>}>
      <Suspense fallback={null}>
        <ResolvedCharacter modelKey={modelKey} onRig={onRig} />
      </Suspense>
    </ModelBoundary>
  );
}

/** Walk cycle / idle / punch on the rig. `phase` advances with distance walked. */
export function animateRig(rig: Rig | null, phase: number, amount: number, punch = 0) {
  if (!rig) return;
  const s = Math.sin(phase) * 0.7 * amount;
  if (rig.legL) rig.legL.rotation.x = s;
  if (rig.legR) rig.legR.rotation.x = -s;
  if (rig.armL) rig.armL.rotation.x = -s * 0.8;
  if (rig.armR) rig.armR.rotation.x = s * 0.8 - punch * 1.6;
}
