import { useEffect, useState } from "react";
import { useGame } from "../lib/gameStore";
import { STORY } from "../lib/gameData";
import { sfx } from "../lib/audio";

export function StoryIntro() {
  const phase = useGame(s => s.phase);
  const startPlaying = useGame(s => s.startPlaying);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (phase !== "intro") return;
    setShown(0);
    const id = setInterval(() => setShown(n => Math.min(STORY.intro.length, n + 1)), 1400);
    return () => clearInterval(id);
  }, [phase]);
  if (phase !== "intro") return null;
  return (
    <div className="story-screen">
      <div className="story-box">
        <div className="eyebrow">Shopy Crafter presenta</div>
        <h1 className="game-title">{STORY.title}</h1>
        <div className="story-sub">{STORY.subtitle}</div>
        <div className="story-text">
          {STORY.intro.map((p, i) => <p key={i} className={i < shown ? "in" : ""}>{p}</p>)}
        </div>
        <div className="story-acts">
          {STORY.acts.map(a => <span key={a.id}>{a.title}</span>)}
        </div>
        <button className="start-btn" onClick={() => { sfx.select(); startPlaying(); }}>▶ Empezar la historia</button>
        <div className="menu-footer">Misiones principales: marcador «!» amarillo · Secundarias: marcador «?» azul · H para ayuda</div>
      </div>
    </div>
  );
}

export function ActBanner() {
  const banner = useGame(s => s.actBanner);
  const clear = useGame(s => s.clearActBanner);
  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(clear, 4500);
    return () => clearTimeout(id);
  }, [banner, clear]);
  if (!banner) return null;
  return (
    <div className="act-banner">
      <div className="act-line" />
      <div className="act-title">{banner}</div>
      <div className="act-line" />
    </div>
  );
}
