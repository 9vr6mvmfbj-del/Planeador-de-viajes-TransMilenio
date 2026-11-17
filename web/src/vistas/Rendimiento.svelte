<script>
  // R11: panel de rendimiento. Muestra cuánto tarda cada operación en redes de 10.000, 20.000, 40.000 y
  // 80.000 estaciones (mediana de varias repeticiones) y la pendiente de log(tiempo) contra log(n):
  // 0 = constante, 1 = lineal. Es el mismo método con el que se mide el motor.
  // Por defecto trae la medición nativa (C++ compilado, `make rendimiento`). Con los botones se repite aquí
  // mismo (WebAssembly, en este dispositivo) con redes generadas, o con los tres CSV de otra red.
  import nativo from '../lib/rendimiento-nativo.json';
  import { pendiente, veredicto, CLASES } from '../lib/redes.js';
  import Icono from '../componentes/Icono.svelte';
  import Palabras from '../componentes/Palabras.svelte';

  const DE_NATIVO = () => nativo.estaciones.map((n, i) => ({
    estaciones: n,
    cargaMs: nativo.cargaMs[i],
    operaciones: nativo.operaciones.map((o) => ({ nombre: o.nombre, esperado: o.esperado, clase: o.clase, us: o.us[i] })),
  }));

  let redes = $state(DE_NATIVO());
  let fuente = $state('nativo');
  let midiendo = $state(false);
  let progreso = $state('');
  let error = $state('');
  let seleccion = $state(0);
  let entrada = $state(/** @type {HTMLInputElement | undefined} */ (undefined));

  function lanzar(mensaje) {
    midiendo = true; error = ''; progreso = 'Preparando…';
    const w = new Worker(new URL('../lib/trabajador.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const d = e.data;
      if (d.progreso) progreso = d.progreso;
      if (d.red) redes = [...redes, d.red];
      if (d.error) { error = d.error; }
      if (d.fin || d.error) { midiendo = false; progreso = ''; w.terminate(); }
    };
    w.postMessage({ wasm: new URL(import.meta.env.BASE_URL + 'motor_boff.wasm', location.href).href, ...mensaje });
  }

  function medirAqui() {
    redes = []; fuente = 'dispositivo';
    lanzar({ tarea: 'generar', tamanos: [10000, 20000, 40000, 80000] });
  }

  // Una red del profesor: los tres CSV (estaciones, rutas y horarios), en cualquier orden.
  async function agregarRed(e) {
    const archivos = [...(e.currentTarget.files ?? [])];
    e.currentTarget.value = '';
    const buscar = (clave) => archivos.find((f) => f.name.toLowerCase().includes(clave));
    const [fe, fr, fh] = [buscar('estacion'), buscar('ruta'), buscar('horario')];
    if (!fe || !fr || !fh) { error = 'Elige los tres archivos a la vez: estaciones.csv, rutas.csv y horarios.csv.'; return; }
    if (fuente !== 'archivos') redes = [];
    fuente = 'archivos';
    const csv = { estaciones: await fe.text(), rutas: await fr.text(), horarios: await fh.text() };
    lanzar({ tarea: 'archivos', csv });
  }

  function volverANativo() { redes = DE_NATIVO(); fuente = 'nativo'; error = ''; seleccion = 0; }

  let ordenadas = $derived([...redes].sort((a, b) => a.estaciones - b.estaciones));
  let ns = $derived(ordenadas.map((r) => r.estaciones));

  // Una fila por operación (y la carga de la red): tiempos por red, pendiente y si coincide con lo esperado.
  let ops = $derived.by(() => {
    if (!ordenadas.length) return [];
    const lista = ordenadas[0].operaciones.map((o, k) => ({
      nombre: o.nombre, esperado: o.esperado, clase: o.clase,
      us: ordenadas.map((r) => r.operaciones[k]?.us ?? 0),
    }));
    lista.push({ nombre: 'Red(carpeta): carga', esperado: 'O(n)', clase: 'lineal', us: ordenadas.map((r) => r.cargaMs * 1000) });
    return lista.map((o) => {
      const mide = !o.nombre.includes('no se mide');
      const pend = pendiente(ns, o.us);
      return { ...o, pend, mide, ok: ns.length < 2 ? null : veredicto(o.clase, pend) };
    });
  });
  let op = $derived(ops[Math.min(seleccion, ops.length - 1)]);

  const PEND = { constante: 0, log: 0.1, lineal: 1, nlogn: 1.1 };
  function explicacion(o) {
    if (!o.mide) return 'R5 no se mide en la prueba del profesor; se muestra como referencia.';
    if (o.ok === null) return 'Con una sola red no hay pendiente: agrega otra red del mismo formato.';
    if (o.ok) return `La pendiente ${o.pend.toFixed(2)} cae dentro de lo esperado para ${CLASES[o.clase].texto}.`;
    if (o.clase === 'constante' || o.clase === 'log') {
      return `La pendiente ${o.pend.toFixed(2)} es mayor que la teórica (${PEND[o.clase]}). No es el algoritmo: el número de pasos es el mismo, pero el C++ es tan rápido (decenas de nanosegundos) que se nota la memoria caché: con redes grandes las tablas y los árboles ya no caben en la caché del procesador y cada acceso al azar tarda más.`;
    }
    return `La pendiente ${o.pend.toFixed(2)} se sale de ${CLASES[o.clase].texto}. Revisa que las redes tengan el mismo formato y que no haya otro proceso usando el procesador durante la medición.`;
  }

  // Gráfica: x = n (escala log), y = cuánto creció el tiempo respecto a la primera red (escala log).
  const W = 320, H = 200, PAD = 30;
  let n0 = $derived(ns[0] ?? 1), nN = $derived(ns[ns.length - 1] ?? 2);
  const xs = (n) => PAD + (Math.log(n / n0) / Math.log(nN / n0 || 2)) * (W - PAD - 10);
  const ys = (v) => { const l = Math.log2(Math.max(0.5, Math.min(32, v))); return H - PAD - ((l + 1) / 6) * (H - PAD - 10); };
  const camino = (puntos) => puntos.map(([n, v], i) => `${i ? 'L' : 'M'}${xs(n).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  let referencias = $derived([
    { nombre: 'O(n)', clase: 'On', vals: ns.map((n) => [n, n / n0]) },
    { nombre: 'O(log n)', clase: 'Olog', vals: ns.map((n) => [n, Math.log2(n) / Math.log2(n0)]) },
    { nombre: 'O(1)', clase: 'O1', vals: ns.map((n) => [n, 1]) },
  ]);
  const fmt = (us) => (us >= 1e6 ? (us / 1e6).toFixed(2) + ' s' : us >= 1000 ? (us / 1000).toFixed(1) + ' ms' : us >= 1 ? us.toFixed(2) + ' µs' : (us * 1000).toFixed(0) + ' ns');
  const etiquetaN = (n) => (n >= 1000 ? n / 1000 + 'k' : n);
</script>

<header class="cabeza">
  <p class="etiqueta">R11 · Panel de rendimiento</p>
  <div class="fila-titulo">
    <h1 class="titulo-grande"><Palabras texto="Rendimiento" /></h1>
    <div class="acciones">
      <button class="boton boton-primario" onclick={medirAqui} disabled={midiendo}>
        {#if midiendo}<span class="anillo" aria-hidden="true"></span>Midiendo…{:else}<Icono nombre="rayo" tam={18} />Medir 10k a 80k aquí{/if}
      </button>
      <button class="boton" onclick={() => entrada?.click()} disabled={midiendo}>Agregar una red (3 CSV)</button>
      {#if fuente !== 'nativo'}<button class="boton" onclick={volverANativo} disabled={midiendo}>Ver la medición nativa</button>{/if}
      <input bind:this={entrada} class="oculto" type="file" accept=".csv,text/csv" multiple onchange={agregarRed} />
    </div>
  </div>
  <p class="pequeno tenue intro">
    Cada operación (menos R5) se mide en redes de <strong class="num">{ns.map((n) => n.toLocaleString('es-CO')).join(', ')}</strong> estaciones,
    con las mismas consultas y la mediana de varias repeticiones. La <strong>pendiente</strong> es cuánto crece log(tiempo) por cada log(n):
    0 = constante, 1 = lineal. R10 se mide con P = 10 × n pasajeros.
    <span class="fuente">{fuente === 'nativo' ? 'Medición nativa (C++, make rendimiento).' : fuente === 'dispositivo' ? 'Medido en este dispositivo (WebAssembly).' : 'Medido con tus archivos CSV (WebAssembly).'}</span>
  </p>
  {#if progreso}<p class="pequeno tenue" aria-live="polite">{progreso}</p>{/if}
  {#if error}<p class="pequeno error">{error}</p>{/if}
</header>

{#if op}
<div class="grilla">
  <section class="vidrio tarjeta">
    <div class="cabeza-tarjeta">
      <div>
        <p class="etiqueta">{op.esperado}</p>
        <h2 class="titulo">{op.nombre}</h2>
      </div>
      <span class="veredicto" class:ok={op.ok}>{op.ok === null ? '—' : op.ok ? 'Coincide' : 'Revisar'}</span>
    </div>

    <svg class="grafica" viewBox="0 0 {W} {H}" role="img" aria-label="Crecimiento del tiempo de {op.nombre} frente a O(1), O(log n) y O(n)">
      {#each [0.5, 1, 2, 4, 8, 16, 32] as g}
        <line class="rejilla" x1={PAD} x2={W - 10} y1={ys(g)} y2={ys(g)} />
        <text class="eje" x={PAD - 6} y={ys(g) + 3.5} text-anchor="end">×{g}</text>
      {/each}
      {#each ns as n}
        <text class="eje" x={ns.length > 1 ? xs(n) : PAD} y={H - PAD + 16} text-anchor="middle">{etiquetaN(n)}</text>
      {/each}
      {#if ns.length > 1}
        {#each referencias as r}
          <path class="ref ref-{r.clase}" d={camino(r.vals)} />
          <text class="ref-texto" x={W - 12} y={ys(r.vals[r.vals.length - 1][1]) - 5} text-anchor="end">{r.nombre}</text>
        {/each}
        <path class="medida" d={camino(ns.map((n, i) => [n, op.us[i] / op.us[0]]))} />
      {/if}
      {#each ns as n, i}<circle class="punto" cx={ns.length > 1 ? xs(n) : PAD} cy={ys(op.us[i] / op.us[0])} r="4" />{/each}
    </svg>

    <div class="tabla" style="--cols:{ns.length}">
      {#each ns as n, i}
        <div class="celda">
          <span class="mini tenue num">{op.nombre.startsWith('R10') ? `${(n * 10 / 1000).toLocaleString('es-CO')}k pas.` : `${n.toLocaleString('es-CO')} est.`}</span>
          <span class="num tiempo">{fmt(op.us[i])}</span>
          <span class="mini num">{i === 0 ? '—' : '×' + (op.us[i] / op.us[i - 1]).toFixed(2)}</span>
        </div>
      {/each}
    </div>
    <p class="pendiente num">Pendiente <strong>{ns.length > 1 ? op.pend.toFixed(2) : '—'}</strong> <span class="tenue">· esperada ≈ {PEND[op.clase]}</span></p>
    <p class="mini tenue nota">{explicacion(op)}</p>
  </section>

  <section class="vidrio tarjeta">
    <p class="etiqueta">Todas las operaciones</p>
    <ul class="operaciones">
      {#each ops as o, i (o.nombre)}
        <li>
          <button class="fila-op" aria-pressed={i === seleccion} onclick={() => (seleccion = i)}>
            <span class="info-op">
              <span class="nombre-op">{o.nombre}</span>
              <span class="mini tenue">{o.esperado} · {o.mide ? CLASES[o.clase].texto : 'referencia'}</span>
            </span>
            <span class="num factor" class:ok={o.ok}>{ns.length > 1 ? o.pend.toFixed(2) : '—'}</span>
          </button>
        </li>
      {/each}
    </ul>
    <p class="mini tenue nota">El número de la derecha es la pendiente log-log: cerca de 0 es O(1) u O(log n); cerca de 1 es O(n).</p>
  </section>
</div>
{/if}

<style>
  .cabeza { padding: 8px 4px 18px; display: grid; gap: 10px; }
  .fila-titulo { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .intro { max-width: 70ch; }
  .fuente { color: var(--tinta-2); font-weight: 600; }
  .error { color: var(--naranja); }
  .anillo { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.4); border-top-color: #fff; animation: girar 600ms linear infinite; }
  @keyframes girar { to { transform: rotate(360deg); } }
  .grilla { display: grid; gap: 14px; align-content: start; }
  .grilla :global(.tarjeta + .tarjeta) { margin-top: 0; }
  .veredicto { font-size: 13px; font-weight: 700; padding: 5px 10px; border-radius: 999px; background: var(--naranja-suave); color: var(--naranja); }
  .veredicto.ok { background: var(--verde-suave); color: var(--verde); }
  .grafica { width: 100%; height: auto; display: block; margin: 4px 0 8px; }
  .rejilla { stroke: var(--separador); stroke-width: 0.6; }
  .eje { font-size: 9.5px; fill: var(--tenue); font-variant-numeric: tabular-nums; }
  .ref { fill: none; stroke: var(--tenue-2); stroke-width: 1.2; stroke-dasharray: 4 4; }
  .ref-On { stroke: var(--naranja); }
  .ref-texto { font-size: 9.5px; fill: var(--tenue); font-weight: 600; }
  .medida { fill: none; stroke: var(--rojo); stroke-width: 2.6; stroke-linejoin: round; stroke-linecap: round; }
  .punto { fill: var(--fondo); stroke: var(--rojo); stroke-width: 2.2; }
  .tabla { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 6px; }
  .acciones { display: flex; gap: 8px; flex-wrap: wrap; }
  .oculto { display: none; }
  .pendiente { margin-top: 10px; font-size: 15px; }
  .ref-Olog { stroke: var(--tenue); }
  .celda { display: grid; gap: 2px; padding: 8px 6px; border-radius: 12px; background: var(--relleno); text-align: center; }
  .tiempo { font-size: 14px; font-weight: 700; }
  .sube { color: var(--naranja); font-weight: 600; }
  .nota { margin-top: 12px; }
  .operaciones { list-style: none; display: grid; gap: 2px; margin-top: 8px; }
  .fila-op { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-radius: 14px; text-align: left; transition: transform 160ms var(--salida), background-color 160ms ease; }
  .fila-op:active { transform: scale(0.98); }
  .fila-op[aria-pressed='true'] { background: var(--rojo-suave); }
  .info-op { flex: 1; min-width: 0; display: grid; }
  .nombre-op { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mini-graf { width: 60px; height: 24px; flex: none; }
  .mini-graf path { fill: none; stroke: var(--rojo); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .factor { min-width: 52px; text-align: right; font-weight: 700; font-size: 15px; color: var(--naranja); }
  .factor.ok { color: var(--verde); }
  @media (hover: hover) and (pointer: fine) { .fila-op:hover:not([aria-pressed='true']) { background: var(--relleno); } }
  @media (max-width: 420px) { .tabla { grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr)); gap: 4px; } .celda { padding: 6px 2px; } .tiempo { font-size: 12px; } }
  @media (min-width: 980px) { .grilla { grid-template-columns: 1.2fr 1fr; gap: 20px; } }
</style>
