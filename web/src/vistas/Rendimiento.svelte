<script>
  // R11: panel de rendimiento. Corre cada operación con redes de tamaño n, 2n, 4n... y grafica
  // cómo crece el tiempo junto a la complejidad esperada. Por defecto muestra la medición nativa
  // (C++ compilado, `make rendimiento`); el botón la repite aquí mismo (WebAssembly) en este dispositivo.
  import nativo from '../lib/rendimiento-nativo.json';
  import Icono from '../componentes/Icono.svelte';
  import Palabras from '../componentes/Palabras.svelte';

  let datos = $state(nativo);
  let fuente = $state('nativo');
  let midiendo = $state(false);
  let error = $state('');
  let seleccion = $state(0);

  function medir() {
    midiendo = true;
    error = '';
    const w = new Worker(new URL('../lib/trabajador.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      midiendo = false;
      w.terminate();
      if (e.data.ok) { datos = e.data.datos; fuente = 'dispositivo'; }
      else error = e.data.error;
    };
    w.postMessage({ wasm: new URL(import.meta.env.BASE_URL + 'motor_boff.wasm', location.href).href, maxEscala: 16, consultas: 8000 });
  }

  // Crecimiento esperado al multiplicar la red por e (e = 1, 2, 4, 8, 16).
  function esperado(tipo, i) {
    const e = datos.escalas[i], n0 = datos.estaciones[0];
    if (tipo.startsWith('O(P)') || tipo.startsWith('O(n')) return e;          // lineal
    if (tipo.includes('log')) return Math.log2(n0 * e) / Math.log2(n0);     // logarítmico
    return 1;                                                                // constante
  }
  const clase = (tipo) => (tipo.startsWith('O(P)') ? 'lineal' : tipo.includes('log') ? 'log' : 'constante');
  const nombreClase = { lineal: 'O(n): se duplica', log: 'O(log n): sube poco', constante: 'O(1): no cambia' };

  let ops = $derived(datos.operaciones.map((o) => {
    const crec = o.us.map((t) => t / o.us[0]);
    const final = crec[crec.length - 1];
    const c = clase(o.esperado);
    // ¿Se comporta como se esperaba? Lineal: crece ~16× al multiplicar por 16. Sublineal: lejos de 16.
    const coincide = c === 'lineal' ? final > 8 && final < 32 : final < 4;
    return { ...o, crec, final, c, coincide, mide: !o.nombre.includes('no se mide') };
  }));
  let op = $derived(ops[seleccion]);

  // gráfica: x = escala (log2), y = crecimiento (log2), de ×0.5 a ×32
  const W = 320, H = 200, PAD = 30;
  const xs = (i) => PAD + (i / (datos.escalas.length - 1)) * (W - PAD - 10);
  const ys = (v) => { const l = Math.log2(Math.max(0.5, Math.min(32, v))); return H - PAD - ((l + 1) / 6) * (H - PAD - 10); };
  const camino = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  let referencias = $derived([
    { nombre: 'O(n)', vals: datos.escalas.map((e) => e) },
    { nombre: 'O(log n)', vals: datos.escalas.map((_, i) => esperado('log', i)) },
    { nombre: 'O(1)', vals: datos.escalas.map(() => 1) },
  ]);
  const fmt = (us) => (us >= 1000 ? (us / 1000).toFixed(1) + ' ms' : us >= 1 ? us.toFixed(2) + ' µs' : (us * 1000).toFixed(0) + ' ns');
</script>

<header class="cabeza">
  <p class="etiqueta">R11 · Panel de rendimiento</p>
  <div class="fila-titulo">
    <h1 class="titulo-grande"><Palabras texto="Rendimiento" /></h1>
    <button class="boton boton-primario" onclick={medir} disabled={midiendo}>
      {#if midiendo}<span class="anillo" aria-hidden="true"></span>Midiendo…{:else}<Icono nombre="rayo" tam={18} />Medir aquí{/if}
    </button>
  </div>
  <p class="pequeno tenue intro">
    Cada operación se corre con redes de <strong class="num">{datos.estaciones.join(', ')}</strong> estaciones (se duplica cada vez).
    Si al duplicar la red el tiempo no cambia es O(1); si sube un poco, O(log n); si se duplica, O(n).
    <span class="fuente">{fuente === 'nativo' ? 'Medición nativa (C++).' : 'Medido en este dispositivo (WebAssembly).'}</span>
  </p>
  {#if error}<p class="pequeno error">{error}</p>{/if}
</header>

<div class="grilla">
  <section class="vidrio tarjeta">
    <div class="cabeza-tarjeta">
      <div>
        <p class="etiqueta">{op.esperado}</p>
        <h2 class="titulo">{op.nombre}</h2>
      </div>
      <span class="veredicto" class:ok={op.coincide}>{op.coincide ? 'Coincide' : 'Revisar'}</span>
    </div>

    <svg class="grafica" viewBox="0 0 {W} {H}" role="img" aria-label="Crecimiento del tiempo de {op.nombre} frente a O(1), O(log n) y O(n)">
      {#each [0.5, 1, 2, 4, 8, 16, 32] as g}
        <line class="rejilla" x1={PAD} x2={W - 10} y1={ys(g)} y2={ys(g)} />
        <text class="eje" x={PAD - 6} y={ys(g) + 3.5} text-anchor="end">×{g}</text>
      {/each}
      {#each datos.escalas as e, i}
        <text class="eje" x={xs(i)} y={H - PAD + 16} text-anchor="middle">{e === 1 ? 'n' : e + 'n'}</text>
      {/each}
      {#each referencias as r}
        <path class="ref ref-{r.nombre.replace(/[^a-z1]/gi, '')}" d={camino(r.vals)} />
        <text class="ref-texto" x={W - 12} y={ys(r.vals[r.vals.length - 1]) - 5} text-anchor="end">{r.nombre}</text>
      {/each}
      <path class="medida" d={camino(op.crec)} />
      {#each op.crec as v, i}<circle class="punto" cx={xs(i)} cy={ys(v)} r="4" />{/each}
    </svg>

    <div class="tabla">
      {#each datos.estaciones as n, i}
        <div class="celda">
          <span class="mini tenue num">{op.nombre.startsWith('R10') ? `${n / 150 * 100}k pas.` : `${n} est.`}</span>
          <span class="num tiempo">{fmt(op.us[i])}</span>
          <span class="mini num" class:sube={i > 0 && op.us[i] / op.us[i - 1] > (op.c === 'lineal' ? 2.6 : 1.6)}>{i === 0 ? '—' : '×' + (op.us[i] / op.us[i - 1]).toFixed(2)}</span>
        </div>
      {/each}
    </div>
    <p class="mini tenue nota">
      {#if !op.mide}R5 no se mide en la prueba del profesor; se muestra como referencia.
      {:else if op.c === 'lineal'}En R10, n son los pasajeros (100 mil, 200 mil…): cada uno entra y sale de la cola una vez.
      {:else}Pequeñas subidas en operaciones O(1) se deben a la memoria caché: con redes más grandes las tablas ya no caben en la caché del procesador. No es el algoritmo.{/if}
    </p>
  </section>

  <section class="vidrio tarjeta">
    <p class="etiqueta">Todas las operaciones</p>
    <ul class="operaciones">
      {#each ops as o, i (o.nombre)}
        <li>
          <button class="fila-op" aria-pressed={i === seleccion} onclick={() => (seleccion = i)}>
            <span class="info-op">
              <span class="nombre-op">{o.nombre}</span>
              <span class="mini tenue">{o.esperado} · {o.mide ? nombreClase[o.c] : 'referencia'}</span>
            </span>
            <svg class="mini-graf" viewBox="0 0 60 24" aria-hidden="true">
              <path d={o.crec.map((v, k) => `${k ? 'L' : 'M'}${(k / (o.crec.length - 1)) * 56 + 2},${22 - (Math.log2(Math.max(0.5, Math.min(32, v))) + 1) / 6 * 20}`).join(' ')} />
            </svg>
            <span class="num factor" class:ok={o.coincide}>×{o.final.toFixed(1)}</span>
          </button>
        </li>
      {/each}
    </ul>
    <p class="mini tenue nota">×N = cuánto creció el tiempo de n a {datos.escalas[datos.escalas.length - 1]}n. Lo ideal: ×1 para O(1), ×1,5 a ×2 para O(log n), ×16 para O(n).</p>
  </section>
</div>

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
  .tabla { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
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
  @media (max-width: 420px) { .tabla { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; } .celda { padding: 6px 2px; } .tiempo { font-size: 12px; } }
  @media (min-width: 980px) { .grilla { grid-template-columns: 1.2fr 1fr; gap: 20px; } }
</style>
