<script>
  // Gradient mesh vivo: manchas de color que derivan despacio detrás de todo.
  // Le da al vidrio algo que desenfocar y refractar. El color principal sigue a la ruta elegida.
  // La intensidad (--v) es una sola perilla: sube o baja todas las manchas a la vez.
  let { acento = '#e3001b' } = $props();
</script>

<div class="malla" style="--acento:{acento}" aria-hidden="true">
  <i class="m m1"></i><i class="m m2"></i><i class="m m3"></i><i class="m m4"></i><i class="m m5"></i>
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
    position: absolute; width: 95vmax; height: 95vmax; border-radius: 50%;
    will-change: transform;
    animation: deriva 26s ease-in-out infinite alternate;
  }
  .m1 { left: -38vmax; top: -34vmax; opacity: calc(0.78 * var(--v)); background: radial-gradient(closest-side, var(--acento), transparent); }
  .m2 { right: -48vmax; top: -10vmax; opacity: calc(0.7 * var(--v)); background: radial-gradient(closest-side, #1a7bff, transparent); animation-duration: 31s; animation-delay: -9s; }
  .m3 { left: -22vmax; bottom: -52vmax; opacity: calc(0.72 * var(--v)); background: radial-gradient(closest-side, #ffbe00, transparent); animation-duration: 29s; animation-delay: -4s; }
  .m4 { right: -40vmax; bottom: -30vmax; opacity: calc(0.62 * var(--v)); background: radial-gradient(closest-side, #00c2a8, transparent); animation-duration: 34s; animation-delay: -15s; }
  .m5 { left: 12vmax; top: 22vmax; width: 70vmax; height: 70vmax; opacity: calc(0.4 * var(--v)); background: radial-gradient(closest-side, #d62f94, transparent); animation-duration: 37s; animation-delay: -20s; }

  /* velo claro arriba (donde están los títulos sobre el fondo, sin tarjeta) */
  .velo { position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, var(--fondo) 84%, transparent), color-mix(in srgb, var(--fondo) 34%, transparent) 14%, transparent 30%); }

  @keyframes deriva {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(9vmax, 7vmax, 0) scale(1.14); }
    100% { transform: translate3d(-7vmax, 10vmax, 0) scale(0.93); }
  }
  /* en oscuro el color brilla más sobre negro: se baja un poco para no cansar */
  @media (prefers-color-scheme: dark) { .malla { --v: 0.85; } }
  @media (prefers-reduced-motion: reduce) { .m { animation: none; } .malla { transition: none; } }
  /* En el celular la malla queda quieta (solo cambia de color con la ruta): si el fondo se mueve, todas
     las tarjetas de vidrio tienen que volver a desenfocarlo en cada cuadro, y eso trababa el scroll y la
     barra en el iPhone. En escritorio sí deriva. */
  @media (pointer: coarse), (max-width: 979px) { .m { animation: none; will-change: auto; } }
</style>
