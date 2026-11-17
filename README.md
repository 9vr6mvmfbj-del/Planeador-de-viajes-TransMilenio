# Planeador de viajes TransMilenio

Proyecto final de Estructuras de Datos y Algoritmos, Universidad de La Sabana.
Planeador de viajes con la red real de TransMilenio (GTFS de julio de 2021).

| Pieza | Dónde | Lenguaje |
|---|---|---|
| Motor (R1–R10) | `motor/` | C++17, todas las estructuras hechas a mano |
| Puente a la web | `wasm/puente.cpp` → `web/public/motor_boff.wasm` | C++ compilado a WebAssembly |
| App web | `web/` | Svelte 5 + JavaScript (stack de CORE I) |
| Conversión GTFS → CSV | `conversion/` | Python |
| Datos | `datos/` | `estaciones.csv`, `rutas.csv`, `horarios.csv` |

## App desplegada

https://transmi-track.netlify.app

## Arrancar la app (un solo comando)

```bash
npm start
```

Instala lo necesario, copia los CSV de `datos/` y abre la app en el navegador. Para verla en el
iPhone: misma red wifi y abrir la dirección "Network" que muestra la terminal (ej. `http://192.168.x.x:5173`).
En Safari → Compartir → **Agregar a inicio** queda como app (pantalla completa, ícono propio).

La app solo llama al motor **motor_boff** (el C++ de `motor/` compilado a WebAssembly); no calcula
nada de los requisitos por su cuenta:

| Pestaña | Requisitos |
|---|---|
| Viajar | R5 viaje, R2 autocompletar, R4 próximo bus de cada tramo |
| Estaciones | R1 estado, R2, R3 rango, R4 próximo bus y horarios, R6 ranking |
| Admin (con PIN) | Crear/eliminar estaciones y líneas, R7 editar recorridos, R8 cerrar/reabrir, R9 historial con deshacer/rehacer de cualquier cambio |
| Fila | R10 simular_fila (hasta 800.000 pasajeros) |
| Rendimiento | R11 panel (redes de 10.000 a 80.000 estaciones, pendiente log-log) y consola para probar el contrato a mano |

Diseño: estilo Apple de CORE I con Liquid Glass (material nativo de iOS 26 Safari con
`-apple-visual-effect`, y desenfoque + brillo en los demás navegadores), modo claro/oscuro,
barra de pestañas flotante en el celular y barra lateral en escritorio, áreas seguras del iPhone,
sin zoom al escribir y animaciones con las curvas de Emil Kowalski (respetan "reducir movimiento").

## Comandos del motor

```bash
make pruebas       # 941 pruebas: casos borde de R1–R10, panel de admin y R5 contra fuerza bruta en la red real
make rendimiento   # mide cada operación en redes de 10.000, 20.000, 40.000 y 80.000 estaciones
make prohibidos    # revisa que motor/ no use nada prohibido
make wasm          # compila el motor a WebAssembly para la app (clang + wasi-libc)
```

Usar el motor desde C++ (equivale a `from motor import Red, simular_fila`):

```cpp
#include "motor/motor.h"
motor::Red red("datos");
red.estado("RICAURTE");                       // "ABIERTA"
red.viaje("PORTAL NORTE", "PORTAL SUR");      // tramos, transbordo y paradas
motor::simular_fila(llegadas, 4, 150);
```

Desde JavaScript (la app) es igual: `red.estado(...)`, `red.proximo_bus(...)`, etc. (`web/src/lib/motor_boff.js`).

---

## ¿Por qué C++?

El profesor nos dejó escoger el lenguaje del motor manteniendo las prohibiciones. Medimos lo mismo
(tabla hash propia, búsqueda binaria y una cola de pasajeros) en 6 lenguajes, duplicando n:

| Lenguaje | n = 1,6 M | n = 3,2 M | crecimiento al duplicar |
|---|---|---|---|
| **C++** | **236 ms** | **466 ms** | **×1,98** |
| Rust | 421 ms | 1.116 ms | ×2,65 |
| Go | 459 ms | 1.131 ms | ×2,47 |
| Java | 538 ms | 1.356 ms | ×2,52 |
| JavaScript | 723 ms | 1.691 ms | ×2,34 |
| Python | 10.695 ms | — | — |

