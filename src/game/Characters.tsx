// ─────────────────────────────────────────────────────────────────────────────
// Personajes 3D generados por código con detalle (cara, pelo, ropa, manos,
// accesorios y jefes reconocibles) y animación de caminar/ataque/muerte/daño.
// Si existe public/assets/models/<nombre>.glb (o .stl) se usa en su lugar.
// ─────────────────────────────────────────────────────────────────────────────
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import type { CharacterVariant } from "../lib/gameData";

export interface AnimState {
  moving: number;      // 0..1
  speedMul: number;    // 1 = andar, 2 = correr
  attack: number;      // 1 → 0 progreso del golpe
  dead: number;        // 0..1
  hitFlash: number;    // 0..1
}

export const makeAnim = (): AnimState => ({ moving: 0, speedMul: 1, attack: 0, dead: 0, hitFlash: 0 });

type Hat = "top" | "cap" | "beret" | "crown" | "helmet" | "police" | "none";
type Hair = "short" | "long" | "ponytail" | "slick" | "bald" | "spiky" | "white_long";

interface Look {
  skin: string; jacket: string; shirt: string; pants: string; shoes: string; hair: string; hairStyle: Hair; hat: Hat;
  tie?: string; lapels?: boolean; glasses?: boolean; cape?: string; horns?: boolean; wings?: boolean; antenna?: boolean;
  sword?: boolean; belly?: boolean; skirt?: boolean; metal?: boolean; eyes?: string; apron?: boolean; bones?: boolean;
  beard?: boolean; lipstick?: boolean; badge?: boolean; scar?: boolean; tattoos?: boolean; blindfold?: boolean; vest?: boolean;
  heels?: boolean; earrings?: boolean; scale?: number; belt?: string;
}

