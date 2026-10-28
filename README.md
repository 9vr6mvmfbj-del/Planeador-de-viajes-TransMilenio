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
| Operar | R7 editar rutas y recorrido, R8 cerrar/reabrir, R9 deshacer/rehacer |
| Fila | R10 simular_fila (hasta 800.000 pasajeros) |
| Rendimiento | R11 panel: n, 2n… 16n por operación, con la curva esperada |

Diseño: estilo Apple de CORE I con Liquid Glass (material nativo de iOS 26 Safari con
`-apple-visual-effect`, y desenfoque + brillo en los demás navegadores), modo claro/oscuro,
barra de pestañas flotante en el celular y barra lateral en escritorio, áreas seguras del iPhone,
sin zoom al escribir y animaciones con las curvas de Emil Kowalski (respetan "reducir movimiento").

## Comandos del motor

```bash
make pruebas       # 502 pruebas: casos borde de R1–R10 y R5 contra fuerza bruta en la red real
make rendimiento   # mide cómo crece cada operación al duplicar la red (n, 2n, 4n, 8n, 16n)
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

## Formato de respuestas (supuestos hasta tener el enunciado completo)

| Llamada | Devuelve |
|---|---|
| `estado(nombre)` | `"ABIERTA"`, `"CERRADA"` o `"NO EXISTE"` |
| `autocompletar(prefijo, k)`, `rango(desde, hasta)`, `ranking(k)`, `recorrido(...)` | lista de nombres |
| `proximo_bus(estacion, ruta, hora)` | `"HH:MM"`, o `""` si no hay |
| `viaje(origen, destino)` | `Viaje{encontrado, paradas, tramos[{ruta, sube, baja, paradas}]}` |
| `agregar_parada`, `quitar_parada`, `cerrar`, `reabrir`, `deshacer`, `rehacer` | `true` si hubo cambio |
| `simular_fila(llegadas, frecuencia, capacidad)` | `{pasajeros, buses, espera_promedio, espera_maxima, ultima_salida, buses_llenos}` |

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
La búsqueda binaria encuentra la primera hora ≥ la pedida. Si ya no hay más ese día, se devuelve el
primer bus del día siguiente (circular). **Horas del GTFS ≥ 24** (ej. 25:10): la conversión las deja
módulo 24 (01:10) y el motor también; con la búsqueda circular, a las 23:50 el próximo bus es el de las
00:04, que es lo correcto. **Descartado:** recorrer las h horas (O(h)) — las troncales pasan cientos
de veces al día.

> **README:** R4 usa una tabla hash (ruta, estación) → arreglo de horas ordenado y búsqueda binaria del
> límite inferior: O(1) + O(log h), h = horarios de esa ruta en esa estación. Si no hay más buses ese día
> se devuelve el primero del día siguiente. Las horas ≥ 24 del GTFS se toman módulo 24. Descartamos la
> búsqueda lineal (O(h)).

### R5 · Viaje directo o con un transbordo — dos recorridos con marcas · O(L_o + L_d)
No hay un algoritmo del curso que lo haga tal cual; combinamos lista enlazada + arreglos con marcas
(como una hash table de índices):
1. Por cada ruta que llega al destino se camina **hacia atrás** desde el destino. En cada estación
   abierta t se anota la menor distancia a destino (y por qué ruta; también la segunda mejor por otra
   ruta). Si aparece el origen, es un viaje directo.
2. Por cada ruta que sale del origen se camina **hacia adelante**. En cada estación marcada se suma
   d₁ + d₂ con una ruta distinta: es un viaje con transbordo.

Se queda el de menos paradas (empate: el directo; luego orden alfabético de rutas). Costo: lo que miden
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
(buses desc, nombre asc): la consulta es recorrer los primeros k. Cuando algo cambia (cerrar, reabrir,
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

### R10 · Fila de abordaje — Cola FIFO en arreglo circular · O(P)
Los pasajeros entran a la cola al llegar y los buses (en los minutos 0, f, 2f, …) sacan hasta
`capacidad`. Si no hay nadie esperando, se salta directo al siguiente bus útil, así el costo no depende
de las horas simuladas. Cada pasajero entra y sale una vez: **O(P)**. Si las llegadas vienen
desordenadas se ordenan primero con merge sort (O(P log P)). **Descartado:** quitar el primero de un
arreglo normal (O(P) cada vez → O(P²) con cientos de miles de pasajeros) y simular minuto a minuto.

> **README:** R10 usa una cola propia sobre arreglo circular: encolar y desencolar O(1), y como cada
> pasajero entra y sale una sola vez la simulación es O(P), P = pasajeros. Los buses vacíos se saltan.
> Descartamos borrar el primero de un arreglo (O(P²) en total) y simular minuto a minuto.

---

## Rendimiento medido (base del panel R11)

`make rendimiento` genera redes sintéticas de 150, 300, 600, 1.200 y 2.400 estaciones (con rutas y
horarios proporcionales) y mide cada operación (µs por operación, mejor de 9):

| Operación | Esperado | n | 2n | 4n | 8n | 16n |
|---|---|---|---|---|---|---|
| R1 estado | O(1) | 0,055 | ×0,83 | ×1,07 | ×1,05 | ×1,08 |
| R2 autocompletar | O(log n + k) | 0,144 | ×1,07 | ×1,28 | ×1,37 | ×1,42 |
| R3 rango (20) | O(log n + m) | 0,567 | ×1,17 | ×1,40 | ×0,93 | ×1,12 |
| R4 próximo bus | O(1) + O(log h) | 0,225 | ×0,85 | ×1,30 | ×1,50 | ×1,32 |
| R6 ranking (10) | O(log n + k) | 0,245 | ×0,86 | ×0,95 | ×1,00 | ×1,15 |
| R7 agregar + quitar | O(1) + O(log n) | 0,230 | ×1,03 | ×1,06 | ×1,15 | ×2,10* |
| R7 recorrido | O(L) | 0,226 | ×1,05 | ×1,04 | ×1,17 | ×1,28 |
| R8 cerrar + reabrir | O(log n) | 0,612 | ×1,13 | ×1,12 | ×1,20 | ×1,12 |
| R9 deshacer + rehacer | O(log n) | 0,201 | ×1,33 | ×1,51 | ×0,79 | ×1,21 |
| R10 simular_fila | O(P) | 912 | ×2,07 | ×2,16 | ×1,85 | ×2,13 |

**Cómo leerlo:** si al duplicar n el tiempo queda igual (×1) es O(1); si sube un poco y cada vez menos
es O(log n); si se duplica (×2) es O(n). R10 se duplica porque su n son los pasajeros.

**Cuando la medición no coincide con la teoría:** las operaciones O(1) suben un poco (×1,05–×1,5) porque
con redes más grandes las tablas ya no caben en la memoria caché del procesador y cada acceso es algo
más lento; no es el algoritmo. (*) Los saltos aislados como ×2,10 aparecen en una corrida y no en otra:
son ruido del computador (otro proceso usando el procesador en ese momento).

## Conversión del GTFS

Ver [`conversion/README.md`](conversion/README.md): con el GTFS 2021-07-14 genera exactamente los CSV
del profesor (147 estaciones, 181 rutas, 140.492 horarios).

## Integrantes

Ver [`integrantes.md`](integrantes.md).
