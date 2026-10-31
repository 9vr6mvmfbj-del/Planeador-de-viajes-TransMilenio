<script>
  // R5 (viaje directo o con un transbordo) + R2 (autocompletar) + R4 (próximo bus de cada tramo).
  import { app, motor, horaActual, sumarMinutos, minutosEntre, vibrar } from '../lib/estado.svelte.js';
  import { colorRuta } from '../lib/colores.js';
  import CampoEstacion from '../componentes/CampoEstacion.svelte';
  import ChipRuta from '../componentes/ChipRuta.svelte';
  import LineaRuta from '../componentes/LineaRuta.svelte';
  import Icono from '../componentes/Icono.svelte';
  import Segmentado from '../componentes/Segmentado.svelte';
  import Numero from '../componentes/Numero.svelte';
  import Palabras from '../componentes/Palabras.svelte';
  import { acento } from '../lib/acento.svelte.js';

  const MIN_POR_PARADA = 3; // estimado solo para mostrar la hora de llegada

  let textoOrigen = $state('');
  let textoDestino = $state('');
  let origen = $state('');
  let destino = $state('');
  let modoHora = $state('ahora');
  let horaElegida = $state(horaActual());
  let girado = $state(false);
  let verTodas = $state(/** @type {Record<number, boolean>} */ ({}));

  let hora = $derived(modoHora === 'ahora' ? horaActual() : horaElegida);
  let populares = $derived.by(() => { app.version; return motor().ranking(6).map((r) => r.nombre); });

  let viaje = $derived.by(() => {
    app.version;
    if (!origen || !destino) return null;
    return motor().viaje(origen, destino);
  });

  let estadoOrigen = $derived.by(() => { app.version; return origen ? motor().estado(origen) : ''; });
  let estadoDestino = $derived.by(() => { app.version; return destino ? motor().estado(destino) : ''; });

  // Cada tramo con sus paradas intermedias y el próximo bus (R4) en la estación donde se sube.
  let tramos = $derived.by(() => {
    if (!viaje?.encontrado) return [];
    let horaTramo = hora;
    return viaje.tramos.map((t) => {
      const desde = t.recorrido.indexOf(t.sube);
      const paradas = t.recorrido.slice(desde, desde + t.paradas + 1);
      const bus = motor().proximo_bus(t.sube, t.ruta, horaTramo);
      const llegada = bus ? sumarMinutos(bus, t.paradas * MIN_POR_PARADA) : '';
      const espera = bus ? minutosEntre(horaTramo, bus) : null;
      const r = { ...t, paradasLista: paradas, bus, llegada, espera, color: colorRuta(t.ruta) };
      if (llegada) horaTramo = llegada;
      return r;
    });
  });
  $effect(() => { acento.color = tramos.length ? tramos[0].color : '#e3001b'; });
  let llegadaFinal = $derived(tramos.length ? tramos[tramos.length - 1].llegada : '');

  function intercambiar() {
    vibrar();
    girado = !girado;
    [textoOrigen, textoDestino] = [textoDestino, textoOrigen];
    [origen, destino] = [destino, origen];
  }
</script>

<header class="cabeza">
  <p class="etiqueta">Planear viaje</p>
  <h1 class="titulo-grande"><Palabras texto="¿A dónde vas?" /></h1>
</header>

