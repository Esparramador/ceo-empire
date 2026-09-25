# Modelos 3D opcionales

El juego funciona sin ficheros externos (personajes generados por código).
Si copias aquí modelos `.glb` (recomendado) o `.stl`, se usarán automáticamente
en lugar del personaje procedural. Nombres reconocidos:

| Fichero                 | Personaje                |
|-------------------------|--------------------------|
| `alec_monopoly.glb`     | Alec CEO (jugable)       |
| `chico_formal.glb`      | CEO Formal / D. García   |
| `chica_ejecutiva.glb`   | CEO Ejecutiva / María    |
| `chica_creativa.glb`    | CEO Creativa / Elena     |
| `chico_casual.glb`      | Ciudadanos (Carlos…)     |
| `lord_tuetano.glb`      | Lord Tuétano (jefe)      |
| `illidan.glb`           | Illidan Marcados (jefe)  |
| `majin_bu.glb`          | Majin CEO (jefe)         |
| `arthas.glb`            | Arthas, Rey Exánime      |

- Los GLB se escalan automáticamente a 1,8 m de altura y se centran en los pies.
- Si el GLB tiene animaciones, se usan por nombre: `idle`/`stand`, `walk`/`run`,
  `attack`/`punch`/`hit`, `death`/`die` (si no hay coincidencia, se usa la primera).
- Los `.stl` se cargan como malla sólida (Z hacia arriba) con el color del traje del personaje.
- Si un fichero falla al cargar, el juego vuelve al personaje procedural sin romperse.
