// ─────────────────────────────────────────────────────────────────────────────
// Texturas generadas por código (canvas): ventanas de edificios, asfalto,
// aceras, césped y rótulos de texto. Sin dependencias de ficheros.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

function seeded(seed: number) {
  return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
}

/** Textura de fachada con ventanas. `style` cambia el patrón; devuelve {map, emissive}. */
export function windowTexture(style: number): { map: THREE.Texture; emissive: THREE.Texture } {
  const key = `win${style}`;
  const eKey = `winE${style}`;
  if (cache.has(key)) return { map: cache.get(key)!, emissive: cache.get(eKey)! };
  const size = 256;
  const c = canvas(size, size);
  const e = canvas(size, size);
  const g = c.getContext("2d")!;
  const ge = e.getContext("2d")!;
  const rnd = seeded(1000 + style * 77);
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, size, size);
  ge.fillStyle = "#000000"; ge.fillRect(0, 0, size, size);
  const cols = style === 2 ? 4 : style === 3 ? 3 : 6;
  const rows = style === 3 ? 3 : 6;
  const cw = size / cols, rh = size / rows;
  const padX = cw * (style === 1 ? 0.12 : 0.22), padY = rh * (style === 0 ? 0.3 : 0.22);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cw + padX, y = j * rh + padY, w = cw - padX * 2, h = rh - padY * 2;
      const shade = 0.45 + rnd() * 0.25;
      g.fillStyle = `rgba(${Math.floor(60 * shade)},${Math.floor(90 * shade)},${Math.floor(130 * shade)},1)`;
      g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x, y, w, h * 0.3);
      const lit = rnd() < 0.55;
      if (lit) {
        const warm = rnd() < 0.7;
        ge.fillStyle = warm ? `rgba(255,${200 + Math.floor(rnd() * 40)},120,1)` : "rgba(170,210,255,1)";
        ge.fillRect(x, y, w, h);
      }
    }
  }
  const map = new THREE.CanvasTexture(c);
  const emissive = new THREE.CanvasTexture(e);
  for (const t of [map, emissive]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  cache.set(key, map); cache.set(eKey, emissive);
  return { map, emissive };
}

export function asphaltTexture(): THREE.Texture {
  if (cache.has("asphalt")) return cache.get("asphalt")!;
  const size = 256;
  const c = canvas(size, size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#2b2b33"; g.fillRect(0, 0, size, size);
  const rnd = seeded(42);
  for (let i = 0; i < 1400; i++) {
    const v = 30 + Math.floor(rnd() * 30);
    g.fillStyle = `rgba(${v},${v},${v + 6},0.6)`;
    g.fillRect(rnd() * size, rnd() * size, 2, 2);
  }
  // línea discontinua central (a lo largo del eje Y del canvas)
  g.fillStyle = "#e8c53a";
  g.fillRect(size / 2 - 3, 20, 6, 96);
  g.fillRect(size / 2 - 3, 148, 6, 96);
  // bordes
  g.fillStyle = "#d8d8d8";
  g.fillRect(4, 0, 3, size);
  g.fillRect(size - 7, 0, 3, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set("asphalt", t);
  return t;
}

export function sidewalkTexture(): THREE.Texture {
  if (cache.has("sidewalk")) return cache.get("sidewalk")!;
  const size = 128;
  const c = canvas(size, size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#9a9a9a"; g.fillRect(0, 0, size, size);
  g.strokeStyle = "#7c7c7c"; g.lineWidth = 2;
  for (let i = 0; i <= size; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, size); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(size, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set("sidewalk", t);
  return t;
}

export function grassTexture(): THREE.Texture {
  if (cache.has("grass")) return cache.get("grass")!;
  const size = 128;
  const c = canvas(size, size);
  const g = c.getContext("2d")!;
  g.fillStyle = "#3f7a34"; g.fillRect(0, 0, size, size);
  const rnd = seeded(7);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = rnd() < 0.5 ? "#4c8c3c" : "#356b2c";
    g.fillRect(rnd() * size, rnd() * size, 2, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set("grass", t);
  return t;
}

/** Rótulo de texto como textura para un Sprite. */
export function textTexture(text: string, opts?: { color?: string; bg?: string; size?: number; icon?: string }): THREE.Texture {
  const key = `txt:${text}:${opts?.color}:${opts?.bg}:${opts?.icon}`;
  if (cache.has(key)) return cache.get(key)!;
  const fontSize = opts?.size ?? 40;
  const c = canvas(512, 128);
  const g = c.getContext("2d")!;
  g.font = `900 ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
  const label = `${opts?.icon ? opts.icon + " " : ""}${text}`;
  const w = Math.min(500, g.measureText(label).width + 40);
  g.fillStyle = opts?.bg ?? "rgba(0,0,0,0.75)";
  const x = (512 - w) / 2;
  g.beginPath();
  g.roundRect(x, 16, w, 96, 20);
  g.fill();
  g.strokeStyle = opts?.color ?? "#ffd700";
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = opts?.color ?? "#ffd700";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(label, 256, 64, w - 20);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}
