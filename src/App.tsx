import { useGame } from "./lib/gameStore";
import { MainMenu } from "./ui/MainMenu";
import { HUD } from "./ui/HUD";
import { MiniMap } from "./ui/MiniMap";
import { DialogBox } from "./ui/DialogBox";
import { Inventory } from "./ui/Inventory";
import { Game } from "./game/Game";

function DeadScreen() {
  const reset = useGame(s => s.reset);
  return (
    <div className="dead-screen">
      <div style={{ fontSize: 64, marginBottom: 8 }}>💀</div>
      <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 8 }}>ELIMINADO</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
        Tu imperio ha caído... por ahora.
      </p>
      <button className="start-btn" onClick={reset}>
        🔄 Intentar de nuevo
      </button>
    </div>
  );
}

export default function App() {
  // Subscribe to the phase only: the store also changes ~10×/s while playing.
  const phase = useGame(s => s.phase);

  return (
    <>
      {phase === "menu" && <MainMenu />}

      {phase === "playing" && (
        <>
          <Game />
          <HUD />
          <MiniMap />
          <DialogBox />
          <Inventory />
        </>
      )}

      {phase === "dead" && <DeadScreen />}
    </>
  );
}
