<script>
  // R10: simular_fila(llegadas, frecuencia, capacidad). La app solo arma la lista de llegadas
  // (los datos de entrada) y muestra lo que devuelve el motor.
  import { motor, formatoNumero, sumarMinutos, vibrar } from '../lib/estado.svelte.js';
  import Icono from '../componentes/Icono.svelte';

  let pasajeros = $state(24000);
  let duracion = $state(120);   // minutos de hora pico
  let frecuencia = $state(1);   // un bus cada cuántos minutos
  let capacidad = $state(250);  // articulado 160 · biarticulado 250
  let perfil = $state('pico');
  const INICIO = '05:00';

  // Minuto de llegada de cada pasajero, ya en orden (cuantiles de la distribución elegida).
  let llegadas = $derived.by(() => {
    const P = pasajeros, D = duracion;
    const v = new Int32Array(P);
    for (let i = 0; i < P; i++) {
      const u = (i + 0.5) / P;
      let t;
      if (perfil === 'constante') t = u * D;
      else if (perfil === 'pico') t = u < 0.5 ? D * Math.sqrt(u / 2) : D * (1 - Math.sqrt((1 - u) / 2));
      else { // dos picos
        const mitad = u < 0.5 ? u * 2 : (u - 0.5) * 2;
        const tt = mitad < 0.5 ? Math.sqrt(mitad / 2) : 1 - Math.sqrt((1 - mitad) / 2);
        t = (u < 0.5 ? tt : 1 + tt) * D / 2;
      }
      v[i] = Math.min(D - 1, Math.floor(t));
    }
    return v;
  });

  let resultado = $state(/** @type {any} */ (null));
  let ms = $state(0);

  function simular() {
    vibrar();
    const t = performance.now();
    resultado = motor().simular_fila(llegadas, frecuencia, capacidad);
    ms = performance.now() - t;
  }
  $effect(() => { llegadas; frecuencia; capacidad; simular(); });

  // Histograma de llegadas cada 5 minutos contra lo que alcanzan a llevar los buses.
  let barras = $derived.by(() => {
    const paso = 5, n = Math.ceil(duracion / paso), c = new Array(n).fill(0);
    for (let i = 0; i < llegadas.length; i++) c[Math.floor(llegadas[i] / paso)]++;
    return c;
  });
  let cupoPorBloque = $derived((5 / frecuencia) * capacidad);
  let maxBarra = $derived(Math.max(...barras, cupoPorBloque) * 1.08);
  let saturado = $derived(resultado && resultado.ultimaSalida > duracion + frecuencia);
</script>

<header class="cabeza">
  <p class="etiqueta">Simulación de hora pico</p>
  <h1 class="titulo-grande">Fila de abordaje</h1>
</header>