<div class="grilla">
  <section class="buscador vidrio tarjeta">
    <div class="campos">
      <div class="guia" aria-hidden="true"><span class="o"></span><span class="raya"></span><span class="d"></span></div>
      <div class="entradas">
        <CampoEstacion etiqueta="Desde" placeholder="Estación de origen" bind:valor={textoOrigen} onelegir={(n) => (origen = n)} />
        <CampoEstacion etiqueta="Hasta" placeholder="Estación de destino" bind:valor={textoDestino} onelegir={(n) => (destino = n)} />
      </div>
      <button class="boton boton-icono girar" class:girado aria-label="Intercambiar origen y destino" onclick={intercambiar}>
        <Icono nombre="intercambiar" />
      </button>
    </div>

    <div class="hora">
      <Segmentado etiqueta="Hora de salida" bind:valor={modoHora} opciones={[{ id: 'ahora', texto: 'Salir ahora' }, { id: 'elegir', texto: 'Elegir hora' }]} />
      {#if modoHora === 'elegir'}
        <input class="campo hora-campo num" type="time" bind:value={horaElegida} aria-label="Hora de salida" />
      {:else}
        <span class="tenue pequeno num"><Icono nombre="reloj" tam={16} /> {hora}</span>
      {/if}
    </div>

    {#if !origen}
      <div class="populares">
        <p class="etiqueta">Estaciones con más buses</p>
        <div class="chips">
          {#each populares as p}
            <button class="chip" onclick={() => { textoOrigen = p; origen = p; }}>{p}</button>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <section class="resultado" aria-live="polite">
    {#if !origen || !destino}
      <div class="vacio vidrio tarjeta">
        <div class="ilustracion" aria-hidden="true"><Icono nombre="viajar" tam={34} /></div>
        <p class="subtitulo">Elige origen y destino</p>
        <p class="tenue pequeno">Buscamos el viaje directo o con un solo transbordo que pase por menos paradas.</p>
      </div>
    {:else if estadoOrigen === 'CERRADA' || estadoDestino === 'CERRADA'}
      <div class="vacio vidrio tarjeta">
        <p class="subtitulo">Estación cerrada</p>
        <p class="tenue pequeno">{estadoOrigen === 'CERRADA' ? origen : destino} está cerrada: nadie puede subir ni bajar ahí.</p>
      </div>
    {:else if origen === destino}
      <div class="vacio vidrio tarjeta"><p class="subtitulo">Ya estás ahí</p><p class="tenue pequeno">El origen y el destino son la misma estación.</p></div>
    {:else if !viaje?.encontrado}
      <div class="vacio vidrio tarjeta">
        <p class="subtitulo">No hay viaje con máximo un transbordo</p>
        <p class="tenue pequeno">Prueba con otra estación cercana o revisa si alguna estación del camino está cerrada.</p>
      </div>
    {:else}
      <article class="vidrio tarjeta resumen aparece">
        <div class="metricas">
          <div><p class="valor num"><Numero valor={viaje.paradas} /></p><p class="mini tenue">paradas</p></div>
          <div><p class="valor num"><Numero valor={viaje.tramos.length - 1} /></p><p class="mini tenue">{viaje.tramos.length === 2 ? 'transbordo' : 'transbordos'}</p></div>
          <div><p class="valor num"><Numero valor={llegadaFinal || '—'} /></p><p class="mini tenue">llegada aprox.</p></div>
        </div>
        <div class="rutas-chips">
          {#each viaje.tramos as t, i}
            {#if i > 0}<Icono nombre="flecha" tam={16} />{/if}
            <ChipRuta ruta={t.ruta} grande />
          {/each}
        </div>
      </article>

      {#each tramos as t, i (t.ruta + i)}
        <article class="vidrio tarjeta tramo aparece" style="animation-delay:{60 + i * 60}ms">
          <div class="cabeza-tarjeta">
            <div class="fila-chip">
              <ChipRuta ruta={t.ruta} grande />
              <span class="pequeno tenue">{t.paradas} {t.paradas === 1 ? 'parada' : 'paradas'}</span>
            </div>
            {#if t.bus}
              <div class="bus">
                <span class="mini tenue">Próximo bus</span>
                <span class="hora-bus num"><Numero valor={t.bus} /></span>
                {#if t.espera !== null}<span class="mini" class:pronto={t.espera <= 5}>{i === 0 ? (t.espera === 0 ? 'ya pasa' : `en ${t.espera} min`) : (t.espera === 0 ? 'justo al llegar' : `esperas ${t.espera} min`)}</span>{/if}
              </div>
            {:else}
              <span class="mini tenue">Sin horarios</span>
            {/if}
          </div>

          <LineaRuta
            color={t.color}
            paradas={((t.paradasLista.length > 6 && !verTodas[i]) ? [t.paradasLista[0], ...t.paradasLista.slice(-2)] : t.paradasLista).map((n, k, arr) => ({
              nombre: n,
              tipo: k === 0 ? (i === 0 ? 'sube' : 'transbordo') : k === arr.length - 1 ? (i === tramos.length - 1 ? 'baja' : 'transbordo') : 'normal',
              nota: k === 0 ? (i === 0 ? 'Sube aquí' : 'Cambia de bus aquí') : k === arr.length - 1 ? (i === tramos.length - 1 ? 'Bájate aquí' : 'Bájate y transborda') : '',
            }))}
          />
          {#if t.paradasLista.length > 6}
            <button class="ver-mas pequeno" onclick={() => (verTodas[i] = !verTodas[i])}>
              {verTodas[i] ? 'Ocultar paradas' : `Ver las ${t.paradasLista.length - 3} paradas intermedias`}
            </button>
          {/if}
        </article>
      {/each}
      <p class="mini tenue nota-final">La llegada es un estimado de {MIN_POR_PARADA} min por parada. Las horas de bus salen de horarios.csv.</p>
    {/if}
  </section>
</div>

<style>
  .cabeza { padding: 8px 4px 18px; }
  .grilla { display: grid; gap: 14px; }
  .campos { display: grid; grid-template-columns: 14px 1fr 44px; gap: 12px; align-items: center; }
  .entradas { display: grid; gap: 12px; }
  .guia { display: grid; justify-items: center; gap: 4px; padding-top: 22px; height: 100%; align-content: center; }
  .guia .o, .guia .d { width: 12px; height: 12px; border-radius: 50%; border: 3px solid var(--rojo); }
  .guia .d { border-color: var(--tinta); background: var(--tinta); }
  .guia .raya { width: 2px; height: 46px; background: repeating-linear-gradient(var(--tenue-2) 0 4px, transparent 4px 8px); }
  .girar { margin-top: 22px; transition: transform 380ms var(--en-pantalla); }
  .girar.girado { transform: rotate(180deg); }
  .girar:active { transform: scale(0.94); }
  .girar.girado:active { transform: rotate(180deg) scale(0.94); }
  .hora { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
  .hora span { display: inline-flex; align-items: center; gap: 6px; }
  .hora-campo { width: auto; min-height: 38px; }
  .populares { margin-top: 18px; display: grid; gap: 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chips .chip { transition: transform 160ms var(--salida); }
  .chips .chip:active { transform: scale(0.96); }

  .resultado { display: grid; gap: 14px; align-content: start; }
  .resultado :global(.tarjeta + .tarjeta) { margin-top: 0; }
  .vacio { display: grid; gap: 6px; justify-items: start; }
  .ilustracion { width: 56px; height: 56px; border-radius: 16px; display: grid; place-content: center; background: var(--rojo-suave); color: var(--rojo); margin-bottom: 6px; }
  .metricas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .valor { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
  .rutas-chips { display: flex; align-items: center; gap: 8px; margin-top: 14px; color: var(--tenue); flex-wrap: wrap; }
  .fila-chip { display: flex; align-items: center; gap: 10px; }
  .bus { display: grid; justify-items: end; line-height: 1.2; }
  .hora-bus { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
  .pronto { color: var(--verde); font-weight: 600; }
  .ver-mas { margin: 6px 0 0 34px; color: var(--azul); font-weight: 600; min-height: 36px; }
  .nota-final { padding: 0 6px; }

  @media (min-width: 980px) {
    .grilla { grid-template-columns: minmax(340px, 420px) 1fr; align-items: start; gap: 20px; }
    .buscador { position: sticky; top: 24px; }
  }
</style>
