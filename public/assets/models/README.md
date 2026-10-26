# Modelos 3D opcionales

Si copias aquí modelos `.glb` (recomendado) o `.stl`, se usan automáticamente.
Sin ellos, el juego usa el muñeco de Blender (`assets/generated/characters`) y,
si tampoco existe, el personaje generado por código. Nombres reconocidos:

| Fichero                 | Personaje                       | Incluido |
|-------------------------|---------------------------------|----------|
| `ceo_crafter.glb`       | CEO Crafter (jugable)           | ✅ busto |
| `lord_tuetano.glb`      | Lord Tuétano (jefe)             | ✅       |
| `guerrero.glb`          | Guerrero Carmesí (jefe)         | ✅ busto |
| `guerrero_2.glb`        | Guerrero Sombrío (jefe)         | ✅ busto |
| `mini_dragon_blue.glb`  | Dragón de Hielo (jefe final)    | ✅       |
| `chico_formal.glb`      | CEO Formal / D. García          | —        |
| `chica_ejecutiva.glb`   | CEO Ejecutiva / María           | —        |
| `chica_creativa.glb`    | CEO Creativa / Elena            | —        |
| `chico_casual.glb`      | Ciudadanos (Carlos…)            | —        |
| `ceo_magnate.glb`       | CEO Magnate (jugable)           | —        |
| `baron_bombon.glb`      | Barón Bombón (jefe secundario)  | —        |
| `malvik.glb`            | Malvik el Especulador (jefe secundario) | — |
| `conde_glaciar.glb`     | Conde Glaciar (jefe)            | —        |

Los modelos marcados como «busto» están cortados por la cintura: el juego les monta
piernas procedurales animadas para que caminen. La orientación, escala y modo de cada
modelo se configura en `src/game/Characters.tsx` (`MODEL_CONFIG`).

- Los GLB se escalan automáticamente a 1,8 m de altura y se centran en los pies.
- Si el GLB tiene animaciones, se usan por nombre: `idle`/`stand`, `walk`/`run`,
  `attack`/`punch`/`hit`, `death`/`die` (si no hay coincidencia, se usa la primera).
- Los `.stl` se cargan como malla sólida (Z hacia arriba) con el color del traje del personaje.
- Si un fichero falla al cargar, el juego vuelve al personaje procedural sin romperse.