C++ fue el más rápido (3 veces JavaScript, 45 veces Python) y **el que crece más cerca de la teoría**:
en un trabajo lineal el tiempo debe duplicarse (×2,0). En los lenguajes con recolector de basura el
crecimiento se infla (×2,3–×2,7) por la memoria, no por el algoritmo, y eso confundiría la prueba de
rendimiento. Para no perder la app web, el mismo código C++ se compila a WebAssembly y corre en el
navegador: la app en Svelte lo llama como una librería de JavaScript.

## Reglas del motor (traducidas a C++)

Prohibido dentro de `motor/`: `unordered_map`, `map`, `set` (≈ `dict`, `set`), `std::sort`
(≈ `sorted`, `.sort()`), `min_element`/`max_element`, `std::find`/`count`/`lower_bound`
(≈ `x in lista`, `.index()`, `.count()`), `queue`, `stack`, `deque`, `list`, `priority_queue`,
`<algorithm>`, `<functional>` (≈ `collections`, `heapq`, `bisect`, `functools`) y librerías externas.
Permitido: `std::vector` como arreglo, `std::string`, `<cstdio>`. `make prohibidos` lo verifica.

Estructuras propias en `motor/estructuras/`: `TablaHash` (encadenamiento, factor de carga ≤ 0,75),
`ArbolAVL`, `ListasDeRutas` (listas doblemente enlazadas), `Pila`, `Cola` (arreglo circular),
`ordenarMezcla` (merge sort) y `primeraPosicionNoMenor` (búsqueda binaria).

## Probar el contrato a mano (motor en C++)

Como el motor no es Python, los casos se corren desde la app: pestaña **Rendimiento → Probar el contrato
del motor**. Se elige el método (R1–R10), se escriben los argumentos y se ve lo que devuelve el motor como
en Python (`None`, `True`, listas y tuplas). Ejemplo de R10: `simular_fila([30, 5, 5, 70], 60, 2)` → `[120, 60, 60, 120]`.

## Formato de respuestas (contrato)

| Llamada | Devuelve |
|---|---|
| `estado(nombre)` | `"ABIERTA"`, `"CERRADA"` o `"NO EXISTE"` |
| `autocompletar(prefijo, k)`, `rango(desde, hasta)`, `recorrido(...)` | lista de nombres |
| `ranking(k)` | lista de `(nombre, buses_por_dia)`, de mayor a menor |
| `proximo_bus(estacion, ruta, hora)` | `"HH:MM"`, o `""` (None) si no hay más ese día |
| `viaje(origen, destino)` | tramos `(ruta, sube_en, baja_en)`: 1 si es directo, 2 si hay transbordo; `encontrado = false` es None (no hay viaje, estación inexistente o cerrada, o origen = destino) |
| `agregar_parada`, `quitar_parada`, `cerrar`, `reabrir`, `deshacer`, `rehacer` | `true` si hubo cambio |
| `simular_fila(llegadas, frecuencia, capacidad)` | lista con el segundo de salida de cada pasajero, en el mismo orden de `llegadas` (todo en segundos; ejemplo del enunciado: `[30,5,5,70], 60, 2` → `[120,60,60,120]`) |

Los nombres se normalizan (espacios de los lados y mayúsculas), así `" ricaurte"` = `"RICAURTE"`.

---

## Decisiones por requisito (R12)

En cada operación: **n** = estaciones de la red, **L** = paradas de una ruta, **h** = horarios de una
ruta en una estación, **k** = resultados pedidos, **m** = resultados del rango, **P** = pasajeros.

### R1 · Estado de una estación — Tabla hash · O(1)
Es la consulta más frecuente y es por nombre exacto: la tabla hash `nombre → estación` la responde en
O(1) promedio. **Descartado:** el árbol (O(log n)) y la búsqueda binaria sobre la lista ordenada
(O(log n)); son más lentas para una clave exacta y el orden no se necesita aquí.

> **README:** Para R1 usamos una tabla hash propia con encadenamiento que asocia cada nombre con su
> estación; con factor de carga ≤ 0,75 la búsqueda es O(1) promedio (n = estaciones). Descartamos el
> AVL y la búsqueda binaria porque cuestan O(log n) y R1 no necesita orden.

