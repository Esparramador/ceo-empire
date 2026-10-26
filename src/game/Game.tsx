import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { DayNightSystem } from "./DayNight";
import { World } from "./World";
import { Player } from "./Player";
import { NPCSystem } from "./NPCSystem";
import { VehicleSystem } from "./VehicleSystem";
import { MissionSystem } from "./MissionSystem";
import { Pickups } from "./Pickups";

/**
 * The models load inside the Canvas, whose Suspense fallback can only be 3D,
 * so without this the player sees a black screen under the HUD for seconds.
 */
function LoadingOverlay({ ready }: { ready: boolean }) {
  const { progress } = useProgress();
  if (ready) return null;
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-title">CEO EMPIRE</div>
      <div className="loading-bar"><div style={{ width: `${Math.round(progress)}%` }} /></div>
      <div className="loading-text">
        {/* models are preloaded from the menu; after 100% the GPU still has to build the scene */}
        {progress < 100 ? `Cargando la ciudad… ${Math.round(progress)}%` : "Preparando la ciudad…"}
      </div>
    </div>
  );
}

/** Mounts only once everything in its Suspense boundary has loaded. */
function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export function Game() {
  // The world state is reset by the store (newGame / continueGame / respawn).
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <>
      <div style={{ position: "fixed", inset: 0, width: "100%", height: "100%" }}>
        <Canvas
          shadows
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
            powerPreference: "high-performance",
          }}
          dpr={[1, 1.75]}
          camera={{ fov: 62, near: 0.1, far: 600, position: [0, 5, 40] }}
          style={{ background: "#000" }}
          // owner models with a pedestal are clipped by a plane (MODEL_CONFIG.clipBottom)
          onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
        >
          <Suspense fallback={null}>
            <DayNightSystem />
            <World />
            <Pickups />
            <Player />
            <NPCSystem />
            <VehicleSystem />
            <MissionSystem />
            <SceneReady onReady={onReady} />
          </Suspense>
        </Canvas>
      </div>
      {/* outside the fixed wrapper (its own stacking context) so it covers the HUD too */}
      <LoadingOverlay ready={ready} />
    </>
  );
}
