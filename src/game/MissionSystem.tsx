import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "../lib/gameStore";
import { MISSIONS } from "../lib/gameData";
import { checkMission } from "../lib/missions";
import { runtime } from "./runtime";

/** Checks the active mission a few times per second; reads state without subscribing. */
export function MissionSystem() {
  const timer = useRef(0);

  useFrame((_, delta) => {
    timer.current -= delta;
    if (timer.current > 0) return;
    timer.current = 0.1;

    const st = useGame.getState();
    if (st.phase !== "playing" || !st.activeMissionId) return;
    const mission = MISSIONS.find(m => m.id === st.activeMissionId);
    if (!mission) return;

    const done = checkMission(mission, {
      playerPos: [runtime.player.x, runtime.player.y, runtime.player.z],
      ownedBusinesses: st.ownedBusinesses,
      defeatedNpcs: Object.keys(runtime.npcs).filter(id => runtime.npcs[id].dead),
    });
    if (done) st.completeMission(true, done);
  });

  return null;
}
