<script>
  // R1 (estado), R2 (autocompletar), R3 (rango), R4 (próximo bus) y R6 (ranking).
  import { app, motor, horaActual, minutosEntre, formatoNumero } from '../lib/estado.svelte.js';
  import { colorRuta } from '../lib/colores.js';
  import CampoEstacion from '../componentes/CampoEstacion.svelte';
  import ChipRuta from '../componentes/ChipRuta.svelte';
  import Icono from '../componentes/Icono.svelte';

  let texto = $state('');
  let elegida = $state('');
  let rutaElegida = $state('');
  let modoHora = $state('ahora');
  let horaElegida = $state(horaActual());
  let verTodos = $state(false);
  let k = $state(10);
  let desde = $state('CALLE 26');
  let hasta = $state('CALLE 80');

  let hora = $derived(modoHora === 'ahora' ? horaActual() : horaElegida);

  // R1 en vivo sobre lo que se escribe (nombre exacto).
  let estadoTexto = $derived.by(() => { app.version; const t = texto.trim(); return t ? motor().estado(t) : ''; });

  let info = $derived.by(() => { app.version; return elegida ? motor().estacion(elegida) : null; });
  $effect(() => {
    if (info && info.rutas.length && !info.rutas.includes(rutaElegida)) rutaElegida = info.rutas[0];
  });

  let horarios = $derived.by(() => { app.version; return elegida && rutaElegida ? motor().horarios(elegida, rutaElegida) : []; });
  let proximo = $derived.by(() => { app.version; return elegida && rutaElegida ? motor().proximo_bus(elegida, rutaElegida, hora) : ''; });
  let siguientes = $derived.by(() => {
    if (!proximo) return [];
    const i = horarios.indexOf(proximo);
    const v = [];
    for (let j = 0; j < Math.min(6, horarios.length); j++) v.push(horarios[(i + j) % horarios.length]);
    return v;
  });

  let ranking = $derived.by(() => { app.version; return motor().ranking(k); });
  let maxBuses = $derived(ranking.length ? ranking[0].buses : 1);
  let enRango = $derived.by(() => { app.version; return motor().rango(desde, hasta); });

  function elegir(n) {
    elegida = n;
    texto = n;
    verTodos = false;
    document.getElementById('detalle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const claseEstado = (e) => (e === 'ABIERTA' ? 'estado-abierta' : e === 'CERRADA' ? 'estado-cerrada' : 'estado-no-existe');
  const textoEstado = (e) => (e === 'ABIERTA' ? 'Abierta' : e === 'CERRADA' ? 'Cerrada' : 'No existe');
</script>

<header class="cabeza">
  <p class="etiqueta">Red de estaciones</p>
  <h1 class="titulo-grande">Estaciones</h1>
</header>

<div class="grilla">
  <div class="col">
    <section class="vidrio tarjeta">
      <CampoEstacion placeholder="Busca por nombre, ej. CAL" bind:valor={texto} onelegir={elegir} />
      {#if estadoTexto && estadoTexto !== 'ABIERTA' && texto.trim().toUpperCase() !== elegida}
        <p class="estado-texto"><span class="estado {claseEstado(estadoTexto)}">{textoEstado(estadoTexto)}</span>
          <span class="mini tenue">“{texto.trim().toUpperCase()}”</span></p>
      {/if}
    </section>

    <section id="detalle">
      {#if info}
        <article class="vidrio tarjeta aparece detalle">
          <div class="cabeza-tarjeta">
            <div>
              <h2 class="titulo">{info.nombre}</h2>
              <p class="pequeno tenue num">{formatoNumero(Math.max(info.buses, 0))} buses al día · {info.rutas.length} rutas</p>
            </div>
            <span class="estado {claseEstado(info.estado)}">{textoEstado(info.estado)}</span>
          </div>

          {#if info.estado === 'CERRADA'}
            <p class="tenue pequeno">La estación está cerrada: no aparece en búsquedas, rangos ni ranking, y nadie sube ni baja aquí.</p>
          {:else if info.rutas.length === 0}
            <p class="tenue pequeno">Ninguna ruta para en esta estación.</p>
          {:else}
            <p class="etiqueta">Rutas</p>
            <div class="rutas" role="group" aria-label="Rutas que paran aquí">
              {#each info.rutas as r}
                <button class="ruta-boton" aria-pressed={r === rutaElegida} onclick={() => { rutaElegida = r; verTodos = false; }}>
                  <ChipRuta ruta={r} />
                </button>
              {/each}
            </div>

            <div class="proximo" style="--c:{colorRuta(rutaElegida)}">
              <div class="hora-fila">
                <div class="segmentado" role="group" aria-label="Hora">
                  <button aria-pressed={modoHora === 'ahora'} onclick={() => (modoHora = 'ahora')}>Ahora</button>
                  <button aria-pressed={modoHora === 'elegir'} onclick={() => (modoHora = 'elegir')}>Otra hora</button>
                </div>
                {#if modoHora === 'elegir'}<input class="campo hora-campo num" type="time" bind:value={horaElegida} aria-label="Hora" />{/if}
              </div>
              {#if proximo}
                <div class="grande">
                  <Icono nombre="bus" tam={26} />
                  <div>
                    <p class="mini tenue">Próximo {rutaElegida} desde las {hora}</p>
                    <p class="hora-grande num">{proximo}<span class="en"> · {minutosEntre(hora, proximo) === 0 ? 'ya pasa' : `en ${minutosEntre(hora, proximo)} min`}</span></p>
                  </div>
                </div>
                <div class="siguientes">
                  {#each siguientes as h, i}
                    <span class="chip num" class:primero={i === 0}>{h}</span>
                  {/each}
                </div>
                <button class="ver-mas pequeno" onclick={() => (verTodos = !verTodos)}>
                  {verTodos ? 'Ocultar' : `Ver los ${horarios.length} horarios del día`}
                </button>
                {#if verTodos}
                  <div class="todos num">{#each horarios as h}<span class:resalta={h === proximo}>{h}</span>{/each}</div>
                {/if}
              {:else}
                <p class="tenue pequeno">Esta ruta no tiene horarios en esta estación.</p>
              {/if}
            </div>
          {/if}
        </article>
      {:else}
        <div class="vidrio tarjeta vacio">
          <p class="subtitulo">Busca una estación</p>
          <p class="tenue pequeno">Verás si está abierta, cuántos buses pasan al día y a qué hora llega el próximo bus de cada ruta.</p>
        </div>
      {/if}
    </section>
  </div>

  <div class="col">
    <section class="vidrio tarjeta">
      <div class="cabeza-tarjeta">
        <div><p class="etiqueta">Ranking</p><h2 class="titulo">Más buses al día</h2></div>
        <div class="segmentado" role="group" aria-label="Cuántas estaciones">
          {#each [5, 10, 20] as n}<button aria-pressed={k === n} onclick={() => (k = n)}>{n}</button>{/each}
        </div>
      </div>
      <ol class="ranking">
        {#each ranking as r, i (r.nombre)}
          <li>
            <button class="fila-ranking" onclick={() => elegir(r.nombre)}>
              <span class="pos num">{i + 1}</span>
              <span class="cuerpo">
                <span class="linea-nombre"><span class="nombre">{r.nombre}</span><span class="mini tenue num">{formatoNumero(r.buses)}</span></span>
                <span class="barra"><span style="transform:scaleX({r.buses / maxBuses})"></span></span>
              </span>
            </button>
          </li>
        {/each}
      </ol>
    </section>

    <section class="vidrio tarjeta">
      <p class="etiqueta">Rango alfabético</p>
      <h2 class="titulo">Estaciones entre dos nombres</h2>
      <div class="rango-campos">
        <label><span class="mini tenue">Desde</span><input class="campo" bind:value={desde} autocapitalize="characters" /></label>
        <label><span class="mini tenue">Hasta</span><input class="campo" bind:value={hasta} autocapitalize="characters" /></label>
      </div>
      <p class="mini tenue num conteo">{enRango.length} estaciones abiertas</p>
      <div class="chips-rango">
        {#each enRango.slice(0, 60) as n (n)}<button class="chip" onclick={() => elegir(n)}>{n}</button>{/each}
        {#if enRango.length > 60}<span class="chip tenue">+{enRango.length - 60}</span>{/if}
      </div>
    </section>
  </div>
</div>

<style>
  .cabeza { padding: 8px 4px 18px; }
  .grilla, .col { display: grid; gap: 14px; align-content: start; }
  .col :global(.tarjeta + .tarjeta) { margin-top: 0; }
  #detalle { scroll-margin-top: calc(env(safe-area-inset-top, 0px) + 16px); }
  .estado-texto { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
  .vacio { display: grid; gap: 6px; }
  .rutas {
    display: flex; gap: 6px; margin: 8px -18px 16px; padding: 5px 18px 8px;
    overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none;
  }
  .rutas::-webkit-scrollbar { display: none; }
  .rutas .ruta-boton { flex: none; scroll-snap-align: start; }
  @media (min-width: 980px) { .rutas { flex-wrap: wrap; overflow: visible; margin: 8px 0 16px; padding: 2px; } }
  .ruta-boton { border-radius: 9px; padding: 2px; transition: transform 160ms var(--salida), box-shadow 160ms ease; }
  .ruta-boton:active { transform: scale(0.95); }
  .ruta-boton[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--fondo), 0 0 0 4px var(--tinta); }
  .proximo { border-top: 0.5px solid var(--separador); padding-top: 14px; display: grid; gap: 12px; }
  .hora-fila { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .hora-campo { width: auto; min-height: 36px; }
  .grande { display: flex; align-items: center; gap: 12px; color: var(--c); }
  .grande p { color: var(--tinta); }
  .grande .mini { color: var(--tenue); }
  .hora-grande { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .en { font-size: 17px; font-weight: 600; color: var(--verde); letter-spacing: 0; }
  .siguientes { display: flex; flex-wrap: wrap; gap: 6px; }
  .siguientes .primero { background: var(--c); color: #fff; }
  .ver-mas { justify-self: start; color: var(--azul); font-weight: 600; min-height: 36px; }
  .todos { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 6px; font-size: 14px; max-height: 260px; overflow: auto; overscroll-behavior: contain; }
  .todos span { padding: 6px 0; text-align: center; border-radius: 8px; background: var(--relleno); }
  .todos .resalta { background: var(--c); color: #fff; font-weight: 700; }

  .ranking { list-style: none; display: grid; gap: 2px; }
  .fila-ranking { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 6px; border-radius: 12px; text-align: left; transition: transform 160ms var(--salida); }
  .fila-ranking:active { transform: scale(0.98); }
  .pos { width: 26px; height: 26px; border-radius: 8px; display: grid; place-content: center; font-size: 13px; font-weight: 700; background: var(--relleno); flex: none; }
  li:first-child .pos { background: var(--rojo); color: #fff; }
  .cuerpo { flex: 1; min-width: 0; display: grid; gap: 6px; }
  .linea-nombre { display: flex; justify-content: space-between; gap: 8px; }
  .nombre { font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barra { height: 6px; border-radius: 3px; background: var(--relleno); overflow: hidden; }
  .barra span { display: block; height: 100%; background: linear-gradient(90deg, var(--rojo), #ff6b6b); transform-origin: left; transition: transform 500ms var(--salida); border-radius: 3px; }

  .rango-campos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  .rango-campos label { display: grid; gap: 4px; }
  .conteo { margin: 12px 0 8px; }
  .chips-rango { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips-rango .chip { transition: transform 160ms var(--salida); }
  .chips-rango .chip:active { transform: scale(0.96); }
  @media (hover: hover) and (pointer: fine) {
    .fila-ranking:hover { background: var(--relleno); }
    .chips-rango button.chip:hover { background: var(--relleno-2); }
  }

  @media (min-width: 980px) {
    .grilla { grid-template-columns: 1.15fr 1fr; gap: 20px; }
  }
</style>
