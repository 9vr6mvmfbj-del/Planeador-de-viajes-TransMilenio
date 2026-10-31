<script>
  // Indicador de actividad de iOS: 8 rayitas que se apagan en ronda (solo opacidad: corre en la GPU).
  let { tam = 28 } = $props();
</script>

<span class="indicador" style="--tam:{tam}px" role="progressbar" aria-label="Cargando">
  {#each Array(8) as _, i}<i style="--i:{i}"></i>{/each}
</span>

<style>
  .indicador { position: relative; display: inline-block; width: var(--tam); height: var(--tam); color: var(--tenue); }
  i {
    position: absolute; left: 50%; top: 0;
    width: calc(var(--tam) * 0.095); height: calc(var(--tam) * 0.29);
    margin-left: calc(var(--tam) * -0.0475);
    border-radius: 999px; background: currentColor;
    transform-origin: 50% calc(var(--tam) * 0.5);
    transform: rotate(calc(var(--i) * 45deg));
    opacity: 0.22;
    animation: apagar 0.8s linear infinite;
    animation-delay: calc(var(--i) * 0.1s - 0.8s);
  }
  @keyframes apagar { 0% { opacity: 1; } 100% { opacity: 0.22; } }
  @media (prefers-reduced-motion: reduce) { i { animation-duration: 1.6s; } }
</style>
