import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { DayNightSystem } from "./DayNight";
import { World } from "./World";
import { Player } from "./Player";
import { NPCSystem } from "./NPCSystem";
import { VehicleSystem, resetCars } from "./VehicleSystem";
import { resetRuntime } from "./runtime";
import { MissionSystem } from "./MissionSystem";

if (import.meta.env.DEV) {
  // Debug handle for automated play-testing (dev server only).
  void Promise.all([import("./runtime"), import("../lib/gameStore"), import("./VehicleSystem")]).then(([r, g, v]) => {
    (window as any).__ceo = { runtime: r.runtime, useGame: g.useGame, carStates: v.carStates };
  });
}

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
  // Runs once per game, during render, so children start from a clean world
  // (an effect would run after the NPCs registered themselves).
  useState(() => { resetRuntime(); resetCars(); });
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
          }}
          dpr={[1, 1.75]}
          camera={{ fov: 62, near: 0.1, far: 600, position: [0, 5, 40] }}
          style={{ background: "#000" }}
        >
          <Suspense fallback={null}>
            <DayNightSystem />
            <World />
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
