<script>
  // Diagrama vertical de una ruta, como el mapa de una línea de metro.
  let {
    paradas = /** @type {{nombre:string, tipo?:string, cerrada?:boolean, nota?:string}[]} */ ([]),
    color = '#e3001b',
    acciones = null, // snippet opcional (parada, índice) para botones por fila
    seleccionable = false,
    onelegir = (/** @type {string} */ _n) => {},
  } = $props();
</script>

<ol class="linea" style="--color:{color}">
  {#each paradas as p, i (p.nombre + i)}
    <li class="parada" data-tipo={p.tipo ?? 'normal'} class:cerrada={p.cerrada} class:primera={i === 0} class:ultima={i === paradas.length - 1}>
      <span class="riel" aria-hidden="true"><span class="punto"></span></span>
      {#if seleccionable}
        <button class="texto" onclick={() => onelegir(p.nombre)}>
          <span class="nombre">{p.nombre}</span>
          {#if p.nota}<span class="nota">{p.nota}</span>{/if}
        </button>
      {:else}
        <span class="texto">
          <span class="nombre">{p.nombre}</span>
          {#if p.nota}<span class="nota">{p.nota}</span>{/if}
        </span>
      {/if}
      {#if p.cerrada}<span class="estado estado-cerrada">Cerrada</span>{/if}
      {#if acciones}{@render acciones(p, i)}{/if}
    </li>
  {/each}
</ol>

<style>
  .linea { list-style: none; }
  .parada {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 46px;
    position: relative;
  }
  .riel { position: relative; width: 22px; align-self: stretch; flex: none; }
  .riel::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 5px;
    transform: translateX(-50%);
    background: var(--color);
  }
  .primera .riel::before { top: 50%; }
  .ultima .riel::before { bottom: 50%; }
  .primera.ultima .riel::before { display: none; }
  .punto {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 13px;
    height: 13px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--fondo);
    border: 3px solid var(--color);
  }
  [data-tipo='sube'] .punto, [data-tipo='baja'] .punto, [data-tipo='transbordo'] .punto {
    width: 19px;
    height: 19px;
    border-width: 4px;
  }
  [data-tipo='transbordo'] .punto { background: var(--color); box-shadow: 0 0 0 3px var(--fondo), 0 0 0 5px var(--color); }
  .cerrada .punto { border-color: var(--gris-cerrada); }
  .texto { flex: 1; min-width: 0; display: grid; text-align: left; padding: 6px 0; }
  .nombre { font-size: 16px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  [data-tipo='sube'] .nombre, [data-tipo='baja'] .nombre, [data-tipo='transbordo'] .nombre { font-weight: 700; }
  .cerrada .nombre { color: var(--tenue); text-decoration: line-through; text-decoration-color: var(--tenue-2); }
  .nota { font-size: 13px; color: var(--tenue); }
  button.texto { border-radius: 10px; transition: transform 160ms var(--salida); }
  button.texto:active { transform: scale(0.98); }
</style>
