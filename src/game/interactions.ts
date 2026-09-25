// ─────────────────────────────────────────────────────────────────────────────
// Interacciones con NPCs: diálogo, misiones, tienda y contratación.
// ─────────────────────────────────────────────────────────────────────────────
import { NPC_CONFIGS, SHOP_ITEMS, HIRE_COST, MAX_EMPLOYEES, missionById } from "../lib/gameData";
import { useGame, type DialogOption } from "../lib/gameStore";
import { runtime } from "../lib/world";
import { sfx } from "../lib/audio";

export function talkTo(npcId: string) {
  const cfg = NPC_CONFIGS.find(n => n.id === npcId);
  const n = runtime.npcs[npcId];
  if (!cfg || !n || n.state === "dead") return;
  const store = useGame.getState();
  sfx.click();
  n.facing = Math.atan2(runtime.player.pos.x - n.pos.x, runtime.player.pos.z - n.pos.z);
  n.state = "idle"; n.stateTimer = 4;

  const close: DialogOption = { label: "Cerrar", onSelect: () => store.closeDialog() };

  // Vendedor: tienda
  if (npcId === "npc_vendor") {
    const options: DialogOption[] = SHOP_ITEMS.map(item => ({
      label: `${item.icon} ${item.name} — $${item.price.toLocaleString("es-ES")}`,
      hint: item.description,
      onSelect: () => { useGame.getState().buyShopItem(item.id); },
    }));
    store.openDialog(npcId, cfg.name, cfg.dialogue[0], [...options, close]);
    return;
  }

  const available = missionById(store.availableMissionId);
  const active = missionById(store.activeMissionId);

  // Da la misión disponible si este NPC es quien la encarga
  if (available && available.giverNpcId === npcId && !active) {
    store.openDialog(npcId, cfg.name, `📋 ${available.title}\n\n${available.briefing}`, [
      { label: "✅ Aceptar misión", onSelect: () => { useGame.getState().acceptMission(available.id); useGame.getState().closeDialog(); } },
      { label: "Ahora no", onSelect: () => store.closeDialog() },
    ]);
    return;
  }

  // Recordatorio de la misión activa si es quien la encargó
  if (active && active.giverNpcId === npcId) {
    store.openDialog(npcId, cfg.name, `Sigue con la misión «${active.title}»: ${active.objective}.`, [close]);
    return;
  }

  // Ciudadanos: charla + contratación
  if (cfg.type === "neutral") {
    const line = cfg.dialogue[n.dialogueIndex % cfg.dialogue.length];
    n.dialogueIndex++;
    const hired = store.hiredNpcIds.includes(npcId);
    const options: DialogOption[] = [];
    if (hired) {
      store.openDialog(npcId, `${cfg.name} (empleado)`, "¡Jefe! Estoy trabajando en ello. Los números van genial.", [close]);
      return;
    }
    options.push({
      label: `🤝 Contratar — $${HIRE_COST.toLocaleString("es-ES")}`,
      hint: store.employees >= MAX_EMPLOYEES ? "Plantilla completa" : "+10 % de ingresos pasivos",
      disabled: store.employees >= MAX_EMPLOYEES,
      onSelect: () => { if (useGame.getState().hireNpc(npcId)) useGame.getState().closeDialog(); },
    });
    options.push(close);
    store.openDialog(npcId, cfg.name, line, options);
    return;
  }

  // Asesores y otros amistosos: consejos rotativos
  const line = cfg.dialogue[n.dialogueIndex % cfg.dialogue.length];
  n.dialogueIndex++;
  const extra = available && available.giverNpcId !== npcId && !active
    ? `\n\n(Tu siguiente misión te la encarga ${NPC_CONFIGS.find(x => x.id === available.giverNpcId)?.name ?? "otro asesor"}.)`
    : "";
  store.openDialog(npcId, cfg.name, line + extra, [close]);
}