<div class="grilla">
  <section class="vidrio tarjeta controles">
    <label class="control-rango">
      <span class="fila"><span>Pasajeros</span><strong class="num">{formatoNumero(pasajeros)}</strong></span>
      <input type="range" min="2000" max="800000" step="2000" bind:value={pasajeros} />
    </label>
    <label class="control-rango">
      <span class="fila"><span>Duración de la hora pico</span><strong class="num">{duracion} min</strong></span>
      <input type="range" min="30" max="360" step="15" bind:value={duracion} />
    </label>
    <label class="control-rango">
      <span class="fila"><span>Un bus cada</span><strong class="num">{frecuencia} min</strong></span>
      <input type="range" min="1" max="15" step="1" bind:value={frecuencia} />
    </label>
    <div class="control-rango">
      <span class="fila"><span>Bus</span><strong class="num">{capacidad} cupos</strong></span>
      <div class="segmentado" role="group" aria-label="Tipo de bus">
        <button aria-pressed={capacidad === 160} onclick={() => (capacidad = 160)}>Articulado</button>
        <button aria-pressed={capacidad === 250} onclick={() => (capacidad = 250)}>Biarticulado</button>
      </div>
    </div>
    <div class="control-rango">
      <span class="fila"><span>Cómo llega la gente</span></span>
      <div class="segmentado" role="group" aria-label="Perfil de llegadas">
        <button aria-pressed={perfil === 'constante'} onclick={() => (perfil = 'constante')}>Parejo</button>
        <button aria-pressed={perfil === 'pico'} onclick={() => (perfil = 'pico')}>Un pico</button>
        <button aria-pressed={perfil === 'dos'} onclick={() => (perfil = 'dos')}>Dos picos</button>
      </div>
    </div>
  </section>

  <div class="col">
    {#if resultado}
      <section class="vidrio tarjeta">
        <div class="cabeza-tarjeta">
          <p class="etiqueta">Resultado</p>
          <span class="chip num"><Icono nombre="rayo" tam={14} /> {formatoNumero(resultado.pasajeros)} en {ms.toFixed(1)} ms</span>
        </div>
        <div class="metricas">
          <div class="metrica" class:alerta={saturado}><p class="valor num">{resultado.esperaPromedio.toFixed(1)}</p><p class="mini tenue">min de espera promedio</p></div>
          <div class="metrica"><p class="valor num">{resultado.esperaMaxima}</p><p class="mini tenue">min de espera máxima</p></div>
          <div class="metrica"><p class="valor num">{formatoNumero(resultado.buses)}</p><p class="mini tenue">buses despachados</p></div>
          <div class="metrica"><p class="valor num">{Math.round((resultado.busesLlenos / Math.max(1, resultado.buses)) * 100)}%</p><p class="mini tenue">buses salen llenos</p></div>
        </div>
        <p class="pequeno tenue resumen">
          {#if saturado}La fila crece más rápido de lo que los buses la vacían: el último pasajero sale a las <strong class="num">{sumarMinutos(INICIO, resultado.ultimaSalida)}</strong>, aunque la llegada termina a las {sumarMinutos(INICIO, duracion)}.
          {:else}Los buses alcanzan a mover la demanda: el último sale a las <strong class="num">{sumarMinutos(INICIO, resultado.ultimaSalida)}</strong>.{/if}
        </p>
      </section>
    {/if}

    <section class="vidrio tarjeta">
      <p class="etiqueta">Llegadas cada 5 minutos</p>
      <svg class="grafica" viewBox="0 0 {barras.length * 10} 100" preserveAspectRatio="none" role="img" aria-label="Pasajeros que llegan cada 5 minutos frente al cupo de los buses">
        {#each barras as b, i}
          <rect x={i * 10 + 1} y={100 - (b / maxBarra) * 100} width="8" height={(b / maxBarra) * 100} rx="2" class:excede={b > cupoPorBloque} />
        {/each}
        <line x1="0" x2={barras.length * 10} y1={100 - (cupoPorBloque / maxBarra) * 100} y2={100 - (cupoPorBloque / maxBarra) * 100} />
      </svg>
      <div class="leyenda mini tenue">
        <span><i class="cuadro"></i>Pasajeros que llegan</span>
        <span><i class="cuadro excede"></i>Más de lo que cabe</span>
        <span><i class="raya"></i>Cupo de los buses ({formatoNumero(Math.round(cupoPorBloque))})</span>
      </div>
      <div class="eje mini tenue num"><span>{INICIO}</span><span>{sumarMinutos(INICIO, duracion)}</span></div>
    </section>
  </div>
</div>

<style>
  .cabeza { padding: 8px 4px 18px; }
  .grilla, .col { display: grid; gap: 14px; align-content: start; }
  .grilla :global(.tarjeta + .tarjeta), .col :global(.tarjeta + .tarjeta) { margin-top: 0; }
  .controles { display: grid; gap: 20px; }
  .control-rango { display: grid; gap: 10px; }
  .fila { display: flex; justify-content: space-between; gap: 8px; font-size: 15px; }
  input[type='range'] {
    -webkit-appearance: none; appearance: none; width: 100%; height: 28px; background: transparent;
    touch-action: pan-y;
  }
  input[type='range']::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--relleno-2); }
  input[type='range']::-moz-range-track { height: 4px; border-radius: 2px; background: var(--relleno-2); }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%;
    background: #fff; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 0.5px 4px rgba(0, 0, 0, 0.12);
  }
  input[type='range']::-moz-range-thumb { width: 28px; height: 28px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15); }
  .metricas { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .metrica { padding: 12px; border-radius: 16px; background: var(--relleno); }
  .metrica.alerta { background: var(--naranja-suave); color: var(--naranja); }
  .metrica.alerta .mini { color: inherit; }
  .valor { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .resumen { margin-top: 12px; }
  .grafica { width: 100%; height: 180px; margin-top: 12px; display: block; overflow: visible; }
  .grafica rect { fill: color-mix(in srgb, var(--azul) 70%, transparent); transition: y 300ms var(--salida), height 300ms var(--salida); }
  .grafica rect.excede { fill: var(--rojo); }
  .grafica line { stroke: var(--tinta); stroke-width: 1.2; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
  .leyenda { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; }
  .leyenda span { display: inline-flex; align-items: center; gap: 6px; }
  .cuadro { width: 10px; height: 10px; border-radius: 3px; background: color-mix(in srgb, var(--azul) 70%, transparent); }
  .cuadro.excede { background: var(--rojo); }
  .raya { width: 14px; border-top: 1.5px dashed var(--tinta); }
  .eje { display: flex; justify-content: space-between; margin-top: 4px; }
  @media (min-width: 640px) { .metricas { grid-template-columns: repeat(4, 1fr); } }
  @media (min-width: 980px) { .grilla { grid-template-columns: minmax(320px, 400px) 1fr; gap: 20px; } .controles { position: sticky; top: 24px; } }
</style>
