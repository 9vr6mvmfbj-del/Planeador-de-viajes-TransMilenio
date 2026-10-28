import {
  TablaHash,
  ListaDobleRuta,
  Pila,
  mergeSort,
  busquedaBinariaLimiteInferior,
} from './estructuras';
import { ESTACIONES_ESQUEMATICAS, RUTAS_INICIALES, TRONCALES_BOGOTA } from './datosBogota';

export interface InfoEstacionRed {
  nombre: string;
  troncal: string;
  nombreTroncal: string;
  colorTroncal: string;
  abierta: boolean;
  busesDia: number;
  esPortal: boolean;
  esIntercambio: boolean;
  rutasQueParan: string[];
}

export interface PlanViaje {
  tipo: 'DIRECTO' | 'TRANSBORDO';
  rutas: string[];
  transbordo: string | null;
  paradas: string[];
  tramo1Paradas: string[];
  tramo2Paradas: string[];
  totalParadas: number;
  tiempoEstimadoMin: number;
}

export interface AccionOperador {
  tipo: 'CERRAR' | 'REABRIR' | 'AGREGAR_PARADA' | 'QUITAR_PARADA';
  descripcion: string;
  timestamp: string;
  estacion?: string;
  ruta?: string;
  nuevaParada?: string;
  despuesDe?: string | null;
}