### R2 · Autocompletar — Árbol AVL de estaciones abiertas · O(log n + k)
Se baja por el AVL hasta el primer nombre ≥ prefijo y se recorre en orden hasta juntar k o hasta que
el nombre ya no empiece por el prefijo. **Por qué AVL y no BST:** `estaciones.csv` viene ordenado y
un BST con datos ordenados se degenera en lista (altura n, sesión 8). **Descartados:** la lista
ordenada con búsqueda binaria (consulta O(log n + k) pero insertar una estación nueva cuesta O(n)) y la
hash table (no tiene orden: habría que revisar las n). **Clave:** las estaciones cerradas se sacan del
árbol, así nunca se recorren.

> **README:** R2 usa un árbol AVL propio con solo las estaciones abiertas, ordenado por nombre. Se busca
> el primer nombre ≥ prefijo (O(log n)) y se recorre en orden con una pila hasta k resultados:
> O(log n + k), n = estaciones abiertas. Descartamos la lista ordenada porque agregar una estación cuesta
> O(n), y la tabla hash porque no guarda orden.

### R3 · Rango alfabético — el mismo AVL · O(log n + m)
Igual que R2, pero se detiene cuando el nombre pasa `hasta`. Es inclusivo en los dos extremos y si
`desde > hasta` devuelve vacío. **Descartado:** recorrer todo (O(n)).

> **README:** R3 reutiliza el AVL de estaciones abiertas: límite inferior en O(log n) y recorrido en
> orden de los m nombres del rango, O(log n + m). Recorrer todas las estaciones costaría O(n).

### R4 · Próximo bus — Tabla hash + búsqueda binaria · O(1) + O(log h)
`(ruta, estación) → arreglo de horas ordenado` (se ordena una sola vez al cargar, con merge sort).
La búsqueda binaria encuentra la primera hora ≥ la pedida. Si ya no hay más ese día, devuelve **None**
(`""` en C++, `null` en la app), como pide el contrato: no da la vuelta a la medianoche. **Horas del
GTFS ≥ 24** (ej. 25:10): la conversión las deja módulo 24 (01:10) y el motor también, así que 25:10 cuenta
como un bus de la madrugada (01:10) del mismo día y a las 23:55 ya no hay más. **Descartado:** recorrer las h horas (O(h)) — las troncales pasan cientos
de veces al día.

> **README:** R4 usa una tabla hash (ruta, estación) → arreglo de horas ordenado y búsqueda binaria del
> límite inferior: O(1) + O(log h), h = horarios de esa ruta en esa estación. Si no hay más buses ese día
> devuelve None. Las horas ≥ 24 del GTFS se toman módulo 24 (25:10 → 01:10). Descartamos la búsqueda
> lineal (O(h)).

> **Jornada de servicio (presentación):** TransMilenio no opera 24 h. La app calcula la jornada de los
> mismos horarios (en estos datos, de 04:00 a 00:36: las horas 24:xx del GTFS son el final de la jornada) y
> la usa solo para decir las cosas bien: "Fuera de servicio", "ya no pasa hoy · mañana a las 05:30" en vez
> de "en 10 h 54 min". R4 no cambia: devuelve None cuando ya no hay más buses ese día; para mostrar "mañana a las 05:30" la app
> vuelve a preguntarle al motor desde las 00:00.

### R5 · Viaje directo o con un transbordo — dos recorridos con marcas · O(L_o + L_d)
No hay un algoritmo del curso que lo haga tal cual; combinamos lista enlazada + arreglos con marcas
(como una hash table de índices):
1. Por cada ruta que llega al destino se camina **hacia atrás** desde el destino. En cada estación
   abierta t se anota la menor distancia a destino (y por qué ruta; también la segunda mejor por otra
   ruta). Si aparece el origen, es un viaje directo.
2. Por cada ruta que sale del origen se camina **hacia adelante**. En cada estación marcada se suma
   d₁ + d₂ con una ruta distinta: es un viaje con transbordo.

Se queda el de menos paradas (empate: el directo; luego orden alfabético de rutas) y se devuelve como lista de
tramos `(ruta, sube_en, baja_en)`: 1 tramo si es directo, 2 si hay transbordo. Si no hay viaje (estación que no
existe o cerrada, o ninguna combinación de una o dos rutas llega) devuelve None; ir de una estación a ella misma
tampoco es un viaje. Costo: lo que miden
las rutas que pasan por el origen y por el destino (**L_o + L_d**), sin importar el tamaño de la red.
Las marcas por "ronda" evitan limpiar los arreglos en cada consulta. **Descartado:** probar todas las
parejas de rutas (O(R² · L²)) o un BFS sobre todo el grafo (no limita a un solo transbordo y recorre
toda la red). Se verificó contra fuerza bruta en 385 viajes de la red real.

