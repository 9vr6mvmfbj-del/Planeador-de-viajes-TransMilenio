<script>
  import { onMount } from 'svelte';
  import { app, vibrar } from '../lib/estado.svelte.js';
  import Icono from './Icono.svelte';

  const pestanas = [
    { id: 'viajar', texto: 'Viajar', icono: 'viajar' },
    { id: 'estaciones', texto: 'Estaciones', icono: 'estaciones' },
    { id: 'operar', texto: 'Operar', icono: 'operar' },
    { id: 'fila', texto: 'Fila', icono: 'fila' },
    { id: 'rendimiento', texto: 'Rendimiento', icono: 'rendimiento' },
  ];
  const N = pestanas.length;
  const PAD = 4; // relleno interno de la barra (px)

  let indice = $derived(pestanas.findIndex((p) => p.id === app.vista));

  function ir(id) {
    if (app.vista === id) return;
    vibrar();
    app.vista = id;
  }

  // =============================================================== lente de Liquid Glass
  // Réplica de la barra de pestañas de iOS 26/27:
  //  · en reposo es una cápsula gris bajo la pestaña activa;
  //  · al tocarla "se levanta": crece (~1,3 pestañas), sobresale de la barra, se vuelve vidrio
  //    transparente que agranda lo que tiene debajo y dobla el contenido en el borde (refracción);
  //  · se arrastra con el dedo, se estira con la velocidad y tiene resistencia en los bordes;
  //  · al soltar proyecta hacia dónde iba, cae en esa pestaña y vuelve a ser cápsula con un rebote.
  // Todo se mueve con resortes (física), no con transiciones CSS: así arranca siempre desde donde
  // está, hereda la velocidad del dedo y se puede agarrar a mitad de camino.

  const K = 1.32;        // ancho de la lente levantada, en pestañas
  const EXT = 6;         // cuánto sobresale arriba y abajo (px)
  const AUMENTO = 0.18;  // la lupa agranda 18%
  const REFRACCION = 15; // desplazamiento máximo en el borde (px)

  let barra = $state(/** @type {HTMLElement | null} */ (null));
  let cristal = $state(/** @type {HTMLElement | null} */ (null));
  let feImagen = $state(/** @type {SVGElement | null} */ (null));
  let feR = $state(/** @type {SVGElement | null} */ (null));
  let feG = $state(/** @type {SVGElement | null} */ (null));
  let feB = $state(/** @type {SVGElement | null} */ (null));
  let mapa = $state('');
  let levantada = $state(false); // solo para la clase que aplica el filtro

  // medidas
  let ancho = 0, alto = 0, interiorW = 0, interiorH = 0, tw = 0;

  // resortes: valor, velocidad, objetivo
  const cx = { v: 0, vel: 0, obj: 0 }; // centro de la lente (px, dentro del interior)
  const pr = { v: 0, vel: 0, obj: 0 }; // cuánto está levantada (0 cápsula → 1 lente)
  const st = { v: 0, vel: 0, obj: 0 }; // estiramiento por velocidad

  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // respuesta (s) y amortiguación (1 = sin rebote), como los resortes de SwiftUI
  const RES = {
    seguir: { r: 0.07, z: 1 },                     // sigue al dedo casi pegado
    soltar: { r: 0.42, z: reducido ? 1 : 0.72 },   // cae en la pestaña con un rebote corto
    levantar: { r: 0.3, z: reducido ? 1 : 0.58 },  // "pop" al tocar
    bajar: { r: 0.36, z: reducido ? 1 : 0.8 },
    estirar: { r: 0.12, z: 1 },
  };
  let resCx = RES.soltar, resPr = RES.bajar;

  function paso(s, res, dt) {
    const k = (2 * Math.PI / res.r) ** 2;
    const c = (4 * Math.PI * res.z) / res.r;
    const a = -k * (s.v - s.obj) - c * s.vel;
    s.vel += a * dt;
    s.v += s.vel * dt;
  }
  const quieto = (s) => Math.abs(s.v - s.obj) < 0.01 && Math.abs(s.vel) < 0.01;

  let cuadro = 0, antes = 0;
  function animar() {
    if (!cuadro) { antes = performance.now(); cuadro = requestAnimationFrame(bucle); }
  }
  function bucle(t) {
    const dt = Math.min(0.032, Math.max(0, (t - antes) / 1000));
    antes = t;
    const sub = 4;
    for (let i = 0; i < sub; i++) {
      paso(cx, resCx, dt / sub);
      paso(pr, resPr, dt / sub);
      st.obj = reducido ? 0 : Math.min(0.2, Math.abs(cx.vel) / 4200);
      paso(st, RES.estirar, dt / sub);
    }
    pintar();
    if (toque || !(quieto(cx) && quieto(pr) && quieto(st))) cuadro = requestAnimationFrame(bucle);
    else { cuadro = 0; pintar(); }
  }

  // Escribe las variables CSS y el filtro de un cuadro (directo al DOM, 60 veces por segundo).
  function pintar() {
    if (!barra || !tw) return;
    const p = pr.v;                       // puede pasar de 1 por el rebote: da el "pop"
    const p01 = Math.max(0, Math.min(1, p));
    const W = tw * (1 + (K - 1) * p);
    const H = interiorH + 2 * EXT * p;
    const L = cx.v - W / 2;
    const m = 1 + AUMENTO * p;
    const sx = 1 + st.v, sy = 1 - st.v * 0.5;
    const s = barra.style;
    s.setProperty('--L', L + 'px');
    s.setProperty('--W', W + 'px');
    s.setProperty('--H', H + 'px');
    s.setProperty('--T', (interiorH - H) / 2 + 'px');
    s.setProperty('--ox', cx.v + 'px');
    s.setProperty('--m', String(m));
    s.setProperty('--sx', String(sx));
    s.setProperty('--sy', String(sy));
    s.setProperty('--p', String(p01));
    s.setProperty('--hl', PAD + L + 'px');
    s.setProperty('--hr', PAD + L + W + 'px');
    if (cristal) cristal.style.transform = `scale(${1 + 0.035 * p}, ${1 + 0.06 * p})`;
    // la refracción "se materializa": crece con la lente
    if (feImagen) { feImagen.setAttribute('width', String(W)); feImagen.setAttribute('height', String(H)); }
    const r = REFRACCION * p01;
    feR?.setAttribute('scale', String(r));
    feG?.setAttribute('scale', String(r * 1.2));
    feB?.setAttribute('scale', String(r * 1.4));
    const lev = p > 0.02;
    if (lev !== levantada) levantada = lev;
  }

  // Mapa de desplazamiento con refracción real (ley de Snell, vidrio n = 1,5) sobre un bisel convexo
  // tipo "squircle": el centro es plano (solo agranda) y el borde dobla la luz hacia afuera, así que
  // ahí se ve comprimido el contenido que está más allá de la lente. R = desplazamiento en x, G en y.
  function generarMapa(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g) return '';
    const img = g.createImageData(w, h);
    const d = img.data;
    const r = h / 2;
    const bisel = r * 0.62;
    const perfil = (x) => Math.pow(1 - Math.pow(1 - x, 4), 0.25);
    // magnitud del desvío a lo largo del bisel (x: 0 borde → 1 interior)
    const muestras = 128, mag = new Float32Array(muestras + 1);
    let max = 0;
    for (let i = 0; i <= muestras; i++) {
      const x = Math.max(0.0005, i / muestras);
      const dl = 0.001;
      const pend = (perfil(Math.min(1, x + dl)) - perfil(Math.max(0, x - dl))) / (2 * dl);
      const alfa = Math.atan(pend);                 // ángulo de la normal
      const beta = Math.asin(Math.sin(alfa) / 1.5); // ángulo refractado
      const desvio = Math.tan(alfa - beta) * (0.35 + perfil(x)); // espesor: base + altura del bisel
      mag[i] = i === muestras ? 0 : desvio;
      if (mag[i] > max) max = mag[i];
    }
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const px = xx + 0.5, py = yy + 0.5;
        const ccx = Math.min(Math.max(px, r), w - r);
        const dx = px - ccx, dy = py - r;
        const dist = Math.hypot(dx, dy);
        const prof = r - dist;
        let v = 0;
        if (prof <= 0) v = 1;
        else if (prof < bisel) v = mag[Math.round((prof / bisel) * muestras)] / max;
        const nx = dist ? dx / dist : 0, ny = dist ? dy / dist : 0;
        const i = (yy * w + xx) * 4;
        d[i] = 128 + nx * v * 127;
        d[i + 1] = 128 + ny * v * 127;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  function medir() {
    if (!barra) return;
    ancho = barra.clientWidth;
    alto = barra.clientHeight;
    if (!ancho) return;
    interiorW = ancho - PAD * 2;
    interiorH = alto - PAD * 2;
    tw = interiorW / N;
    barra.style.setProperty('--w', interiorW + 'px');
    barra.style.setProperty('--ih', interiorH + 'px');
    mapa = generarMapa(Math.round(tw * K * 2), Math.round((interiorH + EXT * 2) * 2));
    if (!toque) { cx.v = cx.obj = (indice + 0.5) * tw; cx.vel = 0; }
    pintar();
  }

  onMount(() => {
    medir();
    const ro = new ResizeObserver(medir);
    if (barra) ro.observe(barra);
    return () => { ro.disconnect(); cancelAnimationFrame(cuadro); };
  });

  // Si la vista cambia por otro lado (teclado, código), la lente viaja hasta allá.
  $effect(() => {
    const i = indice;
    if (toque || !tw) return;
    cx.obj = (i + 0.5) * tw;
    resCx = RES.soltar;
    animar();
  });

  // ---------------------------------------------------------------- gesto
  /** @type {{ id: number, x0: number, desfase: number, historia: {x: number, t: number}[], arrastra: boolean, previo: number } | null} */
  let toque = null;

  // Resistencia tipo iOS fuera de los límites: cuanto más se pasa, menos avanza.
  const banda = (exceso, dim) => (1 - 1 / ((exceso * 0.55) / dim + 1)) * dim;
  function limitar(v) {
    const min = tw / 2, max = interiorW - tw / 2;
    if (v < min) return min - banda(min - v, tw);
    if (v > max) return max + banda(v - max, tw);
    return v;
  }
  const local = (e) => (barra ? e.clientX - barra.getBoundingClientRect().left - PAD : 0);
  const pestanaEn = (x) => Math.max(0, Math.min(N - 1, Math.floor(x / tw)));

  function abajo(e) {
    if (!barra || (e.pointerType === 'mouse' && e.button !== 0)) return;
    barra.setPointerCapture(e.pointerId);
    const x = local(e);
    const i = pestanaEn(x);
    toque = { id: e.pointerId, x0: e.clientX, desfase: x - (i + 0.5) * tw, historia: [{ x: e.clientX, t: e.timeStamp }], arrastra: false, previo: i };
    cx.obj = (i + 0.5) * tw; // la lente va a la pestaña tocada…
    resCx = RES.soltar;
    pr.obj = 1;              // …y se levanta
    resPr = RES.levantar;
    animar();
  }

  function mover(e) {
    if (!toque || e.pointerId !== toque.id) return;
    toque.historia.push({ x: e.clientX, t: e.timeStamp });
    if (toque.historia.length > 6) toque.historia.shift();
    if (!toque.arrastra && Math.abs(e.clientX - toque.x0) < 4) return;
    toque.arrastra = true;
    cx.obj = limitar(local(e) - toque.desfase);
    resCx = RES.seguir;
    const i = pestanaEn(cx.obj);
    if (i !== toque.previo) { toque.previo = i; vibrar(6); }
    animar();
  }

  function velocidadDedo() {
    const h = toque?.historia ?? [];
    if (h.length < 2) return 0;
    const a = h[0], b = h[h.length - 1];
    const dt = (b.t - a.t) / 1000;
    return dt > 0 ? (b.x - a.x) / dt : 0; // px/s
  }

  function arriba(e) {
    if (!toque || e.pointerId !== toque.id) return;
    let destino;
    if (toque.arrastra) {
      // proyecta hacia dónde iba (como un "flick") y elige la pestaña más cercana a ese punto
      const v = velocidadDedo();
      const proyectado = cx.v + v * 0.09;
      destino = Math.max(0, Math.min(N - 1, Math.round(proyectado / tw - 0.5)));
      cx.vel = v; // la animación continúa a la velocidad del dedo: sin costura
    } else {
      destino = pestanaEn(local(e));
    }
    toque = null;
    cx.obj = (destino + 0.5) * tw;
    resCx = RES.soltar;
    pr.obj = 0;
    resPr = RES.bajar;
    animar();
    ir(pestanas[destino].id);
  }

  function cancelar() {
    if (!toque) return;
    toque = null;
    cx.obj = (indice + 0.5) * tw;
    resCx = RES.soltar;
    pr.obj = 0;
    resPr = RES.bajar;
    animar();
  }
