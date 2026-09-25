# CEO Empire 🎩👑

> Juego 3D de mundo abierto en el navegador, estilo GTA — React Three Fiber + Zustand + Vite.

La historia del CEO de **Shopy Crafter** (shopycrafter.com): de un pequeño marketplace para
creadores a un imperio que sale a bolsa. Ciudad de 49 manzanas, 14 misiones principales en
5 actos, 9 misiones secundarias, negocios con ingresos pasivos, empleados, coches, combate,
policía, el Club Diamante, ciclo día/noche y guardado automático.

## 📖 Historia

- **Acto I — El garaje**: recupera la base de datos de los primeros mil crafters, abre el primer showroom y firma la campaña de marketing.
- **Acto II — Competencia sucia**: Lord Tuétano vende copias baratas de los productos de tus crafters con un ejército de esqueletos. Límpialo del noreste.
- **Acto III — Crecimiento**: expansión a 4 negocios, recuperación de datos filtrados, contratación de talento y compra del Club Diamante para sentarte con los inversores.
- **Acto IV — Guerra de mercado**: Corporación Titán contrata mercenarios (Guerrero Carmesí y Sombrío), llegas a 6 negocios y descubres al topo: Víctor Salas, tu CFO, huye con el disco maestro. Persecución en coche.
- **Acto V — La salida a bolsa**: destruye la IA-dragón que protege el centro de datos de Titán y firma la salida a bolsa en el helipuerto.

Secundarias: reparto express, dos carreras contrarreloj, taxi nocturno, rescate de la becaria,
limpiar el club de matones, cazarrecompensas, el reto del bárbaro en el ring clandestino,
campaña de carteles e inversión ángel en una artesana.

## 🎮 Jugabilidad

- **Ciudad procedural** de 7×7 manzanas con calles, aceras, farolas con luz real, parques,
  rascacielos con ventanas iluminadas de noche, HQ, helipuerto, kiosco del Vendedor y 4 guaridas.
- **14 misiones principales en 5 actos + 9 secundarias**: entregas cronometradas, carreras por
  puntos de control, persecución en coche con IA, eliminar grupos, jefes, expansión, recolección,
  contratación, inversión con retorno… hasta la salida a bolsa y la pantalla de victoria.
- **9 negocios comprables y mejorables** (3 niveles) que generan dinero cada segundo, incluido
  el **Club Diamante** (ingresos x2 de noche, bailarinas, DJ, barra, neones); **6 empleados** (+10 % cada uno).
- **Combate**: puños, bate y pistola con munición; enemigos con vida, botín, reaparición;
  **4 jefes** únicos (Lord Tuétano, Guerrero Carmesí, Guerrero Sombrío, Dragón de Hielo) con barra de vida.
- **Policía y nivel de búsqueda** (5 estrellas) por atacar civiles; se disipa con el tiempo.
- **6 coches conducibles** con aceleración, giro, freno de mano, choques y atropellos.
- **Objetos por la ciudad**: maletines de dinero, kits médicos, munición.
- **Ciclo día/noche** de 20 minutos con sol, luna, estrellas, niebla y ventanas encendidas.
- **HUD completo**: salud, karma, dinero, ingresos, búsqueda, reloj, arma, misión, cronómetro,
  pistas contextuales, notificaciones, barra de jefe, minimapa con objetivo y distancia.
- **Modelos 3D propios** (CEO Crafter jugable, Lord Tuétano, Guerrero Carmesí, Guerrero Sombrío y
  Dragón de Hielo) + **assets CC0/MIT** (KayKit City Builder Bits, KayKit Adventurers y Skeletons
  con animaciones esqueléticas, Kenney City Kit) + **personajes generados por código** para el
  resto (CEOs jugables, ciudadanos, bailarinas, policía…). Todo optimizado a WebP: ~12 MB.
- **Sonido sintetizado** (WebAudio, sin ficheros): golpes, disparos, caja, motor, sirena, jingles.
- **Guardado automático** en el navegador y botón «Continuar»; muerte con reaparición en el hospital.

## 🕹️ Controles

