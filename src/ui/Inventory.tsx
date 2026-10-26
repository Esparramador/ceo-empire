import { useGame, formatMoney } from "../lib/gameStore";
import { WEAPONS, WEAPON_ORDER } from "../lib/gameData";

export function Inventory() {
  const show = useGame(s => s.showInventory);
  const inventory = useGame(s => s.inventory);
  const weapons = useGame(s => s.weapons);
  const activeWeapon = useGame(s => s.activeWeapon);
  const ammo = useGame(s => s.ammo);
  const money = useGame(s => s.money);
  const toggle = useGame(s => s.toggleInventory);
  const useItem = useGame(s => s.useItem);
  const setActiveWeapon = useGame(s => s.setActiveWeapon);
  if (!show) return null;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">🎒 Inventario</div>
          <div className="panel-title">Objetos del CEO · {formatMoney(money)}</div>
        </div>
        <button className="close" onClick={toggle}>✕</button>
      </div>

      <div className="section-title">Armas (1/2/3 o Q para cambiar)</div>
      <div className="list">
        {WEAPON_ORDER.map(id => {
          const w = WEAPONS[id];
          const owned = weapons.includes(id);
          return (
            <div key={id} className={`item ${activeWeapon === id ? "active" : ""} ${owned ? "" : "locked"}`}>
              <span className="item-icon">{w.icon}</span>
              <div className="item-body">
                <div className="item-name">{w.name}{activeWeapon === id ? " · equipada" : ""}</div>
                <div className="item-desc">{w.description} Daño {w.damage} · alcance {w.range} m{w.ranged ? ` · munición ${ammo}` : ""}</div>
              </div>
              {owned ? (
                <button className="btn btn-gold" disabled={activeWeapon === id} onClick={() => setActiveWeapon(id)}>Equipar</button>
              ) : (
                <span className="item-desc">Se compra al Vendedor · {formatMoney(w.price)}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="section-title">Objetos</div>
      {inventory.length === 0 ? (
        <div className="empty">El inventario está vacío</div>
      ) : (
        <div className="list">
          {inventory.map(item => (
            <div key={item.id} className="item">
              <span className="item-icon">{item.icon}</span>
              <div className="item-body">
                <div className="item-name">{item.name} <span className="qty">×{item.quantity}</span></div>
                {item.description && <div className="item-desc">{item.description}</div>}
              </div>
              {item.type === "health" && <button className="btn btn-gold" onClick={() => useItem(item.id)}>Usar (R)</button>}
            </div>
          ))}
        </div>
      )}
      <div className="panel-foot">I o Esc para cerrar</div>
    </div>
  );
}
