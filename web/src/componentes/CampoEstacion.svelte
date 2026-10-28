<script>
  // Campo con autocompletar (R2): cada letra le pregunta al motor las estaciones abiertas que empiezan así.
  import { app, motor } from '../lib/estado.svelte.js';
  import Icono from './Icono.svelte';

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

  let sugerencias = $derived.by(() => {
    app.version; // se recalcula si la red cambia (cierres, estaciones nuevas)
    const t = valor.trim().toUpperCase();
    const abiertas = motor().autocompletar(t, 8).map((n) => ({ n, cerrada: false }));
    if (!incluirCerradas) return abiertas;
    const cerradas = motor().cerradas().filter((n) => n.startsWith(t)).slice(0, 4).map((n) => ({ n, cerrada: true }));
    return [...cerradas, ...abiertas].slice(0, 9);
  });
  $effect(() => { if (autofoco) entrada?.focus(); });
  let exacta = $derived(sugerencias.some((s) => s.n === valor.trim().toUpperCase()));

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
      onblur={() => setTimeout(() => (abierto = false), 120)}
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
          <button class:activo={i === activo} onpointerdown={(e) => { e.preventDefault(); elegir(s.n); }}>
            <span class="pin" class:cerrada={s.cerrada}></span>
            <span class="nombre">{s.n}</span>
            {#if s.cerrada}<span class="estado estado-cerrada">Cerrada</span>{/if}
          </button>
        </li>
      {/each}
      {#if permitirNueva && valor.trim() && !exacta}
        <li role="option" aria-selected="false">
          <button onpointerdown={(e) => { e.preventDefault(); elegir(valor.trim().toUpperCase()); }}>
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
    border-radius: 18px;
    max-height: 320px;
    overflow: auto;
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
