import { useGame, formatMoney } from "../lib/gameStore";
import { BUSINESSES, MISSIONS, MAX_BUSINESS_LEVEL, MAX_EMPLOYEES, businessIncome, upgradeCost } from "../lib/gameData";
import { runtime } from "../lib/world";

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function EmpirePanel() {
  const show = useGame(s => s.showEmpire);
  const toggle = useGame(s => s.toggleEmpire);
  const owned = useGame(s => s.ownedBusinesses);
  const employees = useGame(s => s.employees);
  const income = useGame(s => s.incomePerSec());
  const money = useGame(s => s.money);
  const completed = useGame(s => s.completedMissions);
  const activeId = useGame(s => s.activeMissionId);
  const availableId = useGame(s => s.availableMissionId);
  const killCount = useGame(s => s.killCount);
  const defeatedBosses = useGame(s => s.defeatedBosses);
  const totalEarned = useGame(s => s.totalEarned);
  const playTime = useGame(s => s.playTime);
  const deaths = useGame(s => s.deaths);
  const karma = useGame(s => s.karma);
  const upgrade = useGame(s => s.upgradeBusiness);
  const businessPrice = useGame(s => s.businessPrice);
  if (!show) return null;

  const p = runtime.player.pos;
  const ownedCount = Object.keys(owned).length;
  const worth = money + BUSINESSES.reduce((a, b) => a + (owned[b.id] ? businessPrice(b.id) * (1 + (owned[b.id] - 1) * 0.6) : 0), 0);

  return (
    <div className="panel wide">
      <div className="panel-head">
        <div>
          <div className="eyebrow">🏙️ Imperio</div>
          <div className="panel-title">Patrimonio {formatMoney(worth)} · Ingresos {formatMoney(income)}/s</div>
        </div>
        <button className="close" onClick={toggle}>✕</button>
      </div>

      <div className="columns">
        <div>
          <div className="section-title">Negocios ({ownedCount}/{BUSINESSES.length}) · Empleados {employees}/{MAX_EMPLOYEES} (+{employees * 10} %)</div>
          <div className="list compact">
            {BUSINESSES.map(b => {
              const lvl = owned[b.id] ?? 0;
              const d = Math.round(Math.hypot(b.pos[0] - p.x, b.pos[2] - p.z));
              return (
                <div key={b.id} className={`item ${lvl ? "active" : ""}`}>
                  <span className="item-icon">{b.icon}</span>
                  <div className="item-body">
                    <div className="item-name">{b.name} {lvl ? <span className="qty">Nv {lvl}{lvl >= MAX_BUSINESS_LEVEL ? " MAX" : ""}</span> : null}</div>
                    <div className="item-desc">
                      {lvl ? `+${formatMoney(businessIncome(b, lvl))}/s` : `${formatMoney(businessPrice(b.id))} · +${formatMoney(b.incomePerSec)}/s`} · a {d} m
                    </div>
                  </div>
                  {lvl > 0 && lvl < MAX_BUSINESS_LEVEL && (
                    <button className="btn btn-gold" disabled={money < upgradeCost(b, lvl)} onClick={() => upgrade(b.id)}>
                      Mejorar {formatMoney(upgradeCost(b, lvl))}
                    </button>
                  )}
                  {lvl === 0 && <span className="item-desc">Ve al marcador y pulsa B</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="section-title">Misiones ({completed.length}/{MISSIONS.length})</div>
          <div className="list compact">
            {MISSIONS.map((m, i) => {
              const done = completed.includes(m.id);
              const active = activeId === m.id;
              const avail = availableId === m.id;
              const locked = !done && !active && !avail;
              return (
                <div key={m.id} className={`item ${active ? "active" : ""} ${locked ? "locked" : ""}`}>
                  <span className="item-icon">{done ? "✅" : active ? "🎯" : avail ? "📋" : "🔒"}</span>
                  <div className="item-body">
                    <div className="item-name">{i + 1}. {locked ? "???" : m.title}</div>
                    <div className="item-desc">{locked ? "Completa la misión anterior" : active ? m.objective : done ? `Recompensa ${formatMoney(m.rewardMoney)}` : "Disponible: habla con quien la encarga"}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="section-title">Estadísticas</div>
          <div className="stats-grid">
            <div><b>{fmtTime(playTime)}</b><span>jugado</span></div>
            <div><b>{formatMoney(totalEarned)}</b><span>ganado</span></div>
            <div><b>{killCount}</b><span>bajas</span></div>
            <div><b>{defeatedBosses.length}/4</b><span>jefes</span></div>
            <div><b>{deaths}</b><span>muertes</span></div>
            <div><b>{karma > 0 ? "+" : ""}{karma}</b><span>karma</span></div>
          </div>
        </div>
      </div>
      <div className="panel-foot">Tab o Esc para cerrar</div>
    </div>
  );
}
