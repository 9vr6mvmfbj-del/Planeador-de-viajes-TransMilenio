<script>
  // Probar el contrato del motor a mano: cada llamada de R1 a R10 con sus argumentos y lo que devuelve,
  // escrito como lo devolvería Python (None, True, listas y tuplas), para comprobar los resultados sobre
  // la red cargada.  La app no calcula nada: solo llama al motor.
  import { app, motor, huboCambio } from '../lib/estado.svelte.js';

  const s = (v) => "'" + String(v).replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";
  const lista = (v) => '[' + v.join(', ') + ']';
  const bool = (b) => (b ? 'True' : 'False');

  // tipo de cada argumento: 's' texto, 'i' entero, 'b' sí/no, 'l' lista de enteros
  const METODOS = [
    { id: 'estado', req: 'R1', args: [['nombre', 's', 'RICAURTE']], llamar: (m, a) => s(m.estado(a[0])) },
    { id: 'autocompletar', req: 'R2', args: [['prefijo', 's', 'CALLE'], ['k', 'i', 5]], llamar: (m, a) => lista(m.autocompletar(a[0], a[1]).map(s)) },
    { id: 'rango', req: 'R3', args: [['desde', 's', 'CALLE 26'], ['hasta', 's', 'CALLE 80']], llamar: (m, a) => lista(m.rango(a[0], a[1]).map(s)) },
    { id: 'proximo_bus', req: 'R4', args: [['estacion', 's', ''], ['ruta', 's', ''], ['hora', 's', '08:30']], llamar: (m, a) => { const b = m.proximo_bus(a[0], a[1], a[2]); return b === null ? 'None' : s(b); } },
    { id: 'viaje', req: 'R5', args: [['origen', 's', 'PORTAL NORTE'], ['destino', 's', 'PORTAL SUR']], llamar: (m, a) => {
        const v = m.viaje(a[0], a[1]);
        return v.encontrado && v.tramos.length ? lista(v.tramos.map((t) => `(${s(t.ruta)}, ${s(t.sube)}, ${s(t.baja)})`)) : 'None';
      } },
    { id: 'ranking', req: 'R6', args: [['k', 'i', 5]], llamar: (m, a) => lista(m.ranking(a[0]).map((r) => `(${s(r.nombre)}, ${r.buses})`)) },
    { id: 'agregar_parada', req: 'R7', cambia: true, args: [['ruta', 's', ''], ['nueva', 's', ''], ['despues_de', 's', '']], llamar: (m, a) => bool(m.agregar_parada(a[0], a[1], a[2])) },
    { id: 'quitar_parada', req: 'R7', cambia: true, args: [['ruta', 's', ''], ['estacion', 's', '']], llamar: (m, a) => bool(m.quitar_parada(a[0], a[1])) },
    { id: 'recorrido', req: 'R7', args: [['ruta', 's', ''], ['al_reves', 'b', false]], llamar: (m, a) => lista(m.recorrido(a[0], a[1]).map(s)) },
    { id: 'cerrar', req: 'R8', cambia: true, args: [['nombre', 's', '']], llamar: (m, a) => bool(m.cerrar(a[0])) },
    { id: 'reabrir', req: 'R8', cambia: true, args: [['nombre', 's', '']], llamar: (m, a) => bool(m.reabrir(a[0])) },
    { id: 'deshacer', req: 'R9', cambia: true, args: [], llamar: (m) => bool(m.deshacer()) },
    { id: 'rehacer', req: 'R9', cambia: true, args: [], llamar: (m) => bool(m.rehacer()) },
    { id: 'simular_fila', req: 'R10', fuera: true, args: [['llegadas', 'l', '30, 5, 5, 70'], ['frecuencia', 'i', 60], ['capacidad', 'i', 2]], llamar: (m, a) => {
        const r = m.simular_fila(a[0], a[1], a[2]);
        return r.length > 60 ? `[${r.slice(0, 60).join(', ')}, … ${r.length} valores]` : lista(r);
      } },
  ];

  let elegido = $state(0);
  let valores = $state(METODOS.map((m) => m.args.map((a) => a[2])));
  let historial = $state(/** @type {{ llamada: string, resultado: string }[]} */ ([]));

  let metodo = $derived(METODOS[elegido]);

  const comoLista = (t) => String(t).split(/[\s,;\[\]]+/).filter((x) => x !== '').map(Number).filter((x) => Number.isFinite(x));
  const texto = (m, a) => `${m.fuera ? '' : 'red.'}${m.id}(${m.args.map((x, i) => x[1] === 's' ? s(a[i]) : x[1] === 'b' ? bool(a[i]) : x[1] === 'l' ? '[' + comoLista(a[i]).join(', ') + ']' : a[i]).join(', ')})`;

  function ejecutar() {
    const m = metodo;
    const crudos = valores[elegido];
    const a = m.args.map((x, i) => x[1] === 'i' ? Number(crudos[i]) : x[1] === 'l' ? comoLista(crudos[i]) : crudos[i]);
    let resultado;
    try { resultado = m.llamar(motor(), a); } catch (e) { resultado = 'Error: ' + e; }
    if (m.cambia) huboCambio();
    historial = [{ llamada: texto(m, crudos), resultado }, ...historial].slice(0, 12);
  }
