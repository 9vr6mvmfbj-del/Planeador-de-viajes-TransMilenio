<script>
  // Pantalla de entrada: tablero de rutas que se desliza + vía troncal con biarticulados.
  // Mientras se ve, el motor ya está cargando la red por detrás.
  import { app } from '../lib/estado.svelte.js';

  let { onentrar = () => {} } = $props();

  const rutas = ['B7', 'K86', 'G43', 'H13', 'D20', 'C15', 'J24', 'F23', 'E44', 'M86', 'L80', 'B74', 'G12', 'K23', 'H75', 'D22', 'C30', 'J70', 'F14', 'E32'];
  const colores = ['#0072bc', '#7ab800', '#f7a800', '#00a99d', '#8e3c97', '#00aeef', '#e5007e', '#5c2d91', '#f15a24', '#009444'];
  // 8 filas; cada una repite su contenido dos veces para que el desplazamiento sea un loop sin saltos
  const filas = Array.from({ length: 8 }, (_, f) =>
    Array.from({ length: 28 }, (_, k) => {
      const i = k % 14;
      return { r: rutas[(i * 3 + f * 5) % rutas.length], c: colores[(i + f * 2) % colores.length] };
    }),
  );
  // carriles: [duración (s), retraso (s), sentido]
  const carriles = [[5.8, -1, 1], [7, -4.2, -1], [4.6, -2.8, 1]];

  let saliendo = $state(false);
  function entrar() {
    if (saliendo) return;
    saliendo = true;
    setTimeout(onentrar, 420); // espera la salida antes de quitarla
  }
</script>

