<script>
  // Panel de admin: lo que un usuario común no debe tocar.
  //   Estaciones: crear, eliminar, cerrar y reabrir (R8).
  //   Líneas: crear (con horarios), eliminar, agregar y quitar paradas (R7) y ver el recorrido.
  //   Historial: las dos pilas del motor (R9). Se puede deshacer o rehacer CUALQUIER cambio, no solo el último.
  // Cada cambio pide el PIN y queda guardado: al recargar la app la red sigue igual.
  import {
    app, motor, sesion, persistencia, cambiar, restablecer, pinCorrecto, historial, describirCambio,
    fechaCorta, avisar, vibrar, formatoNumero, duracion,
  } from '../lib/estado.svelte.js';
  import { colorRuta } from '../lib/colores.js';
  import CampoEstacion from '../componentes/CampoEstacion.svelte';
  import ChipRuta from '../componentes/ChipRuta.svelte';
  import LineaRuta from '../componentes/LineaRuta.svelte';
  import Icono from '../componentes/Icono.svelte';
  import Segmentado from '../componentes/Segmentado.svelte';
  import TecladoPin from '../componentes/TecladoPin.svelte';
  import Palabras from '../componentes/Palabras.svelte';
  import Cargando from '../componentes/Cargando.svelte';
  import { buscar, normalizar } from '../lib/busqueda.js';

  let seccion = $state('estaciones');

  // ---------------------------------------------------------------- PIN
  /** @type {{ titulo: string, detalle?: string, peligro?: boolean, accion: (pin: string) => Promise<any> } | null} */
  let pedido = $state(null);

  // Pide el PIN y hace el cambio. 'listo' corre si salió bien (limpiar el formulario, etc.).
  function confirmar({ titulo, detalle = '', peligro = false, op, args, desc, ok: listo = () => {} }) {
    pedido = {
      titulo, detalle, peligro,
      accion: async (pin) => {
        const r = await cambiar(pin, op, args, desc);
        if (r.ok) { avisar(desc); vibrar(10); listo(); }
        else if (r.conflicto > 0) {
          const bloqueo = historial().hechos.find((c) => c.id === r.conflicto);
          pedido = null;
          avisar(bloqueo ? `Primero deshaz «${describirCambio(bloqueo)}»: depende de este cambio` : r.error, 'error');
          return { ok: true }; // cierra la hoja: no es un problema del PIN
        }
        return r;
      },
    };
  }

  let desbloqueando = $state(false);
  let abriendo = $state(false);
  function desbloquear() {
    desbloqueando = true;
    pedido = {
      titulo: 'Panel de administración',
      detalle: 'Solo para el equipo que opera la red.',
      accion: async (pin) => {
        if (!(await pinCorrecto(pin))) return { ok: false, pin: false };
        vibrar(10);
        // pausa breve con indicador: da la sensación de entrar a una zona segura (y no a un cambio de pestaña)
        abriendo = true;
        setTimeout(() => { sesion.admin = true; abriendo = false; }, 1000);
        return { ok: true };
      },
    };
  }

  // ---------------------------------------------------------------- Estaciones
  let nuevaEstacion = $state('');
  let nombreNueva = $derived(normalizar(nuevaEstacion));
  let yaExiste = $derived.by(() => { app.version; return nombreNueva ? motor().estado(nombreNueva) !== 'NO EXISTE' : false; });

  function crearEstacion() {
    if (!nombreNueva || yaExiste) return;
    confirmar({
      titulo: `Crear ${nombreNueva}`,
      detalle: 'La estación queda abierta y sin líneas. Luego puedes agregarla a una línea.',
      op: 'crear_estacion', args: [nombreNueva], desc: `Creó la estación ${nombreNueva}`,
      ok: () => { nuevaEstacion = ''; },
    });
  }

  let textoEstacion = $state('');
  let estacion = $state('');
  let info = $derived.by(() => { app.version; return estacion ? motor().estacion(estacion) : null; });
  let cerradas = $derived.by(() => { app.version; return motor().cerradas(); });

  function alternar(nombre, abrir) {
    confirmar({
      titulo: `${abrir ? 'Reabrir' : 'Cerrar'} ${nombre}`,
      detalle: abrir ? 'Vuelve a aparecer en búsquedas, ranking y viajes.' : 'Deja de aparecer en búsquedas, ranking y viajes. Los buses siguen pasando pero nadie sube ni baja.',
      op: abrir ? 'reabrir' : 'cerrar', args: [nombre], desc: `${abrir ? 'Reabrió' : 'Cerró'} ${nombre}`,
    });
  }
  function eliminarEstacion(nombre, lineas) {
    confirmar({
      titulo: `Eliminar ${nombre}`,
      detalle: `${lineas ? `Se quitará de ${lineas} ${lineas === 1 ? 'línea' : 'líneas'} y desaparecerá de la red.` : 'Desaparecerá de la red.'} Puedes deshacerlo en Historial.`,
      peligro: true,
      op: 'eliminar_estacion', args: [nombre], desc: `Eliminó la estación ${nombre}`,
      ok: () => { estacion = ''; textoEstacion = ''; },
    });
  }

  // ---------------------------------------------------------------- Líneas: crear
  let nombreLinea = $state('');
  let paradasNueva = $state(/** @type {string[]} */ ([]));
  let textoParada = $state('');
  let primera = $state('05:00');
  let ultima = $state('22:00');
  let frecuencia = $state(8);
  let entre = $state(3);
  let codigoLinea = $derived(normalizar(nombreLinea));
  let lineaExiste = $derived(codigoLinea !== '' && app.rutas.includes(codigoLinea));
  let busesDia = $derived.by(() => {
    const a = primera.split(':').map(Number), b = ultima.split(':').map(Number);
    if (a.length < 2 || b.length < 2 || !(frecuencia >= 1)) return 0;
    let ini = a[0] * 60 + a[1], fin = b[0] * 60 + b[1];
    if (fin < ini) fin += 1440;
    return Math.floor((fin - ini) / frecuencia) + 1;
  });
  let lineaValida = $derived(codigoLinea !== '' && !lineaExiste && paradasNueva.length >= 2 && busesDia > 0 && entre >= 0);

  function agregarParadaNueva(n) {
    if (!n || paradasNueva.includes(n)) { avisar(n ? `${n} ya está en la lista` : 'Elige una estación', 'error'); return; }
    paradasNueva = [...paradasNueva, n];
    textoParada = '';
  }
  function moverParada(i, d) {
    const j = i + d;
    if (j < 0 || j >= paradasNueva.length) return;
    const v = [...paradasNueva];
    [v[i], v[j]] = [v[j], v[i]];
    paradasNueva = v;
  }
  function crearLinea() {
    if (!lineaValida) return;
    const n = codigoLinea, p = [...paradasNueva];
    confirmar({
      titulo: `Crear la línea ${n}`,
      detalle: `${p.length} paradas · ${formatoNumero(busesDia)} buses al día, uno cada ${duracion(frecuencia)}, de ${primera} a ${ultima}.`,
      op: 'crear_ruta', args: [n, p, primera, ultima, Number(frecuencia), Number(entre)], desc: `Creó la línea ${n} (${p.length} paradas)`,
      ok: () => { nombreLinea = ''; paradasNueva = []; ruta = n; },
    });
  }

  // ---------------------------------------------------------------- Líneas: editar (R7)
  let filtroRuta = $state('');
  let ruta = $state('');
  let alReves = $state(false);
  let insertarTras = $state(/** @type {string | null} */ (null));
  let textoNueva = $state('');
  let rutasFiltradas = $derived(filtroRuta.trim() ? buscar(app.rutas, filtroRuta, 40) : app.rutas.slice(0, 40));
  let recorrido = $derived.by(() => { app.version; return ruta ? motor().recorrido(ruta, alReves) : []; });
  let cerradasSet = $derived(new Set(cerradas));
  $effect(() => { if (ruta && !app.rutas.includes(ruta)) { ruta = ''; insertarTras = null; } });

  function quitar(nombre) {
    confirmar({
      titulo: `Quitar ${nombre}`, detalle: `Deja de ser parada de la línea ${ruta}.`,
      op: 'quitar_parada', args: [ruta, nombre], desc: `Quitó ${nombre} de la línea ${ruta}`,
    });
  }
  function agregar(nueva) {
    if (!insertarTras || !nueva) return;
    const tras = insertarTras;
    const existe = motor().estado(nueva) !== 'NO EXISTE';
    confirmar({
      titulo: `Agregar ${nueva}`,
      detalle: `${existe ? '' : 'Es una estación nueva: se crea en la red. '}Queda en la línea ${ruta} después de ${tras}.`,
      op: 'agregar_parada', args: [ruta, nueva, tras], desc: `Agregó ${nueva} a la línea ${ruta}`,
      ok: () => { insertarTras = null; textoNueva = ''; },
    });
  }
  function eliminarLinea(r) {
    confirmar({
      titulo: `Eliminar la línea ${r}`,
      detalle: `Sus ${recorrido.length} paradas siguen existiendo; solo deja de pasar esta línea. Puedes deshacerlo en Historial.`,
      peligro: true,
      op: 'eliminar_ruta', args: [r], desc: `Eliminó la línea ${r}`,
    });
  }

  // ---------------------------------------------------------------- Historial (R9)
  let pilas = $derived.by(() => { app.version; return historial(); });
  const iconoDe = { CERRAR: 'candado', REABRIR: 'abierto', AGREGAR: 'mas', QUITAR: 'menos', CREAR_ESTACION: 'estaciones', ELIMINAR_ESTACION: 'basura', CREAR_RUTA: 'ruta', ELIMINAR_RUTA: 'basura' };

  function deshacerCambio(c, i) {
    const d = describirCambio(c);
    confirmar({
      titulo: i === 0 ? 'Deshacer el último cambio' : 'Deshacer este cambio',
      detalle: i === 0 ? d : `${d}. Los ${i} cambios posteriores se mantienen.`,
      op: i === 0 ? 'deshacer' : 'deshacer_cambio', args: i === 0 ? [] : [c.id], desc: `Deshizo: ${d}`,
    });
  }
  function rehacerCambio(c, i) {
    const d = describirCambio(c);
    confirmar({
      titulo: 'Rehacer este cambio', detalle: d,
      op: i === 0 ? 'rehacer' : 'rehacer_cambio', args: i === 0 ? [] : [c.id], desc: `Rehízo: ${d}`,
    });
  }
  function restablecerTodo() {
    pedido = {
      titulo: 'Restablecer la red original',
      detalle: `Se borran los ${persistencia.cambios} cambios guardados y el historial. La red vuelve a ser la de los CSV.`,
      peligro: true,
      accion: async (pin) => {
        const r = await restablecer(pin);
        if (r.ok) { avisar('Red original restablecida'); estacion = ''; ruta = ''; }
        return r;
      },
    };
  }
