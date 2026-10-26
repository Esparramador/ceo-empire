# CEO Empire 🎩👑

> Juego 3D de mundo abierto en el navegador, estilo GTA — React Three Fiber + Zustand + Vite, con la ciudad, los coches y los personajes modelados en Blender.

La historia del CEO de **Shopy Crafter**: de un pequeño marketplace para creadores a un imperio que sale a bolsa. Una ciudad de 25 manzanas, 14 misiones principales en 5 actos, 11 secundarias, 9 negocios con ingresos pasivos, empleados, coches conducibles, combate, policía, el Club Diamante, ciclo día/noche y guardado automático.

## 📖 Historia

- **Acto I — El garaje**: *El Inicio del Imperio* (el maletín con los datos de los primeros mil crafters, en el Shopy HQ), *Expansión de Mercado* (la Cafetería Digital, primer showroom) y una entrega contrarreloj en coche.
- **Acto II — Competencia sucia**: Lord Tuétano vende copias baratas con un ejército de esqueletos. Limpia el noreste y, en *El Rival Amenaza*, derríbalo ante su guarida.
- **Acto III — Crecimiento**: *Imperio Imparable* (cuatro negocios), los chips de datos filtrados, la contratación de talento y la compra del Club Diamante.
- **Acto IV — Guerra de mercado**: Corporación Titán manda a sus mercenarios (Guerrero Carmesí y Guerrero Sombrío), llegas a seis negocios y persigues en coche a Víctor Salas, el CFO que vendía los datos.
- **Acto V — La salida a bolsa**: la Torre de Hielo de Titán, guardada por el Conde Glaciar y el Dragón de Hielo, y *CEO del Año*: la firma en el helipuerto.

Las cinco misiones originales del juego (en cursiva) forman la columna de la campaña. Secundarias: reparto express, dos carreras, taxi nocturno, rescate de la becaria, los matones del club, cazarrecompensas, **Los Socios de Tuétano** (Barón Bombón y Malvik el Especulador), el reto del bárbaro, campaña de carteles e inversión ángel.

## 🎮 Jugabilidad

- **Ciudad de Blender**: calles con marcas viales y pasos de cebra, aceras elevadas, rascacielos con ventanas que se encienden de noche, parques, fuente, farolas con luz real cerca del jugador, semáforos y mobiliario. Los edificios son sólidos.
- **Lugares de la historia** en sus propios solares: la plaza y la torre del Shopy HQ, la armería del Vendedor, el Club Diamante (terraza, escenario, DJ, barra, neones, ingresos x2 de noche), el helipuerto, la guarida de Tuétano y el ring de Don Rufo, la Fortaleza Carmesí, el desguace del Chatarrero, el Bastión Sombrío y la Torre de Hielo.
- **8 coches modelados en Blender** con física arcade (batalla, giro según velocidad, freno de mano, luces de freno y faros de noche): Rosso CEO, Toro Azul, Volt Verde, Dorado Royale, Bianco GT, el Taxi Crafter, la Patrulla y el sedán de Víctor (persecución con IA).
- **Combate**: puños, bate y pistola con munición; enemigos con vida, botín y reaparición; jefes con barra de vida.
- **Policía y estrellas de búsqueda** al atacar civiles; bajan con el tiempo si te alejas.
- **Negocios mejorables** (3 niveles), **empleados** (+10 % cada uno), tienda, objetos por la ciudad.
- **HUD** completo, minimapa con objetivo y distancia, panel de imperio, pausa, ayuda, muerte con reaparición en el hospital y pantalla de victoria.
- **Sonido sintetizado** con WebAudio (sin ficheros).
- **Guardado automático** en el navegador y botón «Continuar». Empezar de cero pide confirmación si hay partida guardada.

## 🕹️ Controles

| Tecla | Acción |
|-------|--------|
| `W A S D` / flechas | Moverse · en coche: acelerar, frenar y girar |
| Ratón (clic en el juego para capturar) | Girar la cámara · rueda = zoom |
| `Shift` | Correr |
| `Espacio` | Saltar · freno de mano en coche |
| Clic izquierdo | Atacar / disparar |
| `1` `2` `3` / `Q` | Cambiar de arma |
| `R` | Usar kit médico |
| `F` | Hablar con un NPC (misiones, tienda, contratar) |
| `E` | Entrar / salir del coche |
| `B` / `U` | Comprar / mejorar el negocio cercano |
| `I` · `Tab` · `H` · `M` | Inventario · panel de imperio · ayuda · silenciar |
| `Esc` | Pausa / cerrar ventanas |

