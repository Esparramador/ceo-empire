import { useGame } from "../lib/gameStore";

export function DialogBox() {
  const dialog = useGame(s => s.dialog);
  const closeDialog = useGame(s => s.closeDialog);
  const money = useGame(s => s.money);
  if (!dialog.open) return null;

  return (
    <div className="dialog-box">
      <div className="dialog-head">
        <div>
          <div className="eyebrow">💬 Diálogo · Saldo {money.toLocaleString("es-ES")} $</div>
          <div className="dialog-name">{dialog.name}</div>
        </div>
        <button className="close" onClick={closeDialog} aria-label="Cerrar">✕</button>
      </div>
      <div className="dialog-text">{dialog.text}</div>
      <div className="dialog-options">
        {dialog.options.map((o, i) => (
          <button key={i} className={`btn ${i === 0 ? "btn-gold" : ""}`} disabled={o.disabled} onClick={o.onSelect} title={o.hint}>
            <span className="num">{i + 1}</span> {o.label}
            {o.hint && <span className="hint-text">{o.hint}</span>}
          </button>
        ))}
      </div>
      <div className="dialog-foot">Pulsa el número de la opción o Esc para cerrar</div>
    </div>
  );
}