| Tecla | Acción |
|-------|--------|
| `W A S D` / flechas | Moverse |
| Ratón (clic en el juego para capturar) | Girar la cámara · rueda = zoom |
| `Shift` | Correr |
| `Espacio` | Saltar · freno de mano en coche |
| Clic izquierdo | Atacar / disparar |
| `1` `2` `3` / `Q` | Cambiar de arma |
| `R` | Usar kit médico |
| `F` | Hablar con un NPC (misiones, tienda, contratar) |
| `E` | Entrar / salir del coche |
| `B` | Comprar negocio cercano |
| `U` | Mejorar negocio cercano |
| `I` | Inventario |
| `Tab` | Panel de imperio (negocios, misiones, estadísticas) |
| `H` | Ayuda |
| `M` | Silenciar |
| `Esc` | Pausa / cerrar ventanas |

## 🚀 Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve dist/
```

Variables opcionales: `PORT` (puerto) y `BASE_PATH` (ruta base para desplegar en subcarpeta).
Requiere un navegador con WebGL (Chrome, Edge o Firefox actualizados). Pensado para escritorio.

## 🧩 Modelos 3D y licencias

- `public/assets/models/` — modelos propios del autor (ver su README). Los bustos reciben piernas
  procedurales animadas; orientación/altura/modo en `MODEL_CONFIG` (`src/game/Characters.tsx`).
- `public/assets/kit/` — assets de terceros con licencia libre (CC0 / MIT), convertidos a GLB+WebP
  y con solo los clips de animación usados. Orígenes y licencias en
  [`public/assets/kit/LICENSES.md`](public/assets/kit/LICENSES.md):
  [KayKit City Builder Bits](https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0),
  [KayKit Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0),
  [KayKit Skeletons](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0),
  [Kenney Starter Kit City Builder](https://github.com/KenneyNL/Starter-Kit-City-Builder).
- Los personajes animados usan los clips por nombre (`Idle`, `Walking_A`, `Running_A`,
  `*_Attack_*`, `Hit_A`, `Death_A`, `Cheer`, `Sit_Chair_Idle`). Cualquier GLB con esos nombres
  de clip funciona sin cambios de código.
- No se usan assets de GTA, WoW, LoL ni de ningún juego comercial: son propiedad de sus editores.

## 🏗️ Stack

- **React Three Fiber** + **three** — escena 3D, sombras, cielo con shader, luces dinámicas
- **@react-three/drei** — carga GLB y animaciones
- **Zustand** — estado del juego (progreso, economía, misiones, UI)
- **Vite** + **TypeScript** (modo estricto)

## 📁 Estructura

```
src/
├── App.tsx                 # Menú / juego / overlays
├── main.tsx
├── index.css               # Estilos del HUD y menús
├── lib/
│   ├── gameData.ts         # Misiones, negocios, NPCs, coches, armas, tienda y trazado de la ciudad
│   ├── gameStore.ts        # Store Zustand + guardado en localStorage
│   ├── world.ts            # Estado en tiempo real (posiciones, input) y colisiones
│   ├── audio.ts            # Efectos de sonido sintetizados
│   └── textures.ts         # Texturas generadas (ventanas, asfalto, césped, rótulos)
├── game/
│   ├── Game.tsx            # Canvas R3F
│   ├── World.tsx           # Ciudad: calles, edificios, parques, farolas, HQ, helipuerto…
│   ├── Characters.tsx      # Personajes procedurales + carga opcional GLB/STL
│   ├── Player.tsx          # Movimiento, cámara, combate, recogida, ingresos, autoguardado
│   ├── NPCSystem.tsx       # IA de NPCs, policía, barras de vida
│   ├── npcLogic.ts         # Daño, muerte y botín
│   ├── interactions.ts     # Diálogos, misiones, tienda, contratación
│   ├── VehicleSystem.tsx   # Coches y conducción
│   ├── MissionSystem.tsx   # Objetivos, cronómetro y baliza
│   ├── Pickups.tsx         # Objetos del mundo
│   └── DayNight.tsx        # Ciclo día/noche
└── ui/
    ├── MainMenu.tsx  HUD.tsx  MiniMap.tsx  DialogBox.tsx
    ├── Inventory.tsx  EmpirePanel.tsx  Overlays.tsx (pausa, ayuda, muerte, victoria)
    └── (src/components, src/hooks y src/pages son restos de plantilla no usados por el juego)
```

## 📄 Licencia

MIT