</script>

<header class="cabeza">
  <p class="etiqueta">Operación de la red</p>
  <div class="fila-titulo">
    <h1 class="titulo-grande"><Palabras texto="Admin" /></h1>
    {#if sesion.admin}
      <button class="boton bloquear" onclick={() => { sesion.admin = false; vibrar(); }}><Icono nombre="candado" tam={16} />Bloquear</button>
    {/if}
  </div>
</header>

{#if abriendo}
  <section class="vidrio tarjeta bloqueo aparece" aria-live="polite">
    <Cargando tam={34} />
    <h2 class="titulo">Verificando acceso…</h2>
    <p class="pequeno tenue">Abriendo el panel de administración</p>
  </section>
{:else if !sesion.admin}
  <section class="vidrio tarjeta bloqueo aparece">
    <span class="sello" aria-hidden="true"><Icono nombre="candado" tam={30} grosor={1.8} /></span>
    <h2 class="titulo">Solo para administradores</h2>
    <p class="pequeno tenue">Aquí se crean y eliminan estaciones y líneas, se cierran estaciones, se editan recorridos y se deshacen cambios. Cada cambio pide el PIN y queda guardado.</p>
    <button class="boton boton-primario" onclick={desbloquear} disabled={desbloqueando && !!pedido}><Icono nombre="abierto" tam={18} />Entrar con PIN</button>
    <p class="pin-visible">el PIN es <strong class="num">2523</strong></p>
  </section>
{:else}
  <div class="pestanas-admin">
    <Segmentado etiqueta="Sección del panel" bind:valor={seccion} opciones={[{ id: 'estaciones', texto: 'Estaciones' }, { id: 'lineas', texto: 'Líneas' }, { id: 'historial', texto: `Historial${pilas.hechos.length ? ` · ${pilas.hechos.length}` : ''}` }]} />
  </div>

  {#if seccion === 'estaciones'}
    <div class="grilla">
      <div class="col">
        <section class="vidrio tarjeta">
          <p class="etiqueta">Buscar estación</p>
          <h2 class="titulo">Cerrar, reabrir o eliminar</h2>
          <div class="espacio"><CampoEstacion incluirCerradas placeholder="Buscar estación" bind:valor={textoEstacion} onelegir={(n) => (estacion = n)} /></div>

          {#if info && info.estado !== 'NO EXISTE'}
            <div class="detalle aparece">
              <div class="cabeza-tarjeta">
                <div>
                  <p class="subtitulo">{info.nombre}</p>
                  <p class="mini tenue num">{info.rutas.length} {info.rutas.length === 1 ? 'línea' : 'líneas'} · {formatoNumero(Math.max(0, info.buses))} buses al día</p>
                </div>
                <button class="interruptor" role="switch" aria-checked={info.estado === 'ABIERTA'} aria-label="Estación abierta"
                  onclick={() => alternar(info.nombre, info.estado !== 'ABIERTA')}><span></span></button>
              </div>
              <p class="mini tenue">{info.estado === 'ABIERTA' ? 'Abierta: aparece en búsquedas, ranking y viajes.' : 'Cerrada: no aparece en búsquedas, ranking ni viajes.'}</p>
              {#if info.rutas.length}
                <div class="chips-lineas">{#each info.rutas.slice(0, 18) as r}<ChipRuta ruta={r} />{/each}{#if info.rutas.length > 18}<span class="chip tenue">+{info.rutas.length - 18}</span>{/if}</div>
              {/if}
              <button class="boton peligro" onclick={() => eliminarEstacion(info.nombre, info.rutas.length)}><Icono nombre="basura" tam={18} />Eliminar estación</button>
            </div>
          {/if}

          {#if cerradas.length}
            <p class="etiqueta separado">Cerradas ahora ({cerradas.length})</p>
            <div class="chips">
              {#each cerradas as c (c)}
                <button class="chip cerrada" onclick={() => alternar(c, true)} aria-label="Reabrir {c}">{c}<Icono nombre="abierto" tam={13} grosor={2.2} /></button>
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <section class="vidrio tarjeta">
        <p class="etiqueta">Nueva estación</p>
        <h2 class="titulo">Agregar a la red</h2>
        <label class="campo-etiquetado espacio">
          <span class="mini tenue">Nombre</span>
          <input class="campo" bind:value={nuevaEstacion} placeholder="Ej. CALLE 200" style="text-transform: uppercase" autocapitalize="characters" autocomplete="off" spellcheck="false"
            onkeydown={(e) => e.key === 'Enter' && crearEstacion()} />
        </label>
        {#if yaExiste}<p class="mini aviso-error">Ya existe una estación con ese nombre.</p>{/if}
        <p class="mini tenue nota">Se guarda en mayúsculas y sin repetir. Para que pasen buses, agrégala a una línea en “Líneas”.</p>
        <button class="boton boton-primario ancho" onclick={crearEstacion} disabled={!nombreNueva || yaExiste}><Icono nombre="mas" tam={18} />Crear estación</button>
      </section>
    </div>

  {:else if seccion === 'lineas'}
    <div class="grilla">
      <section class="vidrio tarjeta">
        <p class="etiqueta">Líneas</p>
        <h2 class="titulo">Editar o eliminar</h2>
        <input class="campo espacio" placeholder="Buscar línea, ej. B7 o 86" bind:value={filtroRuta} autocapitalize="characters" aria-label="Filtrar líneas" />
        <div class="carrusel" role="group" aria-label="Líneas">
          {#each rutasFiltradas as r (r)}
            <button class="ruta-boton" aria-pressed={r === ruta} onclick={() => { ruta = r; insertarTras = null; }}><ChipRuta ruta={r} consulta={normalizar(filtroRuta)} /></button>
          {/each}
        </div>

        {#if ruta}
          <div class="cabeza-tarjeta separado">
            <div class="fila-chip"><ChipRuta ruta={ruta} grande /><span class="pequeno tenue num">{recorrido.length} paradas</span></div>
            <Segmentado etiqueta="Sentido" valor={alReves ? 'reves' : 'ida'} onelegir={(v) => (alReves = v === 'reves')} opciones={[{ id: 'ida', texto: 'Ida' }, { id: 'reves', texto: 'Al revés' }]} />
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

          {#if recorrido.length}
            <LineaRuta color={colorRuta(ruta)} acciones={botones}
              paradas={recorrido.map((n) => ({ nombre: n, cerrada: cerradasSet.has(n), nota: insertarTras === n ? 'Agregar después de esta' : '' }))} />
          {:else}
            <p class="tenue pequeno separado">Esta línea no tiene paradas.</p>
          {/if}

          {#if insertarTras}
            <div class="insertar vidrio aparece">
              <p class="pequeno"><strong>Nueva parada</strong> después de {insertarTras}</p>
              <CampoEstacion permitirNueva autofoco placeholder="Estación existente o nueva" bind:valor={textoNueva} onelegir={agregar} />
              <button class="boton" onclick={() => (insertarTras = null)}>Cancelar</button>
            </div>
          {/if}

          <button class="boton peligro separado" onclick={() => eliminarLinea(ruta)}><Icono nombre="basura" tam={18} />Eliminar línea {ruta}</button>
        {:else}
          <p class="tenue pequeno separado">Elige una línea para ver su recorrido, agregar o quitar paradas, o eliminarla.</p>
        {/if}
      </section>

      <section class="vidrio tarjeta">
        <p class="etiqueta">Nueva línea</p>
        <h2 class="titulo">Crear con sus horarios</h2>
        <label class="campo-etiquetado espacio">
          <span class="mini tenue">Código de la línea</span>
          <input class="campo" bind:value={nombreLinea} placeholder="Ej. K99" style="text-transform: uppercase" autocapitalize="characters" autocomplete="off" spellcheck="false" />
        </label>
        {#if lineaExiste}<p class="mini aviso-error">Ya existe una línea {codigoLinea}.</p>{/if}

        <p class="etiqueta separado">Paradas en orden ({paradasNueva.length})</p>
        {#if paradasNueva.length}
          <ol class="paradas-nueva">
            {#each paradasNueva as p, i (p)}
              <li class="aparece">
                <span class="orden num" style="--c:{codigoLinea ? colorRuta(codigoLinea) : 'var(--rojo)'}">{i + 1}</span>
                <span class="nombre-parada">{p}</span>
                <span class="acciones">
                  <button class="mini-boton" aria-label="Subir {p}" disabled={i === 0} onclick={() => moverParada(i, -1)}><Icono nombre="subir" tam={16} grosor={2.4} /></button>
                  <button class="mini-boton" aria-label="Bajar {p}" disabled={i === paradasNueva.length - 1} onclick={() => moverParada(i, 1)}><Icono nombre="bajar" tam={16} grosor={2.4} /></button>
                  <button class="mini-boton quitar" aria-label="Quitar {p}" onclick={() => (paradasNueva = paradasNueva.filter((x) => x !== p))}><Icono nombre="cerrar" tam={14} grosor={2.4} /></button>
                </span>
              </li>
            {/each}
          </ol>
        {/if}
        <div class="espacio"><CampoEstacion placeholder={paradasNueva.length ? 'Agregar otra parada' : 'Primera parada'} bind:valor={textoParada} onelegir={agregarParadaNueva} /></div>

        <p class="etiqueta separado">Horario</p>
        <div class="horario">
          <label class="campo-etiquetado"><span class="mini tenue">Primer bus</span><input class="campo num" type="time" bind:value={primera} /></label>
          <label class="campo-etiquetado"><span class="mini tenue">Último bus</span><input class="campo num" type="time" bind:value={ultima} /></label>
          <label class="campo-etiquetado"><span class="mini tenue">Un bus cada (min)</span><input class="campo num" type="number" inputmode="numeric" min="1" max="720" bind:value={frecuencia} /></label>
          <label class="campo-etiquetado"><span class="mini tenue">Min. entre paradas</span><input class="campo num" type="number" inputmode="numeric" min="0" max="120" bind:value={entre} /></label>
        </div>
        <p class="mini tenue nota num">
          {#if busesDia > 0}{formatoNumero(busesDia)} buses al día{#if paradasNueva.length >= 2} · recorrido completo de {duracion((paradasNueva.length - 1) * (Number(entre) || 0))}{/if}{:else}Revisa el horario{/if}
        </p>
        <button class="boton boton-primario ancho" onclick={crearLinea} disabled={!lineaValida}><Icono nombre="ruta" tam={18} />Crear línea</button>
      </section>
    </div>

  {:else}
    <div class="grilla">
      <section class="vidrio tarjeta">
        <div class="cabeza-tarjeta">
          <div><p class="etiqueta">Pila de deshacer</p><h2 class="titulo">Cambios aplicados</h2></div>
          <span class="chip num">{pilas.hechos.length}</span>
        </div>
        <p class="mini tenue explica">Cada cambio se apila: el de arriba es el más reciente. Puedes deshacer cualquiera; los que vinieron después se mantienen.</p>
        {#if pilas.hechos.length === 0}
          <p class="tenue pequeno vacio">Aún no hay cambios.</p>
        {:else}
          <ol class="historial">
            {#each pilas.hechos as c, i (c.id)}
              <li class="aparece">
                <span class="ico tipo-{c.tipo}"><Icono nombre={iconoDe[c.tipo] ?? 'info'} tam={16} grosor={2.2} /></span>
                <span class="texto-cambio">
                  <span class="desc">{describirCambio(c)}</span>
                  <span class="mini tenue num">{c.rehecho ? `Rehecho ${fechaCorta(c.rehecho)}` : fechaCorta(c.hecho)}{i === 0 ? ' · último' : ''}</span>
                </span>
                <button class="boton chico" onclick={() => deshacerCambio(c, i)}><Icono nombre="deshacer" tam={15} />Deshacer</button>
              </li>
            {/each}
          </ol>
        {/if}
      </section>

      <div class="col">
        <section class="vidrio tarjeta">
          <div class="cabeza-tarjeta">
            <div><p class="etiqueta">Pila de rehacer</p><h2 class="titulo">Cambios deshechos</h2></div>
            <span class="chip num">{pilas.deshechos.length}</span>
          </div>
          <p class="mini tenue explica">Hacer un cambio nuevo vacía esta pila, como un Ctrl+Z.</p>
          {#if pilas.deshechos.length === 0}
            <p class="tenue pequeno vacio">Nada para rehacer.</p>
          {:else}
            <ol class="historial">
              {#each pilas.deshechos as c, i (c.id)}
                <li class="aparece deshecho">
                  <span class="ico"><Icono nombre={iconoDe[c.tipo] ?? 'info'} tam={16} grosor={2.2} /></span>
                  <span class="texto-cambio">
                    <span class="desc">{describirCambio(c)}</span>
                    <span class="mini tenue num">Deshecho {fechaCorta(c.deshecho)}</span>
                  </span>
                  <button class="boton chico" onclick={() => rehacerCambio(c, i)}><Icono nombre="rehacer" tam={15} />Rehacer</button>
                </li>
              {/each}
            </ol>
          {/if}
        </section>

        <section class="vidrio tarjeta guardado">
          <p class="etiqueta">Guardado</p>
          <p class="pequeno">
            {#if persistencia.guardado}
              {persistencia.cambios ? `${persistencia.cambios} ${persistencia.cambios === 1 ? 'cambio guardado' : 'cambios guardados'} en este dispositivo: siguen ahí al recargar.` : 'La red está igual que en los CSV.'}
            {:else}
              Este navegador no deja guardar (¿modo privado?): los cambios se pierden al recargar.
            {/if}
          </p>
          <button class="boton peligro" onclick={restablecerTodo} disabled={persistencia.cambios === 0}><Icono nombre="historial" tam={18} />Restablecer red original</button>
        </section>
      </div>
    </div>
  {/if}
{/if}

{#if pedido}
  <TecladoPin titulo={pedido.titulo} detalle={pedido.detalle} peligro={pedido.peligro} accion={pedido.accion}
    oncerrar={() => { pedido = null; desbloqueando = false; }} />
{/if}

<style>
  .pin-visible { margin-top: 6px; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.15; text-align: center; }
  .pin-visible strong { display: block; font-size: 36px; font-weight: 800; letter-spacing: 0.08em; color: var(--rojo); }

  .cabeza { padding: 8px 4px 18px; }
  .fila-titulo { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .bloquear { gap: 6px; min-height: 36px; padding: 0 14px; font-size: 14px; }
  .pestanas-admin { display: flex; justify-content: center; margin: -4px 0 16px; }
  .pestanas-admin :global(.seg) { width: 100%; max-width: 460px; }
  .pestanas-admin :global(.seg button) { flex: 1; }
  .grilla, .col { display: grid; gap: 14px; align-content: start; }
  .grilla :global(.tarjeta + .tarjeta), .col :global(.tarjeta + .tarjeta) { margin-top: 0; }
  .espacio { margin-top: 12px; }
  .separado { margin-top: 18px; }
  .nota { margin: 10px 0 14px; }
  .ancho { width: 100%; }

  .bloqueo { display: grid; justify-items: center; text-align: center; gap: 12px; padding: 34px 22px; max-width: 520px; margin: 0 auto; }
  .bloqueo p { max-width: 40ch; }
  .sello { width: 68px; height: 68px; border-radius: 22px; display: grid; place-content: center; background: var(--rojo); color: #fff; box-shadow: 0 10px 26px rgba(227, 0, 27, 0.32); }

  .detalle { margin-top: 16px; padding: 14px; border-radius: 18px; background: var(--relleno); display: grid; gap: 10px; }
  .detalle .cabeza-tarjeta { margin-bottom: 0; }
  .chips-lineas { display: flex; flex-wrap: wrap; gap: 5px; }
  .boton.peligro { color: var(--rojo); gap: 8px; justify-self: start; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip.cerrada { color: var(--tenue); gap: 6px; transition: transform 160ms var(--salida); }
  .chip.cerrada:active { transform: scale(0.96); }
  .campo-etiquetado { display: grid; gap: 5px; }
  .aviso-error { color: var(--rojo); margin-top: 6px; font-weight: 600; }

  /* interruptor estilo iOS */
  .interruptor { width: 51px; height: 31px; border-radius: 999px; background: var(--relleno-2); position: relative; flex: none; transition: background-color 200ms ease; }
  .interruptor span { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.16); transition: transform 280ms var(--cajon); }
  .interruptor[aria-checked='true'] { background: var(--verde); }
  .interruptor[aria-checked='true'] span { transform: translateX(20px); }

  .carrusel {
    display: flex; gap: 6px; overflow-x: auto; padding: 12px 4px 6px;
    scroll-snap-type: x proximity; scroll-padding-inline: 4px; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(90deg, #000 85%, transparent);
    mask-image: linear-gradient(90deg, #000 85%, transparent);
  }
  .carrusel::-webkit-scrollbar { display: none; }
  .ruta-boton { flex: none; scroll-snap-align: start; border-radius: 9px; padding: 2px; transition: transform 160ms var(--salida), box-shadow 160ms ease; }
  .ruta-boton:active { transform: scale(0.95); }
  .ruta-boton[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--fondo), 0 0 0 4px var(--tinta); }
  .fila-chip { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
  .acciones { display: flex; gap: 6px; flex: none; }
  .mini-boton { width: 34px; height: 34px; border-radius: 50%; display: grid; place-content: center; background: var(--relleno); color: var(--azul); transition: transform 160ms var(--salida), opacity 160ms; }
  .mini-boton:active:not(:disabled) { transform: scale(0.92); }
  .mini-boton:disabled { opacity: 0.35; }
  .mini-boton.quitar { color: var(--rojo); }
  .insertar { margin-top: 14px; padding: 14px; border-radius: 18px; display: grid; gap: 10px; }
  .insertar .boton { justify-self: start; }

  .paradas-nueva { list-style: none; display: grid; gap: 6px; margin-top: 8px; }
  .paradas-nueva li { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 8px; border-radius: 14px; background: var(--relleno); }
  .orden { width: 24px; height: 24px; border-radius: 50%; display: grid; place-content: center; font-size: 12px; font-weight: 700; color: #fff; background: var(--c); flex: none; }
  .nombre-parada { flex: 1; min-width: 0; font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .horario { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }

  .explica { margin: -4px 0 10px; }
  .vacio { padding: 10px 0 4px; }
  .historial { list-style: none; display: grid; gap: 2px; }
  .historial li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 0.5px solid var(--separador); }
  .historial li:first-child { border-top: 0; }
  .ico { width: 32px; height: 32px; border-radius: 10px; display: grid; place-content: center; flex: none; background: var(--azul-suave, var(--relleno)); color: var(--azul); }
  .ico.tipo-ELIMINAR_ESTACION, .ico.tipo-ELIMINAR_RUTA, .ico.tipo-QUITAR, .ico.tipo-CERRAR { background: var(--rojo-suave); color: var(--rojo); }
  .ico.tipo-CREAR_ESTACION, .ico.tipo-CREAR_RUTA, .ico.tipo-REABRIR { background: var(--verde-suave); color: var(--verde); }
  .deshecho .ico { background: var(--relleno); color: var(--tenue); }
  .deshecho .desc { color: var(--tenue); }
  .texto-cambio { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .desc { font-size: 15px; font-weight: 600; line-height: 1.3; }
  .boton.chico { min-height: 34px; padding: 0 12px; font-size: 13.5px; gap: 5px; flex: none; }
  .guardado { display: grid; gap: 10px; }

  @media (min-width: 980px) {
    .grilla { grid-template-columns: 1.1fr 1fr; gap: 20px; }
  }
</style>
