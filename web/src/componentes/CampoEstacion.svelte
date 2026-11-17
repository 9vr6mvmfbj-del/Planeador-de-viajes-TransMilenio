<script>
  // Campo con autocompletar: primero lo que responde el motor (R2, nombres que empiezan así) y después
  // las estaciones donde alguna palabra coincide ("100" → CALLE 100), con lo escrito resaltado.
  import { app, motor } from '../lib/estado.svelte.js';
  import Icono from './Icono.svelte';
  import Resaltado from './Resaltado.svelte';
  import { buscar, normalizar } from '../lib/busqueda.js';

  let {
    valor = $bindable(''),
    etiqueta = '',
    placeholder = 'Buscar estación',
    incluirCerradas = false, // operación: también ofrece las cerradas (para reabrirlas)
    permitirNueva = false,   // operación: deja escribir una estación que no existe
    autofoco = false,
    onelegir = (/** @type {string} */ _v) => {},
  } = $props();

  const id = 'campo-' + Math.random().toString(36).slice(2, 8);
  let abierto = $state(false);
  let activo = $state(-1);
  /** @type {HTMLInputElement | undefined} */
  let entrada = $state();

  const MAX = 8;
  // Todas las estaciones abiertas (R3 en orden) y las cerradas, para buscar por palabra.
  let abiertas = $derived.by(() => { app.version; return motor().rango('', '~'); });

  let consulta = $derived(normalizar(valor));
  let sugerencias = $derived.by(() => {
    app.version; // se recalcula si la red cambia (cierres, estaciones nuevas)
    const t = consulta;
    if (!t) return motor().autocompletar('', MAX).map((n) => ({ n, cerrada: false }));
    // 1) R2: abiertas que empiezan con lo escrito. 2) el resto de coincidencias por palabra.
    const lista = motor().autocompletar(t, MAX).map((n) => ({ n, cerrada: false }));
    if (lista.length < MAX) {
      const ya = new Set(lista.map((s) => s.n));
      for (const n of buscar(abiertas, t, MAX + lista.length)) {
        if (!ya.has(n) && lista.length < MAX) lista.push({ n, cerrada: false });
      }
    }
    if (!incluirCerradas) return lista;
    const cerradas = buscar(motor().cerradas(), t, 4).map((n) => ({ n, cerrada: true }));
    return [...cerradas, ...lista].slice(0, MAX + 1);
  });
  $effect(() => { if (autofoco) entrada?.focus(); });
  let exacta = $derived(sugerencias.some((s) => s.n === consulta));

  // Se elige con un toque (click), no al apoyar el dedo: así deslizar la lista la desplaza sin elegir nada.
  function elegir(n) {
    valor = n;
    abierto = false;
    activo = -1;
    onelegir(n);
    entrada?.blur();
  }

  function tecla(e) {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) abierto = true;
    if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(activo + 1, sugerencias.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(activo - 1, -1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activo >= 0 && sugerencias[activo]) elegir(sugerencias[activo].n);
      else if (exacta || permitirNueva) elegir(valor.trim().toUpperCase());
      else if (sugerencias[0]) elegir(sugerencias[0].n);
    } else if (e.key === 'Escape') { abierto = false; }
  }
</script>

<div class="campo-estacion">
  {#if etiqueta}<label class="etiqueta" for={id}>{etiqueta}</label>{/if}
  <div class="caja">
    <span class="lupa"><Icono nombre="buscar" tam={18} /></span>
    <input
      {id}
      bind:this={entrada}
      class="campo"
      type="text"
      autocomplete="off"
      autocapitalize="characters"
      spellcheck="false"
      enterkeyhint="search"
      role="combobox"
      aria-expanded={abierto && sugerencias.length > 0}
      aria-controls={id + '-lista'}
      aria-autocomplete="list"
      {placeholder}
      bind:value={valor}
      onfocus={() => { abierto = true; }}
      oninput={() => { abierto = true; activo = -1; }}
      onblur={() => setTimeout(() => (abierto = false), 200)}
      onkeydown={tecla}
    />
    {#if valor}
      <button class="limpiar" aria-label="Borrar" onpointerdown={(e) => { e.preventDefault(); valor = ''; entrada?.focus(); }}>
        <Icono nombre="cerrar" tam={12} grosor={3} />
      </button>
    {/if}
  </div>

  {#if abierto && (sugerencias.length > 0 || (permitirNueva && valor.trim() && !exacta))}
    <ul class="lista-sug vidrio vidrio-flotante" id={id + '-lista'} role="listbox">
      {#each sugerencias as s, i (s.n)}
        <li role="option" aria-selected={i === activo}>
          <button class:activo={i === activo} onmousedown={(e) => e.preventDefault()} onclick={() => elegir(s.n)}>
            <span class="pin" class:cerrada={s.cerrada}></span>
            <span class="nombre"><Resaltado texto={s.n} {consulta} /></span>
            {#if s.cerrada}<span class="estado estado-cerrada">Cerrada</span>{/if}
          </button>
        </li>
      {/each}
      {#if permitirNueva && valor.trim() && !exacta}
        <li role="option" aria-selected="false">
          <button onmousedown={(e) => e.preventDefault()} onclick={() => elegir(valor.trim().toUpperCase())}>
            <span class="pin nueva"><Icono nombre="mas" tam={12} grosor={3} /></span>
            <span class="nombre">Crear “{valor.trim().toUpperCase()}”</span>
          </button>
        </li>
      {/if}
    </ul>
  {/if}
</div>

<style>
  .campo-estacion { position: relative; display: grid; gap: 6px; }
  .caja { position: relative; }
  .caja .campo { padding-left: 40px; padding-right: 40px; font-weight: 500; }
  .lupa { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--tenue-2); display: flex; }
  .limpiar {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    width: 24px; height: 24px; border-radius: 50%;
    display: grid; place-content: center;
    background: var(--tenue-2); color: var(--fondo);
  }
  .lista-sug {
    position: absolute;
    z-index: 30;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    list-style: none;
    padding: 6px;
    background: var(--vidrio-fuerte); /* más opaca que el vidrio normal: se lee bien sobre lo que tapa */
    border-radius: 18px;
    max-height: min(320px, 38dvh);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overscroll-behavior: contain;
    transform-origin: top center; /* nace desde el campo que lo abrió */
    transition: opacity 180ms ease, transform 180ms var(--salida);
    @starting-style { opacity: 0; transform: scale(0.97) translateY(-4px); }
  }
  .lista-sug button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 10px;
    border-radius: 12px;
    text-align: left;
    font-weight: 500;
  }
  .lista-sug button.activo { background: var(--relleno); }
  .nombre { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pin { width: 10px; height: 10px; border-radius: 50%; border: 2.5px solid var(--rojo); flex: none; }
  .pin.cerrada { border-color: var(--gris-cerrada); }
  .pin.nueva { width: 20px; height: 20px; border: 0; background: var(--azul); color: #fff; display: grid; place-content: center; }
  @media (hover: hover) and (pointer: fine) { .lista-sug button:hover { background: var(--relleno); } }
</style>
