import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../lib/gameStore";
import { nightFactor } from "../lib/city";
import { runtime } from "../lib/world";

const HOUR_SECONDS = 50; // 1 hora de juego = 50 s reales (día completo = 20 min)

const DAY_FOG = new THREE.Color("#b9cde0");
const DUSK_FOG = new THREE.Color("#d39a6e");
const NIGHT_FOG = new THREE.Color("#0b1120");
const SUN_DAY = new THREE.Color("#fff3e0");
const SUN_LOW = new THREE.Color("#ffad66");
const MOON = new THREE.Color("#8fa6ff");

export function DayNightSystem() {
  const sun = useRef<THREE.DirectionalLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const sky = useRef<any>(null);
  const stars = useRef<THREE.Points>(null!);
  const { scene } = useThree();
  const sunDir = useRef(new THREE.Vector3());
  const fogColor = useRef(new THREE.Color());

  useFrame((_, delta) => {
    // The clock lives in the per-frame runtime (saved with the game), not in the
    // store: a store update every frame would re-render every subscriber.
    if (useGame.getState().phase === "playing") runtime.hour = (runtime.hour + delta / HOUR_SECONDS) % 24;
    const t = runtime.hour;
    const n = nightFactor(t);
    runtime.night = n;

    // Sun path: rises at 6h in the east, sets at 18h in the west
    const ang = ((t - 6) / 12) * Math.PI;
    sunDir.current.set(Math.cos(ang), Math.sin(ang), 0.35).normalize();
    const elev = sunDir.current.y;
    const p = runtime.player.pos;

    if (sun.current) {
      // Moonlight at night (from the opposite side), sun otherwise
      const dir = elev > 0 ? sunDir.current : sunDir.current.clone().multiplyScalar(-1);
      sun.current.position.set(p.x + dir.x * 120, Math.max(20, dir.y * 120), p.z + dir.z * 120);
      sun.current.target.position.set(p.x, 0, p.z);
      sun.current.target.updateMatrixWorld();
      if (elev > 0) {
        sun.current.intensity = 0.4 + Math.min(1, elev * 3) * 2.6;
        sun.current.color.copy(SUN_LOW).lerp(SUN_DAY, Math.min(1, elev * 2.5));
      } else {
        sun.current.intensity = 0.55 * n;
        sun.current.color.copy(MOON);
      }
    }
    // night floor keeps streets readable where no street lamp reaches
    if (hemi.current) hemi.current.intensity = 0.32 + (1 - n) * 0.53;
    if (sky.current?.material) {
      sky.current.material.uniforms.sunPosition.value.copy(sunDir.current).multiplyScalar(1000);
    }
    if (stars.current) (stars.current.material as THREE.PointsMaterial).opacity = n;
    scene.environmentIntensity = 0.25 + (1 - n) * 0.75;

    if (scene.fog) {
      const dusk = Math.max(0, 1 - Math.abs(elev) * 5);
      fogColor.current.copy(DAY_FOG).lerp(DUSK_FOG, dusk * (1 - n)).lerp(NIGHT_FOG, n);
      (scene.fog as THREE.Fog).color.copy(fogColor.current);
      scene.background = fogColor.current;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#cfe3ff", "#4a4036", 0.8]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={2.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0008}
        shadow-normalBias={0.06}
      />
      <Sky ref={sky} distance={500} turbidity={6} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <Stars ref={stars as any} radius={300} depth={60} count={3000} factor={4} fade speed={0.5} />
      {/* Studio-style reflections for car paint and glass, generated offline (no HDR download) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} color="#dfefff" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[-15, 3, 0]} rotation-y={Math.PI / 2} scale={[30, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#fff2df" position={[15, 3, 0]} rotation-y={-Math.PI / 2} scale={[30, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#8fb6ff" position={[0, 3, -15]} scale={[30, 6, 1]} />
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#59626e" side={THREE.BackSide} />
        </mesh>
      </Environment>
      <fog attach="fog" args={["#b9cde0", 60, 330]} />
    </>
  );
}
