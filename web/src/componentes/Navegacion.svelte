<script>
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
  const PAD = 4; // relleno de la barra (px)

  let indice = $derived(pestanas.findIndex((p) => p.id === app.vista));

  function ir(id) {
    if (app.vista === id) return;
    vibrar();
    app.vista = id;
  }

  // ---------------------------------------------------------------- lente de vidrio arrastrable
  // Se puede arrastrar con el dedo y soltar sobre otra pestaña (como la barra de iOS 26/27).
  //  - al tocar: la lente "se levanta" (crece y se vuelve transparente);
  //  - al arrastrar: sigue al dedo, se estira según la velocidad y tiene resistencia en los bordes;
  //  - al soltar: se acomoda con un rebote en la pestaña más cercana y cambia de vista.
  let barra = $state(/** @type {HTMLElement | null} */ (null));
  let ancho = $state(0);
  let presionada = $state(false);
  let arrastrando = $state(false);
  let px = $state(/** @type {number | null} */ (null)); // posición de la lente mientras se toca
  let velocidad = $state(0);

  let alto = $state(0);
  let anchoPestana = $derived(ancho ? (ancho - PAD * 2) / N : 0);
  let maximo = $derived(anchoPestana * (N - 1));
  let x = $derived(px !== null ? px : indice * anchoPestana); // izquierda de la pestaña bajo la lente

  // Al tocar, la lente crece (como la de iOS): ~1,6 pestañas de ancho, sobresale de la barra y
  // agranda lo que tiene debajo. Todo se calcula en px dentro del interior de la barra.
  const K = 1.62;   // ancho de la lente levantada, en pestañas
  const EXT = 9;    // cuánto sobresale arriba y abajo (px)
  const MAG = 1.3;  // aumento del contenido
  let extra = $derived(presionada ? (K - 1) * anchoPestana : 0);
  let anchoLente = $derived(anchoPestana + extra);
  let altoLente = $derived(Math.max(0, alto - PAD * 2) + (presionada ? EXT * 2 : 0));
  let izq = $derived(Math.max(-2, Math.min(ancho - PAD * 2 - anchoLente + 2, x - extra / 2)));

  // Estiramiento por velocidad (squash & stretch), sin pasar del 18%.
  let estira = $derived(Math.min(Math.abs(velocidad) * 0.09, 0.18));
  let escala = $derived(1 + estira);
  let escalaY = $derived(1 - estira * 0.55);

  // Mapa de desplazamiento de la refracción: en el borde de la cápsula el contenido se empuja hacia
  // afuera (más fuerte justo en el borde y cada vez menos hacia el centro). Se dibuja una vez en un
  // canvas y el filtro SVG lo usa para doblar y separar los colores (aberración cromática).
  let mapa = $state('');
  function generarMapa(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g) return '';
    const img = g.createImageData(w, h);
    const d = img.data;
    const r = h / 2, bisel = r * 0.55;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const cx = Math.min(Math.max(xx + 0.5, r), w - r);
        const dx = xx + 0.5 - cx, dy = yy + 0.5 - r;
        const dist = Math.hypot(dx, dy);
        const prof = r - dist; // distancia al borde, hacia adentro
        let t = prof <= 0 ? 1 : Math.max(0, 1 - prof / bisel);
        t = t * t * t;       // cae rápido hacia el centro: el medio queda sin deformar
        const nx = dist ? dx / dist : 0, ny = dist ? dy / dist : 0;
        const i = (yy * w + xx) * 4;
        d[i] = 128 + nx * t * 127;
        d[i + 1] = 128 + ny * t * 127;
        d[i + 2] = 128;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }
  $effect(() => {
    if (!anchoPestana || !alto) return;
    mapa = generarMapa(Math.round(K * anchoPestana * 2), Math.round((alto - PAD * 2 + EXT * 2) * 2));
  });

  /** @type {{ id: number, desfase: number, x0: number, t: number, ultimoX: number, ultimoT: number, indicePrevio: number } | null} */
  let toque = null;

  const limitar = (v) => {
    // dentro del rango se mueve libre; fuera, la mueve solo un 25% (banda elástica)
    if (v < 0) return v * 0.25;
    if (v > maximo) return maximo + (v - maximo) * 0.25;
    return v;
  };
  const pestanaEn = (local) => Math.max(0, Math.min(N - 1, Math.floor(local / anchoPestana)));
  const masCercana = (valor) => Math.max(0, Math.min(N - 1, Math.round(valor / anchoPestana)));

  function abajo(e) {
    if (!barra || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const caja = barra.getBoundingClientRect();
    const local = e.clientX - caja.left - PAD;
    const i = pestanaEn(local);
    barra.setPointerCapture(e.pointerId);
    toque = {
      id: e.pointerId,
      desfase: local - anchoPestana / 2 - i * anchoPestana,
      x0: e.clientX,
      t: performance.now(),
      ultimoX: e.clientX,
      ultimoT: performance.now(),
      indicePrevio: i,
    };
    presionada = true;
    px = i * anchoPestana; // la lente viaja hasta la pestaña tocada
  }

  function mover(e) {
    if (!toque || e.pointerId !== toque.id || !barra) return;
    if (!arrastrando && Math.abs(e.clientX - toque.x0) < 4) return;
    arrastrando = true;
    const caja = barra.getBoundingClientRect();
    const local = e.clientX - caja.left - PAD;
    px = limitar(local - anchoPestana / 2 - toque.desfase);

    const ahora = performance.now();
    const dt = Math.max(1, ahora - toque.ultimoT);
    const v = (e.clientX - toque.ultimoX) / dt; // px por ms
    velocidad = velocidad * 0.6 + v * 0.4;      // suavizado para que no parpadee
    toque.ultimoX = e.clientX;
    toque.ultimoT = ahora;

    const i = masCercana(px);
    if (i !== toque.indicePrevio) { toque.indicePrevio = i; vibrar(6); } // "clic" al pasar por cada pestaña
  }

  function arriba(e) {
    if (!toque || e.pointerId !== toque.id || !barra) return;
    const caja = barra.getBoundingClientRect();
    const local = e.clientX - caja.left - PAD;
    const destino = arrastrando ? masCercana(px ?? 0) : pestanaEn(local);
    soltar();
    ir(pestanas[destino].id);
  }

  function soltar() {
    toque = null;
    presionada = false;
    arrastrando = false;
    px = null;
    velocidad = 0;
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

  <!-- celular: barra flotante con lente de vidrio (3 capas hermanas: el vidrio de la barra,
       las pestañas y la lente; así la lente "ve" lo que hay detrás de la barra) -->
  <div
    class="barra"
    class:presionada
    class:arrastrando
    bind:this={barra}
    bind:clientWidth={ancho}
    bind:clientHeight={alto}
    style="--n:{N}; --L:{izq}px; --W:{anchoLente}px; --C:{izq + anchoLente / 2}px; --ext:{presionada ? EXT : 0}px; --m:{presionada ? MAG : 1}; --sx:{escala}; --sy:{escalaY}; --w:{Math.max(0, ancho - PAD * 2)}px; --hl:{izq + PAD}px; --hr:{izq + anchoLente + PAD}px"
    onpointerdown={abajo}
    onpointermove={mover}
    onpointerup={arriba}
    onpointercancel={soltar}
    role="presentation"
  >
    <span class="cristal vidrio vidrio-flotante vidrio-nativo" aria-hidden="true"></span>

    <!-- las pestañas se "perforan" donde está la lente: ahí se lee la copia ampliada -->
    <div class="pestanas">
      {#each pestanas as p}
        <button class="pestana" aria-current={app.vista === p.id ? 'page' : undefined} onclick={(e) => e.detail === 0 && ir(p.id)}>
          <Icono nombre={p.icono} tam={24} />
          <span>{p.texto}</span>
        </button>
      {/each}
    </div>

    <span class="lente" class:levantada={presionada} class:arrastrando aria-hidden="true">
      <span class="lupa" class:refracta={presionada && mapa}>
        <span class="copia">
          {#each pestanas as p}
            <span class="pestana roja">
              <Icono nombre={p.icono} tam={24} />
              <span>{p.texto}</span>
            </span>
          {/each}
        </span>
      </span>
    </span>

    <!-- filtro de refracción: dobla el contenido en el borde de la lente y separa los colores -->
    <svg class="filtros" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter id="refraccion" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <feFlood flood-color="rgb(128,128,128)" result="neutro" />
          <feImage href={mapa} x="0" y="0" width={anchoLente} height={altoLente} preserveAspectRatio="none" result="mapa0" />
          <feComposite in="mapa0" in2="neutro" operator="over" result="mapa" />
          <feDisplacementMap in="SourceGraphic" in2="mapa" scale="15" xChannelSelector="R" yChannelSelector="G" result="dr" />
          <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cr" />
          <feDisplacementMap in="SourceGraphic" in2="mapa" scale="19" xChannelSelector="R" yChannelSelector="G" result="dg" />
          <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cg" />
          <feDisplacementMap in="SourceGraphic" in2="mapa" scale="23" xChannelSelector="R" yChannelSelector="G" result="db" />
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

  /* propiedades animables para el "agujero" que la lente hace en las pestañas */
  @property --hl { syntax: '<length>'; inherits: true; initial-value: 0px; }
  @property --hr { syntax: '<length>'; inherits: true; initial-value: 0px; }

  .barra {
    --resorte: cubic-bezier(0.3, 1.35, 0.45, 1); /* rebote corto al soltar */
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
  .cristal {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    transition: transform 420ms var(--resorte);
  }
  .barra.presionada .cristal { transform: scale(1.05, 1.07); } /* la barra se ensancha al tocarla, como en iOS */

  .pestanas {
    position: absolute;
    inset: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    /* agujero donde está la lente: no se ve el contenido original debajo del ampliado */
    -webkit-mask-image: linear-gradient(90deg, #000 var(--hl), transparent var(--hl), transparent var(--hr), #000 var(--hr));
    mask-image: linear-gradient(90deg, #000 var(--hl), transparent var(--hl), transparent var(--hr), #000 var(--hr));
    transition: --hl 460ms var(--resorte), --hr 460ms var(--resorte);
  }
  .barra.arrastrando .pestanas { transition: none; }
  .pestana {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    color: var(--tenue);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
    border-radius: 999px;
    pointer-events: none; /* los toques los recibe la barra completa */
  }
  .pestanas .pestana { pointer-events: auto; }

  /* ---------------- la lente */
  .lente {
    position: absolute;
    top: calc(4px - var(--ext));
    bottom: calc(4px - var(--ext));
    left: 4px;
    width: var(--W);
    border-radius: 999px;
    overflow: hidden;
    pointer-events: none;
    transform: translate3d(var(--L), 0, 0) scale(var(--sx), var(--sy));
    transition:
      transform 460ms var(--resorte), width 460ms var(--resorte), top 460ms var(--resorte), bottom 460ms var(--resorte),
      background-color 200ms ease, box-shadow 200ms ease, backdrop-filter 200ms ease;
    will-change: transform;
    /* en reposo: cápsula gris translúcida (como el selector de iOS) */
    background: linear-gradient(180deg, rgba(120, 120, 128, 0.2), rgba(120, 120, 128, 0.12));
    -webkit-backdrop-filter: blur(1px) saturate(180%);
    backdrop-filter: blur(1px) saturate(180%);
    box-shadow:
      inset 0 0 0 0.5px rgba(255, 255, 255, 0.55),
      inset 0 1px 1px rgba(255, 255, 255, 0.8),
      inset 0 -1px 1px rgba(255, 255, 255, 0.25),
      0 0 0 0.5px rgba(0, 0, 0, 0.04);
  }
  .lente.arrastrando {
    transition: width 460ms var(--resorte), top 460ms var(--resorte), bottom 460ms var(--resorte),
      background-color 200ms ease, box-shadow 200ms ease, backdrop-filter 200ms ease;
  } /* la posición sigue al dedo sin retraso; el tamaño sí se anima */
  /* levantada: vidrio casi transparente que aclara y satura lo que hay detrás, con borde de luz y sombra */
  .lente.levantada {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03));
    -webkit-backdrop-filter: blur(0.4px) saturate(230%) brightness(1.12) contrast(1.05);
    backdrop-filter: blur(0.4px) saturate(230%) brightness(1.12) contrast(1.05);
    box-shadow:
      inset 0 0 0 0.75px rgba(255, 255, 255, 0.9),
      inset 0 2px 2px rgba(255, 255, 255, 0.95),
      inset 0 -2px 3px rgba(255, 255, 255, 0.5),
      inset 5px 0 10px -4px rgba(255, 255, 255, 0.75),
      inset -5px 0 10px -4px rgba(255, 255, 255, 0.55),
      0 0 0 0.5px rgba(31, 38, 60, 0.12),
      0 14px 32px rgba(31, 38, 60, 0.26),
      0 3px 8px rgba(0, 0, 0, 0.12);
  }
  /* reflejo curvo, como luz sobre una gota de vidrio */
  .lente::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background:
      radial-gradient(120% 70% at 28% -8%, rgba(255, 255, 255, 0.55), transparent 58%),
      radial-gradient(90% 60% at 80% 118%, rgba(255, 255, 255, 0.25), transparent 62%);
    mix-blend-mode: soft-light;
  }
  /* aro con colores del arcoíris en el borde: la luz que se separa al atravesar el vidrio */
  .lente::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.5px;
    pointer-events: none;
    background: conic-gradient(from 200deg, #ff5e8a, #ffb454, #fff27a, #6bff9e, #5ec8ff, #8f7bff, #ff5e8a);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 200ms ease;
  }
  .lente.levantada::before { opacity: 0.38; }

  /* contenedor del filtro: tiene el tamaño de la lente para que el mapa de refracción coincida */
  .lupa { position: absolute; inset: 0; display: block; }
  .lupa.refracta { filter: url(#refraccion); }

  /* copia de las pestañas recortada por la lente. Al levantarla se ve más grande (efecto lupa)
     y oscura, como el contenido real de la barra de iOS; en reposo se tiñe de rojo. */
  .copia {
    position: absolute;
    top: var(--ext);
    left: 0;
    height: calc(100% - var(--ext) * 2);
    width: var(--w);
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    transform: translate3d(calc(var(--L) * -1), 0, 0) scale(var(--m));
    transform-origin: var(--C) 50%;
    transition: transform 460ms var(--resorte), transform-origin 460ms var(--resorte), top 460ms var(--resorte), height 460ms var(--resorte);
    will-change: transform;
  }
  .lente.arrastrando .copia { transition: top 460ms var(--resorte), height 460ms var(--resorte); } /* sigue al dedo sin retraso */
  .pestana.roja { color: var(--rojo); pointer-events: none; transition: color 200ms ease; }
  .lente.levantada .pestana.roja { color: var(--tinta); font-weight: 700; }
  .filtros { position: absolute; pointer-events: none; }

  @media (prefers-color-scheme: dark) {
    .lente {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.06));
      box-shadow:
        inset 0 0 0 0.5px rgba(255, 255, 255, 0.28),
        inset 0 1.5px 1px rgba(255, 255, 255, 0.4),
        inset 0 -1px 1px rgba(255, 255, 255, 0.12),
        0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .lente.levantada {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.02));
      box-shadow:
        inset 0 0 0 0.75px rgba(255, 255, 255, 0.5),
        inset 0 2px 2px rgba(255, 255, 255, 0.55),
        inset 3px 0 6px -2px rgba(255, 255, 255, 0.35),
        inset -3px 0 6px -2px rgba(255, 255, 255, 0.22),
        0 12px 30px rgba(0, 0, 0, 0.55);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lente, .copia { transition-duration: 1ms; }
  }
  @media (prefers-reduced-transparency: reduce) {
    .lente, .lente.levantada { -webkit-backdrop-filter: none; backdrop-filter: none; background: var(--vidrio-fuerte); }
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