## 🚀 Puesta en marcha

Node 20 o superior.

```bash
npm install
npm run dev        # http://localhost:5173 (PORT=xxxx para cambiarlo)
npm test           # pruebas (Vitest): historia, estado, ciudad y colisiones
npm run build      # comprobación de tipos + build de producción en dist/public
npm run preview    # sirve el build de producción
```

Variables opcionales: `PORT` y `BASE_PATH` (ruta base para desplegar en una subcarpeta). Con `?debug=1` en la URL, la consola tiene `window.__CEO` (estado, mundo en vivo e input) para pruebas.

## 🧩 Modelos 3D

### Cadena de Blender (`blender/`)

La ciudad, los coches, el mobiliario y los personajes sustitutos salen de scripts de Python para Blender y se exportan como GLB a `public/assets/generated/`. El trazado de la ciudad, que usan las colisiones, va a `src/lib/cityLayout.json`.

```bash
npm run build:assets                                     # todo (necesita bpy: pip install bpy==4.2.0)
blender -b -P blender/build_assets.py -- --only cars     # o con Blender instalado: cars|characters|props|city
python3 blender/preview.py public/assets/generated/vehicles/rosso_ceo.glb preview.png
```

En macOS, Blender necesita acceso a la GPU (Metal) incluso en modo `-b`. Para añadir un coche, añade un diseño a `CARS` en `blender/cars.py` (o una variante con `_variant`), regenera y añade la entrada en `VEHICLE_CONFIGS` (`src/lib/gameData.ts`).

### Personajes

Cada personaje busca, por este orden:
1. `public/assets/models/<nombre>.glb` (o `.stl`): modelos propios del autor. Los bustos reciben piernas animadas; la orientación, la altura y el modo de cada uno están en `MODEL_CONFIG` (`src/game/Characters.tsx`).
2. `public/assets/generated/characters/<nombre>.glb`: los muñecos de Blender (articulados: piernas y brazos se animan al andar, golpear y bailar).
3. El personaje generado por código, si no hay ninguno de los anteriores.

Los modelos del kit (`public/assets/kit/`) son de licencia libre (CC0 / MIT); orígenes y licencias en [`public/assets/kit/LICENSES.md`](public/assets/kit/LICENSES.md). No se usan personajes, nombres ni assets de otros juegos o franquicias.

## 📁 Estructura

```
src/
├── App.tsx                 # Menú / juego / capas de interfaz
├── lib/
│   ├── gameData.ts         # Historia, misiones, negocios, NPCs, coches, armas, tienda y lugares
│   ├── gameStore.ts        # Estado (Zustand) + guardado en localStorage
│   ├── world.ts            # Estado en tiempo real (posiciones, input, persecución)
│   ├── city.ts             # Trazado de la ciudad, altura del suelo, colisiones y línea de visión
│   ├── audio.ts · textures.ts · assets.ts
├── game/
│   ├── Game.tsx            # Canvas R3F + pantalla de carga
│   ├── World.tsx           # Ciudad de Blender + lugares de la historia + marcadores de negocio
│   ├── Characters.tsx      # Personajes: modelo propio → Blender → generado por código
│   ├── Player.tsx          # Movimiento, cámara, combate, recogida, ingresos, autoguardado
│   ├── NPCSystem.tsx       # IA de NPCs y policía, barras de vida
│   ├── VehicleSystem.tsx   # Coches de Blender, conducción y persecución
│   ├── MissionSystem.tsx   # Objetivos, cronómetro y baliza
│   ├── interactions.ts · npcLogic.ts · Pickups.tsx · KitModel.tsx · DayNight.tsx
└── ui/                     # Menú, HUD, minimapa, diálogo, inventario, imperio, intro y pantallas
blender/                    # Generadores de la ciudad, coches, mobiliario y personajes
```

## 📄 Licencia

MIT para el código. Los modelos de `public/assets/models/` son propiedad del autor del juego.
