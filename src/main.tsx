import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useGame } from "./lib/gameStore";
import { runtime, input, camera } from "./lib/world";
import { NPC_CONFIGS } from "./lib/gameData";

// Hook de depuración/pruebas: solo con ?debug=1 en la URL
if (new URLSearchParams(location.search).has("debug")) {
  (window as unknown as { __CEO: unknown }).__CEO = { useGame, runtime, input, camera, NPC_CONFIGS };
}

createRoot(document.getElementById("root")!).render(<App />);
