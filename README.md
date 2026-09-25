# CEO Empire 🎩👑

> Juego 3D de mundo abierto en el navegador, estilo GTA — React Three Fiber + Zustand + Vite.

Parte de la plataforma **Shopy Crafter**. Eres un CEO que construye su imperio en una ciudad
de 49 manzanas: misiones, negocios con ingresos pasivos, empleados, coches, combate, policía,
ciclo día/noche y guardado automático.

## 🎮 Jugabilidad

- **Ciudad procedural** de 7×7 manzanas con calles, aceras, farolas con luz real, parques,
  rascacielos con ventanas iluminadas de noche, HQ, helipuerto, kiosco del Vendedor y 4 guaridas.
- **12 misiones con historia**: recoger, comprar, entrega cronometrada, eliminar matones,
  jefes, expansión, recolección de chips, contratación… hasta «CEO del Año» y pantalla de victoria.
- **8 negocios comprables y mejorables** (3 niveles) que generan dinero cada segundo;
  **6 empleados** contratables (+10 % ingresos cada uno).
- **Combate**: puños, bate y pistola con munición; enemigos con vida, botín, reaparición;
  **4 jefes** únicos (Lord Tuétano, Guerrero Carmesí, Guerrero Sombrío, Dragón de Hielo) con barra de vida.
- **Policía y nivel de búsqueda** (5 estrellas) por atacar civiles; se disipa con el tiempo.
- **6 coches conducibles** con aceleración, giro, freno de mano, choques y atropellos.
- **Objetos por la ciudad**: maletines de dinero, kits médicos, munición.
- **Ciclo día/noche** de 20 minutos con sol, luna, estrellas, niebla y ventanas encendidas.
- **HUD completo**: salud, karma, dinero, ingresos, búsqueda, reloj, arma, misión, cronómetro,
  pistas contextuales, notificaciones, barra de jefe, minimapa con objetivo y distancia.
- **Modelos 3D propios** (CEO Crafter jugable, Lord Tuétano, Guerrero Carmesí, Guerrero Sombrío y
  Dragón de Hielo, optimizados a WebP y 5,7 MB en total) más **personajes generados por código**
  (3 CEOs jugables, 12 ciudadanos, matones y policías) con animaciones.
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

## 🧩 Modelos 3D

Los modelos de `public/assets/models/` se cargan automáticamente (ver
[`public/assets/models/README.md`](public/assets/models/README.md)). Los bustos cortados por la
cintura reciben piernas procedurales animadas; la orientación, altura y modo de cada modelo se
ajustan en `MODEL_CONFIG` (`src/game/Characters.tsx`). Si un modelo falta o falla, se usa el
personaje procedural equivalente. Para añadir más, copia el `.glb` (o `.stl`) con el nombre esperado.

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
