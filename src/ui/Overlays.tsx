import { useGame, formatMoney } from "../lib/gameStore";
import { MISSIONS, missionById } from "../lib/gameData";
import { sfx } from "../lib/audio";

export function HelpPanel() {
  const show = useGame(s => s.showHelp);
  const toggle = useGame(s => s.toggleHelp);
  if (!show) return null;
  return (
    <div className="panel">
      <div className="panel-head">
        <div><div className="eyebrow">❓ Ayuda</div><div className="panel-title">Controles y consejos</div></div>
        <button className="close" onClick={toggle}>✕</button>
      </div>
      <div className="controls-box left">
        <div><kbd>W A S D</kbd> Moverse · <kbd>Shift</kbd> Correr · <kbd>Espacio</kbd> Saltar · <kbd>Rueda</kbd> Zoom de cámara</div>
        <div><kbd>Ratón</kbd> Girar la cámara (haz clic en el juego para capturarlo)</div>
        <div><kbd>Clic izq.</kbd> Atacar · <kbd>1 2 3</kbd> / <kbd>Q</kbd> Cambiar arma · <kbd>R</kbd> Usar kit médico</div>
        <div><kbd>F</kbd> Hablar con NPC · <kbd>E</kbd> Entrar/salir del coche · <kbd>B</kbd> Comprar negocio · <kbd>U</kbd> Mejorar negocio</div>
        <div><kbd>I</kbd> Inventario · <kbd>Tab</kbd> Panel de imperio · <kbd>M</kbd> Silenciar · <kbd>Esc</kbd> Pausa</div>
        <div>En coche: <kbd>W/S</kbd> acelerar/frenar · <kbd>A/D</kbd> girar · <kbd>Espacio</kbd> freno de mano</div>
      </div>
      <div className="section-title">Consejos</div>
      <ul className="tips">
        <li>El marcador «!» amarillo sobre un asesor indica que tiene una misión para ti.</li>
        <li>Los negocios generan dinero cada segundo; mejóralos (U) hasta el nivel 3.</li>
        <li>Contrata ciudadanos (F → Contratar): cada empleado suma un 10 % a los ingresos.</li>
        <li>Atacar civiles baja el karma y atrae a la policía. Aléjate para perder las estrellas.</li>
        <li>La salud se regenera lentamente si no recibes daño durante unos segundos.</li>
        <li>Si mueres despiertas en el hospital y pagas el 10 % de tu dinero.</li>
      </ul>
      <div className="panel-foot">H o Esc para cerrar</div>
    </div>
  );
}

export function PauseMenu() {
  const phase = useGame(s => s.phase);
  const resume = useGame(s => s.resume);
  const saveGame = useGame(s => s.saveGame);
  const quit = useGame(s => s.quitToMenu);
  const muted = useGame(s => s.muted);
  const toggleMuted = useGame(s => s.toggleMuted);
  const toggleHelp = useGame(s => s.toggleHelp);
  const abandon = useGame(s => s.abandonMission);
  const active = useGame(s => missionById(s.activeMissionId));
  const notify = useGame(s => s.notify);
  if (phase !== "paused") return null;
  return (
    <div className="overlay">
      <div className="panel">
        <div className="panel-head"><div><div className="eyebrow">⏸ Pausa</div><div className="panel-title">CEO Empire</div></div></div>
        <div className="menu-list">
          <button className="btn btn-gold big" onClick={() => { sfx.click(); resume(); }}>▶ Continuar</button>
          <button className="btn big" onClick={() => { sfx.click(); saveGame(); notify("Partida guardada.", "success"); }}>💾 Guardar partida</button>
          <button className="btn big" onClick={() => { sfx.click(); resume(); toggleHelp(); }}>❓ Controles y consejos</button>
          <button className="btn big" onClick={() => { sfx.click(); toggleMuted(); }}>{muted ? "🔇 Sonido: apagado" : "🔊 Sonido: encendido"}</button>
          {active && <button className="btn big btn-red" onClick={() => { sfx.click(); abandon(); resume(); }}>✖ Abandonar «{active.title}»</button>}
          <button className="btn big btn-red" onClick={() => { sfx.click(); quit(); }}>🚪 Guardar y salir al menú</button>
        </div>
        <div className="panel-foot">Esc para continuar</div>
      </div>
    </div>
  );
}

export function DeadScreen() {
  const phase = useGame(s => s.phase);
  const respawn = useGame(s => s.respawn);
  const money = useGame(s => s.money);
  const deaths = useGame(s => s.deaths);
  if (phase !== "dead") return null;
  return (
    <div className="dead-screen">
      <div style={{ fontSize: 64 }}>💀</div>
      <h1>ELIMINADO</h1>
      <p>Tu imperio ha caído… por ahora. El hospital cobrará {formatMoney(Math.floor(money * 0.1))} (10 %).</p>
      <p className="dim">Muertes: {deaths + 1}</p>
      <button className="start-btn" onClick={() => { sfx.select(); respawn(); }}>🏥 Despertar en el hospital</button>
    </div>
  );
}

export function VictoryScreen() {
  const phase = useGame(s => s.phase);
  const setPhase = (p: "playing") => useGame.setState({ phase: p });
  const quit = useGame(s => s.quitToMenu);
  const money = useGame(s => s.money);
  const playTime = useGame(s => s.playTime);
  const killCount = useGame(s => s.killCount);
  const owned = useGame(s => Object.keys(s.ownedBusinesses).length);
  const employees = useGame(s => s.employees);
  const karma = useGame(s => s.karma);
  const deaths = useGame(s => s.deaths);
  const character = useGame(s => s.selectedCharacter);
  if (phase !== "victory") return null;
  const m = Math.round(playTime / 60);
  return (
    <div className="victory-screen">
      <div className="confetti" />
      <div style={{ fontSize: 72 }}>👑</div>
      <h1 className="game-title">CEO DEL AÑO</h1>
      <p>Has completado las {MISSIONS.length} misiones y cerrado el trato del siglo. La ciudad es tuya.</p>
      <div className="stats-grid big">
        <div><b>{formatMoney(money)}</b><span>fortuna</span></div>
        <div><b>{owned}/8</b><span>negocios</span></div>
        <div><b>{employees}</b><span>empleados</span></div>
        <div><b>{killCount}</b><span>rivales</span></div>
        <div><b>{m} min</b><span>tiempo</span></div>
        <div><b>{deaths}</b><span>muertes</span></div>
        <div><b>{karma > 0 ? "+" : ""}{karma}</b><span>karma</span></div>
        <div><b>{character}</b><span>CEO</span></div>
      </div>
      <div className="menu-buttons">
        <button className="start-btn" onClick={() => { sfx.select(); setPhase("playing"); }}>🏙️ Seguir jugando (modo libre)</button>
        <button className="btn big" onClick={() => { sfx.click(); quit(); }}>🚪 Volver al menú</button>
      </div>
      <div className="menu-footer">CEO Empire · Shopy Crafter</div>
    </div>
  );
}