> **README:** R5 combina dos recorridos de listas enlazadas: desde el destino hacia atrás por sus rutas
> marcamos la distancia mínima a destino de cada estación abierta (con la mejor y la segunda mejor ruta),
> y desde el origen hacia adelante buscamos estaciones marcadas para transbordar. Costo O(L_o + L_d),
> L = paradas de las rutas que pasan por el origen y el destino. Descartamos probar todas las parejas de
> rutas (O(R²·L²)) y el BFS sobre toda la red.

### R6 · Ranking — Árbol AVL ordenado por buses/día · O(log n + k)
"Se consulta muy seguido y cambia poco". Un segundo AVL guarda las estaciones abiertas ordenadas por
(buses desc, nombre asc): la consulta es recorrer los primeros k y devolver cada uno como
`(nombre, buses_por_dia)`; el número sale de la misma clave del árbol, sin buscar nada más. Cuando algo cambia (cerrar, reabrir,
quitar/agregar parada) se saca y se vuelve a meter **solo esa estación**: O(log n).
**Descartados:** ordenar en cada consulta (O(n log n)); un heap (sacar los k mayores cuesta
O(k log n) y destruye el heap); un caché ordenado que se recalcula entero en cada cambio (O(n log n)).

> **README:** R6 usa un AVL propio de estaciones abiertas ordenado por buses al día (desc) y nombre: la
> consulta recorre los primeros k en O(log n + k), n = estaciones abiertas. Cada cambio actualiza solo la
> estación afectada en O(log n). Descartamos ordenar en cada consulta (O(n log n)) y el heap.

### R7 · Editar rutas — Lista doblemente enlazada + tabla hash · O(1) (+ O(log n) del ranking)
Cada ruta es una lista doble. Una tabla hash `(ruta, estación) → nodo` da el nodo en O(1), y agregar
o quitar es cambiar 4 punteros. `recorrido(ruta, al_reves)` camina la lista en un sentido u otro: O(L).
Al quitar una parada, sus buses dejan de contar para el ranking (O(log n) por el AVL); al volver a
agregarla, vuelven a contar. Si `nueva` no existe en la red, se crea como estación abierta.
**Descartado:** arreglo por ruta (insertar en medio corre todo: O(L)).

> **README:** R7 representa cada ruta como lista doblemente enlazada propia y usa una tabla hash
> (ruta, estación) → nodo: agregar después de una parada y quitar una parada son O(1), más O(log n) para
> actualizar el ranking. `recorrido` es O(L) en los dos sentidos gracias al puntero anterior.
> Descartamos el arreglo porque insertar en medio cuesta O(L).

### R8 · Cerrar y reabrir — bandera + sacar/meter en los dos AVL · O(log n)
Cerrar marca la estación y la saca de los árboles de nombres y de ranking; así **desaparece sola** de
R2, R3 y R6 sin revisar nada en cada consulta. R1 responde "CERRADA", R4 no da buses ahí y en R5 no se
puede subir, bajar ni transbordar en ella (el bus sí sigue pasando). **Descartado:** solo la bandera
(cada búsqueda tendría que saltarse las cerradas: con muchas cerradas, O(n)).

> **README:** R8 marca la estación y la saca (o la vuelve a meter) de los dos AVL: O(log n). Así las
> cerradas nunca aparecen en autocompletar, rango ni ranking sin costo extra, y R5 no transborda en ellas.
> Descartamos dejar solo una bandera porque cada consulta tendría que saltarse las cerradas.

### R9 · Deshacer y rehacer — dos pilas · O(1) + el costo de la operación
Cada cambio guarda en la pila de deshacer lo necesario para revertirlo (para quitar parada, cuál era la
anterior). Deshacer saca de esa pila, aplica lo inverso y lo pasa a la de rehacer; rehacer hace lo
contrario. **Un cambio nuevo vacía la pila de rehacer.** **Descartado:** guardar copias de la red
(O(n) por cambio).

> **README:** R9 usa dos pilas propias de operaciones (cerrar, reabrir, agregar y quitar parada con su
> parada anterior). Deshacer/rehacer es O(1) más el costo de la operación inversa (O(log n) como mucho).
> Un cambio nuevo vacía la pila de rehacer. Descartamos guardar copias de la red (O(n) por cambio).

