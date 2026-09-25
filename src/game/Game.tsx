import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { DayNightSystem } from "./DayNight";
import { World } from "./World";
import { Player } from "./Player";
import { NPCSystem } from "./NPCSystem";
import { VehicleSystem } from "./VehicleSystem";
import { MissionSystem } from "./MissionSystem";
import { Pickups } from "./Pickups";

export function Game() {
  return (
    <div style={{ position: "fixed", inset: 0, width: "100%", height: "100%" }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, powerPreference: "high-performance" }}
        camera={{ fov: 62, near: 0.2, far: 1200, position: [0, 6, 42] }}
        style={{ background: "#000" }}
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
        </Suspense>
      </Canvas>
    </div>
  );
}
