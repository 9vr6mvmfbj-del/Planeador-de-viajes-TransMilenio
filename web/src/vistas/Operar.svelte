<script>
  // R7 (editar rutas y recorrido), R8 (cerrar/reabrir) y R9 (deshacer/rehacer).
  import { app, motor, huboCambio, avisar, vibrar } from '../lib/estado.svelte.js';
  import { colorRuta } from '../lib/colores.js';
  import CampoEstacion from '../componentes/CampoEstacion.svelte';
  import ChipRuta from '../componentes/ChipRuta.svelte';
  import LineaRuta from '../componentes/LineaRuta.svelte';
  import Icono from '../componentes/Icono.svelte';

  // Etiquetas de lo que se hizo, solo para mostrar el historial (el motor guarda las operaciones reales).
  let hechos = $state(/** @type {string[]} */ ([]));
  let deshechos = $state(/** @type {string[]} */ ([]));

  function registrar(texto) {
    hechos.push(texto);
    deshechos.length = 0; // un cambio nuevo borra lo que había para rehacer
    huboCambio();
    avisar(texto);
    vibrar(10);
  }

  function deshacer() {
    if (!motor().deshacer()) return;
    const t = hechos.pop();
    if (t) deshechos.push(t);
    huboCambio();
    avisar('Deshecho: ' + (t ?? 'último cambio'));
  }
  function rehacer() {
    if (!motor().rehacer()) return;
    const t = deshechos.pop();
    if (t) hechos.push(t);
    huboCambio();
    avisar('Rehecho: ' + (t ?? 'cambio'));
  }

  // ---------- R8
  let textoEstacion = $state('');
  let estacion = $state('');
  let estadoEstacion = $derived.by(() => { app.version; return estacion ? motor().estado(estacion) : ''; });
  let cerradas = $derived.by(() => { app.version; return motor().cerradas(); });

  function alternar(nombre, abrir) {
    const ok = abrir ? motor().reabrir(nombre) : motor().cerrar(nombre);
    if (ok) registrar(`${abrir ? 'Reabierta' : 'Cerrada'} ${nombre}`);
    else avisar('No hubo cambios', 'error');
  }

  // ---------- R7
  let filtroRuta = $state('');
  let ruta = $state('');
  let alReves = $state(false);
  let insertarTras = $state(/** @type {string | null} */ (null));
  let textoNueva = $state('');

  let rutasFiltradas = $derived.by(() => {
    const f = filtroRuta.trim().toUpperCase();
    return (f ? app.rutas.filter((r) => r.startsWith(f)) : app.rutas).slice(0, 40);
  });
  let recorrido = $derived.by(() => { app.version; return ruta ? motor().recorrido(ruta, alReves) : []; });
  let cerradasSet = $derived(new Set(cerradas));

  function elegirRuta(r) {
    ruta = r;
    insertarTras = null;
  }
  function quitar(nombre) {
    if (motor().quitar_parada(ruta, nombre)) registrar(`Quitada ${nombre} de ${ruta}`);
    else avisar('No se pudo quitar', 'error');
  }
  function agregar(nueva) {
    if (!insertarTras) return;
    if (motor().agregar_parada(ruta, nueva, insertarTras)) {
      registrar(`Agregada ${nueva} en ${ruta}`);
      insertarTras = null;
      textoNueva = '';
    } else avisar(`${nueva} ya está en ${ruta}`, 'error');
  }
</script>

<header class="cabeza">
  <p class="etiqueta">Operación de la red</p>
  <div class="fila-titulo">
    <h1 class="titulo-grande">Operar</h1>
    <div class="deshacer vidrio vidrio-nativo">
      <button class="boton boton-icono" aria-label="Deshacer" disabled={!app.resumen.puedeDeshacer} onclick={deshacer}><Icono nombre="deshacer" /></button>
      <button class="boton boton-icono" aria-label="Rehacer" disabled={!app.resumen.puedeRehacer} onclick={rehacer}><Icono nombre="rehacer" /></button>
    </div>
  </div>
