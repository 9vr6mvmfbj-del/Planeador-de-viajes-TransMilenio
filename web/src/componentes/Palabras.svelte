<script>
  // Texto cinético: cada palabra sube y se enfoca, escalonada. El texto real queda en aria-label.
  let { texto = '' } = $props();
  let palabras = $derived(texto.split(' '));
</script>

<span class="pals" role="img" aria-label={texto}>
  {#each palabras as p, i}<span class="pal" aria-hidden="true" style="--i:{i}">{p}</span>{#if i < palabras.length - 1}{' '}{/if}{/each}
</span>

<style>
  .pals { display: inline; }
  .pal { display: inline-block; animation: sube 760ms cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 90ms + 40ms); }
  @keyframes sube { from { opacity: 0; transform: translateY(0.62em) scale(0.96); filter: blur(7px); } to { opacity: 1; transform: none; filter: blur(0); } }
  @media (prefers-reduced-motion: reduce) { .pal { animation: none; } }
</style>
