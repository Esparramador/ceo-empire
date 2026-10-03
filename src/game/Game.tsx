import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { DayNightSystem } from "./DayNight";
import { World } from "./World";
import { Player } from "./Player";
import { NPCSystem } from "./NPCSystem";
import { VehicleSystem } from "./VehicleSystem";
import { MissionSystem } from "./MissionSystem";

if (import.meta.env.DEV) {
  // Debug handle for automated play-testing (dev server only).
  void Promise.all([import("./runtime"), import("../lib/gameStore"), import("./VehicleSystem")]).then(([r, g, v]) => {
    (window as any).__ceo = { runtime: r.runtime, useGame: g.useGame, carStates: v.carStates };
  });
}

export function Game() {
  return (
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
        </Suspense>
      </Canvas>
    </div>
  );
}
