<script>
  // La fila de abordaje, en vivo. SOLO ILUSTRA: cada punto agrupa k pasajeros y usa los mismos datos
  // (llegadas, frecuencia, capacidad); las cifras de verdad las calcula el motor (R10) en Fila.svelte.
  //
  //  · Avanza sola desde que se abre. Se puede mover con el dedo: arrastrando el mango de la línea de
  //    tiempo o la escena.
  //  · Al soltar conserva el impulso del gesto (inercia que frena sola) y enseguida sigue sola,
  //    acelerando suave (1 minuto simulado ≈ 0,5 s).
  //  · La simulación ilustrativa es determinista: ir atrás o adelante a la misma hora da lo mismo.
  import { onMount } from 'svelte';
  let { llegadas, duracion, frecuencia, capacidad, pasajeros } = $props();

  const INICIO_MIN = 5 * 60; // 05:00
  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // cada punto ≈ k pasajeros: un bus se lleva unos pocos puntos y nunca hay más de ~3.000 en pantalla
  // (tope de ~1.400 puntos: con 800.000 pasajeros el celular sigue dibujando fluido)
  let k = $derived(Math.max(1, Math.ceil(pasajeros / 1400), Math.min(Math.ceil(pasajeros / 700), Math.floor(capacidad / 3))));
  let porMinuto = $derived.by(() => { const c = new Float32Array(duracion + 1); for (let i = 0; i < llegadas.length; i++) c[Math.min(duracion, Math.floor(llegadas[i] / 60))]++; return c; }); // llegadas viene en segundos
  let segundos = $derived(Math.min(150, Math.max(40, duracion * 0.5))); // lo que dura la hora pico en pantalla (≈ medio segundo por minuto: se alcanza a leer sin aburrir)
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

  // ------------------------------------------------------------ reloj y control (física tipo iOS)
  let t = $state(0);            // minuto simulado (con decimales)
  let enFila = $state(0);
  // modo: 'auto' (avanza sola) · 'arrastre' (dedo encima) · 'suelto' (inercia del gesto, luego sigue sola)
  let modo = $state('auto');
  let reanuda = 0;
  let visible = false;
  let esperaHasta = 0;          // pausa al final antes de repetir
  let vel = 0;                  // velocidad actual (min simulados por segundo)
  let soltadoEn = 0;
  let desborde = 0;             // cuánto se pasó el mango del borde (px), vuelve con resorte

  function reiniciar() {
    sim = nuevaSim();
    fin = calcularFin();
    const inicio = 0; // arranca sola desde el comienzo de la hora pico (variable local: el efecto no depende de t)
    t = inicio;
    modo = 'auto';
    vel = 0;
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
  // Mover el tiempo: hacia adelante y poquito se anima (la gente camina), atrás o mucho salta.
  function irA(nuevo, animar) {
    const v = Math.max(0, Math.min(fin, nuevo));
    if (animar && v >= t && v - t < 4) avanzarHasta(sim, v, true, alto);
    else if (Math.floor(v) !== Math.floor(t) || v < t) saltar(v);
    t = v;
  }

  // ---- gesto: arrastrar el mango (posición) o la escena (desplazamiento)
  let pista = $state(/** @type {HTMLElement | null} */ (null));
  let mango = $state(/** @type {HTMLElement | null} */ (null));
  /** @type {{ id: number, tipo: 'pista'|'escena', x0: number, t0: number, ancho: number, izq: number, historia: {x: number, t: number}[] } | null} */
  let dedo = null;
  const banda = (exceso) => (1 - 1 / ((Math.abs(exceso) * 0.55) / 60 + 1)) * 60 * Math.sign(exceso);

  function agarrar(e, tipo) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = /** @type {HTMLElement} */ (e.currentTarget);
    el.setPointerCapture(e.pointerId);
    const r = (tipo === 'pista' ? pista : el).getBoundingClientRect();
    dedo = { id: e.pointerId, tipo, x0: e.clientX, t0: t, ancho: r.width - 28, izq: r.left + 14, historia: [{ x: e.clientX, t: e.timeStamp }] };
    modo = 'arrastre';
    vel = 0;
    reanuda = 0;
    if (tipo === 'pista') moverDedo(e); // tocar la pista lleva el mango ahí
  }
  function moverDedo(e) {
    if (!dedo || e.pointerId !== dedo.id) return;
    dedo.historia.push({ x: e.clientX, t: e.timeStamp });
    if (dedo.historia.length > 6) dedo.historia.shift();
    const objetivo = dedo.tipo === 'pista'
      ? ((e.clientX - dedo.izq) / dedo.ancho) * fin
      : dedo.t0 + ((e.clientX - dedo.x0) / dedo.ancho) * fin * 0.6;
    const px = ((objetivo - Math.max(0, Math.min(fin, objetivo))) / fin) * dedo.ancho;
    desborde = banda(px); // resistencia elástica al pasarse del borde
    irA(objetivo, true);
  }
  function soltar(e) {
    if (!dedo || e.pointerId !== dedo.id) return;
    const h = dedo.historia, a = h[0], b = h[h.length - 1];
    const dt = (b.t - a.t) / 1000;
    const pxs = dt > 0.008 && e.timeStamp - b.t < 80 ? (b.x - a.x) / dt : 0; // px/s del dedo (0 si se quedó quieto)
    vel = (pxs / dedo.ancho) * fin * (dedo.tipo === 'pista' ? 1 : 0.6);
    dedo = null;
    modo = 'suelto';
    soltadoEn = performance.now();
  }
  function teclado(e) {
    const paso = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') irA(t + paso, false);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') irA(t - paso, false);
    else if (e.key === 'Home') irA(0, false);
    else if (e.key === 'End') irA(fin, false);
    else return;
    e.preventDefault();
    vel = 0;
    modo = 'suelto';
    soltadoEn = performance.now();
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
  const RADIO = 3.3;
  const colores = Array.from({ length: TONOS }, (_, i) => {
    const u = i / (TONOS - 1);
    const h = u < 0.5 ? 212 + u * 2 * 68 : 280 + (u - 0.5) * 2 * 80; // azul → violeta → rojo
    return `hsl(${h % 360} 100% ${68 - u * 6}%)`; // vivos: se ven sobre el vidrio claro y el oscuro
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
    const filas = Math.max(8, Math.floor((h - 24) / 8));
    const cols = Math.max(1, Math.ceil(sim.fila.length / filas));
    const sep = Math.min(8, (xAnden - 16) / cols);
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
      for (const p of cubetas[c]) { g.moveTo(p.x + RADIO, p.yy); g.arc(p.x, p.yy, RADIO, 0, 6.2832); }
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
      g.beginPath(); g.arc(x, y, RADIO, 0, 6.2832); g.fill();
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
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.15 });
    if (caja) io.observe(caja);

    const bucle = (ahora) => {
      raf = requestAnimationFrame(bucle);
      const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
      if (document.hidden || !visible) return;
      let animar = false;
      if (modo === 'suelto') {
        // inercia: sigue con la velocidad del gesto y frena sola (fricción tipo iOS)
        if (Math.abs(vel) > 0.05) {
          irA(t + vel * dt, vel > 0);
          vel *= Math.exp(-dt * 3.2);
          if (t <= 0 || t >= fin) vel = 0;
          animar = vel > 0;
        }
        // sin cuenta regresiva: cuando la inercia se acaba (o va hacia adelante) sigue sola
        if (Math.abs(vel) <= 0.05 || (vel > 0 && vel <= minPorSeg)) { modo = 'auto'; if (vel < 0) vel = 0; }
      } else if (modo === 'auto' && !reducido) {
        // retoma: la velocidad crece suave hasta la normal (no arranca de golpe)
        vel += (minPorSeg - vel) * (1 - Math.exp(-dt * 2.4));
        if (t >= fin) {
          if (!esperaHasta) esperaHasta = ahora + 2500;
          else if (ahora > esperaHasta) { esperaHasta = 0; vel = 0; t = 0; saltar(0); }
        } else {
          t = Math.min(fin, t + vel * dt);
          avanzarHasta(sim, t, true, h);
          animar = true;
        }
      }
      // el mango vuelve a su sitio con resorte si se pasó del borde
      if (!dedo && desborde) { desborde *= Math.exp(-dt * 14); if (Math.abs(desborde) < 0.3) desborde = 0; }
      if (mango && pista) {
        const ancho = pista.clientWidth - 28;
        mango.style.transform = `translate3d(${((Math.min(t, fin) / Math.max(1, fin)) * ancho + desborde).toFixed(2)}px,0,0) scale(${dedo ? 1.15 : 1})`;
      }
      dibujar(g, w, h, dt, animar || modo === 'arrastre');
      // el número sigue a la fila de forma suave (no salta de golpe ni se queda pegado)
      if (ahora - ultimoConteo > 120) {
        ultimoConteo = ahora;
        const real = sim.fila.length * k;
        enFila = Math.abs(real - enFila) < Math.max(1, k) ? real : Math.round(enFila + (real - enFila) * 0.45);
      }
    };
    raf = requestAnimationFrame(bucle);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  });