### Panel de admin — mismas pilas de R9 + pila auxiliar para deshacer un cambio del medio
El profesor sugirió separar lo de un usuario común de lo de quien opera la red. La pestaña **Admin**
pide un PIN para entrar y **otra vez en cada cambio**. Ahí se crean y eliminan estaciones, se crean
líneas (con horarios generados: primer bus, último bus, frecuencia y minutos entre paradas) y se
eliminan líneas. Estas funciones son extras del motor (`crear_estacion`, `eliminar_estacion`,
`crear_ruta`, `eliminar_ruta`), no cambian el contrato, y **entran a las mismas pilas de R9**.

- **Eliminar** no borra datos: marca la estación o la línea como inexistente y la saca de las tablas,
  los dos AVL y las listas de sus rutas, guardando en la operación lo necesario para devolverla
  (de qué rutas salió y cuál era la parada anterior en cada una). Así deshacer la deja exactamente
  donde estaba, con sus horarios. Eliminar una estación con R rutas cuesta O(R · log n).
- **Deshacer cualquier cambio** (`deshacer_cambio(i)`, i contado desde el tope): se desapilan los i
  cambios de encima deshaciéndolos hacia una **pila auxiliar**, se deshace el elegido y se vuelven a
  aplicar los de la auxiliar del más viejo al más nuevo. Si alguno ya no se puede aplicar porque
  dependía del elegido (ej. agregar una parada a una estación creada en ese cambio), se devuelve todo a
  como estaba y el motor dice cuál cambio lo impide. Costo O(i · c). `rehacer_cambio(i)` aparta los de
  encima de la pila de rehacer igual. **Descartado:** reconstruir la red desde cero sin ese cambio
  (O(tamaño de la red) cada vez y se perderían las pilas de R9).
- **Persistencia:** la red original son los CSV y cada cambio se guarda como un registro
  `{ op, args, fecha }`. Al abrir la app, el motor carga los CSV y vuelve a aplicar los registros en
  orden; como es determinista, queda igual que antes, pilas incluidas. Hoy el registro vive en el
  navegador (`localStorage`); `supabase/transmitrack.sql` deja lista la tabla compartida con el PIN
  validado en el servidor, para cuando se active.
- **PIN:** la app no guarda el PIN, solo su huella PBKDF2-SHA256 (150.000 vueltas). Ojo: mientras viva
  solo en el navegador es una barrera de uso, no seguridad real; la real es la versión con Supabase.

> **README:** El panel de admin usa las mismas dos pilas de R9. Para deshacer un cambio que no es el
> último usamos una pila auxiliar: deshacemos los i de encima guardándolos en ella, deshacemos el
> elegido y volvemos a aplicar los guardados; si alguno dependía del elegido se cancela todo. O(i · c).
> Eliminar estaciones y líneas guarda lo necesario para devolverlas a su lugar exacto. Descartamos
> reconstruir la red sin ese cambio porque cuesta O(n) cada vez y perdería las pilas.

### R10 · Fila de abordaje — Merge sort + cola FIFO en arreglo circular · O(P log P) (O(P) si ya vienen en orden)
Entra una lista de segundos de llegada (pueden venir desordenadas) y sale, en el mismo orden, el segundo
en que salió el bus de cada persona. Primero se ordenan las llegadas con merge sort **estable** (guardando
la posición original de cada pasajero, así el empate sube en el orden de la lista). Después la fila es una
**cola FIFO sobre arreglo circular**: los pasajeros entran al llegar y los buses (en los segundos f, 2f, 3f…)
sacan hasta `capacidad`. Quien llega justo en el segundo de salida alcanza a subir. Si no hay nadie
esperando se salta directo al siguiente bus útil, así el costo no depende de las horas simuladas. Cada
pasajero entra y sale de la cola una vez: **O(P)** la simulación, más **O(P log P)** el ordenamiento
(se omite si las llegadas ya vienen ordenadas). **Descartado:** quitar el primero de un arreglo normal
(O(P) cada vez → O(P²) con cientos de miles de pasajeros) y simular segundo a segundo.

