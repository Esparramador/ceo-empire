import { MISSIONS, type Mission } from "./gameData";

/** What a mission check needs to know about the world, kept free of React/three. */
export interface MissionContext {
  playerPos: [number, number, number];
  ownedBusinesses: string[];
  /** NPC ids currently knocked down. */
  defeatedNpcs: string[];
}

/** The story is linear: the next mission is the first one not yet completed. */
export function nextMission(completed: string[]): Mission | null {
  return MISSIONS.find(m => !completed.includes(m.id)) ?? null;
}

/** Only the next story mission can be started, and only when none is running. */
export function canStartMission(id: string, completed: string[], activeId: string | null): boolean {
  return activeId === null && nextMission(completed)?.id === id;
}

const dist2d = (a: [number, number, number], b: [number, number, number]) =>
  Math.hypot(a[0] - b[0], a[2] - b[2]);

/** Objective message when `mission` is accomplished in `ctx`, otherwise null. */
export function checkMission(mission: Mission, ctx: MissionContext): string | null {
  switch (mission.id) {
    case "mission_1":
      return dist2d(mission.markerPos, ctx.playerPos) < 5
        ? "✅ Maletín recogido. Busca la siguiente misión (marcador amarillo)."
        : null;
    case "mission_2":
      return ctx.ownedBusinesses.includes("cafe") ? "✅ Cafetería adquirida. ¡El negocio crece!" : null;
    case "mission_3":
      return ctx.defeatedNpcs.includes("npc_lord")
        ? "✅ ¡Rival eliminado! Ahora construye tu verdadero imperio."
        : null;
    case "mission_4":
      return ctx.ownedBusinesses.length >= 4 ? "✅ ¡4 negocios controlados! Eres imparable." : null;
    case "mission_5":
      return dist2d(mission.markerPos, ctx.playerPos) < 6 ? "👑 ¡ERES EL CEO DEL AÑO! El imperio es tuyo." : null;
    default:
      return null;
  }
}
