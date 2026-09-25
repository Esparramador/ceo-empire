// ─────────────────────────────────────────────────────────────────────────────
// Ciclo día/noche: sol y luna orbitando, sombras que siguen al jugador, cielo
// con degradado, estrellas, niebla y luz ambiental.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { runtime } from "../lib/world";
import { useGame } from "../lib/gameStore";

const HOUR_SECONDS = 50; // 1 hora de juego = 50 s reales (día completo = 20 min)

const skyVert = `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const skyFrag = `
uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunGlow;
varying vec3 vWorld;
void main(){
  vec3 d = normalize(vWorld - cameraPosition);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(horizon, top, pow(h, 0.55));
  float s = max(dot(d, sunDir), 0.0);
  col += sunColor * (pow(s, 220.0) * 1.6 + pow(s, 8.0) * 0.25 * sunGlow);
  gl_FragColor = vec4(col, 1.0);
}`;

const DAY = { top: new THREE.Color("#2f78d6"), horizon: new THREE.Color("#a9d3f5"), fog: new THREE.Color("#aecde8"), amb: new THREE.Color("#ffefd8"), ambI: 0.55 };
const SUNSET = { top: new THREE.Color("#3a3f8a"), horizon: new THREE.Color("#ff9a4a"), fog: new THREE.Color("#d9a07a"), amb: new THREE.Color("#ffb080"), ambI: 0.4 };
const NIGHT = { top: new THREE.Color("#04071a"), horizon: new THREE.Color("#141f3e"), fog: new THREE.Color("#0e162c"), amb: new THREE.Color("#5a6cb8"), ambI: 0.42 };

export function DayNightSystem() {
  const sun = useRef<THREE.DirectionalLight>(null!);
  const moon = useRef<THREE.DirectionalLight>(null!);
  const amb = useRef<THREE.AmbientLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const sky = useRef<THREE.Mesh>(null!);
  const stars = useRef<THREE.Points>(null!);
  const sunTarget = useMemo(() => new THREE.Object3D(), []);
  const { scene } = useThree();
  const uniforms = useMemo(() => ({
    top: { value: DAY.top.clone() }, horizon: { value: DAY.horizon.clone() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color("#fff3c0") }, sunGlow: { value: 1 },
  }), []);
  const starGeo = useMemo(() => {
    const n = 900;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.05;
      arr[i * 3] = Math.cos(a) * Math.cos(e) * 700; arr[i * 3 + 1] = Math.sin(e) * 700; arr[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 700;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  const fog = useMemo(() => new THREE.Fog(DAY.fog.clone(), 90, 420), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (useGame.getState().phase === "playing") runtime.hour = (runtime.hour + dt / HOUR_SECONDS) % 24;
    const h = runtime.hour;
    const angle = ((h - 6) / 24) * Math.PI * 2;           // 6h → amanecer en el horizonte
    const elev = Math.sin(angle);                          // -1..1
    const sunDir = new THREE.Vector3(Math.cos(angle) * 0.8, elev, 0.45).normalize();
    const night = 1 - THREE.MathUtils.clamp((elev + 0.08) / 0.28, 0, 1);
    runtime.night = night;
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(elev) / 0.32, 0, 1) * (1 - night * 0.6);

    const p = runtime.player.pos;
    if (sun.current) {
      sun.current.position.set(p.x + sunDir.x * 140, Math.max(20, sunDir.y * 140), p.z + sunDir.z * 140);
      sunTarget.position.set(p.x, 0, p.z);
      sun.current.target = sunTarget;
      sun.current.intensity = THREE.MathUtils.clamp(elev * 3.2, 0, 2.6) * (1 - night);
      tmpColor.set("#fff4d6").lerp(new THREE.Color("#ff9040"), dusk);
      sun.current.color.copy(tmpColor);
      sun.current.shadow.camera.updateProjectionMatrix();
    }
    if (moon.current) {
      moon.current.position.set(p.x - sunDir.x * 140, Math.max(30, -sunDir.y * 140), p.z - sunDir.z * 140);
      moon.current.target = sunTarget;
      moon.current.intensity = night * 0.7;
    }
    if (amb.current) {
      const c = tmpColor.copy(DAY.amb).lerp(SUNSET.amb, dusk).lerp(NIGHT.amb, night);
      amb.current.color.copy(c);
      amb.current.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(DAY.ambI, SUNSET.ambI, dusk), NIGHT.ambI, night);
    }
    if (hemi.current) hemi.current.intensity = 0.35 * (1 - night) + 0.22;

    uniforms.top.value.copy(DAY.top).lerp(SUNSET.top, dusk).lerp(NIGHT.top, night);
    uniforms.horizon.value.copy(DAY.horizon).lerp(SUNSET.horizon, dusk).lerp(NIGHT.horizon, night);
    uniforms.sunDir.value.copy(sunDir);
    uniforms.sunColor.value.set("#fff3c0").lerp(new THREE.Color("#ff7a30"), dusk).multiplyScalar(1 - night);
    uniforms.sunGlow.value = 1 - night;
    if (sky.current) sky.current.position.set(p.x, 0, p.z);
    if (stars.current) { (stars.current.material as THREE.PointsMaterial).opacity = night; stars.current.position.set(p.x, 0, p.z); stars.current.rotation.y = h * 0.02; }

    fog.color.copy(DAY.fog).lerp(SUNSET.fog, dusk).lerp(NIGHT.fog, night);
    fog.near = 90 - night * 40; fog.far = 420 - night * 160;
    if (scene.fog !== fog) scene.fog = fog;
  });

  return (
    <>
      <ambientLight ref={amb} intensity={0.55} color="#ffefd8" />
      <hemisphereLight ref={hemi} args={["#bcd7ff", "#4a4030", 0.35]} />
      <directionalLight
        ref={sun}
        position={[80, 120, 60]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={10}
        shadow-camera-far={400}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />
      <directionalLight ref={moon} position={[-80, 100, -60]} intensity={0} color="#8fa6ff" />
      <primitive object={sunTarget} />
      <mesh ref={sky} scale={800} frustumCulled={false}>
        <sphereGeometry args={[1, 24, 16]} />
        <shaderMaterial vertexShader={skyVert} fragmentShader={skyFrag} uniforms={uniforms} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
      <points ref={stars} geometry={starGeo} frustumCulled={false}>
        <pointsMaterial size={2.2} color="#ffffff" transparent opacity={0} sizeAttenuation={false} depthWrite={false} fog={false} />
      </points>
    </>
  );
}