</script>

<section class="vidrio tarjeta contrato" aria-labelledby="titulo-contrato">
  <p class="etiqueta">R1 a R10 · a mano</p>
  <h2 class="titulo" id="titulo-contrato">Probar el contrato del motor</h2>
  <p class="pequeno tenue">
    Red cargada: <strong class="num">{app.resumen.estaciones.toLocaleString('es-CO')}</strong> estaciones,
    <strong class="num">{app.resumen.rutas.toLocaleString('es-CO')}</strong> rutas y
    <strong class="num">{app.resumen.horarios.toLocaleString('es-CO')}</strong> horarios. Cada llamada va directo al motor
    y muestra lo que devuelve como en Python (<code>None</code>, <code>True</code>, listas y tuplas).
  </p>
  <div class="formulario">
    <label class="campo-etiqueta">
      <span class="mini tenue">Método</span>
      <select class="campo" bind:value={elegido}>
        {#each METODOS as m, i}<option value={i}>{m.req} · {m.fuera ? '' : 'red.'}{m.id}({m.args.map((a) => a[0]).join(', ')})</option>{/each}
      </select>
    </label>
    {#each metodo.args as a, i (metodo.id + a[0])}
      <label class="campo-etiqueta">
        <span class="mini tenue">{a[0]}{a[1] === 'l' ? ' (segundos, separados por coma)' : ''}</span>
        {#if a[1] === 'b'}
          <input type="checkbox" bind:checked={valores[elegido][i]} />
        {:else}
          <input class="campo" type={a[1] === 'i' ? 'number' : 'text'} autocomplete="off" autocapitalize="characters" spellcheck="false" bind:value={valores[elegido][i]} />
        {/if}
      </label>
    {/each}
    <button class="boton boton-primario" onclick={ejecutar}>Ejecutar</button>
    {#if metodo.cambia}<p class="mini tenue">Este cambio vive solo en esta sesión: no se guarda como los del Admin.</p>{/if}
  </div>

  {#if historial.length}
    <ul class="salidas" aria-live="polite">
      {#each historial as h}
        <li><code class="llamada">{h.llamada}</code><code class="valor">→ {h.resultado}</code></li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .contrato { display: grid; gap: 12px; margin-top: 14px; }
  .formulario { display: grid; gap: 10px; }
  .campo-etiqueta { display: grid; gap: 4px; }
  .salidas { list-style: none; display: grid; gap: 8px; }
  .salidas li { display: grid; gap: 2px; padding: 8px 10px; border-radius: 12px; background: var(--relleno); overflow-wrap: anywhere; }
  .llamada { font-size: 13px; color: var(--tenue); }
  .valor { font-size: 14px; font-weight: 600; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  @media (min-width: 720px) { .formulario { grid-template-columns: repeat(2, 1fr); align-items: end; } .formulario :global(.boton-primario) { justify-self: start; } }
</style>