</header>

<div class="grilla">
  <div class="col">
    <section class="vidrio tarjeta">
      <p class="etiqueta">Estaciones</p>
      <h2 class="titulo">Cerrar o reabrir</h2>
      <div class="espacio"><CampoEstacion incluirCerradas placeholder="Buscar estación" bind:valor={textoEstacion} onelegir={(n) => (estacion = n)} /></div>

      {#if estacion && estadoEstacion !== 'NO EXISTE'}
        <div class="interruptor-fila aparece">
          <div>
            <p class="subtitulo">{estacion}</p>
            <p class="mini tenue">{estadoEstacion === 'ABIERTA' ? 'Abierta: aparece en búsquedas y viajes' : 'Cerrada: no aparece en búsquedas ni viajes'}</p>
          </div>
          <button class="interruptor" role="switch" aria-checked={estadoEstacion === 'ABIERTA'} aria-label="Estación abierta"
            onclick={() => alternar(estacion, estadoEstacion !== 'ABIERTA')}>
            <span></span>
          </button>
        </div>
      {/if}

      {#if cerradas.length}
        <p class="etiqueta separado">Cerradas ahora ({cerradas.length})</p>
        <div class="chips">
          {#each cerradas as c (c)}
            <button class="chip cerrada" onclick={() => alternar(c, true)} aria-label="Reabrir {c}">
              {c}<Icono nombre="cerrar" tam={12} grosor={2.6} />
            </button>
          {/each}
        </div>
      {/if}
    </section>

    <section class="vidrio tarjeta">
      <p class="etiqueta">Historial</p>
      {#if hechos.length === 0 && deshechos.length === 0}
        <p class="tenue pequeno espacio">Aún no hay cambios. Todo cierre, reapertura o edición se puede deshacer.</p>
      {:else}
        <ol class="historial">
          {#each [...hechos].reverse() as h, i (h + i)}<li><Icono nombre="cheque" tam={14} grosor={2.6} />{h}</li>{/each}
          {#each [...deshechos].reverse() as h, i (h + 'd' + i)}<li class="deshecho"><Icono nombre="deshacer" tam={14} />{h}</li>{/each}
        </ol>
      {/if}
    </section>
  </div>

  <section class="vidrio tarjeta">
    <p class="etiqueta">Rutas</p>
    <h2 class="titulo">Editar recorrido</h2>
    <input class="campo espacio" placeholder="Filtrar rutas, ej. B7" bind:value={filtroRuta} autocapitalize="characters" aria-label="Filtrar rutas" />
    <div class="carrusel" role="group" aria-label="Rutas">
      {#each rutasFiltradas as r (r)}
        <button class="ruta-boton" aria-pressed={r === ruta} onclick={() => elegirRuta(r)}><ChipRuta ruta={r} /></button>
      {/each}
    </div>

    {#if ruta}
      <div class="cabeza-tarjeta separado">
        <div class="fila-chip"><ChipRuta ruta={ruta} grande /><span class="pequeno tenue num">{recorrido.length} paradas</span></div>
        <div class="segmentado" role="group" aria-label="Sentido">
          <button aria-pressed={!alReves} onclick={() => (alReves = false)}>Ida</button>
          <button aria-pressed={alReves} onclick={() => (alReves = true)}>Al revés</button>
        </div>
      </div>
      {#if alReves}<p class="mini tenue">Vista al revés: para editar vuelve a “Ida”.</p>{/if}

      {#snippet botones(p)}
        {#if !alReves}
          <span class="acciones">
            <button class="mini-boton" aria-label="Agregar parada después de {p.nombre}" onclick={() => { insertarTras = insertarTras === p.nombre ? null : p.nombre; textoNueva = ''; }}>
              <Icono nombre="mas" tam={16} grosor={2.4} />
            </button>
            <button class="mini-boton quitar" aria-label="Quitar {p.nombre}" onclick={() => quitar(p.nombre)}>
              <Icono nombre="menos" tam={16} grosor={2.4} />
            </button>
          </span>
        {/if}
      {/snippet}

      <LineaRuta color={colorRuta(ruta)} acciones={botones}
        paradas={recorrido.map((n) => ({ nombre: n, cerrada: cerradasSet.has(n), nota: insertarTras === n ? 'Agregar después de esta' : '' }))} />

      {#if insertarTras}
        <div class="insertar vidrio aparece">
          <p class="pequeno"><strong>Nueva parada</strong> después de {insertarTras}</p>
          <CampoEstacion permitirNueva autofoco placeholder="Estación existente o nueva" bind:valor={textoNueva} onelegir={agregar} />
          <button class="boton" onclick={() => (insertarTras = null)}>Cancelar</button>
        </div>
      {/if}
    {:else}
      <p class="tenue pequeno separado">Elige una ruta para ver su recorrido, agregar o quitar paradas.</p>
    {/if}
  </section>
</div>

<style>
  .cabeza { padding: 8px 4px 18px; }
  .fila-titulo { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .deshacer { display: flex; gap: 4px; padding: 4px; border-radius: 999px; }
  .deshacer .boton { background: transparent; }
  .grilla, .col { display: grid; gap: 14px; align-content: start; }
  .grilla :global(.tarjeta + .tarjeta), .col :global(.tarjeta + .tarjeta) { margin-top: 0; }
  .espacio { margin-top: 12px; }
  .separado { margin-top: 18px; }
  .interruptor-fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; padding: 12px 14px; border-radius: 16px; background: var(--relleno); }
  /* interruptor estilo iOS */
  .interruptor { width: 51px; height: 31px; border-radius: 999px; background: var(--relleno-2); position: relative; flex: none; transition: background-color 200ms ease; }
  .interruptor span { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.16); transition: transform 280ms var(--cajon); }
  .interruptor[aria-checked='true'] { background: var(--verde); }
  .interruptor[aria-checked='true'] span { transform: translateX(20px); }
  .interruptor:active span { width: 31px; }
  .interruptor[aria-checked='true']:active span { transform: translateX(16px); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip.cerrada { color: var(--tenue); transition: transform 160ms var(--salida); }
  .chip.cerrada:active { transform: scale(0.96); }
  .historial { list-style: none; display: grid; gap: 8px; margin-top: 10px; font-size: 15px; }
  .historial li { display: flex; align-items: center; gap: 8px; }
  .historial li :global(svg) { color: var(--verde); flex: none; }
  .historial .deshecho { color: var(--tenue); text-decoration: line-through; }
  .historial .deshecho :global(svg) { color: var(--tenue); }

  .carrusel {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 12px 2px 6px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(90deg, #000 85%, transparent);
    mask-image: linear-gradient(90deg, #000 85%, transparent);
  }
  .carrusel::-webkit-scrollbar { display: none; }
  .ruta-boton { flex: none; scroll-snap-align: start; border-radius: 9px; padding: 2px; transition: transform 160ms var(--salida), box-shadow 160ms ease; }
  .ruta-boton:active { transform: scale(0.95); }
  .ruta-boton[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--fondo), 0 0 0 4px var(--tinta); }
  .fila-chip { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
  .acciones { display: flex; gap: 6px; }
  .mini-boton { width: 34px; height: 34px; border-radius: 50%; display: grid; place-content: center; background: var(--relleno); color: var(--azul); transition: transform 160ms var(--salida); }
  .mini-boton:active { transform: scale(0.92); }
  .mini-boton.quitar { color: var(--rojo); }
  .insertar { margin-top: 14px; padding: 14px; border-radius: 18px; display: grid; gap: 10px; }
  .insertar .boton { justify-self: start; }

  @media (min-width: 980px) {
    .grilla { grid-template-columns: 1fr 1.1fr; gap: 20px; }
  }
</style>