</script>

<div class="tarjeta-fila" bind:this={caja}>
  <div class="cabeza-tarjeta">
    <p class="etiqueta">La fila, en vivo</p>
    <span class="datos">
      <span class="chip num reloj">{reloj}</span>
      <span class="esperando"><strong class="num">{enFila.toLocaleString('es-CO')}</strong> <span class="mini tenue">esperando</span></span>
    </span>
  </div>

  <div class="escena" role="presentation" onpointerdown={(e) => agarrar(e, 'escena')} onpointermove={moverDedo} onpointerup={soltar} onpointercancel={soltar}>
    <canvas bind:this={lienzo} aria-hidden="true"></canvas>
    <span class="rotulo izq mini">Entran →</span>
  </div>

  <p class="explica pequeno">
    Cada punto es un grupo de ~{k.toLocaleString('es-CO')} personas. Cada {frecuencia} min sale un bus que se lleva hasta {capacidad.toLocaleString('es-CO')};
    si llegan más de los que caben, la fila crece. <span class="tenue">Azul: acaba de llegar · rojo: lleva rato esperando.</span>
  </p>

  <div class="linea-tiempo" bind:this={pista}
    role="slider" tabindex="0" aria-label="Hora de la simulación" aria-valuemin="0" aria-valuemax={fin} aria-valuenow={Math.round(t)} aria-valuetext={reloj}
    onpointerdown={(e) => agarrar(e, 'pista')} onpointermove={moverDedo} onpointerup={soltar} onpointercancel={soltar} onkeydown={teclado}>
    <svg class="curva" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><path d={curva} /></svg>
    <span class="riel" aria-hidden="true"></span>
    <span class="mango" class:activo={modo === 'arrastre'} bind:this={mango} aria-hidden="true"></span>
  </div>
  <div class="pie-tiempo mini tenue num">
    <span>{aHora(0)}</span>
    <span class="estado-tiempo">
      {#if modo === 'arrastre'}Suelta para que siga sola
      {:else}<span class="punto-vivo" aria-hidden="true"></span>En vivo · toca para mover la hora{/if}
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

  .escena { touch-action: pan-y; cursor: grab; -webkit-user-select: none; user-select: none; }
  .escena:active { cursor: grabbing; }
  .linea-tiempo {
    position: relative; height: 44px; margin-top: 12px; border-radius: 12px;
    touch-action: pan-y; cursor: pointer; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent;
  }
  .curva { position: absolute; left: 14px; right: 14px; bottom: 22px; width: calc(100% - 28px); height: 20px; pointer-events: none; }
  .curva path { fill: color-mix(in srgb, var(--azul) 18%, transparent); }
  .riel { position: absolute; left: 14px; right: 14px; bottom: 20px; height: 4px; border-radius: 2px; background: var(--relleno-2); }
  .mango {
    position: absolute; left: 0; bottom: 8px; width: 28px; height: 28px; border-radius: 50%;
    background: #fff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18), 0 0.5px 4px rgba(0, 0, 0, 0.14), inset 0 0 0 6px var(--rojo);
    will-change: transform; pointer-events: none;
    transition: box-shadow 200ms ease;
  }
  .mango.activo { box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22), 0 0.5px 4px rgba(0, 0, 0, 0.14), inset 0 0 0 5px var(--rojo); }
  .punto-vivo { width: 7px; height: 7px; border-radius: 50%; background: var(--rojo); animation: latido 1.4s ease-in-out infinite; }
  @keyframes latido { 50% { opacity: 0.35; } }
  .pie-tiempo { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 2px; }
  .estado-tiempo { display: inline-flex; align-items: center; gap: 6px; color: var(--tinta-2); font-weight: 600; text-align: center; }
  .nota { margin-top: 8px; }
  @media (max-width: 380px) { .rotulo { display: none; } }
</style>
