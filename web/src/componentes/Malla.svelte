<script>
  // Fondo vivo estilo wallpaper de iOS: manchas de color que viajan despacio por TODA la pantalla.
  // El rojo TransMilenio manda (dos manchas rojas grandes); azul, amarillo y verde acompañan, y una
  // mancha toma el color de la ruta elegida. La intensidad (--v) es una sola perilla.
  //
  // Rendimiento: todo es transform (GPU). Cada vez que el fondo se mueve, las tarjetas de vidrio tienen
  // que volver a desenfocarlo; por eso en el celular el movimiento avanza en pasos de ~1 px unas 8 veces
  // por segundo (a esa velocidad el ojo lo ve continuo) en vez de 60: 7 veces menos trabajo para el vidrio.
  let { acento = '#e3001b' } = $props();
</script>

<div class="malla" style="--acento:{acento}" aria-hidden="true">
  <i class="m rojo-a"></i><i class="m azul"></i><i class="m amarillo"></i><i class="m rojo-b"></i><i class="m verde"></i><i class="m ruta"></i>
  <!-- velo: apaga un poco el color justo donde va el texto suelto (encabezados) para que siempre se lea -->
  <i class="velo"></i>
</div>

<style>
  @property --acento { syntax: '<color>'; inherits: true; initial-value: #e3001b; }
  .malla {
    --v: 1;
    position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
    background: var(--fondo);
    transition: --acento 1100ms cubic-bezier(0.23, 1, 0.32, 1);
    contain: strict;
  }
  .m {
    position: absolute; left: 50%; top: 50%;
    width: var(--t); height: var(--t); margin: calc(var(--t) / -2) 0 0 calc(var(--t) / -2);
    border-radius: 50%;
    will-change: transform;
    animation: var(--anim) var(--dur) ease-in-out infinite alternate;
    animation-delay: var(--retraso, 0s);
  }
  /* rojo: las dos manchas más grandes y opacas */
  .rojo-a { --t: 115vmax; --anim: viajeA; --dur: 46s; opacity: calc(0.74 * var(--v)); background: radial-gradient(closest-side, #e3001b, transparent); }
  .rojo-b { --t: 92vmax; --anim: viajeD; --dur: 58s; --retraso: -21s; opacity: calc(0.58 * var(--v)); background: radial-gradient(closest-side, #ff2d55, transparent); }
  .azul { --t: 78vmax; --anim: viajeB; --dur: 52s; --retraso: -13s; opacity: calc(0.6 * var(--v)); background: radial-gradient(closest-side, #1a7bff, transparent); }
  .amarillo { --t: 66vmax; --anim: viajeC; --dur: 49s; --retraso: -30s; opacity: calc(0.6 * var(--v)); background: radial-gradient(closest-side, #ffbe00, transparent); }
  .verde { --t: 60vmax; --anim: viajeE; --dur: 61s; --retraso: -8s; opacity: calc(0.5 * var(--v)); background: radial-gradient(closest-side, #00c2a8, transparent); }
  .ruta { --t: 70vmax; --anim: viajeF; --dur: 55s; --retraso: -38s; opacity: calc(0.5 * var(--v)); background: radial-gradient(closest-side, var(--acento), transparent); }

  /* recorridos que cruzan toda la pantalla (cada mancha visita esquinas distintas) */
  @keyframes viajeA { 0% { transform: translate3d(-38vw, -34vh, 0) scale(1); } 33% { transform: translate3d(22vw, -18vh, 0) scale(1.08); } 66% { transform: translate3d(-12vw, 26vh, 0) scale(0.94); } 100% { transform: translate3d(30vw, 30vh, 0) scale(1.05); } }
  @keyframes viajeB { 0% { transform: translate3d(42vw, -30vh, 0) scale(1); } 33% { transform: translate3d(-8vw, 8vh, 0) scale(1.1); } 66% { transform: translate3d(-40vw, -24vh, 0) scale(0.92); } 100% { transform: translate3d(20vw, 36vh, 0) scale(1); } }
  @keyframes viajeC { 0% { transform: translate3d(-34vw, 38vh, 0) scale(1); } 33% { transform: translate3d(30vw, 20vh, 0) scale(0.92); } 66% { transform: translate3d(8vw, -34vh, 0) scale(1.1); } 100% { transform: translate3d(-36vw, -6vh, 0) scale(1); } }
  @keyframes viajeD { 0% { transform: translate3d(36vw, 34vh, 0) scale(1.04); } 33% { transform: translate3d(-30vw, 12vh, 0) scale(0.95); } 66% { transform: translate3d(14vw, -36vh, 0) scale(1.08); } 100% { transform: translate3d(-22vw, -28vh, 0) scale(1); } }
  @keyframes viajeE { 0% { transform: translate3d(30vw, 4vh, 0) scale(1); } 50% { transform: translate3d(-34vw, 32vh, 0) scale(1.12); } 100% { transform: translate3d(4vw, -38vh, 0) scale(0.95); } }
  @keyframes viajeF { 0% { transform: translate3d(-10vw, -40vh, 0) scale(1); } 50% { transform: translate3d(38vw, 10vh, 0) scale(0.94); } 100% { transform: translate3d(-30vw, 30vh, 0) scale(1.08); } }

  /* velo claro arriba (donde están los títulos sobre el fondo, sin tarjeta) */
  .velo { position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, var(--fondo) 84%, transparent), color-mix(in srgb, var(--fondo) 34%, transparent) 14%, transparent 30%); }

  /* en oscuro el color brilla más sobre negro: se baja un poco para no cansar */
  @media (prefers-color-scheme: dark) {
    /* en oscuro: colores más saturados y manchas un poco más chicas, para que se distingan rojo, azul,
       ámbar y verde en vez de fundirse en un solo rojo apagado */
    .malla { --v: 0.8; }
    .rojo-a { --t: 96vmax; background: radial-gradient(closest-side, #ff1f3d, transparent); }
    .rojo-b { --t: 74vmax; background: radial-gradient(closest-side, #ff3d7a, transparent); }
    .azul { opacity: calc(0.8 * var(--v)); background: radial-gradient(closest-side, #2f7dff, transparent); }
    .amarillo { opacity: calc(0.62 * var(--v)); background: radial-gradient(closest-side, #ffb020, transparent); }
    .verde { opacity: calc(0.62 * var(--v)); background: radial-gradient(closest-side, #12d6b6, transparent); }
    .velo { background: linear-gradient(180deg, color-mix(in srgb, var(--fondo) 80%, transparent), color-mix(in srgb, var(--fondo) 30%, transparent) 14%, color-mix(in srgb, var(--fondo) 22%, transparent) 100%); }
  }
  /* celular: pasos de ~1 px, ~8 por segundo (ver nota arriba) */
  @media (pointer: coarse), (max-width: 979px) {
    .rojo-a { animation-timing-function: steps(122); }
    .rojo-b { animation-timing-function: steps(154); }
    .azul { animation-timing-function: steps(138); }
    .amarillo { animation-timing-function: steps(130); }
    .verde { animation-timing-function: steps(244); }
    .ruta { animation-timing-function: steps(220); }
  }
  @media (prefers-reduced-motion: reduce) { .m { animation: none; } .malla { transition: none; } }
</style>
