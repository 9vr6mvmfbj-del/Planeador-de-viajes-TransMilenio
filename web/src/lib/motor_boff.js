// Puente JavaScript del motor en C++ compilado a WebAssembly (web/public/motor.wasm).
// La app solo llama a estos métodos; toda la lógica de R1-R10 vive en el motor (C++).
//
//   const red = await cargarMotor('/motor.wasm');
//   red.cargar(textoEstaciones, textoRutas, textoHorarios);
//   red.estado('RICAURTE')  // 'ABIERTA'

export async function cargarMotor(origen) {
  let bytes;
  if (typeof origen === 'string') {
    const resp = await fetch(origen);
    bytes = await resp.arrayBuffer();
  } else {
    bytes = origen; // ArrayBuffer / Uint8Array (útil en Node para las pruebas)
  }

  let memoria = null;
  const codificador = new TextEncoder();
  const decodificador = new TextDecoder();
  const ahora = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

  // El motor solo necesita 4 funciones del sistema (WASI). Se implementan aquí mismo.
  const wasi = {
    clock_time_get(_id, _precision, ptr) {
      const ns = BigInt(Math.round(ahora() * 1e6));
      new DataView(memoria.buffer).setBigUint64(ptr, ns, true);
      return 0;
    },
    fd_write(_fd, iovs, n, escritos) {
      const dv = new DataView(memoria.buffer);
      let total = 0;
      let texto = '';
      for (let i = 0; i < n; i++) {
        const p = dv.getUint32(iovs + i * 8, true);
        const len = dv.getUint32(iovs + i * 8 + 4, true);
        texto += decodificador.decode(new Uint8Array(memoria.buffer, p, len));
        total += len;
      }
      if (texto.trim()) console.log('[motor]', texto.trimEnd());
      dv.setUint32(escritos, total, true);
      return 0;
    },
    fd_close() { return 0; },
    fd_seek() { return 0; },
  };

  const { instance } = await WebAssembly.instantiate(bytes, { wasi_snapshot_preview1: wasi });
  const m = instance.exports;
  memoria = m.memory;
  if (m.__wasm_call_ctors) m.__wasm_call_ctors(); // inicializa la librería de C++

  // Pasa un texto de JS a la memoria del motor (UTF-8, terminado en 0).
  function texto(s) {
    const b = codificador.encode(String(s ?? ''));
    const p = m.malloc(b.length + 1);
    const vista = new Uint8Array(memoria.buffer, p, b.length + 1);
    vista.set(b);
    vista[b.length] = 0;
    return p;
  }
  // Lee el texto (JSON) que devolvió el motor.
  function leer(p) {
    const mem = new Uint8Array(memoria.buffer);
    let fin = p;
    while (mem[fin] !== 0) fin++;
    return JSON.parse(decodificador.decode(mem.subarray(p, fin)));
  }
  // Llama una función del motor convirtiendo los argumentos de texto.
  function llamar(fn, ...args) {
    const punteros = [];
    const reales = args.map((a) => {
      if (typeof a === 'number' || typeof a === 'boolean') return Number(a);
      const p = texto(a);
      punteros.push(p);
      return p;
    });
    try {
      return leer(fn(...reales));
    } finally {
      punteros.forEach((p) => m.free(p));
    }
  }

  // Escribe las llegadas (enteros de 32 bits) en la memoria del motor y llama a la función.
  function conLlegadas(fn, llegadas, frecuencia, capacidad) {
    const n = llegadas.length;
    const p = m.malloc(Math.max(1, n) * 4);
    new Int32Array(memoria.buffer, p, n).set(llegadas);
    try {
      return leer(fn(p, n, frecuencia, capacidad));
    } finally {
      m.free(p);
    }
  }

  return {
    cargar: (estaciones, rutas, horarios) => llamar(m.m_cargar, estaciones, rutas, horarios),
    resumen: () => leer(m.m_resumen()),

    // ---- contrato (R1-R9), mismos nombres que el enunciado ----
    estado: (nombre) => llamar(m.m_estado, nombre),
    autocompletar: (prefijo, k) => llamar(m.m_autocompletar, prefijo, k),
    rango: (desde, hasta) => llamar(m.m_rango, desde, hasta),
    proximo_bus: (estacion, ruta, hora) => llamar(m.m_proximo_bus, estacion, ruta, hora),
    viaje: (origen, destino) => llamar(m.m_viaje, origen, destino),
    ranking: (k) => llamar(m.m_ranking, k),
    agregar_parada: (ruta, nueva, despues_de) => llamar(m.m_agregar_parada, ruta, nueva, despues_de),
    quitar_parada: (ruta, estacion) => llamar(m.m_quitar_parada, ruta, estacion),
    recorrido: (ruta, al_reves = false) => llamar(m.m_recorrido, ruta, al_reves ? 1 : 0),
    cerrar: (nombre) => llamar(m.m_cerrar, nombre),
    reabrir: (nombre) => llamar(m.m_reabrir, nombre),
    deshacer: () => leer(m.m_deshacer()),
    rehacer: () => leer(m.m_rehacer()),

    // ---- R10: función suelta ----
    // llegadas y frecuencia en segundos; devuelve el segundo de salida de cada pasajero (mismo orden).
    simular_fila(llegadas, frecuencia, capacidad) { return conLlegadas(m.m_simular_fila, llegadas, frecuencia, capacidad); },
    // Solo para la pantalla de la fila: resumen de la misma simulación (segundos).
    resumen_fila(llegadas, frecuencia, capacidad) { return conLlegadas(m.m_resumen_fila, llegadas, frecuencia, capacidad); },

    // ---- extras para la app ----
    estacion: (nombre) => llamar(m.m_estacion, nombre),
    horarios: (estacion, ruta) => llamar(m.m_horarios, estacion, ruta),
    rutas: () => leer(m.m_rutas()),
    cerradas: () => leer(m.m_cerradas()),
    rendimiento: (maxEscala = 8, consultas = 20000) => leer(m.m_rendimiento(maxEscala, consultas)),

    // ---- panel de admin (también entran a deshacer/rehacer) ----
    crear_estacion: (nombre) => llamar(m.m_crear_estacion, nombre),
    eliminar_estacion: (nombre) => llamar(m.m_eliminar_estacion, nombre),
    crear_ruta: (ruta, paradas, primera, ultima, frecuencia, entre) =>
      llamar(m.m_crear_ruta, ruta, paradas.join('|'), primera, ultima, frecuencia, entre),
    eliminar_ruta: (ruta) => llamar(m.m_eliminar_ruta, ruta),
    deshacer_cambio: (i) => leer(m.m_deshacer_cambio(i)),
    rehacer_cambio: (i) => leer(m.m_rehacer_cambio(i)),
    historial: () => leer(m.m_historial()),
    error: () => leer(m.m_error()),
  };
}
