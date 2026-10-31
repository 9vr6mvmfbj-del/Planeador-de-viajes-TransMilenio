<script>
  import { onMount } from 'svelte';
  import { app, vibrar } from '../lib/estado.svelte.js';
  import Icono from './Icono.svelte';

  const pestanas = [
    { id: 'viajar', texto: 'Viajar', icono: 'viajar' },
    { id: 'estaciones', texto: 'Estaciones', icono: 'estaciones' },
    { id: 'admin', texto: 'Admin', icono: 'candado' },
    { id: 'fila', texto: 'Fila', icono: 'fila' },
    { id: 'rendimiento', texto: 'Rendimiento', icono: 'rendimiento' },
  ];
  const N = pestanas.length;
  const PAD = 4; // relleno interno de la barra (px)

  let indice = $derived(Math.max(0, pestanas.findIndex((p) => p.id === app.vista)));

  function ir(id) {
    if (app.vista === id) return;
    vibrar();
    app.vista = id;
  }

  // =============================================================== lente de Liquid Glass
  // En reposo es una cápsula gris bajo la pestaña activa. Al tocar "se levanta" (crece, se vuelve
  // vidrio y agranda el ícono de abajo), se arrastra con el dedo, se estira con la velocidad como una
  // gota (liquid morph: el borde de adelante y el de atrás llevan resortes distintos) y al soltar
  // cae en la pestaña con un rebote.
  //
  // RENDIMIENTO (por qué ya no se traba):
  //  · Cada cuadro solo cambia transform y opacity, que el navegador anima en la GPU sin recalcular
  //    el diseño ni volver a pintar. Antes se cambiaban width/height, una máscara y un filtro SVG de
  //    refracción en cada cuadro: en el iPhone ese filtro se dibuja en la CPU y era lo que trababa.
  //  · Al soltar, la física se calcula completa de una vez (unos 60 cuadros) y se entrega al navegador
  //    como una animación nativa (Web Animations). Esa animación corre en el hilo de composición, así
  //    que sigue fluida aunque la vista nueva tarde en montarse en el hilo principal.
  //  · Mientras el dedo está en la barra sí se calcula cuadro a cuadro (hay que seguir al dedo), pero
  //    ahí no se monta ninguna vista.

  const K = 1.3;       // ancho de la lente levantada, en pestañas
  const EXT = 6;       // cuánto sobresale arriba y abajo al levantarse (px)
  const AUMENTO = 0.14; // cuánto se agranda el ícono que queda bajo la lente

  let barra = $state(/** @type {HTMLElement | null} */ (null));
  let lente = $state(/** @type {HTMLElement | null} */ (null));
  let capaGris = $state(/** @type {HTMLElement | null} */ (null));
  let capaVidrio = $state(/** @type {HTMLElement | null} */ (null));
  /** @type {HTMLElement[]} */
  const iconos = [];

  let interiorW = 0, interiorH = 0, tw = 0;

  // resortes: valor, velocidad, objetivo
  const cx = { v: 0, vel: 0, obj: 0 }; // borde que lidera (centro de la lente, px)
  const cz = { v: 0, vel: 0, obj: 0 }; // borde que sigue, más lento: la lente se estira como una gota
  const pr = { v: 0, vel: 0, obj: 0 }; // cuánto está levantada (0 cápsula → 1 lente)
  const st = { v: 0, vel: 0, obj: 0 }; // estiramiento por velocidad

  const reducido = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // respuesta (s) y amortiguación (1 = sin rebote), como los resortes de SwiftUI
  const RES = {
    seguir: { r: 0.07, z: 1 },
    soltar: { r: 0.42, z: reducido ? 1 : 0.74 },
    levantar: { r: 0.3, z: reducido ? 1 : 0.6 },
    bajar: { r: 0.34, z: reducido ? 1 : 0.82 },
    estirar: { r: 0.12, z: 1 },
    cola: { r: 0.6, z: reducido ? 1 : 0.84 },
    colaSeguir: { r: 0.2, z: 1 },
  };
  let resCx = RES.soltar, resPr = RES.bajar;

  function paso(s, res, dt) {
    const k = (2 * Math.PI / res.r) ** 2;
    const c = (4 * Math.PI * res.z) / res.r;
    const a = -k * (s.v - s.obj) - c * s.vel;
    s.vel += a * dt;
    s.v += s.vel * dt;
  }
  const quieto = (s) => Math.abs(s.v - s.obj) < 0.02 && Math.abs(s.vel) < 0.02;

  // Avanza los 4 resortes juntos (con sub-pasos para que sea estable).
  function avanzar(S, dt) {
    const sub = 4;
    for (let i = 0; i < sub; i++) {
      paso(S.cx, resCx, dt / sub);
      S.cz.obj = S.cx.obj;
      paso(S.cz, reducido ? resCx : resCx === RES.seguir ? RES.colaSeguir : RES.cola, dt / sub);
      paso(S.pr, resPr, dt / sub);
      S.st.obj = reducido ? 0 : Math.min(0.2, Math.abs(S.cx.vel) / 4200);
      paso(S.st, RES.estirar, dt / sub);
    }
  }
  const todos = () => ({ cx, cz, pr, st });
  const copiar = (S) => ({ cx: { ...S.cx }, cz: { ...S.cz }, pr: { ...S.pr }, st: { ...S.st } });
  const reposo = (S) => quieto(S.cx) && quieto(S.cz) && quieto(S.pr) && quieto(S.st);

  // De los resortes a lo que se ve: solo un transform y dos opacidades.
  function visual(S) {
    const p = S.pr.v;
    const atras = Math.min(S.cx.v, S.cz.v), adelante = Math.max(S.cx.v, S.cz.v);
    const extra = adelante - atras;
    const W = tw * (1 + (K - 1) * p) + extra;
    const H = interiorH + 2 * EXT * p;
    const centro = (atras + adelante) / 2;
    const sx = (W / tw) * (1 + S.st.v * 0.4);
    const sy = (H / interiorH) * (1 - S.st.v * 0.2 - Math.min(0.09, (extra / tw) * 0.07));
    const p01 = Math.max(0, Math.min(1, p));
    return {
      transform: `translate3d(${(centro - tw / 2).toFixed(2)}px,0,0) scale(${sx.toFixed(4)},${sy.toFixed(4)})`,
      gris: 1 - p01,
      vidrio: p01,
      centro,
      p: p01,
    };
  }

  let iconoActivo = -1;
  function pintar(v) {
    if (!lente || !tw) return;
    lente.style.transform = v.transform;
    if (capaGris) capaGris.style.opacity = String(v.gris);
    if (capaVidrio) capaVidrio.style.opacity = String(v.vidrio);
    // el ícono bajo la lente se agranda un poco (así se siente que la lente "aumenta")
    const i = Math.max(0, Math.min(N - 1, Math.floor(v.centro / tw)));
    if (i !== iconoActivo && iconoActivo >= 0 && iconos[iconoActivo]) iconos[iconoActivo].style.transform = '';
    iconoActivo = i;
    if (iconos[i]) iconos[i].style.transform = v.p > 0.001 ? `scale(${(1 + AUMENTO * v.p).toFixed(4)})` : '';
  }

  // ---------------------------------------------------------- modo 1: cuadro a cuadro (con el dedo)
  let cuadro = 0, antes = 0;
  function animarEnVivo() {
    detenerNativa();
    if (!cuadro) { antes = performance.now(); cuadro = requestAnimationFrame(bucle); }
  }
  function bucle(t) {
    const dt = Math.min(0.032, Math.max(0, (t - antes) / 1000));
    antes = t;
    avanzar(todos(), dt);
    pintar(visual(todos()));
    if (toque || !reposo(todos())) cuadro = requestAnimationFrame(bucle);
    else cuadro = 0;
  }

  // ---------------------------------------------------------- modo 2: animación nativa (al soltar)
  /** @type {{ anims: Animation[], estados: any[], paso: number } | null} */
  let nativa = null;
  const PASO = 1000 / 60;

  function animarNativa() {
    if (cuadro) { cancelAnimationFrame(cuadro); cuadro = 0; }
    detenerNativa();
    if (!lente || !tw) return;
    // simula hasta que se quede quieta (máx. 2 s) guardando cada cuadro
    const S = copiar(todos());
    const estados = [], marcos = [];
    for (let f = 0; f < 120; f++) {
      estados.push(copiar(S));
      marcos.push(visual(S));
      if (reposo(S)) break;
      avanzar(S, PASO / 1000);
    }
    // el estado final queda en los resortes reales, exacto en su objetivo (sin restos de 0,0001)
    for (const k of ['cx', 'cz', 'pr', 'st']) { S[k].v = S[k].obj; S[k].vel = 0; }
    Object.assign(cx, S.cx); Object.assign(cz, S.cz); Object.assign(pr, S.pr); Object.assign(st, S.st);
    const final = visual(todos());
    if (marcos.length < 2) { pintar(final); return; }
    const duracion = (marcos.length - 1) * PASO;
    const opciones = { duration: duracion, easing: 'linear', fill: "forwards" };
    const anims = [
      lente.animate(marcos.map((m) => ({ transform: m.transform })), opciones),
      capaGris ? capaGris.animate(marcos.map((m) => ({ opacity: m.gris })), opciones) : null,
      capaVidrio ? capaVidrio.animate(marcos.map((m) => ({ opacity: m.vidrio })), opciones) : null,
    ].filter(Boolean);
    // el ícono agrandado vuelve a su tamaño
    if (iconoActivo >= 0 && iconos[iconoActivo]) {
      const el = iconos[iconoActivo];
      const desde = el.style.transform || 'scale(1)';
      el.style.transform = '';
      anims.push(el.animate([{ transform: desde }, { transform: 'scale(1)' }], { duration: Math.min(320, duracion), easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }));
    }
    nativa = { anims, estados, paso: PASO };
    const actual = nativa;
    anims[0].onfinish = () => {
      if (nativa !== actual) return;
      pintar(final);              // deja el estilo final escrito…
      actual.anims.forEach((a) => a.cancel()); // …y suelta las animaciones
      nativa = null;
    };
  }

  // Si se vuelve a tocar a mitad de la animación nativa, se retoma la física desde ese cuadro exacto.
  function detenerNativa() {
    if (!nativa) return;
    const t = Number(nativa.anims[0].currentTime ?? 0);
    const i = Math.max(0, Math.min(nativa.estados.length - 1, Math.round(t / nativa.paso)));
    const S = nativa.estados[i];
    Object.assign(cx, S.cx); Object.assign(cz, S.cz); Object.assign(pr, S.pr); Object.assign(st, S.st);
    nativa.anims.forEach((a) => a.cancel());
    nativa = null;
    pintar(visual(todos()));
  }

  function medir() {
    if (!barra) return;
    const ancho = barra.clientWidth, alto = barra.clientHeight;
    if (!ancho) return;
    interiorW = ancho - PAD * 2;
    interiorH = alto - PAD * 2;
    tw = interiorW / N;
    if (lente) { lente.style.width = tw + 'px'; lente.style.height = interiorH + 'px'; }
    if (!toque) {
      detenerNativa();
      cx.v = cx.obj = cz.v = cz.obj = (indice + 0.5) * tw;
      cx.vel = cz.vel = 0;
    }
    pintar(visual(todos()));
  }

  onMount(() => {
    medir();
    const ro = new ResizeObserver(medir);
    if (barra) ro.observe(barra);
    return () => { ro.disconnect(); cancelAnimationFrame(cuadro); detenerNativa(); };
  });

  // Si la vista cambia por otro lado (escritorio, teclado, código), la lente viaja hasta allá.
  $effect(() => {
    const i = indice;
    if (toque || !tw) return;
    if (Math.abs(cx.obj - (i + 0.5) * tw) < 0.5) return;
    if (nativa) detenerNativa();
    cx.obj = (i + 0.5) * tw;
    resCx = RES.soltar;
    animarNativa();
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
  let izquierda = 0; // borde izquierdo de la barra, medido al tocar (no en cada movimiento)
  const local = (e) => e.clientX - izquierda - PAD;
  const pestanaEn = (x) => Math.max(0, Math.min(N - 1, Math.floor(x / tw)));

  function abajo(e) {
    if (!barra || (e.pointerType === 'mouse' && e.button !== 0)) return;
    barra.setPointerCapture(e.pointerId);
    izquierda = barra.getBoundingClientRect().left;
    const x = local(e);
    const i = pestanaEn(x);
    toque = { id: e.pointerId, x0: e.clientX, desfase: x - (i + 0.5) * tw, historia: [{ x: e.clientX, t: e.timeStamp }], arrastra: false, previo: i };
    cx.obj = (i + 0.5) * tw; // la lente va a la pestaña tocada…
    resCx = RES.soltar;
    pr.obj = 1;              // …y se levanta
    resPr = RES.levantar;
    animarEnVivo();
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
      destino = Math.max(0, Math.min(N - 1, Math.round((cx.v + v * 0.09) / tw - 0.5)));
      cx.vel = v; // la animación continúa a la velocidad del dedo: sin costura
      cz.vel = v * 0.7;
    } else {
      destino = pestanaEn(local(e));
    }
    toque = null;
    cx.obj = (destino + 0.5) * tw;
    resCx = RES.soltar;
    pr.obj = 0;
    resPr = RES.bajar;
    animarNativa();
    // la vista nueva se monta en el cuadro siguiente: la animación nativa ya arrancó y no se traba
    requestAnimationFrame(() => ir(pestanas[destino].id));
  }

  function cancelar() {
    if (!toque) return;
    toque = null;
    cx.obj = (indice + 0.5) * tw;
    resCx = RES.soltar;
    pr.obj = 0;
    resPr = RES.bajar;
    animarNativa();
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
    <span class="cristal vidrio vidrio-flotante vidrio-nativo" aria-hidden="true"></span>

    <span class="lente" bind:this={lente} aria-hidden="true">
      <span class="gris" bind:this={capaGris}></span>
      <span class="lupa" bind:this={capaVidrio}><span class="brillo"></span></span>
    </span>

    <div class="pestanas">
      {#each pestanas as p, i}
        <button class="pestana" aria-current={app.vista === p.id ? 'page' : undefined} onclick={(e) => e.detail === 0 && ir(p.id)}>
          <span class="contenido" bind:this={iconos[i]}>
            <Icono nombre={p.icono} tam={24} grosor={app.vista === p.id ? 2.2 : 1.9} />
            <span>{p.texto}</span>
          </span>
        </button>
      {/each}
    </div>
  </div>
</nav>

<style>
  .lateral { display: none; }

  .barra {
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
    contain: layout style;    /* lo que pase adentro no obliga a recalcular la página */
  }
  .cristal { position: absolute; inset: 0; border-radius: inherit; }

  /* ---------------- la lente: tamaño fijo (una pestaña); todo lo demás es transform */
  .lente {
    position: absolute;
    left: 4px;
    top: 4px;
    width: 0;
    height: 0;
    border-radius: 999px;
    pointer-events: none;
    transform-origin: 50% 50%;
    will-change: transform;
    z-index: 1;
  }
  .gris, .lupa { position: absolute; inset: 0; border-radius: inherit; will-change: opacity; }
  /* en reposo: la cápsula gris del selector */
  .gris { background: rgba(120, 120, 128, 0.17); }
  /* levantada: vidrio claro con borde de luz y sombra suave (sin filtros: se compone en la GPU) */
  .lupa {
    opacity: 0;
    background:
      radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.12) 60%),
      rgba(255, 255, 255, 0.28);
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.06), 0 8px 22px rgba(31, 38, 60, 0.16), 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .brillo {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 0 0 0.6px rgba(255, 255, 255, 0.75),
      inset 0 1.4px 1px rgba(255, 255, 255, 0.9),
      inset 0 -1px 1px rgba(255, 255, 255, 0.4);
  }

  .pestanas {
    position: absolute;
    inset: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    z-index: 2;
  }
  .pestana {
    position: relative;
    display: grid;
    place-items: center;
    color: var(--tinta); /* sobre vidrio el texto va oscuro y con peso, no gris plano (vibrancia) */
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.015em;
    border-radius: 999px;
    -webkit-tap-highlight-color: transparent;
  }
  .contenido { display: grid; justify-items: center; gap: 2px; transform-origin: 50% 55%; will-change: transform; }
  .pestana[aria-current='page'] { color: var(--rojo); font-weight: 700; }

  @media (prefers-color-scheme: dark) {
    .gris { background: rgba(255, 255, 255, 0.14); }
    .lupa {
      background: radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.05) 60%), rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.08), 0 8px 22px rgba(0, 0, 0, 0.5);
    }
    .brillo { box-shadow: inset 0 0 0 0.6px rgba(255, 255, 255, 0.3), inset 0 1.2px 1px rgba(255, 255, 255, 0.35); }
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
