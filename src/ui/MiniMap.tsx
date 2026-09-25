import { useEffect, useRef } from "react";
import { useGame } from "../lib/gameStore";
import { BUSINESSES, ALL_BUILDINGS, ROAD_LINES, WORLD, NPC_CONFIGS, missionById } from "../lib/gameData";
import { runtime, camera as camState } from "../lib/world";

const SIZE = 190;
const SCALE = 0.62; // px por unidad del mundo

export function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useGame(s => s.phase);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const s = useGame.getState();
      const p = runtime.player.pos;
      const cx = SIZE / 2, cy = SIZE / 2;
      const toMap = (x: number, z: number): [number, number] => [cx + (x - p.x) * SCALE, cy + (z - p.z) * SCALE];

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, SIZE / 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = "#101a12"; ctx.fillRect(0, 0, SIZE, SIZE);
      // Zona jugable
      const [bx, by] = toMap(-WORLD.bounds, -WORLD.bounds);
      ctx.fillStyle = "#1a2230"; ctx.fillRect(bx, by, WORLD.bounds * 2 * SCALE, WORLD.bounds * 2 * SCALE);
      // Calles
      ctx.strokeStyle = "#3a4152"; ctx.lineWidth = WORLD.roadWidth * SCALE;
      const len = (WORLD.blockSize * WORLD.blocksPerSide + WORLD.blockSize) * SCALE;
      for (const l of ROAD_LINES) {
        const [x] = toMap(l, 0); const [, y] = toMap(0, l);
        ctx.beginPath(); ctx.moveTo(x, cy - len / 2 - (p.z) * SCALE); ctx.lineTo(x, cy + len / 2 - (p.z) * SCALE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - len / 2 - p.x * SCALE, y); ctx.lineTo(cx + len / 2 - p.x * SCALE, y); ctx.stroke();
      }
      // Edificios
      ctx.fillStyle = "#55607a";
      for (const b of ALL_BUILDINGS) {
        const [x, y] = toMap(b.x - b.w / 2, b.z - b.d / 2);
        if (x > SIZE || y > SIZE || x + b.w * SCALE < 0 || y + b.d * SCALE < 0) continue;
        ctx.fillRect(x, y, b.w * SCALE, b.d * SCALE);
      }
      // Negocios
      for (const b of BUSINESSES) {
        const [x, y] = toMap(b.pos[0], b.pos[2]);
        ctx.fillStyle = s.ownedBusinesses[b.id] ? "#2dd49f" : "#ffd700";
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      // Objetos
      for (const pk of Object.values(runtime.pickups)) {
        if (!pk.active) continue;
        const [x, y] = toMap(pk.pos.x, pk.pos.z);
        ctx.fillStyle = pk.kind === "data" ? "#00ff88" : pk.kind === "medkit" ? "#ff6b6b" : pk.kind === "ammo" ? "#8de35c" : "#f5d76e";
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      // NPCs
      for (const cfg of NPC_CONFIGS) {
        const n = runtime.npcs[cfg.id];
        if (!n || n.state === "dead") continue;
        const [x, y] = toMap(n.pos.x, n.pos.z);
        ctx.fillStyle = cfg.type === "boss" ? "#ff2a2a" : cfg.type === "hostile" ? "#ff7a45" : cfg.type === "friendly" ? "#7dffb0" : s.hiredNpcIds.includes(cfg.id) ? "#ffd700" : "#c8c8c8";
        ctx.beginPath(); ctx.arc(x, y, cfg.type === "boss" ? 3.5 : 2.2, 0, Math.PI * 2); ctx.fill();
      }
      for (const c of runtime.police) {
        if (c.state === "dead") continue;
        const [x, y] = toMap(c.pos.x, c.pos.z);
        ctx.fillStyle = "#4d8dff"; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      // Vehículos
      ctx.fillStyle = "#e8e8e8";
      for (const v of Object.values(runtime.vehicles)) {
        const [x, y] = toMap(v.pos.x, v.pos.z);
        ctx.fillRect(x - 2, y - 1.4, 4, 2.8);
      }
      // Objetivo
      const obj = runtime.nearestObjective;
      const m = missionById(s.activeMissionId);
      if (obj) {
        const color = m?.color ?? "#ffd700";
        const [x, y] = toMap(obj.x, obj.z);
        const dx = x - cx, dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const r = SIZE / 2 - 8;
        const pulse = 4 + Math.sin(performance.now() / 200) * 1.5;
        if (dist < r) {
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, pulse + 2, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        } else {
          const ex = cx + (dx / dist) * r, ey = cy + (dy / dist) * r;
          const a = Math.atan2(dy, dx);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(a) * 7, ey + Math.sin(a) * 7);
          ctx.lineTo(ex + Math.cos(a + 2.4) * 6, ey + Math.sin(a + 2.4) * 6);
          ctx.lineTo(ex + Math.cos(a - 2.4) * 6, ey + Math.sin(a - 2.4) * 6);
          ctx.closePath(); ctx.fill();
        }
      }
      // Cono de cámara y jugador
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-camState.yaw + Math.PI);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 36, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-runtime.player.facing + Math.PI);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(-5, 5); ctx.lineTo(0, 3); ctx.lineTo(5, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, SIZE / 2 - 1, 0, Math.PI * 2); ctx.stroke();
      // Distancia al objetivo
      if (obj) {
        const d = Math.hypot(obj.x - p.x, obj.z - p.z);
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(cx - 26, SIZE - 22, 52, 16);
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(`${Math.round(d)} m`, cx, SIZE - 10);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (phase !== "playing" && phase !== "paused") return null;

  return (
    <div className="minimap">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} />
      <div className="minimap-n">N</div>
    </div>
  );
}
