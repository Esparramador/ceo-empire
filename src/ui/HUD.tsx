import { useEffect, useRef } from "react";
import { useGame, formatMoney, missionProgressText, isUiBlocking, availableSideMissions } from "../lib/gameStore";
import { WEAPONS, missionById, MAX_BUSINESS_LEVEL, upgradeCost, BUSINESSES } from "../lib/gameData";
import { runtime, input } from "../lib/world";

function Bar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar" style={{ height }}>
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Clock() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const h = runtime.hour;
      const hh = Math.floor(h), mm = Math.floor((h % 1) * 60);
      const icon = h >= 6 && h < 20 ? (h >= 18 ? "🌇" : "☀️") : "🌙";
      if (ref.current) ref.current.textContent = `${icon} ${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
    }, 500);
    return () => clearInterval(id);
  }, []);
  return <span ref={ref} className="clock" />;
}

function DamageVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const health = useGame(s => s.health);
  const maxHealth = useGame(s => s.maxHealth);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const low = health / maxHealth < 0.3 ? (0.35 + Math.sin(performance.now() / 250) * 0.15) : 0;
      const a = Math.max(runtime.player.hitFlash * 0.6, low);
      if (ref.current) ref.current.style.opacity = a.toFixed(3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [health, maxHealth]);
  return <div ref={ref} className="vignette" />;
}

function PointerLockHint() {
  const blocking = useGame(s => isUiBlocking(s));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => { if (ref.current) ref.current.style.display = !input.pointerLocked && !blocking ? "flex" : "none"; }, 200);
    return () => clearInterval(id);
  }, [blocking]);
  return (
    <div ref={ref} className="lock-hint" style={{ display: "none" }}>
      <div className="lock-box">
        <div style={{ fontSize: 28 }}>🖱️</div>
        <div style={{ fontWeight: 700, marginTop: 6 }}>Haz clic en el juego para capturar el ratón</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Esc para pausar · H para ver los controles</div>
      </div>
    </div>
  );
}

export function HUD() {
  const health = useGame(s => s.health);
  const maxHealth = useGame(s => s.maxHealth);
  const armor = useGame(s => s.armor);
  const money = useGame(s => s.money);
  const karma = useGame(s => s.karma);
  const wanted = useGame(s => s.wantedLevel);
  const activeWeapon = useGame(s => s.activeWeapon);
  const ammo = useGame(s => s.ammo);
  const employees = useGame(s => s.employees);
  const owned = useGame(s => Object.keys(s.ownedBusinesses).length);
  const inVehicle = useGame(s => s.inVehicle);
  const vehicleName = useGame(s => s.vehicleName);
  const vehicleSpeed = useGame(s => s.vehicleSpeed);
  const income = useGame(s => s.incomePerSec());
  const nearby = useGame(s => s.nearby);
  const activeMission = useGame(s => missionById(s.activeMissionId));
  const availableMission = useGame(s => missionById(s.availableMissionId));
  const sideCount = useGame(s => availableSideMissions(s).length);
  const progress = useGame(s => missionProgressText(s));
  const timeLeft = useGame(s => s.missionTimeLeft);
  const notifications = useGame(s => s.notifications);
  const bossFight = useGame(s => s.bossFight);
  const result = useGame(s => s.lastMissionResult);
  const clearResult = useGame(s => s.clearMissionResult);
  const ownedLevel = useGame(s => nearby.businessId ? s.ownedBusinesses[nearby.businessId] ?? 0 : 0);
  const price = useGame(s => nearby.businessId ? s.businessPrice(nearby.businessId) : 0);
  const phase = useGame(s => s.phase);

  useEffect(() => {
    if (!result) return;
    const id = setTimeout(clearResult, 4500);
    return () => clearTimeout(id);
  }, [result, clearResult]);

  if (phase !== "playing" && phase !== "paused") return null;

  const weapon = WEAPONS[activeWeapon] ?? WEAPONS.fists;
  const karmaLabel = karma > 50 ? "CEO ejemplar" : karma > 10 ? "Ambicioso" : karma > -30 ? "Polémico" : "Villano";
  const karmaColor = karma > 10 ? "#2dd49f" : karma > -30 ? "#fbbf24" : "#ef4444";
  const nearBiz = nearby.businessId ? BUSINESSES.find(b => b.id === nearby.businessId) : null;

  return (
    <>
      <DamageVignette />
      <PointerLockHint />

      {/* Arriba izquierda: vitales y dinero */}
      <div className="hud-panel hud-tl">
        <div className="hud-row"><span>❤️ Salud{armor ? " 🦺" : ""}</span><span>{Math.round(health)}/{maxHealth}</span></div>
        <Bar value={health} max={maxHealth} color={health / maxHealth > 0.5 ? "#2dd49f" : health / maxHealth > 0.25 ? "#fbbf24" : "#ef4444"} />
        <div className="hud-row" style={{ marginTop: 6 }}><span>⚖️ Karma</span><span style={{ color: karmaColor }}>{karmaLabel} ({karma > 0 ? "+" : ""}{karma})</span></div>
        <Bar value={karma + 100} max={200} color={karmaColor} height={5} />
        <div className="money">{formatMoney(money)}</div>
        {income > 0 && <div className="income">+{formatMoney(income)}/s · {owned} negocios · {employees} empleados</div>}
        {income === 0 && <div className="income dim">Sin ingresos pasivos: compra un negocio</div>}
      </div>

      {/* Arriba derecha: búsqueda, hora, arma */}
      <div className="hud-panel hud-tr">
        <div className="stars">
          {[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= wanted ? "star on" : "star"}>★</span>)}
        </div>
        <Clock />
        <div className="weapon">
          {weapon.icon} {weapon.name}{weapon.ranged ? ` · ${ammo} balas` : ""}
        </div>
        {inVehicle && <div className="vehicle">🚗 {vehicleName} · {vehicleSpeed} km/h</div>}
      </div>

      {/* Arriba centro: misión */}
      <div className="hud-mission">
        {activeMission ? (
          <>
            <div className="mission-title" style={{ color: activeMission.color }}>{activeMission.category === "main" ? "🎯" : "📋"} {activeMission.title}{progress ? ` · ${progress}` : ""}<span className="mission-cat">{activeMission.category === "main" ? "principal" : "secundaria"}</span></div>
            <div className="mission-obj">{activeMission.objective}</div>
            {timeLeft !== null && <div className={`mission-timer ${timeLeft < 15 ? "urgent" : ""}`}>⏱ {Math.ceil(timeLeft)} s</div>}
          </>
        ) : availableMission ? (
          <>
            <div className="mission-title dim">📋 Misión disponible: {availableMission.title}</div>
            <div className="mission-obj">Busca el marcador «!» amarillo y pulsa F para hablar.</div>
          </>
        ) : sideCount > 0 ? (
          <>
            <div className="mission-title dim">📋 {sideCount} misión{sideCount > 1 ? "es" : ""} secundaria{sideCount > 1 ? "s" : ""} disponible{sideCount > 1 ? "s" : ""}</div>
            <div className="mission-obj">Busca los marcadores «?» azules. Tab para ver la lista.</div>
          </>
        ) : (
          <div className="mission-title dim">👑 Modo libre: sigue ampliando tu imperio</div>
        )}
      </div>

      {/* Jefe */}
      {bossFight && (
        <div className="boss-bar">
          <div className="boss-name">☠️ {bossFight.name}</div>
          <Bar value={bossFight.hp} max={bossFight.maxHp} color="#ff3b3b" height={10} />
        </div>
      )}

      {/* Resultado de misión */}
      {result && (
        <div className={`mission-result ${result.success ? "ok" : "fail"}`}>
          <div className="mr-title">{result.success ? "MISIÓN COMPLETADA" : "MISIÓN FALLIDA"}</div>
          <div className="mr-sub">{result.title}{result.success ? ` · +${formatMoney(result.reward)}` : ""}</div>
        </div>
      )}

      {/* Pistas contextuales */}
      <div className="hints">
        {inVehicle && <div className="hint"><kbd>E</kbd> Salir del coche · <kbd>Espacio</kbd> Freno de mano</div>}
        {!inVehicle && nearby.vehicleId && <div className="hint">🚗 <kbd>E</kbd> Entrar en el coche</div>}
        {!inVehicle && nearby.npcId && <div className="hint">💬 <kbd>F</kbd> Hablar</div>}
        {!inVehicle && nearBiz && ownedLevel === 0 && <div className="hint">{nearBiz.icon} <kbd>B</kbd> Comprar {nearBiz.name} · {formatMoney(price)}</div>}
        {!inVehicle && nearBiz && ownedLevel > 0 && ownedLevel < MAX_BUSINESS_LEVEL && <div className="hint">⬆️ <kbd>U</kbd> Mejorar {nearBiz.name} a Nv {ownedLevel + 1} · {formatMoney(upgradeCost(nearBiz, ownedLevel))}</div>}
        {!inVehicle && nearBiz && ownedLevel >= MAX_BUSINESS_LEVEL && <div className="hint">👑 {nearBiz.name} al nivel máximo</div>}
      </div>

      {/* Notificaciones */}
      <div className="notifications">
        {notifications.map(n => <div key={n.id} className={`notif ${n.kind}`}>{n.text}</div>)}
      </div>

      {weapon.ranged && !inVehicle && <div className="crosshair" />}
    </>
  );
}