<div class="intro" class:saliendo role="dialog" aria-label="Bienvenida a TransmiTrack">
  <div class="grano" aria-hidden="true"></div>

  <div class="tablero" aria-hidden="true">
    {#each filas as fila}
      <div class="fila">
        {#each fila as ch}<span class="ch" style="background:{ch.c}">{ch.r}</span>{/each}
      </div>
    {/each}
  </div>
  <div class="velo" aria-hidden="true"></div>

  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <g id="biarticulado">
        <rect x="0" y="4" width="70" height="34" rx="9" fill="#fff" />
        <rect x="74" y="4" width="70" height="34" rx="4" fill="#fff" />
        <rect x="148" y="4" width="80" height="34" rx="4" fill="#fff" />
        <rect x="68" y="9" width="8" height="24" rx="2" fill="rgba(255,255,255,.55)" />
        <rect x="142" y="9" width="8" height="24" rx="2" fill="rgba(255,255,255,.55)" />
        <g fill="#b30016">
          <rect x="8" y="10" width="54" height="11" rx="3" />
          <rect x="80" y="10" width="58" height="11" rx="2" />
          <rect x="154" y="10" width="62" height="11" rx="2" />
        </g>
        <rect x="0" y="27" width="228" height="4" fill="#e3001b" opacity=".9" />
        <g fill="#3a0007">
          <circle cx="18" cy="39" r="5" /><circle cx="54" cy="39" r="5" /><circle cx="110" cy="39" r="5" />
          <circle cx="186" cy="39" r="5" /><circle cx="212" cy="39" r="5" />
        </g>
      </g>
    </defs>
  </svg>

  <div class="via" aria-hidden="true">
    <div class="carriles">
      {#each carriles as [dur, ret, sentido], i}
        <div class="carril" style="top:{i * 56}px">
          <svg class="bus" class:vuelta={sentido < 0} style="animation-duration:{dur}s; animation-delay:{ret}s" viewBox="0 0 230 44"><use href="#biarticulado" /></svg>
        </div>
      {/each}
    </div>
  </div>

  <div class="centro">
    <span class="logo">T</span>
    <h1>TransmiTrack</h1>
    <p class="sub">Rutas, horarios y transbordos de toda la red troncal.</p>
    <button class="empezar" onclick={entrar}>
      Empezar
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </button>
    <p class="carga" aria-live="polite">{app.error ? 'No se pudo cargar la red' : app.listo ? `${app.resumen.estaciones} estaciones · ${app.resumen.rutas} rutas listas` : 'Cargando la red…'}</p>
  </div>

  <p class="pie">Proyecto EDD · U. de La Sabana</p>
</div>

<style>
  .intro {
    position: fixed;
    inset: 0;
    z-index: 100;
    overflow: hidden;
    color: #fff;
    background: radial-gradient(120% 80% at 50% 0%, #ff2a3d 0%, #e3001b 38%, #a80015 100%);
    transition: opacity 400ms var(--salida), transform 400ms var(--salida), filter 400ms var(--salida);
  }
  /* salida: se aclara, crece un poco y se desenfoca, dejando ver la app */
  .intro.saliendo { opacity: 0; transform: scale(1.06); filter: blur(6px); pointer-events: none; }

  .grano {
    position: absolute;
    inset: 0;
    opacity: 0.16;
    mix-blend-mode: overlay;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* tablero de rutas inclinado */
  .tablero { position: absolute; inset: -30% -40% 10% -40%; transform: rotate(-14deg); display: grid; gap: 14px; align-content: center; opacity: 0.95; }
  .fila { display: flex; gap: 12px; width: max-content; animation: correr 26s linear infinite; }
  .fila:nth-child(even) { animation-direction: reverse; animation-duration: 32s; }
  @keyframes correr { to { transform: translateX(-50%); } }
  .ch {
    height: 58px; min-width: 76px; padding: 0 16px; border-radius: 14px;
    display: grid; place-content: center;
    font-weight: 850; font-size: 26px; letter-spacing: -0.01em; color: #fff;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25), 0 6px 16px rgba(60, 0, 8, 0.25);
  }
  /* velo: rojo intenso donde va el texto y más oscuro hacia la vía */
  .velo {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(85% 42% at 50% 40%, rgba(205, 0, 27, 0.95) 30%, rgba(205, 0, 27, 0.6) 68%, rgba(205, 0, 27, 0.12)),
      linear-gradient(180deg, transparent 52%, rgba(150, 0, 18, 0.85) 70%, #8e0012 80%);
  }

  /* vía troncal */
  .via { position: absolute; left: 0; right: 0; bottom: 0; height: 250px; overflow: hidden; }
  .carriles { position: absolute; left: -12%; right: -12%; bottom: calc(env(safe-area-inset-bottom, 0px) + 44px); height: 200px; transform: perspective(620px) rotateX(42deg); transform-origin: 50% 100%; }
  .carril { position: absolute; left: 0; right: 0; height: 56px; border-top: 2px solid rgba(255, 255, 255, 0.12); }
  .carril::after {
    content: '';
    position: absolute; left: 0; right: 0; top: 28px; height: 3px;
    background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.55) 0 34px, transparent 34px 70px);
    animation: linea 1.1s linear infinite;
  }
  @keyframes linea { to { background-position: -70px 0; } }
  .bus { position: absolute; top: 6px; width: 230px; height: 44px; animation: pasar linear infinite; filter: drop-shadow(0 6px 6px rgba(60, 0, 8, 0.35)); }
  .bus.vuelta { animation-name: volver; }
  @keyframes pasar { from { transform: translateX(-260px); } to { transform: translateX(calc(100vw + 120px)); } }
  @keyframes volver { from { transform: translateX(calc(100vw + 120px)) scaleX(-1); } to { transform: translateX(-260px) scaleX(-1); } }

  /* contenido */
  .centro {
    position: absolute; left: 0; right: 0;
    top: calc(env(safe-area-inset-top, 0px) + max(64px, 14vh));
    display: grid; justify-items: center; text-align: center; gap: 14px; padding: 0 28px;
  }
  .logo {
    width: 80px; height: 80px; border-radius: 23px; background: #fff; color: #e3001b;
    display: grid; place-content: center; font-weight: 850; font-size: 44px;
    box-shadow: 0 10px 28px rgba(80, 0, 10, 0.38);
  }
  h1 { font-size: 46px; line-height: 1.02; letter-spacing: -0.035em; font-weight: 800; }
  .sub { font-size: 16px; line-height: 1.4; opacity: 0.88; max-width: 30ch; }
  .empezar {
    margin-top: 8px; min-width: 220px; height: 58px; padding: 0 30px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    background: #fff; color: #c8001a; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;
    box-shadow: 0 12px 30px rgba(70, 0, 10, 0.35), inset 0 -2px 0 rgba(0, 0, 0, 0.06);
    transition: transform 160ms var(--salida);
  }
  .empezar svg { width: 20px; height: 20px; }
  .empezar:active { transform: scale(0.96); }
  .carga { font-size: 13px; opacity: 0.75; min-height: 18px; }
  .pie { position: absolute; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); left: 0; right: 0; text-align: center; font-size: 12.5px; opacity: 0.72; }

  /* escritorio: más aire y título más grande */
  @media (min-width: 980px) {
    h1 { font-size: 64px; }
    .centro { top: 16vh; }
    .via { height: 300px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .fila, .bus, .carril::after { animation: none; }
    .intro { transition: opacity 200ms ease; }
    .intro.saliendo { transform: none; filter: none; }
  }
</style>