export function horaAMinutos(horaStr: string): number {
  const limpio = horaStr.trim();
  const partes = limpio.split(':');
  if (partes.length !== 2) return 0;
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutosAHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

export class RedTransMilenio {
  private estacionesHash = new TablaHash<InfoEstacionRed>(256);
  private nombresEstacionesOrd: string[] = [];
  private rutasHash = new TablaHash<ListaDobleRuta>(64);
  private nombresRutasOrd: string[] = [];
  private horariosHash = new TablaHash<Array<{ min: number; hora: string }>>(512);
  private pilaDeshacer = new Pila<AccionOperador>();
  private pilaRehacer = new Pila<AccionOperador>();
  private rankingCache: InfoEstacionRed[] | null = null;

  constructor() {
    this.inicializarRedBogota();
  }

  private inicializarRedBogota(): void {
    const mapaTroncales = new TablaHash<{ nombre: string; color: string }>(32);
    for (let i = 0; i < TRONCALES_BOGOTA.length; i++) {
      const t = TRONCALES_BOGOTA[i];
      mapaTroncales.insertar(t.codigo, { nombre: t.nombre, color: t.color });
    }

    const listaNombres: string[] = [];
    for (let i = 0; i < ESTACIONES_ESQUEMATICAS.length; i++) {
      const e = ESTACIONES_ESQUEMATICAS[i];
      const nom = e.nombre.trim().toUpperCase();
      if (!this.estacionesHash.contiene(nom)) {
        const infoT = mapaTroncales.obtener(e.troncal) || {
          nombre: 'Troncal General',
          color: '#E30613',
        };
        this.estacionesHash.insertar(nom, {
          nombre: nom,
          troncal: e.troncal,
          nombreTroncal: infoT.nombre,
          colorTroncal: infoT.color,
          abierta: true,
          busesDia: 0,
          esPortal: Boolean(e.esPortal),
          esIntercambio: Boolean(e.esIntercambio),
          rutasQueParan: [],
        });
        listaNombres.push(nom);
      }
    }

    this.nombresEstacionesOrd = mergeSort(listaNombres, (a, b) => a < b);

    const listaRutas: string[] = [];
    for (let i = 0; i < RUTAS_INICIALES.length; i++) {
      const r = RUTAS_INICIALES[i];
      const rNom = r.ruta.trim().toUpperCase();
      const listaDoble = new ListaDobleRuta();
      for (let j = 0; j < r.paradas.length; j++) {
        const estNom = r.paradas[j].trim().toUpperCase();
        if (!this.estacionesHash.contiene(estNom)) {
          this.estacionesHash.insertar(estNom, {
            nombre: estNom,
            troncal: r.troncalOrigen,
            nombreTroncal: 'Troncal Red',
            colorTroncal: '#E30613',
            abierta: true,
            busesDia: 0,
            esPortal: false,
            esIntercambio: false,
            rutasQueParan: [],
          });
          this.nombresEstacionesOrd.push(estNom);
          this.nombresEstacionesOrd = mergeSort(this.nombresEstacionesOrd, (a, b) => a < b);
        }
        listaDoble.agregarAlFinal(estNom);

        // Generar horarios realistas desde las 04:30 hasta las 25:15 (GTFS extendido)
        const claveRE = `${estNom}|${rNom}`;
        const arrHorarios: Array<{ min: number; hora: string }> = [];
        // Cada parada tiene un desfase de 3 minutos respecto a la anterior
        const desfase = j * 3;
        // Frecuencia cada 7 a 12 minutos segun ruta
        const paso = 7 + (i % 5);
        for (let m = 270 + desfase; m <= 1515; m += paso) {
          arrHorarios.push({ min: m, hora: minutosAHora(m) });
        }
        const ordHorarios = mergeSort(arrHorarios, (a, b) => a.min < b.min);
        this.horariosHash.insertar(claveRE, ordHorarios);

        const infoEst = this.estacionesHash.obtener(estNom);
        if (infoEst !== null) {
          infoEst.busesDia += ordHorarios.length;
          let yaEsta = false;
          for (let k = 0; k < infoEst.rutasQueParan.length; k++) {
            if (infoEst.rutasQueParan[k] === rNom) {
              yaEsta = true;
              break;
            }
          }
          if (!yaEsta) {
            infoEst.rutasQueParan.push(rNom);
          }
        }
      }
      this.rutasHash.insertar(rNom, listaDoble);
      listaRutas.push(rNom);
    }

    this.nombresRutasOrd = mergeSort(listaRutas, (a, b) => a < b);
  }

  private recalcularRutasEnEstaciones(): void {
    for (let i = 0; i < this.nombresEstacionesOrd.length; i++) {
      const est = this.estacionesHash.obtener(this.nombresEstacionesOrd[i]);
      if (est !== null) {
        est.rutasQueParan = [];
        est.busesDia = 0;
      }
    }
    for (let i = 0; i < this.nombresRutasOrd.length; i++) {
      const rNom = this.nombresRutasOrd[i];
      const lista = this.rutasHash.obtener(rNom);
      if (lista !== null) {
        const paradas = lista.recorrer(false);
        for (let j = 0; j < paradas.length; j++) {
          const estNom = paradas[j];
          const info = this.estacionesHash.obtener(estNom);
          if (info !== null) {
            info.rutasQueParan.push(rNom);
            const h = this.horariosHash.obtener(`${estNom}|${rNom}`);
            info.busesDia += h ? h.length : 110;
          }
        }
      }
    }
    this.rankingCache = null;
  }

  // R1: Buscar una estacion exacta en O(1) promedio (Tabla Hash)
  estado(nombre: string): 'ABIERTA' | 'CERRADA' | 'NO EXISTE' {
    const nom = nombre.trim().toUpperCase();
    const info = this.estacionesHash.obtener(nom);
    if (info === null) return 'NO EXISTE';
    return info.abierta ? 'ABIERTA' : 'CERRADA';
  }

  obtenerDetalleEstacion(nombre: string): InfoEstacionRed | null {
    const nom = nombre.trim().toUpperCase();
    return this.estacionesHash.obtener(nom);
  }

  // R2: Autocompletar hasta k estaciones abiertas por prefijo en orden alfabetico
  autocompletar(prefijo: string, k: number): string[] {
    const pref = prefijo.trim().toUpperCase();
    if (k <= 0) return [];
    let idx = busquedaBinariaLimiteInferior(this.nombresEstacionesOrd, pref);
    const resultado: string[] = [];
    const n = this.nombresEstacionesOrd.length;
    while (idx < n && resultado.length < k) {
      const candidato = this.nombresEstacionesOrd[idx];
      if (!candidato.startsWith(pref)) {
        break;
      }
      const info = this.estacionesHash.obtener(candidato);
      if (info !== null && info.abierta) {
        resultado.push(candidato);
      }
      idx++;
    }
    return resultado;
  }

  // R3: Listar estaciones abiertas en un rango alfabetico [desde, hasta] inclusive
  rango(desde: string, hasta: string): string[] {
    const d = desde.trim().toUpperCase();
    const h = hasta.trim().toUpperCase();
    if (d === '' || h === '' || d > h) return [];
    let idx = busquedaBinariaLimiteInferior(this.nombresEstacionesOrd, d);
    const resultado: string[] = [];
    const n = this.nombresEstacionesOrd.length;
    while (idx < n) {
      const actual = this.nombresEstacionesOrd[idx];
      if (actual > h) break;
      const info = this.estacionesHash.obtener(actual);
      if (info !== null && info.abierta) {
        resultado.push(actual);
      }
      idx++;
    }
    return resultado;
  }

  // R4: Proximo bus usando Busqueda Binaria manual O(log H)
  proximoBus(estacion: string, ruta: string, hora: string): string | null {
    const est = estacion.trim().toUpperCase();
    const rut = ruta.trim().toUpperCase();
    const info = this.estacionesHash.obtener(est);
    if (info === null || !info.abierta) return null;

    // Verificar que la estacion pertenezca actualmente al recorrido de la ruta
    const listaRuta = this.rutasHash.obtener(rut);
    if (listaRuta === null) return null;
    const paradasActuales = listaRuta.recorrer(false);
    let pertenece = false;
    for (let i = 0; i < paradasActuales.length; i++) {
      if (paradasActuales[i] === est) {
        pertenece = true;
        break;
      }
    }
    if (!pertenece) return null;

    let horarios = this.horariosHash.obtener(`${est}|${rut}`);
    if (horarios === null) {
      // Si fue agregada dinamicamente en R7, generar horarios ordenados
      const generados: Array<{ min: number; hora: string }> = [];
      for (let m = 300; m <= 1480; m += 10) {
        generados.push({ min: m, hora: minutosAHora(m) });
      }
      this.horariosHash.insertar(`${est}|${rut}`, generados);
      horarios = generados;
    }

    const objetivoMin = horaAMinutos(hora);
    let bajo = 0;
    let alto = horarios.length;
    while (bajo < alto) {
      const medio = Math.floor((bajo + alto) / 2);
      if (horarios[medio].min < objetivoMin) {
        bajo = medio + 1;
      } else {
        alto = medio;
      }
    }
    if (bajo < horarios.length) {
      return horarios[bajo].hora;
    }
    return null;
  }

  proximosBusesLista(estacion: string, ruta: string, hora: string, cantidad = 4): string[] {
    const est = estacion.trim().toUpperCase();
    const rut = ruta.trim().toUpperCase();
    const primero = this.proximoBus(est, rut, hora);
    if (primero === null) return [];
    const horarios = this.horariosHash.obtener(`${est}|${rut}`);
    if (!horarios) return [primero];
    const objetivoMin = horaAMinutos(primero);
    let bajo = 0;
    let alto = horarios.length;
    while (bajo < alto) {
      const medio = Math.floor((bajo + alto) / 2);
      if (horarios[medio].min < objetivoMin) {
        bajo = medio + 1;
      } else {
        alto = medio;
      }
    }
    const lista: string[] = [];
    while (bajo < horarios.length && lista.length < cantidad) {
      lista.push(horarios[bajo].hora);
      bajo++;
    }
    return lista;
  }

  // R5: Planear viaje directo o con maximo 1 transbordo con menos paradas
  // Nota operativa para el frontend bidireccional: permite recorrer la ruta en sentido directo o inverso
  viaje(origen: string, destino: string): PlanViaje | null {
    const orig = origen.trim().toUpperCase();
    const dest = destino.trim().toUpperCase();
    const infoO = this.estacionesHash.obtener(orig);
    const infoD = this.estacionesHash.obtener(dest);
    if (infoO === null || infoD === null || !infoO.abierta || !infoD.abierta) {
      return null;
    }
    if (orig === dest) {
      return {
        tipo: 'DIRECTO',
        rutas: [],
        transbordo: null,
        paradas: [orig],
        tramo1Paradas: [orig],
        tramo2Paradas: [],
        totalParadas: 0,
        tiempoEstimadoMin: 0,
      };
    }

    let mejorPlan: PlanViaje | null = null;
    const numRutas = this.nombresRutasOrd.length;

    // Helper que extrae el tramo entre A y B en una lista de paradas (permitiendo sentido normal o inverso)
    const extraerTramo = (paradas: string[], a: string, b: string): string[] | null => {
      let idxA = -1;
      let idxB = -1;
      for (let i = 0; i < paradas.length; i++) {
        if (paradas[i] === a) idxA = i;
        if (paradas[i] === b) idxB = i;
      }
      if (idxA === -1 || idxB === -1 || idxA === idxB) return null;
      const tramo: string[] = [];
      if (idxA < idxB) {
        for (let k = idxA; k <= idxB; k++) tramo.push(paradas[k]);
      } else {
        for (let k = idxA; k >= idxB; k--) tramo.push(paradas[k]);
      }
      return tramo;
    };

    // 1. Evaluar viajes directos (0 transbordos)
    for (let i = 0; i < numRutas; i++) {
      const rNom = this.nombresRutasOrd[i];
      const lista = this.rutasHash.obtener(rNom)!;
      const paradas = lista.recorrer(false);
      const tramo = extraerTramo(paradas, orig, dest);
      if (tramo !== null) {
        const numParadas = tramo.length - 1;
        if (mejorPlan === null || numParadas < mejorPlan.totalParadas) {
          mejorPlan = {
            tipo: 'DIRECTO',
            rutas: [rNom],
            transbordo: null,
            paradas: tramo,
            tramo1Paradas: tramo,
            tramo2Paradas: [],
            totalParadas: numParadas,
            tiempoEstimadoMin: numParadas * 3 + 2,
          };
        }
      }
    }

    // 2. Evaluar viajes con maximo 1 transbordo en una estacion ABIERTA
    for (let i = 0; i < numRutas; i++) {
      const r1 = this.nombresRutasOrd[i];
      const paradas1 = this.rutasHash.obtener(r1)!.recorrer(false);
      let tieneOrig = false;
      for (let p = 0; p < paradas1.length; p++) {
        if (paradas1[p] === orig) {
          tieneOrig = true;
          break;
        }
      }
      if (!tieneOrig) continue;

      for (let j = 0; j < numRutas; j++) {
        if (i === j) continue;
        const r2 = this.nombresRutasOrd[j];
        const paradas2 = this.rutasHash.obtener(r2)!.recorrer(false);
        let tieneDest = false;
        for (let q = 0; q < paradas2.length; q++) {
          if (paradas2[q] === dest) {
            tieneDest = true;
            break;
          }
        }
        if (!tieneDest) continue;

        // Buscar estaciones de interseccion abiertas
        for (let a = 0; a < paradas1.length; a++) {
          const estTransbordo = paradas1[a];
          if (estTransbordo === orig || estTransbordo === dest) continue;
          const infoT = this.estacionesHash.obtener(estTransbordo);
          if (infoT === null || !infoT.abierta) continue;

          const tramo1 = extraerTramo(paradas1, orig, estTransbordo);
          const tramo2 = extraerTramo(paradas2, estTransbordo, dest);
          if (tramo1 !== null && tramo2 !== null) {
            const totalParadas = (tramo1.length - 1) + (tramo2.length - 1);
            if (mejorPlan === null || totalParadas < mejorPlan.totalParadas) {
              const combinadas: string[] = [];
              for (let k = 0; k < tramo1.length; k++) combinadas.push(tramo1[k]);
              for (let k = 1; k < tramo2.length; k++) combinadas.push(tramo2[k]);
              mejorPlan = {
                tipo: 'TRANSBORDO',
                rutas: [r1, r2],
                transbordo: estTransbordo,
                paradas: combinadas,
                tramo1Paradas: tramo1,
                tramo2Paradas: tramo2,
                totalParadas,
                tiempoEstimadoMin: totalParadas * 3 + 6,
              };
            }
          }
        }
      }
    }

    return mejorPlan;
  }

  // R6: Ranking de las k estaciones abiertas por donde pasan mas buses al dia (con cache precalculado)
  ranking(k: number): InfoEstacionRed[] {
    if (k <= 0) return [];
    if (this.rankingCache === null) {
      const abiertas: InfoEstacionRed[] = [];
      for (let i = 0; i < this.nombresEstacionesOrd.length; i++) {
        const info = this.estacionesHash.obtener(this.nombresEstacionesOrd[i]);
        if (info !== null && info.abierta) {
          abiertas.push(info);
        }
      }
      this.rankingCache = mergeSort(abiertas, (a, b) =>
        a.busesDia !== b.busesDia ? a.busesDia > b.busesDia : a.nombre < b.nombre
      );
    }
    const limite = k < this.rankingCache.length ? k : this.rankingCache.length;
    const res: InfoEstacionRed[] = [];
    for (let i = 0; i < limite; i++) {
      res.push(this.rankingCache[i]);
    }
    return res;
  }

  // R7: Editar rutas (agregar_parada, quitar_parada, recorrido normal o al_reves)
  agregarParada(ruta: string, nueva: string, despuesDe: string): boolean {
    const rNom = ruta.trim().toUpperCase();
    const nNom = nueva.trim().toUpperCase();
    const dNom = despuesDe.trim().toUpperCase();
    if (!rNom || !nNom || !dNom) return false;
    const lista = this.rutasHash.obtener(rNom);
    if (lista === null) return false;

    if (!this.estacionesHash.contiene(nNom)) {
      this.estacionesHash.insertar(nNom, {
        nombre: nNom,
        troncal: 'B',
        nombreTroncal: 'Estación Operativa',
        colorTroncal: '#E30613',
        abierta: true,
        busesDia: 120,
        esPortal: false,
        esIntercambio: false,
        rutasQueParan: [rNom],
      });
      this.nombresEstacionesOrd.push(nNom);
      this.nombresEstacionesOrd = mergeSort(this.nombresEstacionesOrd, (a, b) => a < b);
    }

    const exito = lista.insertarDespuesDe(nNom, dNom);
    if (exito) {
      const ahora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.pilaDeshacer.apilar({
        tipo: 'AGREGAR_PARADA',
        descripcion: `Ruta ${rNom}: agregada parada ${nNom} después de ${dNom}`,
        timestamp: ahora,
        ruta: rNom,
        nuevaParada: nNom,
        despuesDe: dNom,
      });
      this.pilaRehacer.limpiar();
      this.recalcularRutasEnEstaciones();
    }
    return exito;
  }

  quitarParada(ruta: string, estacion: string): boolean {
    const rNom = ruta.trim().toUpperCase();
    const eNom = estacion.trim().toUpperCase();
    const lista = this.rutasHash.obtener(rNom);
    if (lista === null || lista.tamano <= 2) return false;
    const { exito, anteriorNombre } = lista.eliminarEstacion(eNom);
    if (exito) {
      const ahora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.pilaDeshacer.apilar({
        tipo: 'QUITAR_PARADA',
        descripcion: `Ruta ${rNom}: eliminada parada ${eNom}`,
        timestamp: ahora,
        ruta: rNom,
        nuevaParada: eNom,
        despuesDe: anteriorNombre,
      });
      this.pilaRehacer.limpiar();
      this.recalcularRutasEnEstaciones();
      return true;
    }
    return false;
  }

  recorrido(ruta: string, alReves = false): string[] {
    const rNom = ruta.trim().toUpperCase();
    const lista = this.rutasHash.obtener(rNom);
    if (lista === null) return [];
    return lista.recorrer(alReves);
  }

  // R8: Cerrar y reabrir estaciones
  cerrar(nombre: string): boolean {
    const nom = nombre.trim().toUpperCase();
    const info = this.estacionesHash.obtener(nom);
    if (info === null || !info.abierta) return false;
    info.abierta = false;
    const ahora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.pilaDeshacer.apilar({
      tipo: 'CERRAR',
      descripcion: `Estación ${nom} cerrada temporalmente`,
      timestamp: ahora,
      estacion: nom,
    });
    this.pilaRehacer.limpiar();
    this.rankingCache = null;
    return true;
  }

  reabrir(nombre: string): boolean {
    const nom = nombre.trim().toUpperCase();
    const info = this.estacionesHash.obtener(nom);
    if (info === null || info.abierta) return false;
    info.abierta = true;
    const ahora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.pilaDeshacer.apilar({
      tipo: 'REABRIR',
      descripcion: `Estación ${nom} reabierta al servicio`,
      timestamp: ahora,
      estacion: nom,
    });
    this.pilaRehacer.limpiar();
    this.rankingCache = null;
    return true;
  }

  // R9: Deshacer y rehacer operaciones
  deshacer(): AccionOperador | null {
    if (this.pilaDeshacer.estaVacia()) return null;
    const accion = this.pilaDeshacer.desapilar()!;
    if (accion.tipo === 'CERRAR' && accion.estacion) {
      const info = this.estacionesHash.obtener(accion.estacion);
      if (info) info.abierta = true;
    } else if (accion.tipo === 'REABRIR' && accion.estacion) {
      const info = this.estacionesHash.obtener(accion.estacion);
      if (info) info.abierta = false;
    } else if (accion.tipo === 'AGREGAR_PARADA' && accion.ruta && accion.nuevaParada) {
      const lista = this.rutasHash.obtener(accion.ruta);
      if (lista) lista.eliminarEstacion(accion.nuevaParada);
      this.recalcularRutasEnEstaciones();
    } else if (accion.tipo === 'QUITAR_PARADA' && accion.ruta && accion.nuevaParada) {
      const lista = this.rutasHash.obtener(accion.ruta);
      if (lista) {
        if (accion.despuesDe === null || accion.despuesDe === undefined) {
          lista.insertarAlInicio(accion.nuevaParada);
        } else {
          lista.insertarDespuesDe(accion.nuevaParada, accion.despuesDe);
        }
      }
      this.recalcularRutasEnEstaciones();
    }
    this.pilaRehacer.apilar(accion);
    this.rankingCache = null;
    return accion;
  }

  rehacer(): AccionOperador | null {
    if (this.pilaRehacer.estaVacia()) return null;
    const accion = this.pilaRehacer.desapilar()!;
    if (accion.tipo === 'CERRAR' && accion.estacion) {
      const info = this.estacionesHash.obtener(accion.estacion);
      if (info) info.abierta = false;
    } else if (accion.tipo === 'REABRIR' && accion.estacion) {
      const info = this.estacionesHash.obtener(accion.estacion);
      if (info) info.abierta = true;
    } else if (
      accion.tipo === 'AGREGAR_PARADA' &&
      accion.ruta &&
      accion.nuevaParada &&
      accion.despuesDe
    ) {
      const lista = this.rutasHash.obtener(accion.ruta);
      if (lista) lista.insertarDespuesDe(accion.nuevaParada, accion.despuesDe);
      this.recalcularRutasEnEstaciones();
    } else if (accion.tipo === 'QUITAR_PARADA' && accion.ruta && accion.nuevaParada) {
      const lista = this.rutasHash.obtener(accion.ruta);
      if (lista) lista.eliminarEstacion(accion.nuevaParada);
      this.recalcularRutasEnEstaciones();
    }
    this.pilaDeshacer.apilar(accion);
    this.rankingCache = null;
    return accion;
  }

  obtenerHistorialDeshacer(): AccionOperador[] {
    return this.pilaDeshacer.aArreglo();
  }

  obtenerHistorialRehacer(): AccionOperador[] {
    return this.pilaRehacer.aArreglo();
  }

  obtenerTodasLasEstaciones(): InfoEstacionRed[] {
    const res: InfoEstacionRed[] = [];
    for (let i = 0; i < this.nombresEstacionesOrd.length; i++) {
      const info = this.estacionesHash.obtener(this.nombresEstacionesOrd[i]);
      if (info !== null) res.push(info);
    }
    return res;
  }

  obtenerEstacionesAbiertas(): string[] {
    const res: string[] = [];
    for (let i = 0; i < this.nombresEstacionesOrd.length; i++) {
      const info = this.estacionesHash.obtener(this.nombresEstacionesOrd[i]);
      if (info !== null && info.abierta) res.push(info.nombre);
    }
    return res;
  }

  obtenerNombresRutas(): string[] {
    return [...this.nombresRutasOrd];
  }
}