function hashColor(seed: string, s = 60, l = 45) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, ${s}%, ${l}%)`;
}
function hashPick<T>(seed: string, arr: T[]): T {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

const SKINS = ["#f1c9a5", "#e8b48a", "#d9a57c", "#c68642", "#8d5524", "#f3d5b5", "#a86f3d"];

export function lookFor(variant: CharacterVariant, seed = ""): Look {
  switch (variant) {
    case "alec":         return { skin: "#f1c9a5", jacket: "#151515", shirt: "#ffffff", pants: "#151515", shoes: "#1a1a1a", hair: "#2a1a10", hairStyle: "short", hat: "top", tie: "#d11a2a", lapels: true, belt: "#333" };
    case "formal":       return { skin: "#e8b48a", jacket: "#1f2d5a", shirt: "#e8f0ff", pants: "#1a2448", shoes: "#2a1a10", hair: "#1a1208", hairStyle: "slick", hat: "none", tie: "#b8860b", lapels: true, belt: "#3a2a1a" };
    case "ejecutiva":    return { skin: "#f3cdb0", jacket: "#3a3a44", shirt: "#f2f2f2", pants: "#2a2a30", shoes: "#111", hair: "#3b2313", hairStyle: "long", hat: "none", lapels: true, skirt: true, lipstick: true, heels: true, earrings: true };
    case "creativa":     return { skin: "#d9a57c", jacket: "#1fa39b", shirt: "#ffd166", pants: "#c2338f", shoes: "#fff", hair: "#111", hairStyle: "ponytail", hat: "beret", lipstick: true, earrings: true };
    case "casual_m":     return { skin: hashPick(seed + "s", SKINS), jacket: hashColor(seed + "p"), shirt: hashColor(seed + "p"), pants: hashPick(seed + "j", ["#2f4a7a", "#3a3a3a", "#5a4632", "#243a5a"]), shoes: "#222", hair: hashColor(seed + "h", 30, 20), hairStyle: hashPick(seed + "hs", ["short", "spiky", "bald", "slick"]), hat: hashPick(seed + "ht", ["none", "none", "cap"]), beard: hashPick(seed + "b", [true, false, false]) };
    case "casual_f":     return { skin: hashPick(seed + "s", SKINS), jacket: hashColor(seed + "p", 65, 55), shirt: hashColor(seed + "p", 65, 55), pants: hashPick(seed + "j", ["#39466b", "#222", "#6b3a5a", "#2b4a3a"]), shoes: "#333", hair: hashColor(seed + "h", 35, 25), hairStyle: hashPick(seed + "hs", ["long", "ponytail"]), hat: "none", lipstick: true, earrings: hashPick(seed + "e", [true, false]) };
    case "vendor":       return { skin: "#e0a878", jacket: "#6b4226", shirt: "#e8dcc0", pants: "#3a2a1a", shoes: "#2a1a10", hair: "#333", hairStyle: "short", hat: "cap", apron: true, beard: true };
    case "goon":         return { skin: hashPick(seed + "s", SKINS), jacket: "#151515", shirt: "#7a0f0f", pants: "#101010", shoes: "#0a0a0a", hair: "#000", hairStyle: "bald", hat: "none", glasses: true, scar: true, belt: "#444" };
    case "police":       return { skin: hashPick(seed + "s", SKINS), jacket: "#1c3f8f", shirt: "#1c3f8f", pants: "#14306e", shoes: "#111", hair: "#222", hairStyle: "short", hat: "police", badge: true, belt: "#111" };
    case "lord_tuetano": return { skin: "#ece6d8", jacket: "#ece6d8", shirt: "#ece6d8", pants: "#ece6d8", shoes: "#d8d2c4", hair: "#000", hairStyle: "bald", hat: "crown", cape: "#1a0a0a", bones: true, eyes: "#ff2020" };
    case "majin":        return { skin: "#f28cc0", jacket: "#2a2a2a", shirt: "#f28cc0", pants: "#f5f0d0", shoes: "#f5c400", hair: "#000", hairStyle: "bald", hat: "none", antenna: true, belly: true, eyes: "#111", vest: true, belt: "#2a2a2a" };
    case "illidan":      return { skin: "#7a4fb0", jacket: "#7a4fb0", shirt: "#7a4fb0", pants: "#221c2c", shoes: "#151020", hair: "#111", hairStyle: "long", hat: "none", horns: true, wings: true, eyes: "#3cff8a", tattoos: true, blindfold: true };
    case "arthas":       return { skin: "#cfd6e6", jacket: "#5e6b85", shirt: "#3a4560", pants: "#2c3448", shoes: "#3a4560", hair: "#e8e8f0", hairStyle: "white_long", hat: "helmet", cape: "#2a1a3a", sword: true, metal: true, eyes: "#5ac8ff", belt: "#4a5670" };
  }
}

function useMats(look: Look) {
  return useMemo(() => {
    const std = (color: string, extra?: Partial<THREE.MeshStandardMaterialParameters>) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04, ...extra });
    return {
      skin: std(look.skin, { roughness: 0.6 }),
      jacket: std(look.jacket, look.metal ? { metalness: 0.75, roughness: 0.3 } : { roughness: 0.8 }),
      shirt: std(look.shirt, { roughness: 0.7 }),
      pants: std(look.pants, { roughness: 0.85 }),
      shoes: std(look.shoes, { roughness: 0.4, metalness: 0.1 }),
      hair: std(look.hair, { roughness: 0.9 }),
      dark: std("#111", { roughness: 0.4 }),
      white: std("#f8f8f8", { roughness: 0.5 }),
      eyes: new THREE.MeshStandardMaterial({ color: look.eyes ?? "#111", emissive: look.eyes ?? "#000", emissiveIntensity: look.eyes ? 1.4 : 0, roughness: 0.3 }),
      gold: std("#ffd700", { metalness: 0.85, roughness: 0.25 }),
      accent: std(look.tie ?? "#c00", { roughness: 0.6 }),
      cape: std(look.cape ?? "#222", { roughness: 0.95, side: THREE.DoubleSide }),
      lips: std("#c0392b", { roughness: 0.5 }),
      glow: new THREE.MeshStandardMaterial({ color: "#3cff8a", emissive: "#3cff8a", emissiveIntensity: 1.5 }),
      ice: new THREE.MeshStandardMaterial({ color: "#9fdcff", emissive: "#5ac8ff", emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.2 }),
      belt: std(look.belt ?? "#333", { roughness: 0.5 }),
    };
  }, [look]);
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function rbox(w: number, h: number, d: number, r = 0.06) {
  const k = `${w}|${h}|${d}|${r}`;
  let g = geoCache.get(k);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2.2)); geoCache.set(k, g); }
  return g;
}

/** Personaje procedural detallado. `anim` es un objeto mutable actualizado cada frame por su propietario. */
export function ProceduralCharacter({ variant, seed = "", anim, scale = 1 }: { variant: CharacterVariant; seed?: string; anim: AnimState; scale?: number }) {
  const look = useMemo(() => lookFor(variant, seed), [variant, seed]);
  const m = useMats(look);
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const wingL = useRef<THREE.Group>(null!);
  const wingR = useRef<THREE.Group>(null!);
  const cape = useRef<THREE.Mesh>(null!);
  const t = useRef(Math.random() * 10);
  const flashMats = useMemo(() => [m.skin, m.jacket, m.shirt, m.pants, m.hair], [m]);

  useEffect(() => () => { Object.values(m).forEach(x => x.dispose()); }, [m]);

  useFrame((_, dt) => {
    const a = anim;
    t.current += dt * (a.moving > 0.05 ? 8 * a.speedMul : 1.6);
    const swing = Math.sin(t.current) * 0.8 * a.moving;
    const idle = Math.sin(t.current) * 0.04 * (1 - a.moving);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.85 + idle;
    if (armR.current) {
      const punch = a.attack > 0 ? -Math.sin(a.attack * Math.PI) * 1.9 : 0;
      armR.current.rotation.x = swing * 0.85 - idle + punch;
      armR.current.rotation.z = a.attack > 0 ? -Math.sin(a.attack * Math.PI) * 0.45 : -0.06;
    }
    if (torso.current) torso.current.rotation.x = a.moving * 0.08 + (a.attack > 0 ? Math.sin(a.attack * Math.PI) * 0.25 : 0);
    if (head.current) head.current.rotation.z = Math.sin(t.current * 0.5) * 0.03;
    if (body.current) body.current.position.y = Math.abs(Math.sin(t.current)) * 0.07 * a.moving + Math.sin(t.current * 0.5) * 0.012 * (1 - a.moving);
    if (wingL.current && wingR.current) {
      const flap = Math.sin(t.current * 0.7) * 0.25;
      wingL.current.rotation.y = 0.5 + flap; wingR.current.rotation.y = -0.5 - flap;
    }
    if (cape.current) cape.current.rotation.x = 0.15 + a.moving * 0.35 + Math.sin(t.current * 0.8) * 0.04;
    if (root.current) {
      root.current.rotation.x = -Math.PI / 2 * a.dead;
      root.current.position.y = -0.3 * a.dead;
    }
    const flash = a.hitFlash;
    for (const mat of flashMats) {
      if (flash > 0.01) { mat.emissive.setRGB(1, 0.1, 0.1); mat.emissiveIntensity = flash * 0.9; }
      else if (mat.emissiveIntensity !== 0) { mat.emissiveIntensity = 0; }
    }
  });

  const legH = 0.84, torsoH = 0.74, armH = 0.66;
  const torsoW = look.belly ? 0.9 : look.metal ? 0.78 : 0.62;
  const shoulderY = legH + torsoH - 0.05;
  const headY = legH + torsoH + 0.3;
  const R = 0.26; // radio de la cabeza

  const Leg = ({ side, ref }: { side: -1 | 1; ref: React.RefObject<THREE.Group> }) => (
    <group ref={ref} position={[side * 0.16, legH, 0]}>
      <mesh position={[0, -legH / 2 + 0.05, 0]} castShadow material={look.bones ? m.jacket : m.pants} geometry={look.bones ? rbox(0.14, legH - 0.1, 0.14, 0.05) : rbox(0.25, legH - 0.1, 0.25, 0.07)} />
      {look.bones && <mesh position={[0, -legH / 2, 0]} material={m.jacket}><sphereGeometry args={[0.1, 8, 6]} /></mesh>}
      <mesh position={[0, -legH + 0.07, 0.07]} castShadow material={m.shoes} geometry={rbox(0.27, look.heels ? 0.1 : 0.14, 0.4, 0.05)} />
      {look.heels && <mesh position={[0, -legH + 0.03, -0.12]} material={m.shoes}><cylinderGeometry args={[0.03, 0.03, 0.08, 6]} /></mesh>}
    </group>
  );

  const Arm = ({ side, ref }: { side: -1 | 1; ref: React.RefObject<THREE.Group> }) => (
    <group ref={ref} position={[side * (torsoW / 2 + 0.11), shoulderY, 0]}>
      {/* Hombro */}
      <mesh castShadow material={look.metal ? m.jacket : m.jacket}>
        <sphereGeometry args={[look.metal ? 0.2 : 0.13, 10, 8]} />
      </mesh>
      {look.metal && <mesh position={[side * 0.08, 0.1, 0]} castShadow material={m.jacket}><sphereGeometry args={[0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>}
      <mesh position={[0, -armH / 2, 0]} castShadow material={look.bones ? m.jacket : (look.vest ? m.skin : m.jacket)} geometry={rbox(look.bones ? 0.12 : 0.2, armH, look.bones ? 0.12 : 0.2, 0.06)} />
      {/* Puño de camisa */}
      {!look.bones && !look.vest && <mesh position={[0, -armH + 0.06, 0]} material={m.shirt} geometry={rbox(0.22, 0.06, 0.22, 0.02)} />}
      {/* Mano */}
      <mesh position={[0, -armH - 0.07, 0]} castShadow material={m.skin}>
        <sphereGeometry args={[0.1, 10, 8]} />
      </mesh>
      {look.tattoos && <mesh position={[0, -armH / 2, 0.11]} material={m.glow} geometry={rbox(0.08, 0.4, 0.01, 0.005)} />}
      {look.sword && side === 1 && (
        <group position={[0, -armH - 0.07, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0.85, 0]} castShadow material={m.ice} geometry={rbox(0.12, 1.7, 0.03, 0.01)} />
          <mesh position={[0, 0.85, 0.02]} material={m.glow} geometry={rbox(0.03, 1.3, 0.005, 0.002)} />
          <mesh position={[0, -0.02, 0]} material={m.gold} geometry={rbox(0.44, 0.08, 0.1, 0.02)} />
          <mesh position={[0, -0.16, 0]} material={m.dark}><cylinderGeometry args={[0.035, 0.035, 0.24, 8]} /></mesh>
          <mesh position={[0, -0.3, 0]} material={m.gold}><sphereGeometry args={[0.06, 8, 6]} /></mesh>
        </group>
      )}
    </group>
  );

  return (
    <group ref={root} scale={scale * (look.scale ?? 1)}>
      <group ref={body}>
        <Leg side={-1} ref={legL} />
        <Leg side={1} ref={legR} />
        {look.skirt && <mesh position={[0, legH - 0.12, 0]} castShadow material={m.pants} geometry={rbox(0.7, 0.4, 0.44, 0.08)} />}

        {/* Torso */}
        <group ref={torso} position={[0, legH, 0]}>
          {look.belly ? (
            <>
              <mesh position={[0, torsoH / 2 - 0.02, 0.02]} castShadow material={m.shirt}><sphereGeometry args={[0.5, 16, 12]} /></mesh>
              {look.vest && (
                <>
                  <mesh position={[-0.28, torsoH / 2 + 0.05, 0.3]} rotation={[0, -0.5, 0]} castShadow material={m.jacket} geometry={rbox(0.18, 0.6, 0.06, 0.02)} />
                  <mesh position={[0.28, torsoH / 2 + 0.05, 0.3]} rotation={[0, 0.5, 0]} castShadow material={m.jacket} geometry={rbox(0.18, 0.6, 0.06, 0.02)} />
                </>
              )}
              <mesh position={[0, 0.06, 0]} castShadow material={m.belt}><cylinderGeometry args={[0.48, 0.5, 0.1, 16]} /></mesh>
              <mesh position={[0, 0.06, 0.48]} material={m.gold} geometry={rbox(0.16, 0.1, 0.04, 0.02)} />
            </>
          ) : (
            <>
              {/* Camisa y chaqueta */}
              <mesh position={[0, torsoH / 2, 0]} castShadow material={look.bones ? m.jacket : m.shirt} geometry={rbox(torsoW - 0.04, torsoH, 0.34, 0.06)} />
              {!look.bones && (
                <>
                  <mesh position={[-torsoW / 4 - 0.02, torsoH / 2, 0.02]} castShadow material={m.jacket} geometry={rbox(torsoW / 2 - 0.02, torsoH, 0.38, 0.06)} />
                  <mesh position={[torsoW / 4 + 0.02, torsoH / 2, 0.02]} castShadow material={m.jacket} geometry={rbox(torsoW / 2 - 0.02, torsoH, 0.38, 0.06)} />
                </>
              )}
              {look.lapels && (
                <>
                  <mesh position={[-0.11, torsoH - 0.18, 0.2]} rotation={[0, 0, 0.35]} material={m.jacket} geometry={rbox(0.1, 0.3, 0.02, 0.01)} />
                  <mesh position={[0.11, torsoH - 0.18, 0.2]} rotation={[0, 0, -0.35]} material={m.jacket} geometry={rbox(0.1, 0.3, 0.02, 0.01)} />
                </>
              )}
              {look.tie && (
                <>
                  <mesh position={[0, torsoH - 0.1, 0.2]} material={m.accent} geometry={rbox(0.1, 0.08, 0.03, 0.01)} />
                  <mesh position={[0, torsoH - 0.32, 0.2]} material={m.accent} geometry={rbox(0.08, 0.38, 0.02, 0.01)} />
                </>
              )}
              {look.badge && <mesh position={[-0.14, torsoH - 0.16, 0.19]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}><cylinderGeometry args={[0.04, 0.04, 0.02, 6]} /></mesh>}
              {look.apron && <mesh position={[0, torsoH / 2 - 0.1, 0.19]} material={m.shirt} geometry={rbox(0.46, 0.55, 0.02, 0.01)} />}
              {look.belt && !look.skirt && <mesh position={[0, 0.05, 0]} material={m.belt} geometry={rbox(torsoW + 0.02, 0.08, 0.38, 0.02)} />}
              {look.belt && !look.skirt && <mesh position={[0, 0.05, 0.19]} material={m.gold} geometry={rbox(0.1, 0.07, 0.03, 0.01)} />}
              {look.bones && (
                <>
                  {[0.12, 0.28, 0.44, 0.6].map(y => (
                    <mesh key={y} position={[0, y, 0.16]} material={m.dark} geometry={rbox(0.5, 0.05, 0.03, 0.01)} />
                  ))}
                  <mesh position={[0, torsoH / 2, 0.17]} material={m.dark} geometry={rbox(0.06, torsoH - 0.1, 0.02, 0.01)} />
                </>
              )}
              {look.metal && (
                <>
                  <mesh position={[0, torsoH / 2 + 0.05, 0.2]} castShadow material={m.jacket} geometry={rbox(torsoW - 0.1, torsoH - 0.2, 0.06, 0.03)} />
                  <mesh position={[0, torsoH / 2 + 0.08, 0.24]} material={m.ice}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
                </>
              )}
              {look.tattoos && (
                <>
                  <mesh position={[-0.12, torsoH / 2 + 0.1, 0.18]} rotation={[0, 0, 0.4]} material={m.glow} geometry={rbox(0.05, 0.4, 0.01, 0.004)} />
                  <mesh position={[0.12, torsoH / 2 + 0.1, 0.18]} rotation={[0, 0, -0.4]} material={m.glow} geometry={rbox(0.05, 0.4, 0.01, 0.004)} />
                </>
              )}
            </>
          )}
          {/* Cuello */}
          <mesh position={[0, torsoH + 0.05, 0]} material={m.skin}><cylinderGeometry args={[0.09, 0.11, 0.14, 10]} /></mesh>
          {look.cape && (
            <mesh ref={cape} position={[0, torsoH - 0.02, -0.2]} castShadow material={m.cape}>
              <boxGeometry args={[0.86, 1.35, 0.04]} />
            </mesh>
          )}
          {look.wings && (
            <>
              <group ref={wingL} position={[-0.25, torsoH - 0.1, -0.2]}>
                <mesh position={[-0.55, 0.1, 0]} rotation={[0, 0, 0.25]} castShadow material={m.cape} geometry={rbox(1.1, 0.08, 0.05, 0.02)} />
                <mesh position={[-0.55, -0.3, 0]} castShadow material={m.cape}><planeGeometry args={[1.1, 0.8]} /></mesh>
                <mesh position={[-1.05, 0.25, 0]} material={m.dark}><coneGeometry args={[0.04, 0.2, 5]} /></mesh>
              </group>
              <group ref={wingR} position={[0.25, torsoH - 0.1, -0.2]}>
                <mesh position={[0.55, 0.1, 0]} rotation={[0, 0, -0.25]} castShadow material={m.cape} geometry={rbox(1.1, 0.08, 0.05, 0.02)} />
                <mesh position={[0.55, -0.3, 0]} castShadow material={m.cape}><planeGeometry args={[1.1, 0.8]} /></mesh>
                <mesh position={[1.05, 0.25, 0]} material={m.dark}><coneGeometry args={[0.04, 0.2, 5]} /></mesh>
              </group>
            </>
          )}
        </group>

        <Arm side={-1} ref={armL} />
        <Arm side={1} ref={armR} />

        {/* Cabeza */}
        <group ref={head} position={[0, headY, 0]}>
          <mesh castShadow material={m.skin}>
            {look.bones ? <primitive object={rbox(0.46, 0.5, 0.44, 0.1)} attach="geometry" /> : <sphereGeometry args={[R, 18, 14]} />}
          </mesh>
          {!look.bones && <mesh position={[0, -0.02, 0]} material={m.skin}><cylinderGeometry args={[R * 0.98, R * 0.9, 0.2, 18]} /></mesh>}
          {/* Orejas */}
          {!look.bones && [-1, 1].map(s => <mesh key={s} position={[s * R, 0, 0]} material={m.skin}><sphereGeometry args={[0.055, 8, 6]} /></mesh>)}
          {/* Ojos */}
          {look.bones ? (
            <>
              <mesh position={[-0.1, 0.06, 0.2]} material={m.dark} geometry={rbox(0.12, 0.12, 0.06, 0.02)} />
              <mesh position={[0.1, 0.06, 0.2]} material={m.dark} geometry={rbox(0.12, 0.12, 0.06, 0.02)} />
              <mesh position={[-0.1, 0.06, 0.24]} material={m.eyes}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
              <mesh position={[0.1, 0.06, 0.24]} material={m.eyes}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
              <mesh position={[0, -0.14, 0.2]} material={m.dark} geometry={rbox(0.24, 0.05, 0.04, 0.01)} />
              {[-0.08, -0.03, 0.03, 0.08].map(x => <mesh key={x} position={[x, -0.14, 0.22]} material={m.white} geometry={rbox(0.03, 0.06, 0.02, 0.005)} />)}
            </>
          ) : look.blindfold ? (
            <mesh position={[0, 0.04, 0.16]} material={m.dark} geometry={rbox(0.48, 0.1, 0.22, 0.02)} />
          ) : (
            <>
              {[-1, 1].map(s => (
                <group key={s} position={[s * 0.09, 0.04, R - 0.03]}>
                  <mesh material={m.white}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
                  <mesh position={[0, 0, 0.035]} material={m.eyes}><sphereGeometry args={[0.028, 8, 6]} /></mesh>
                  {/* Ceja */}
                  <mesh position={[0, 0.07, 0.01]} rotation={[0, 0, s * 0.15]} material={m.hair} geometry={rbox(0.09, 0.02, 0.02, 0.005)} />
                </group>
              ))}
              {/* Nariz y boca */}
              <mesh position={[0, -0.03, R - 0.01]} material={m.skin}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
              <mesh position={[0, -0.12, R - 0.05]} material={look.lipstick ? m.lips : m.dark} geometry={rbox(0.11, look.lipstick ? 0.035 : 0.02, 0.02, 0.008)} />
              {look.scar && <mesh position={[0.13, 0.0, R - 0.06]} rotation={[0, 0, 0.6]} material={m.lips} geometry={rbox(0.02, 0.18, 0.02, 0.005)} />}
              {look.glasses && (
                <>
                  <mesh position={[0, 0.04, R - 0.02]} material={m.dark} geometry={rbox(0.38, 0.09, 0.03, 0.01)} />
                  {[-1, 1].map(s => <mesh key={s} position={[s * 0.19, 0.04, R - 0.1]} rotation={[0, s * 0.3, 0]} material={m.dark} geometry={rbox(0.02, 0.03, 0.2, 0.005)} />)}
                </>
              )}
              {look.beard && <mesh position={[0, -0.13, 0.1]} material={m.hair}><sphereGeometry args={[0.2, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /></mesh>}
              {look.earrings && [-1, 1].map(s => <mesh key={s} position={[s * R, -0.06, 0]} material={m.gold}><sphereGeometry args={[0.025, 6, 6]} /></mesh>)}
            </>
          )}
          {/* Pelo */}
          {look.hairStyle === "short" && look.hat !== "top" && <mesh position={[0, 0.1, -0.02]} castShadow material={m.hair}><sphereGeometry args={[R + 0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1]} /></mesh>}
          {look.hairStyle === "slick" && <mesh position={[0, 0.1, -0.04]} castShadow material={m.hair}><sphereGeometry args={[R + 0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.4]} /></mesh>}
          {look.hairStyle === "spiky" && (
            <>
              <mesh position={[0, 0.1, -0.02]} castShadow material={m.hair}><sphereGeometry args={[R + 0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2]} /></mesh>
              {[-0.1, 0, 0.1].map(x => <mesh key={x} position={[x, R + 0.1, -0.02]} rotation={[0, 0, x * 2]} material={m.hair}><coneGeometry args={[0.05, 0.14, 5]} /></mesh>)}
            </>
          )}
          {(look.hairStyle === "long" || look.hairStyle === "white_long") && (
            <>
              {look.hat !== "helmet" && <mesh position={[0, 0.1, -0.02]} castShadow material={m.hair}><sphereGeometry args={[R + 0.03, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>}
              <mesh position={[0, -0.14, -0.14]} castShadow material={m.hair} geometry={rbox(0.5, 0.55, 0.2, 0.06)} />
              {[-1, 1].map(s => <mesh key={s} position={[s * 0.24, -0.06, 0.02]} castShadow material={m.hair} geometry={rbox(0.08, 0.5, 0.28, 0.03)} />)}
            </>
          )}
          {look.hairStyle === "ponytail" && (
            <>
              {look.hat !== "beret" && <mesh position={[0, 0.1, -0.02]} castShadow material={m.hair}><sphereGeometry args={[R + 0.03, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>}
              {look.hat === "beret" && <mesh position={[0, 0.06, -0.02]} castShadow material={m.hair}><sphereGeometry args={[R + 0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>}
              <mesh position={[0, -0.08, -0.3]} rotation={[0.5, 0, 0]} castShadow material={m.hair}><capsuleGeometry args={[0.07, 0.4, 4, 8]} /></mesh>
            </>
          )}
          {/* Sombreros */}
          {look.hat === "top" && (
            <>
              <mesh position={[0, 0.2, 0]} castShadow material={m.dark}><cylinderGeometry args={[0.38, 0.38, 0.04, 20]} /></mesh>
              <mesh position={[0, 0.46, 0]} castShadow material={m.dark}><cylinderGeometry args={[0.24, 0.25, 0.5, 20]} /></mesh>
              <mesh position={[0, 0.26, 0]} material={m.accent}><cylinderGeometry args={[0.255, 0.255, 0.07, 20]} /></mesh>
            </>
          )}
          {look.hat === "cap" && (
            <>
              <mesh position={[0, 0.12, 0]} castShadow material={m.pants}><sphereGeometry args={[R + 0.03, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
              <mesh position={[0, 0.14, 0.27]} castShadow material={m.pants} geometry={rbox(0.34, 0.03, 0.22, 0.01)} />
            </>
          )}
          {look.hat === "police" && (
            <>
              <mesh position={[0, 0.2, 0]} castShadow material={m.jacket}><cylinderGeometry args={[0.3, 0.27, 0.16, 18]} /></mesh>
              <mesh position={[0, 0.3, 0]} material={m.jacket}><cylinderGeometry args={[0.24, 0.3, 0.06, 18]} /></mesh>
              <mesh position={[0, 0.13, 0.28]} material={m.dark} geometry={rbox(0.4, 0.03, 0.2, 0.01)} />
              <mesh position={[0, 0.24, 0.27]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}><cylinderGeometry args={[0.05, 0.05, 0.02, 6]} /></mesh>
            </>
          )}
          {look.hat === "beret" && (
            <mesh position={[0.06, 0.2, 0]} rotation={[0, 0, -0.3]} castShadow material={m.accent}><cylinderGeometry args={[0.33, 0.27, 0.1, 18]} /></mesh>
          )}
          {look.hat === "crown" && (
            <group position={[0, 0.3, 0]}>
              <mesh material={m.gold}><cylinderGeometry args={[0.24, 0.26, 0.16, 8]} /></mesh>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <mesh key={i} position={[Math.cos(i / 8 * Math.PI * 2) * 0.24, 0.15, Math.sin(i / 8 * Math.PI * 2) * 0.24]} material={m.gold}><coneGeometry args={[0.05, 0.16, 4]} /></mesh>
              ))}
              <mesh position={[0, 0.1, 0.25]} material={m.lips}><sphereGeometry args={[0.04, 8, 6]} /></mesh>
            </group>
          )}
          {look.hat === "helmet" && (
            <>
              <mesh position={[0, 0.08, 0]} castShadow material={m.jacket}><sphereGeometry args={[R + 0.06, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.8]} /></mesh>
              <mesh position={[0, 0.02, 0.2]} material={m.jacket} geometry={rbox(0.5, 0.16, 0.2, 0.03)} />
              <mesh position={[0, 0.16, 0.26]} material={m.dark}><sphereGeometry args={[0.1, 8, 6]} /></mesh>
              {[-1, 1].map(s => <mesh key={s} position={[s * 0.26, 0.25, 0]} rotation={[0, 0, s * -0.55]} castShadow material={m.ice}><coneGeometry args={[0.05, 0.42, 6]} /></mesh>)}
            </>
          )}
          {look.horns && [-1, 1].map(s => (
            <group key={s} position={[s * 0.18, 0.18, 0]} rotation={[0, 0, s * -0.6]}>
              <mesh castShadow material={m.dark}><coneGeometry args={[0.06, 0.5, 8]} /></mesh>
              <mesh position={[0, 0.2, 0]} rotation={[0.4, 0, 0]} material={m.dark}><coneGeometry args={[0.035, 0.28, 8]} /></mesh>
            </group>
          ))}
          {look.antenna && (
            <mesh position={[0, 0.34, -0.06]} rotation={[0.55, 0, 0]} castShadow material={m.shirt}><capsuleGeometry args={[0.07, 0.4, 4, 10]} /></mesh>
          )}
        </group>
      </group>
    </group>
  );
}

// ── Soporte opcional de modelos GLB / STL ────────────────────────────────────
interface ModelConfig {
  /** full: cuerpo completo · bust: cortado por la cintura (se añaden piernas) · creature: flota */
  mode: "full" | "bust" | "creature";
  /** altura objetivo del modelo en metros (en modo bust, del busto) */
  height: number;
  /** giro para que el modelo mire hacia +Z (los de Tripo miran hacia +X) */
  yaw: number;
  /** anchura máxima (criaturas con alas) */
  maxWidth?: number;
  /** altura de flotación */
  hover?: number;
  /** fracción de la altura a recortar por abajo (peanas) */
  clipBottom?: number;
  /** escala de las piernas procedurales (modo bust) */
  legScale?: number;
}

const TRIPO_YAW = -Math.PI / 2;
export const MODEL_CONFIG: Record<string, ModelConfig> = {
  ceo_crafter:      { mode: "bust", height: 1.05, yaw: TRIPO_YAW, legScale: 1.0 },
  guerrero:         { mode: "bust", height: 1.5, yaw: TRIPO_YAW, legScale: 1.3 },
  guerrero_2:       { mode: "bust", height: 1.5, yaw: TRIPO_YAW, legScale: 1.3 },
  lord_tuetano:     { mode: "creature", height: 2.6, yaw: TRIPO_YAW, maxWidth: 4.6, hover: 0.9 },
  mini_dragon_blue: { mode: "full", height: 3.6, yaw: TRIPO_YAW, clipBottom: 0.11 },
};
const DEFAULT_CONFIG: ModelConfig = { mode: "full", height: 1.8, yaw: 0 };

const availability = new Map<string, Promise<boolean>>();

/** Comprueba una sola vez si existe un fichero real (no el index.html del fallback SPA). */
export function checkAsset(url: string): Promise<boolean> {
  let p = availability.get(url);
  if (!p) {
    p = fetch(url, { method: "HEAD" })
      .then(r => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"))
      .catch(() => false);
    availability.set(url, p);
  }
  return p;
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Piernas procedurales animadas para modelos cortados por la cintura. */
function ProceduralLegs({ look, anim, legScale }: { look: Look; anim: AnimState; legScale: number }) {
  const m = useMats(look);
  const legL = useRef<THREE.Group>(null!);
  const legR = useRef<THREE.Group>(null!);
  const t = useRef(Math.random() * 10);
  useEffect(() => () => { Object.values(m).forEach(x => x.dispose()); }, [m]);
  useFrame((_, dt) => {
    t.current += dt * (anim.moving > 0.05 ? 8 * anim.speedMul : 0);
    const swing = Math.sin(t.current) * 0.8 * anim.moving;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    const flash = anim.hitFlash;
    for (const mat of [m.pants, m.shoes]) {
      if (flash > 0.01) { mat.emissive.setRGB(1, 0.1, 0.1); mat.emissiveIntensity = flash * 0.9; }
      else if (mat.emissiveIntensity !== 0) mat.emissiveIntensity = 0;
    }
  });
  const legH = 0.84;
  return (
    <group scale={legScale}>
      <mesh position={[0, legH + 0.02, 0]} castShadow material={m.pants} geometry={rbox(0.62, 0.22, 0.4, 0.06)} />
      {([-1, 1] as const).map(side => (
        <group key={side} ref={side === -1 ? legL : legR} position={[side * 0.16, legH, 0]}>
          <mesh position={[0, -legH / 2 + 0.05, 0]} castShadow material={m.pants} geometry={rbox(0.27, legH - 0.1, 0.27, 0.07)} />
          <mesh position={[0, -legH + 0.07, 0.07]} castShadow material={m.shoes} geometry={rbox(0.29, 0.14, 0.42, 0.05)} />
        </group>
      ))}
    </group>
  );
}

function useModelMaterials(obj: THREE.Object3D) {
  return useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    obj.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true; mesh.receiveShadow = true;
      const arr = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of arr) if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) mats.push(mat as THREE.MeshStandardMaterial);
    });
    return mats;
  }, [obj]);
}

function GlbModel({ url, name, anim, scale, look }: { url: string; name: string; anim: AnimState; scale: number; look: Look }) {
  const cfg = MODEL_CONFIG[name] ?? DEFAULT_CONFIG;
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const root = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Group>(null!);
  const { actions, names } = useAnimations(animations, root);
  const mats = useModelMaterials(cloned);
  const t = useRef(Math.random() * 10);
  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3(); box.getSize(size);
    let s = cfg.height / (size.y || 1);
    if (cfg.maxWidth) s = Math.min(s, cfg.maxWidth / Math.max(size.x, size.z, 0.001));
    const legOffset = cfg.mode === "bust" ? 0.84 * (cfg.legScale ?? 1) - 0.06 : 0;
    return {
      s,
      x: -(box.min.x + box.max.x) / 2 * s,
      y: -box.min.y * s + legOffset + (cfg.hover ?? 0),
      z: -(box.min.z + box.max.z) / 2 * s,
      height: size.y * s,
    };
  }, [cloned, cfg]);

  useEffect(() => {
    if (cfg.clipBottom) for (const m of mats) { m.clippingPlanes = [clipPlane]; m.clipShadows = true; m.needsUpdate = true; }
    return () => { for (const m of mats) { m.clippingPlanes = null; m.emissiveIntensity = 0; } };
  }, [mats, cfg.clipBottom, clipPlane]);

  const current = useRef<string | null>(null);
  useFrame((_, dt) => {
    const a = anim;
    t.current += dt * (a.moving > 0.05 ? 8 * a.speedMul : 1.5);
    if (names.length) {
      const find = (k: string[]) => names.find(n => k.some(x => n.toLowerCase().includes(x)));
      const want = a.dead > 0 ? (find(["death", "die"]) ?? null)
        : a.attack > 0.5 ? (find(["attack", "punch", "hit"]) ?? null)
        : a.moving > 0.2 ? (find(["run", "walk"]) ?? names[0])
        : (find(["idle", "stand"]) ?? names[0]);
      if (want && want !== current.current) {
        if (current.current) actions[current.current]?.fadeOut(0.2);
        actions[want]?.reset().fadeIn(0.2).play();
        current.current = want;
      }
    } else if (bodyRef.current) {
      // Animación procedural para mallas estáticas
      const lunge = a.attack > 0 ? Math.sin(a.attack * Math.PI) : 0;
      if (cfg.mode === "creature") {
        bodyRef.current.position.y = Math.sin(t.current * 0.6) * 0.18;
        bodyRef.current.position.z = lunge * 0.7;
        bodyRef.current.rotation.x = a.moving * 0.18 + lunge * 0.3;
        bodyRef.current.rotation.z = Math.sin(t.current * 0.4) * 0.05;
      } else if (cfg.mode === "bust") {
        bodyRef.current.position.y = Math.abs(Math.sin(t.current)) * 0.07 * a.moving;
        bodyRef.current.rotation.x = a.moving * 0.06 + lunge * 0.35;
        bodyRef.current.rotation.y = Math.sin(t.current) * 0.06 * a.moving;
      } else {
        bodyRef.current.position.y = Math.abs(Math.sin(t.current)) * 0.12 * a.moving;
        bodyRef.current.rotation.x = lunge * 0.25;
        bodyRef.current.rotation.z = Math.sin(t.current) * 0.04 * a.moving;
        bodyRef.current.position.z = lunge * 0.5;
      }
    }
    if (root.current) {
      root.current.rotation.x = -Math.PI / 2 * a.dead;
      root.current.position.y = -0.3 * a.dead;
      if (cfg.clipBottom) {
        root.current.getWorldPosition(worldPos);
        clipPlane.constant = a.dead > 0 ? 1e6 : -(worldPos.y + cfg.clipBottom * fit.height * scale);
      }
    }
    const flash = a.hitFlash;
    for (const m of mats) {
      if (flash > 0.01) { m.emissive.setRGB(1, 0.1, 0.1); m.emissiveIntensity = flash; }
      else if (m.emissiveIntensity !== 0) m.emissiveIntensity = 0;
    }
  });

  return (
    <group ref={root} scale={scale}>
      {cfg.mode === "bust" && <ProceduralLegs look={look} anim={anim} legScale={cfg.legScale ?? 1} />}
      <group ref={bodyRef}>
        <group rotation={[0, cfg.yaw, 0]}>
          <group scale={fit.s} position={[fit.x, fit.y, fit.z]}>
            <primitive object={cloned} />
          </group>
        </group>
      </group>
    </group>
  );
}

function StlModel({ url, name, anim, scale, color }: { url: string; name: string; anim: AnimState; scale: number; color: string }) {
  const cfg = MODEL_CONFIG[name] ?? DEFAULT_CONFIG;
  const geometry = useLoader(STLLoader, url);
  const group = useRef<THREE.Group>(null!);
  const normalized = useMemo(() => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    // Los STL suelen tener Z hacia arriba
    const h = (box.max.z - box.min.z) || 1;
    const s = cfg.height / h;
    return { s, x: -(box.min.x + box.max.x) / 2 * s, y: -box.min.z * s, z: (box.min.y + box.max.y) / 2 * s };
  }, [geometry, cfg.height]);
  useFrame(() => { if (group.current) { group.current.rotation.x = -Math.PI / 2 * anim.dead; group.current.position.y = -0.3 * anim.dead; } });
  return (
    <group ref={group} scale={scale}>
      <group rotation={[0, cfg.yaw, 0]}>
        <group position={[normalized.x, normalized.y, normalized.z]} rotation={[-Math.PI / 2, 0, 0]} scale={normalized.s}>
          <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Usa el modelo GLB/STL si existe en public/assets/models; si no, el personaje procedural. */
export function Character({ variant, glb, seed, anim, scale = 1 }: { variant: CharacterVariant; glb?: string; seed?: string; anim: AnimState; scale?: number }) {
  const base = glb ? `${import.meta.env.BASE_URL}assets/models/${glb}` : null;
  const [model, setModel] = useState<{ url: string; kind: "glb" | "stl" } | null>(null);
  useEffect(() => {
    let alive = true;
    if (!base) return;
    (async () => {
      if (await checkAsset(`${base}.glb`)) { if (alive) setModel({ url: `${base}.glb`, kind: "glb" }); return; }
      if (await checkAsset(`${base}.stl`)) { if (alive) setModel({ url: `${base}.stl`, kind: "stl" }); }
    })();
    return () => { alive = false; };
  }, [base]);
  const look = useMemo(() => lookFor(variant, seed), [variant, seed]);
  const fallback = <ProceduralCharacter variant={variant} seed={seed} anim={anim} scale={scale} />;
  if (!model || !glb) return fallback;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        {model.kind === "glb"
          ? <GlbModel url={model.url} name={glb} anim={anim} scale={scale} look={look} />
          : <StlModel url={model.url} name={glb} anim={anim} scale={scale} color={look.jacket} />}
      </Suspense>
    </ModelBoundary>
  );
}

// Precarga de los modelos incluidos
for (const name of Object.keys(MODEL_CONFIG)) {
  const url = `${import.meta.env.BASE_URL}assets/models/${name}.glb`;
  void checkAsset(url).then(ok => { if (ok) useGLTF.preload(url); });
}
