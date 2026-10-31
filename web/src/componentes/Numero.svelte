<script>
  // Número con ruedas (odómetro): cada dígito rueda hasta su valor, uno tras otro de derecha a izquierda.
  let { valor = '' } = $props();
  let texto = $derived(String(valor));
  let chars = $derived(texto.split(''));
  let moviendo = $state(false);
  let previo = /** @type {string | undefined} */ (undefined);
  let t = 0;
  $effect(() => {
    if (previo === undefined) { previo = texto; return; } // primera pintura: sin animar
    if (texto === previo) return;
    previo = texto;
    moviendo = true;
    clearTimeout(t);
    t = setTimeout(() => (moviendo = false), 900);
  });
</script>

<span class="rueda" class:moviendo role="img" aria-label={texto}>
  {#each chars as c, i (chars.length - 1 - i)}
    {#if c >= '0' && c <= '9'}
      <span class="dig" aria-hidden="true" style="--d:{+c}; --r:{chars.length - 1 - i}">
        <span class="tira"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span></span>
      </span>
    {:else}<span class="fijo" aria-hidden="true">{c}</span>{/if}
  {/each}
</span>

<style>
  .rueda { display: inline-flex; font-variant-numeric: tabular-nums; line-height: 1.12; vertical-align: bottom; }
  .dig { display: inline-block; height: 1.12em; overflow: hidden; }
  .tira {
    display: flex; flex-direction: column;
    transform: translateY(calc(var(--d) * -1.12em));
    transition: transform 820ms cubic-bezier(0.16, 1, 0.3, 1) calc(var(--r) * 55ms), filter 300ms ease;
  }
  .tira span { display: block; height: 1.12em; }
  .moviendo .tira { filter: blur(0.7px); }
  .fijo { display: inline-block; }
  @media (prefers-reduced-motion: reduce) { .tira { transition: none; } }
</style>
