import { Component, Suspense, type ReactNode } from "react";
import { useGame } from "./lib/gameStore";
import { MainMenu } from "./ui/MainMenu";
import { HUD } from "./ui/HUD";
import { MiniMap } from "./ui/MiniMap";
import { DialogBox } from "./ui/DialogBox";
import { Inventory } from "./ui/Inventory";
import { EmpirePanel } from "./ui/EmpirePanel";
import { HelpPanel, PauseMenu, DeadScreen, VictoryScreen } from "./ui/Overlays";
import { Game } from "./game/Game";

class GameErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="main-menu">
          <div className="menu-content">
            <h1 className="game-title">CEO EMPIRE</h1>
            <div className="warning-box">
              No se pudo iniciar el motor 3D: {this.state.error.message}. Comprueba que tu navegador tenga WebGL activado.
            </div>
            <button className="start-btn" onClick={() => { this.setState({ error: null }); useGame.setState({ phase: "menu" }); }}>Volver al menú</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Loading() {
  return (
    <div className="loading">
      <div className="game-title">CEO EMPIRE</div>
      <div className="dim">Construyendo la ciudad…</div>
    </div>
  );
}

export default function App() {
  const phase = useGame(s => s.phase);
  const inGame = phase !== "menu";

  return (
    <>
      {phase === "menu" && <MainMenu />}
      {inGame && (
        <GameErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Game />
          </Suspense>
          <HUD />
          <MiniMap />
          <DialogBox />
          <Inventory />
          <EmpirePanel />
          <HelpPanel />
          <PauseMenu />
          <DeadScreen />
          <VictoryScreen />
        </GameErrorBoundary>
      )}
    </>
  );
}