</script>

<nav class="nav" aria-label="Secciones">
  <!-- escritorio: barra lateral -->
  <div class="lateral vidrio">
    <div class="marca">
      <span class="logo" aria-hidden="true">T</span>
      <div>
        <p class="subtitulo">TransMilenio</p>
        <p class="mini tenue">Planeador · motor_boff</p>
      </div>
    </div>
    <ul>
      {#each pestanas as p}
        <li>
          <button class="item" aria-current={app.vista === p.id ? 'page' : undefined} onclick={() => ir(p.id)}>
            <Icono nombre={p.icono} />
            <span>{p.texto}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if app.listo}
      <div class="datos mini tenue num">
        <span>{app.resumen.abiertas}/{app.resumen.estaciones} estaciones abiertas</span>
        <span>{app.resumen.rutas} rutas · {app.resumen.horarios.toLocaleString('es-CO')} horarios</span>
      </div>
    {/if}
  </div>

  <!-- celular: barra flotante con lente de vidrio -->
  <div
    class="barra"
    bind:this={barra}
    style="--n:{N}"
    onpointerdown={abajo}
    onpointermove={mover}
    onpointerup={arriba}
    onpointercancel={cancelar}
    role="presentation"
  >
    <span class="cristal vidrio vidrio-flotante vidrio-nativo" bind:this={cristal} aria-hidden="true"></span>

    <!-- pestañas reales (con foco y teclado). Se perforan donde está la lente. -->
    <div class="pestanas">
      {#each pestanas as p}
        <button class="pestana" aria-current={app.vista === p.id ? 'page' : undefined} onclick={(e) => e.detail === 0 && ir(p.id)}>
          <Icono nombre={p.icono} tam={24} />
          <span>{p.texto}</span>
        </button>
      {/each}
    </div>

    <span class="lente" aria-hidden="true">
      <span class="sombra"></span>
      <span class="recorte">
        <span class="pastilla"></span>
        <span class="lupa" class:refracta={levantada && mapa}>
          <!-- copia de la barra (fondo + pestañas) que la lente agranda y refracta -->
          <span class="base"></span>
          <span class="fantasma"></span>
          <span class="copia">
            <span class="fila">
              {#each pestanas as p}
                <span class="pestana" class:activa={app.vista === p.id}>
                  <Icono nombre={p.icono} tam={24} grosor={2.3} />
                  <span>{p.texto}</span>
                </span>
              {/each}
            </span>
          </span>
        </span>
      </span>
      <span class="brillo"></span>
    </span>

    <!-- refracción con dispersión: cada canal de color se desvía un poco distinto (arcoíris en el borde) -->
    <svg class="filtros" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="refraccion" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
          <feFlood flood-color="rgb(128,128,128)" result="neutro" />
          <feImage bind:this={feImagen} href={mapa} x="0" y="0" width="0" height="0" preserveAspectRatio="none" result="mapa0" />
          <feComposite in="mapa0" in2="neutro" operator="over" result="mapa" />
          <feDisplacementMap bind:this={feR} in="SourceGraphic" in2="mapa" scale="0" xChannelSelector="R" yChannelSelector="G" result="dr" />
          <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cr" />
          <feDisplacementMap bind:this={feG} in="SourceGraphic" in2="mapa" scale="0" xChannelSelector="R" yChannelSelector="G" result="dg" />
          <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cg" />
          <feDisplacementMap bind:this={feB} in="SourceGraphic" in2="mapa" scale="0" xChannelSelector="R" yChannelSelector="G" result="db" />
          <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cb" />
          <feBlend in="cr" in2="cg" mode="screen" result="rg" />
          <feBlend in="rg" in2="cb" mode="screen" />
        </filter>
      </defs>
    </svg>
  </div>
</nav>

<style>
  .lateral { display: none; }

  .barra {
    /* valores iniciales; luego los escribe la física en cada cuadro */
    --L: 0px; --W: 0px; --H: 0px; --T: 0px; --ox: 0px; --m: 1; --sx: 1; --sy: 1; --p: 0; --hl: 0px; --hr: 0px;
    --fantasma: color-mix(in srgb, var(--fondo) 30%, #ffffff);
    position: fixed;
    z-index: 50;
    left: 12px;
    right: 12px;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    height: var(--barra-alto);
    max-width: 520px;
    margin: 0 auto;
    border-radius: 999px;
    touch-action: pan-y;      /* el movimiento horizontal es de la lente; el vertical sigue siendo scroll */
    -webkit-user-select: none;
    user-select: none;
  }
  .cristal { position: absolute; inset: 0; border-radius: inherit; will-change: transform; }

  .pestanas {
    position: absolute;
    inset: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    /* agujero donde está la lente: debajo no se ve el original, solo la copia agrandada */
    -webkit-mask-image: linear-gradient(90deg, #000 var(--hl), transparent var(--hl), transparent var(--hr), #000 var(--hr));
    mask-image: linear-gradient(90deg, #000 var(--hl), transparent var(--hl), transparent var(--hr), #000 var(--hr));
  }
  .pestana {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    color: var(--tinta); /* sobre vidrio el texto va oscuro y con peso, no gris plano (vibrancia) */
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.015em;
    border-radius: 999px;
  }
  .pestanas .pestana[aria-current='page'] { color: var(--rojo); }

  /* ---------------- la lente */
  .lente {
    position: absolute;
    left: 4px;
    top: 4px;
    width: var(--W);
    height: var(--H);
    border-radius: 999px;
    pointer-events: none;
    transform: translate3d(var(--L), var(--T), 0) scale(var(--sx), var(--sy));
    will-change: transform, width, height;
  }
  /* sombra muy suave que aparece al levantarla (sobre una barra clara casi no se nota, como en iOS) */
  .sombra {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: var(--p);
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.07), 0 6px 18px rgba(31, 38, 60, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .recorte { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; }
  /* en reposo: la cápsula gris del selector; se desvanece al levantarse */
  .pastilla {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(120, 120, 128, 0.17);
    opacity: calc(1 - var(--p));
  }
  .lupa { position: absolute; inset: 0; display: block; }
  .lupa.refracta { filter: url(#refraccion); }

  /* copia de la barra alineada con la real; se agranda alrededor del centro de la lente */
  .copia {
    position: absolute;
    left: calc(var(--L) * -1);
    top: calc(var(--T) * -1);
    width: var(--w);
    height: var(--ih);
    transform: scale(var(--m));
    transform-origin: var(--ox) 50%;
  }
  /* el fondo de la barra, en su posición real (sin aumento): como la lente sobresale, su borde se ve
     como una línea dentro de la lente que el bisel dobla (igual que en iOS), y le da a la refracción
     algo claro que separar en colores */
  .fantasma {
    position: absolute;
    left: calc(-4px - var(--L));
    top: calc(-4px - var(--T));
    width: calc(var(--w) + 8px);
    height: calc(var(--ih) + 8px);
    border-radius: 999px;
    background: var(--fantasma);
    box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    opacity: var(--p);
  }
  /* lo que hay detrás fuera de la barra (la página): así la lente no tiene huecos que se tiñan */
  .base {
    position: absolute;
    inset: -12px;
    background: var(--fondo);
    opacity: var(--p);
  }
  .fila { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(var(--n), 1fr); }
  /* bajo la lente: el texto se agranda (transform), se engruesa y el borde lo deforma (filtro) */
  .fila .pestana { font-weight: 750; }
  .fila .pestana.activa { color: var(--rojo); }

  /* brillo especular: un hilo de luz que sigue la forma, más fuerte arriba a la izquierda y abajo a la derecha */
  .brillo {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: var(--p);
    box-shadow:
      inset 0 0 0 0.6px rgba(255, 255, 255, 0.7),
      inset 0 1.2px 1px rgba(255, 255, 255, 0.85),
      inset 0 -1px 1px rgba(255, 255, 255, 0.45);
  }
  .brillo::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(125deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 32%, rgba(255, 255, 255, 0) 68%, rgba(255, 255, 255, 0.7));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  }
  .filtros { position: absolute; pointer-events: none; }

  @media (prefers-color-scheme: dark) {
    .barra { --fantasma: #1f1f22; }
    .pastilla { background: rgba(255, 255, 255, 0.14); }
    .fantasma { box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.12); }
    .brillo { box-shadow: inset 0 0 0 0.6px rgba(255, 255, 255, 0.3), inset 0 1.2px 1px rgba(255, 255, 255, 0.35); }
    .brillo::before { opacity: 0.45; }
    .sombra { box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.06), 0 8px 22px rgba(0, 0, 0, 0.5); }
  }
  @media (prefers-reduced-transparency: reduce) {
    .lupa.refracta { filter: none; }
  }

  @media (min-width: 980px) {
    .barra { display: none; }
    .lateral {
      display: flex;
      flex-direction: column;
      gap: 22px;
      position: sticky;
      top: 24px;
      height: calc(100dvh - 48px);
      border-radius: 26px;
      padding: 20px 14px;
    }
    .marca { display: flex; align-items: center; gap: 12px; padding: 4px 8px; }
    .logo {
      width: 40px; height: 40px; border-radius: 12px;
      display: grid; place-content: center;
      background: var(--rojo); color: #fff; font-weight: 800; font-size: 20px;
      box-shadow: 0 6px 16px rgba(227, 0, 27, 0.35);
    }
    ul { list-style: none; display: grid; gap: 4px; }
    .item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 12px;
      border-radius: 12px;
      font-weight: 500;
      color: var(--tinta-2);
      transition: background-color 160ms ease, transform 160ms var(--salida);
    }
    .item:active { transform: scale(0.98); }
    .item[aria-current='page'] { background: var(--rojo-suave); color: var(--rojo); font-weight: 600; }
    .datos { margin-top: auto; display: grid; gap: 4px; padding: 0 10px; }
  }
  @media (min-width: 980px) and (hover: hover) and (pointer: fine) {
    .item:hover:not([aria-current='page']) { background: var(--relleno); }
  }
</style>
