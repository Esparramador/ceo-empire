import { useEffect, useState } from "react";
import { useGame } from "../lib/gameStore";
import { CHARACTERS } from "../lib/gameData";
import { sfx, unlockAudio } from "../lib/audio";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

export function MainMenu() {
  const [selected, setSelected] = useState(useGame.getState().selectedCharacter || "alec");
  const [showControls, setShowControls] = useState(false);
  const hasSave = useGame(s => s.hasSave);
  const newGame = useGame(s => s.newGame);
  const continueGame = useGame(s => s.continueGame);
  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(hasWebGL()); }, []);

  const start = () => { unlockAudio(); sfx.select(); newGame(selected); };
  const cont = () => { unlockAudio(); sfx.select(); continueGame(); };

  return (
    <div className="main-menu">
      <div className="menu-bg" />
      <div className="menu-content">
        <h1 className="game-title">CEO EMPIRE</h1>
        <p className="game-subtitle">Shopy Crafter — Mundo abierto</p>

        {!webgl && (
          <div className="warning-box">Tu navegador no soporta WebGL. Prueba con Chrome, Edge o Firefox actualizados.</div>
        )}

        <p className="menu-intro">
          Conviértete en el CEO más poderoso de la ciudad: completa 12 misiones, compra y mejora 8 negocios,
          contrata empleados, conduce, derrota a los CEOs rivales y cierra el trato del siglo.
        </p>

        <div className="menu-label">Elige tu CEO</div>
        <div className="char-grid">
          {CHARACTERS.map(c => (
            <button
              key={c.key}
              className={`char-card ${selected === c.key ? "selected" : ""}`}
              onClick={() => { unlockAudio(); sfx.click(); setSelected(c.key); }}
            >
              <span className="char-icon">{c.icon}</span>
              <div className="char-name">{c.label}</div>
              <div className="char-desc">{c.description}</div>
              <div className="char-perk">★ {c.perk}</div>
            </button>
          ))}
        </div>

        <div className="menu-buttons">
          <button className="start-btn" onClick={start} disabled={!webgl}>🚀 Nueva partida</button>
          {hasSave && <button className="start-btn secondary" onClick={cont} disabled={!webgl}>💾 Continuar</button>}
          <button className="btn" onClick={() => { sfx.click(); setShowControls(v => !v); }}>🎮 Controles</button>
        </div>

        {showControls && (
          <div className="controls-box">
            <div><kbd>W A S D</kbd> Moverse · <kbd>Shift</kbd> Correr · <kbd>Espacio</kbd> Saltar · <kbd>Ratón</kbd> Cámara (clic para capturar)</div>
            <div><kbd>Clic izq.</kbd> Atacar · <kbd>1 2 3</kbd> / <kbd>Q</kbd> Cambiar arma · <kbd>R</kbd> Usar kit médico</div>
            <div><kbd>F</kbd> Hablar · <kbd>E</kbd> Entrar/salir del coche · <kbd>B</kbd> Comprar negocio · <kbd>U</kbd> Mejorar negocio</div>
            <div><kbd>I</kbd> Inventario · <kbd>Tab</kbd> Imperio · <kbd>H</kbd> Ayuda · <kbd>M</kbd> Sonido · <kbd>Esc</kbd> Pausa</div>
          </div>
        )}

        <div className="menu-footer">Se guarda automáticamente en tu navegador. Recomendado: Chrome o Edge en escritorio.</div>
      </div>
    </div>
  );
}