> **README:** R10 ordena las llegadas con merge sort estable (O(P log P)) y usa una cola propia sobre
> arreglo circular: encolar y desencolar O(1), y como cada pasajero entra y sale una sola vez la simulación
> es O(P), P = pasajeros. Los buses vacíos se saltan. Devuelve el segundo de salida de cada pasajero en el
> orden de entrada. Descartamos borrar el primero de un arreglo (O(P²) en total) y simular segundo a segundo.

---

## Rendimiento medido (base del panel R11)

Mismo método del profesor: cada operación del contrato (menos R5) se corre en redes de **10.000, 20.000,
40.000 y 80.000 estaciones** (generadas con el formato de los tres CSV: n/4 rutas de 10 paradas y 8 horarios por
parada), con las mismas consultas y la **mediana** de varias repeticiones. Con los cuatro puntos se calcula la
**pendiente** de log(tiempo) contra log(n): 0 = constante, 1 = lineal. R10 se mide con P = 10 × n pasajeros
desordenados. Resultado de `make rendimiento` (C++ nativo):

| Operación | Esperado | 10.000 | 20.000 | 40.000 | 80.000 | Pendiente |
|---|---|---|---|---|---|---|
| R1 estado | O(1) | 0,060 µs | 0,131 µs | 0,143 µs | 0,254 µs | 0,64 |
| R2 autocompletar (k=10) | O(log n + k) | 0,532 µs | 0,470 µs | 0,438 µs | 0,489 µs | -0,05 |
| R3 rango (20 resultados) | O(log n + m) | 1,237 µs | 1,273 µs | 1,652 µs | 3,066 µs | 0,43 |
| R4 proximo_bus | O(1) + O(log h) | 0,257 µs | 0,518 µs | 0,641 µs | 1,215 µs | 0,70 |
| R5 viaje (no se mide) | O(L_o + L_d) | 0,460 µs | 1,198 µs | 1,504 µs | 2,128 µs | 0,70 |
| R6 ranking (k=10) | O(log n + k) | 0,201 µs | 0,225 µs | 0,225 µs | 0,218 µs | 0,03 |
| R7 agregar + quitar parada | O(log n) | 0,580 µs | 0,797 µs | 0,867 µs | 1,865 µs | 0,52 |
| R7 recorrido | O(L) | 0,329 µs | 0,622 µs | 0,804 µs | 1,103 µs | 0,56 |
| R8 cerrar + reabrir | O(log n) | 1,390 µs | 2,070 µs | 3,314 µs | 4,665 µs | 0,59 |
| R9 deshacer + rehacer | O(log n) | 0,376 µs | 0,394 µs | 0,425 µs | 0,484 µs | 0,12 |
| R10 simular_fila (P = 10 n) | O(P log P) | 9,1 ms | 20,2 ms | 51,9 ms | 87,6 ms | 1,12 |
| Red(carpeta): carga | O(n) | 55 ms | 157 ms | 260 ms | 592 ms | 1,10 |

**Cómo leerlo:** una operación O(1) u O(log n) debe dar una pendiente cercana a 0; una lineal, cercana a 1; una
n log n, un poco más de 1. R10 da ≈ 1,1 (ordena las llegadas con merge sort y luego la cola es O(P)) y la carga
de la red ≈ 1 (lee cada fila de los CSV una vez).

**Cuando la medición no coincide con la teoría:** varias operaciones O(1) y O(log n) dan pendientes de 0,3 a 0,7
en vez de ≈ 0. No es el algoritmo: el número de pasos es el mismo en las cuatro redes. El motor en C++ responde
en decenas o cientos de nanosegundos, y a esa escala manda la memoria caché: con 10.000 estaciones la tabla hash
y los árboles caben en la caché del procesador; con 80.000 ya no, y cada acceso a una estación al azar tiene que
ir a la memoria principal. En un motor en Python ese efecto queda escondido porque cada llamada cuesta mucho más.

**En el panel:** el botón **Medir 10k a 80k aquí** repite la medición en el dispositivo (WebAssembly) y
**Agregar una red (3 CSV)** mide cualquier red del mismo formato; con dos o más redes se calcula la pendiente y
cada operación dice si coincide con lo esperado y, si no, por qué.

## Conversión del GTFS

Ver [`conversion/README.md`](conversion/README.md): con el GTFS 2021-07-14 genera exactamente los CSV
del profesor (147 estaciones, 181 rutas, 140.492 horarios).

## Integrantes

Ver [`integrantes.md`](integrantes.md).
