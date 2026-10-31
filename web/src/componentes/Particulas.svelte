<script>
  // La fila de abordaje, en vivo. SOLO ILUSTRA: cada punto agrupa k pasajeros y usa los mismos datos
  // (llegadas, frecuencia, capacidad); las cifras de verdad las calcula el motor (R10) en Fila.svelte.
  //
  //  · Avanza sola cuando la tarjeta entra en pantalla (1 minuto simulado ≈ 0,25 s).
  //  · Debajo hay una línea de tiempo con un mango: al arrastrarlo la escena salta a esa hora
  //    (la simulación ilustrativa se recalcula desde las 05:00 de forma determinista: ir atrás o
  //    adelante da siempre lo mismo). Tres segundos después de soltarlo vuelve a avanzar sola.
  import { onMount } from 'svelte';
  import Numero from './Numero.svelte';
  let { llegadas, duracion, frecuencia, capacidad, pasajeros } = $props();

  const INICIO_MIN = 5 * 60; // 05:00
  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // cada punto ≈ k pasajeros: un bus se lleva unos pocos puntos y nunca hay más de ~3.000 en pantalla
  let k = $derived(Math.max(1, Math.ceil(pasajeros / 3000), Math.min(Math.ceil(pasajeros / 700), Math.floor(capacidad / 3))));
  let porMinuto = $derived.by(() => { const c = new Float32Array(duracion + 1); for (let i = 0; i < llegadas.length; i++) c[llegadas[i]]++; return c; });
  let segundos = $derived(Math.min(60, Math.max(24, duracion * 0.25))); // lo que dura la hora pico en pantalla
  let minPorSeg = $derived(duracion / segundos);

  // ------------------------------------------------------------ simulación ilustrativa (por minuto)
  let sim = null;
  let fin = $state(0); // último minuto que vale la pena mostrar (la fila puede seguir después de la llegada)
  const azar = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

  function nuevaSim() { return { m: -1, fila: [], vuelo: [], resto: 0, cupo: 0, id: 0, ultimoBus: -99 }; }

  // Procesa minuto a minuto hasta 'hasta'. 'animar' = los puntos entran caminando y los que suben vuelan.
  function avanzarHasta(S, hasta, animar, alto) {
    while (S.m < Math.floor(hasta)) {
      S.m++;
      const m = S.m;
      if (m <= duracion) {
        S.resto += (porMinuto[m] || 0) / k;
        while (S.resto >= 1) {
          S.resto -= 1;
          const id = S.id++;
          S.fila.push({ id, nace: m + azar(id * 7 + 3), y: 0.08 + azar(id) * 0.84, x: animar ? -8 : null, yy: null });
        }
      }
      if (m % frecuencia === 0) {
        S.ultimoBus = m;
        S.cupo += capacidad / k;
        let n = Math.min(Math.floor(S.cupo), S.fila.length);
        S.cupo -= Math.floor(S.cupo);
        const suben = S.fila.splice(0, n);
        if (animar) for (const p of suben) { p.espera = m - p.nace; p.t = 0; S.vuelo.push(p); }
      }
    }
    if (S.vuelo.length > 600) S.vuelo.splice(0, S.vuelo.length - 600);
  }

  // Hasta dónde llega la línea de tiempo: fin de llegadas o cuando se vacía la fila (máx. +2 h).
  function calcularFin() {
    const S = nuevaSim();
    let m = duracion;
    avanzarHasta(S, duracion, false, 1);
    while (S.fila.length > 0 && m < duracion + 120) { m++; avanzarHasta(S, m, false, 1); }
    return Math.max(duracion, Math.ceil(m / frecuencia) * frecuencia);
  }

  // ------------------------------------------------------------ reloj y control
  let t = $state(0);            // minuto simulado (con decimales)
  let enFila = $state(0);
  let pausa = $state(false);    // el dedo movió el mango
  let reanuda = $state(0);      // 0..1 progreso de los 3 s antes de seguir solo
  let visible = false, yaEmpezo = false;
  let esperaHasta = 0;          // pausa al final antes de repetir
  let temporizador = 0;

  function reiniciar() {
    sim = nuevaSim();
    fin = calcularFin();
    const inicio = reducido ? Math.round(duracion * 0.55) : 0; // variable local: el efecto no debe depender de t
    t = inicio;
    saltar(inicio);
  }
  $effect(() => { llegadas; duracion; frecuencia; capacidad; k; reiniciar(); });

  // La escena salta a la hora t (desde cero si hay que ir hacia atrás) y los puntos quedan en su lugar.
  function saltar(nuevo) {
    if (!sim || Math.floor(nuevo) < sim.m) sim = nuevaSim();
    avanzarHasta(sim, nuevo, false, alto);
    sim.vuelo = [];
    for (const p of sim.fila) { p.x = null; p.yy = null; }
    enFila = Math.round(sim.fila.length * k);
  }

  function alMover(e) {
    const v = Number(e.currentTarget.value);
    pausa = true;
    reanuda = 0;
    clearInterval(temporizador);
    t = v;
    saltar(v);
  }
  function alSoltar() {
    if (!pausa) return;
    clearInterval(temporizador);
    const inicio = performance.now();
    temporizador = setInterval(() => {
      reanuda = Math.min(1, (performance.now() - inicio) / 3000);
      if (reanuda >= 1) { clearInterval(temporizador); pausa = false; reanuda = 0; }
    }, 50);
  }

  const aHora = (m) => { const x = INICIO_MIN + Math.floor(m); return String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
  let reloj = $derived(aHora(Math.min(t, fin)));

  // silueta de la curva de llegadas para la línea de tiempo
  let curva = $derived.by(() => {
    const n = 60, paso = Math.max(1, Math.ceil((duracion + 1) / n)), v = [];
    for (let i = 0; i <= duracion; i += paso) { let s = 0; for (let j = i; j < Math.min(duracion + 1, i + paso); j++) s += porMinuto[j]; v.push(s); }
    const max = Math.max(1, ...v), ancho = duracion / Math.max(1, fin);
    return 'M0,24 ' + v.map((s, i) => `L${((i / Math.max(1, v.length - 1)) * 100 * ancho).toFixed(2)},${(24 - (s / max) * 22).toFixed(2)}`).join(' ') + ` L${(100 * ancho).toFixed(2)},24 Z`;
  });

  // ------------------------------------------------------------ dibujo
  let lienzo = $state(/** @type {HTMLCanvasElement | null} */ (null));
  let caja = $state(/** @type {HTMLElement | null} */ (null));
  let alto = 190;
  const TONOS = 10;
  const colores = Array.from({ length: TONOS }, (_, i) => {
    const u = i / (TONOS - 1);
    const h = u < 0.5 ? 212 + u * 2 * 68 : 280 + (u - 0.5) * 2 * 80; // azul → violeta → rojo
    return `hsl(${h % 360} 82% ${58 - u * 6}%)`;
  });

  function dibujar(g, w, h, dt, animar) {
    g.clearRect(0, 0, w, h);
    const xAnden = w * 0.7, xBus = xAnden + 10;
    // andén
    g.fillStyle = 'rgba(120,120,128,0.18)';
    g.fillRect(xAnden, 10, 3, h - 20);

    // bus: si los buses van muy seguidos queda en la puerta y solo "respira"; si no, llega y se va
    const ciclo = frecuencia / minPorSeg; // segundos reales entre buses
    const fase = ((t % frecuencia) + frecuencia) % frecuencia / frecuencia;
    let dx = 0;
    if (ciclo > 0.9 && animar) {
      if (fase < 0.18) dx = (1 - fase / 0.18) ** 2 * (w - xBus + 20);           // llega
      else if (fase > 0.86) dx = ((fase - 0.86) / 0.14) ** 2 * (w - xBus + 20); // se va
    }
    const bw = Math.min(w - xBus - 6, 120), bh = h - 36, bx = xBus + 4 + dx, by = 18;
    g.fillStyle = '#e3001b';
    g.beginPath(); g.roundRect(bx, by, bw, bh, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.82)';
    const nv = Math.max(2, Math.floor((bh - 20) / 26));
    for (let i = 0; i < nv; i++) { g.beginPath(); g.roundRect(bx + bw * 0.38, by + 10 + i * ((bh - 20) / nv), bw * 0.48, (bh - 20) / nv - 6, 4); g.fill(); }
    // puerta (se ilumina cuando sube gente)
    const brillo = sim && t - sim.ultimoBus < Math.max(0.6, frecuencia * 0.35) ? 0.95 : 0.35;
    g.fillStyle = `rgba(255,214,0,${brillo})`;
    g.beginPath(); g.roundRect(bx + 6, by + bh * 0.3, 7, bh * 0.4, 3); g.fill();

    if (!sim) return;
    // fila: los primeros en llegar, pegados al andén; cuadrícula de abajo hacia atrás
    const filas = Math.max(8, Math.floor((h - 24) / 7));
    const cols = Math.max(1, Math.ceil(sim.fila.length / filas));
    const sep = Math.min(7, (xAnden - 16) / cols);
    const a = animar ? 1 - Math.pow(0.0006, dt) : 1;
    const max = Math.max(8, frecuencia * 6);
    const cubetas = colores.map(() => []);
    for (let i = 0; i < sim.fila.length; i++) {
      const p = sim.fila[i];
      const tx = xAnden - 8 - Math.floor(i / filas) * sep;
      const ty = 12 + (i % filas) * ((h - 24) / (filas - 1));
      if (p.x === null) { p.x = tx; p.yy = ty; }
      if (p.yy === null) p.yy = 12 + p.y * (h - 24);
      p.x += (tx - p.x) * a; p.yy += (ty - p.yy) * a;
      cubetas[Math.min(TONOS - 1, Math.floor(Math.max(0, t - p.nace) / max * (TONOS - 1)))].push(p);
    }
    for (let c = 0; c < TONOS; c++) {
      if (!cubetas[c].length) continue;
      g.fillStyle = colores[c];
      g.beginPath();
      for (const p of cubetas[c]) { g.moveTo(p.x + 2.6, p.yy); g.arc(p.x, p.yy, 2.6, 0, 6.2832); }
      g.fill();
    }
    // los que suben: vuelan a la puerta y se desvanecen
    const puertaX = bx + 10, puertaY = by + bh / 2;
    for (let i = sim.vuelo.length - 1; i >= 0; i--) {
      const p = sim.vuelo[i];
      p.t += dt * 2.6;
      if (p.t >= 1) { sim.vuelo.splice(i, 1); continue; }
      const e = p.t * p.t;
      const x = p.x + (puertaX - p.x) * e, y = p.yy + (puertaY - p.yy) * e;
      g.globalAlpha = 1 - p.t;
      g.fillStyle = colores[Math.min(TONOS - 1, Math.floor(Math.max(0, p.espera) / max * (TONOS - 1)))];
      g.beginPath(); g.arc(x, y, 2.6, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;
  }

  onMount(() => {
    const g = lienzo.getContext('2d');
    let w = 0, h = 0, raf = 0, antes = performance.now(), ultimoConteo = 0;
    const medir = () => {
      const r = lienzo.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height; alto = h; lienzo.width = Math.round(w * d); lienzo.height = Math.round(h * d); g.setTransform(d, 0, 0, d, 0, 0);
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(lienzo);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !yaEmpezo) { yaEmpezo = true; if (!reducido) { t = 0; saltar(0); } }
    }, { threshold: 0.25 });
    if (caja) io.observe(caja);

    const bucle = (ahora) => {
      raf = requestAnimationFrame(bucle);
      const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
      if (document.hidden || !visible) return;
      const corre = !reducido && !pausa && yaEmpezo;
      if (corre) {
        if (t >= fin) {
          if (!esperaHasta) esperaHasta = ahora + 2500;
          else if (ahora > esperaHasta) { esperaHasta = 0; t = 0; saltar(0); }
        } else {
          t = Math.min(fin, t + dt * minPorSeg);
          avanzarHasta(sim, t, true, h);
        }
      }
      dibujar(g, w, h, dt, corre);
      if (ahora - ultimoConteo > 150) { ultimoConteo = ahora; enFila = Math.round(sim.fila.length * k); }
    };
    raf = requestAnimationFrame(bucle);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); clearInterval(temporizador); };
  });
