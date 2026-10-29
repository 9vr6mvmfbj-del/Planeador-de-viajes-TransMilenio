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

  let anchoPestana = $derived(ancho ? (ancho - PAD * 2) / N : 0);
  let maximo = $derived(anchoPestana * (N - 1));
  let x = $derived(px !== null ? px : indice * anchoPestana);

  // Estiramiento por velocidad (squash & stretch), sin pasar del 18%.
  let estira = $derived(Math.min(Math.abs(velocidad) * 0.09, 0.18));
  let escala = $derived((presionada ? 1.16 : 1) * (1 + estira));
  let escalaY = $derived((presionada ? 1.16 : 1) * (1 - estira * 0.55));

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
    bind:this={barra}
    bind:clientWidth={ancho}
    style="--n:{N}; --x:{x}px; --sx:{escala}; --sy:{escalaY}; --w:{Math.max(0, ancho - PAD * 2)}px"
    onpointerdown={abajo}
    onpointermove={mover}
    onpointerup={arriba}
    onpointercancel={soltar}
    role="presentation"
  >
    <span class="cristal vidrio vidrio-flotante vidrio-nativo" aria-hidden="true"></span>

    <div class="pestanas">
      {#each pestanas as p, i}
        <!-- la etiqueta gris se desvanece cuando la lente pasa por encima: ahí se lee la copia roja -->
        <button class="pestana" style="opacity:{anchoPestana ? Math.min(1, Math.abs(x / anchoPestana - i) * 1.5) : 1}" aria-current={app.vista === p.id ? 'page' : undefined} onclick={(e) => e.detail === 0 && ir(p.id)}>
          <Icono nombre={p.icono} tam={24} />
          <span>{p.texto}</span>
        </button>
      {/each}
    </div>

    <span class="lente" class:levantada={presionada} class:arrastrando aria-hidden="true">
      <span class="copia">
        {#each pestanas as p}
          <span class="pestana roja">
            <Icono nombre={p.icono} tam={24} />
            <span>{p.texto}</span>
          </span>
        {/each}
      </span>
    </span>
  </div>
</nav>

<style>
  .lateral { display: none; }

  .barra {
    --resorte: cubic-bezier(0.3, 1.45, 0.45, 1); /* rebote corto al soltar */
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
  .cristal { position: absolute; inset: 0; border-radius: inherit; }

  .pestanas {
    position: absolute;
    inset: 0;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
  }
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
  .pestanas .pestana { pointer-events: auto; transition: opacity 180ms ease; }
  .pestanas .pestana:focus-visible { pointer-events: auto; }

  /* ---------------- la lente */
  .lente {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc((100% - 8px) / var(--n));
    border-radius: 999px;
    overflow: hidden;
    pointer-events: none;
    transform: translate3d(var(--x), 0, 0) scale(var(--sx), var(--sy));
    transition: transform 460ms var(--resorte), background-color 200ms ease, box-shadow 200ms ease, backdrop-filter 200ms ease;
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
  .lente.arrastrando { transition: background-color 200ms ease, box-shadow 200ms ease, backdrop-filter 200ms ease; } /* sigue al dedo sin retraso */
  /* levantada: casi transparente, con borde de luz y sombra profunda; satura y aclara lo que hay detrás */
  .lente.levantada {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.02));
    -webkit-backdrop-filter: blur(0.5px) saturate(280%) brightness(1.1) contrast(1.08);
    backdrop-filter: blur(0.5px) saturate(280%) brightness(1.1) contrast(1.08);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.95),
      inset 0 2.5px 2px rgba(255, 255, 255, 1),
      inset 4px 0 8px -3px rgba(255, 255, 255, 0.9),
      inset -4px 0 8px -3px rgba(255, 255, 255, 0.6),
      inset 0 -3px 5px rgba(255, 255, 255, 0.55),
      0 0 0 0.5px rgba(31, 38, 60, 0.12),
      0 12px 30px rgba(31, 38, 60, 0.28),
      0 3px 8px rgba(0, 0, 0, 0.14);
  }
  /* reflejo curvo, como luz sobre una gota de vidrio */
  .lente::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background:
      radial-gradient(120% 70% at 28% -8%, rgba(255, 255, 255, 0.6), transparent 58%),
      radial-gradient(90% 60% at 80% 118%, rgba(255, 255, 255, 0.28), transparent 62%);
    mix-blend-mode: soft-light;
  }

  /* copia de las pestañas, en rojo, recortada por la lente: los iconos se tiñen y se magnifican al pasar */
  .copia {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: var(--w);
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    transform: translate3d(calc(var(--x) * -1), 0, 0);
    transition: transform 460ms var(--resorte);
    will-change: transform;
  }
  .lente.arrastrando .copia { transition: none; }
  .pestana.roja { color: var(--rojo); pointer-events: none; }

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