</script>

<div class="tarjeta-fila" bind:this={caja}>
  <div class="cabeza-tarjeta">
    <p class="etiqueta">La fila, en vivo</p>
    <span class="datos">
      <span class="chip num reloj">{reloj}</span>
      <span class="esperando"><strong class="num"><Numero valor={enFila.toLocaleString('es-CO')} /></strong> <span class="mini tenue">esperando</span></span>
    </span>
  </div>

  <div class="escena">
    <canvas bind:this={lienzo} aria-hidden="true"></canvas>
    <span class="rotulo izq mini">Entran →</span>
  </div>

  <p class="explica pequeno">
    Cada punto es un grupo de ~{k.toLocaleString('es-CO')} personas. Cada {frecuencia} min sale un bus que se lleva hasta {capacidad.toLocaleString('es-CO')};
    si llegan más de los que caben, la fila crece. <span class="tenue">Azul: acaba de llegar · rojo: lleva rato esperando.</span>
  </p>

  <div class="linea-tiempo" class:pausa>
    <svg class="curva" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><path d={curva} /></svg>
    <input
      type="range" min="0" max={fin} step="0.25" value={Math.min(t, fin)}
      aria-label="Hora de la simulación" aria-valuetext={reloj}
      oninput={alMover} onpointerup={alSoltar} onpointercancel={alSoltar} ontouchend={alSoltar} onkeyup={alSoltar} onchange={alSoltar}
    />
  </div>
  <div class="pie-tiempo mini tenue num">
    <span>{aHora(0)}</span>
    <span class="estado-tiempo">
      {#if pausa}
        <svg class="anillo" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" /><circle class="progreso" cx="10" cy="10" r="8" style="stroke-dashoffset:{50.3 * (1 - reanuda)}" /></svg>
        {reanuda > 0 ? `Sigue sola en ${Math.max(1, Math.ceil(3 - reanuda * 3))} s` : 'Suelta para seguir'}
      {:else if reducido}Arrastra para ver otra hora{:else}Arrastra el punto para ver otra hora{/if}
    </span>
    <span>{aHora(fin)}</span>
  </div>
  <p class="mini tenue nota">Ilustración: las cifras de arriba las calcula el motor.</p>
</div>

<style>
  .tarjeta-fila :global(.cabeza-tarjeta) { flex-wrap: wrap; row-gap: 8px; }
  .datos { display: flex; align-items: center; gap: 10px; }
  .reloj { font-weight: 700; }
  .esperando { display: inline-flex; align-items: baseline; gap: 4px; white-space: nowrap; }
  .esperando strong { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .escena { position: relative; height: 190px; border-radius: 16px; background: color-mix(in srgb, var(--relleno) 70%, transparent); overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .rotulo { position: absolute; top: 6px; padding: 2px 8px; border-radius: 999px; background: var(--vidrio-fuerte); color: var(--tenue); font-weight: 600; pointer-events: none; }
  .rotulo.izq { left: 8px; }
  .explica { margin-top: 10px; line-height: 1.45; }

  .linea-tiempo { position: relative; height: 44px; margin-top: 12px; }
  .curva { position: absolute; left: 14px; right: 14px; bottom: 21px; width: calc(100% - 28px); height: 20px; pointer-events: none; }
  .curva path { fill: color-mix(in srgb, var(--azul) 18%, transparent); }
  input[type='range'] {
    position: absolute; inset: 0; width: 100%; height: 44px; margin: 0;
    -webkit-appearance: none; appearance: none; background: transparent;
    touch-action: pan-y; cursor: grab;
  }
  input[type='range']:active { cursor: grabbing; }
  input[type='range']::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--relleno-2); }
  input[type='range']::-moz-range-track { height: 4px; border-radius: 2px; background: var(--relleno-2); }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none; width: 28px; height: 28px; margin-top: -12px; border-radius: 50%;
    background: #fff; border: 0;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18), 0 0.5px 4px rgba(0, 0, 0, 0.14), inset 0 0 0 6px var(--rojo);
    transition: transform 160ms var(--salida);
  }
  input[type='range']::-moz-range-thumb { width: 28px; height: 28px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18), inset 0 0 0 6px var(--rojo); }
  input[type='range']:active::-webkit-slider-thumb { transform: scale(1.12); }
  .pie-tiempo { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 2px; }
  .estado-tiempo { display: inline-flex; align-items: center; gap: 6px; color: var(--tinta-2); font-weight: 600; text-align: center; }
  .anillo { width: 14px; height: 14px; transform: rotate(-90deg); }
  .anillo circle { fill: none; stroke: var(--relleno-2); stroke-width: 3; }
  .anillo .progreso { stroke: var(--rojo); stroke-dasharray: 50.3; transition: stroke-dashoffset 60ms linear; }
  .nota { margin-top: 8px; }
  @media (max-width: 380px) { .rotulo { display: none; } }
</style>
