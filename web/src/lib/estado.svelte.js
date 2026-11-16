// Estado compartido de la app. El motor (motor_boff, C++ → WebAssembly) es la única fuente de verdad:
// la app no guarda ni calcula nada de los requisitos, solo pregunta y muestra.
import { cargarMotor } from './motor_boff.js';

export const app = $state({
  listo: false,
  error: '',
  version: 0, // sube con cada cambio (cerrar, editar, deshacer...) para refrescar las vistas
  resumen: { estaciones: 0, abiertas: 0, rutas: 0, horarios: 0, puedeDeshacer: false, puedeRehacer: false },
  vista: 'viajar',
  rutas: /** @type {string[]} */ ([]),
  servicio: { inicio: 4 * 60, fin: 24 * 60 }, // jornada de TransMilenio (min, sobre el eje de la jornada); se calcula de los horarios
});

/** @type {Awaited<ReturnType<typeof cargarMotor>> | null} */
let red = null;

export function motor() {
  if (!red) throw new Error('El motor no está cargado');
  return red;
}

const base = import.meta.env.BASE_URL;
let csv = { e: '', r: '', h: '' }; // la red original, para poder volver a ella

export async function iniciar() {
  try {
    const [m, e, r, h] = await Promise.all([
      cargarMotor(base + 'motor_boff.wasm'),
      fetch(base + 'datos/estaciones.csv').then((x) => x.text()),
      fetch(base + 'datos/rutas.csv').then((x) => x.text()),
      fetch(base + 'datos/horarios.csv').then((x) => x.text()),
    ]);
    red = m;
    csv = { e, r, h };
    app.servicio = jornada(h);
    red.cargar(e, r, h);
    reaplicarGuardados();
    app.resumen = red.resumen();
    app.rutas = red.rutas();
    app.listo = true;
  } catch (err) {
    app.error = String(err);
  }
}

// Llamar después de cualquier operación que cambie la red.
export function huboCambio() {
  app.version++;
  app.resumen = motor().resumen();
  app.rutas = motor().rutas();
}

// ================================================================= cambios del admin (persistentes)
// La red original son los CSV. Cada cambio del admin se guarda como un registro { op, args, creado }
// en el orden en que se hizo. Al abrir la app, el motor carga los CSV y vuelve a aplicar los registros
// en ese orden: como el motor es determinista, la red queda igual que antes de recargar, incluidas
// las pilas de deshacer y rehacer (R9). Hoy el registro vive en este dispositivo (localStorage);
// para compartirlo entre todos basta cambiar guardar()/leer() por la tabla de Supabase
// (ver supabase/transmitrack.sql), sin tocar el motor ni las vistas.
const CLAVE = 'transmitrack.cambios.v1';
/** @type {{ op: string, args: any[], desc: string, creado: string }[]} */
let registro = [];
/** Hora de cada cambio, por id del motor: cuándo se hizo, se deshizo o se rehízo. */
const marcas = new Map();
export const persistencia = $state({ guardado: true, cambios: 0 });
/** El admin queda desbloqueado hasta recargar la app o tocar "Bloquear" (cada cambio igual pide el PIN). */
export const sesion = $state({ admin: false });

const NUEVOS = ['cerrar', 'reabrir', 'agregar_parada', 'quitar_parada', 'crear_estacion', 'eliminar_estacion', 'crear_ruta', 'eliminar_ruta'];

// Ejecuta un registro en el motor y anota la hora en 'marcas'. Devuelve si el motor lo aceptó.
function ejecutar(op, args, creado) {
  const m = motor();
  const marca = (id) => { if (!marcas.has(id)) marcas.set(id, {}); return marcas.get(id); };
  if (NUEVOS.includes(op)) {
    const ok = m[op](...args);
    if (ok) marca(m.historial().hechos[0].id).hecho = creado;
    return ok;
  }
  const h = m.historial();
  if (op === 'deshacer' || op === 'rehacer') {
    const lista = op === 'deshacer' ? h.hechos : h.deshechos;
    if (!lista.length || !m[op]()) return false;
    const c = marca(lista[0].id);
    if (op === 'deshacer') c.deshecho = creado; else c.rehecho = creado;
    return true;
  }
  if (op === 'deshacer_cambio' || op === 'rehacer_cambio') {
    const lista = op === 'deshacer_cambio' ? h.hechos : h.deshechos;
    const i = lista.findIndex((c) => c.id === args[0]); // el registro guarda el id del cambio, no su posición
    if (i < 0 || !m[op](i)) return false;
    const c = marca(args[0]);
    if (op === 'deshacer_cambio') c.deshecho = creado; else c.rehecho = creado;
    return true;
  }
  return false;
}

function leerGuardados() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(registro));
    persistencia.guardado = true;
  } catch {
    persistencia.guardado = false; // navegación privada o sin espacio: el cambio vale solo hasta recargar
  }
  persistencia.cambios = registro.length;
}

function reaplicarGuardados() {
  marcas.clear();
  registro = [];
  for (const r of leerGuardados()) {
    if (!r || typeof r.op !== 'string' || !Array.isArray(r.args)) continue;
    ejecutar(r.op, r.args, r.creado); // si alguno ya no aplica (cambiaron los CSV), simplemente no hace nada
    registro.push(r);
  }
  persistencia.cambios = registro.length;
}

// ---- PIN del admin. Se guarda solo su huella (PBKDF2-SHA256, 150.000 vueltas), nunca el PIN.
const PIN_HUELLA = '610e6d6dc61ec9c655b5457b389d787f7bbce4fe00b84a4c3caa93631e8aaf56';
export async function pinCorrecto(pin) {
  if (!/^\d{4}$/.test(pin)) return false;
  const c = globalThis.crypto?.subtle;
  if (!c) return false;
  const llave = await c.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await c.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode('transmitrack-admin-v1'), iterations: 150000, hash: 'SHA-256' }, llave, 256);
  const hex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === PIN_HUELLA;
}

/**
 * Hace un cambio del admin: revisa el PIN, lo aplica en el motor y lo guarda.
 * @returns {Promise<{ok: boolean, error?: string, pin?: boolean, conflicto?: number}>}
 */
export async function cambiar(pin, op, args, desc) {
  if (!(await pinCorrecto(pin))) return { ok: false, pin: false, error: 'PIN incorrecto' };
  const creado = new Date().toISOString();
  if (!ejecutar(op, args, creado)) {
    const e = motor().error();
    return { ok: false, error: e.error || 'No se pudo hacer el cambio', conflicto: e.conflicto };
  }
  registro.push({ op, args, desc, creado });
  guardar();
  huboCambio();
  return { ok: true };
}

/** Vuelve a la red original de los CSV y borra el historial guardado. */
export async function restablecer(pin) {
  if (!(await pinCorrecto(pin))) return { ok: false, pin: false, error: 'PIN incorrecto' };
  registro = [];
  marcas.clear();
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  persistencia.cambios = 0;
  motor().cargar(csv.e, csv.r, csv.h);
  huboCambio();
  return { ok: true };
}

/** Pilas de deshacer y rehacer del motor, con la hora de cada cambio. */
export function historial() {
  const h = motor().historial();
  const conHora = (c) => ({ ...c, ...(marcas.get(c.id) ?? {}) });
  return { hechos: h.hechos.map(conHora), deshechos: h.deshechos.map(conHora) };
}

/** Texto legible de un cambio del motor. */
export function describirCambio(c) {
  switch (c.tipo) {
    case 'CERRAR': return `Cerró ${c.estacion}`;
    case 'REABRIR': return `Reabrió ${c.estacion}`;
    case 'AGREGAR': return `Agregó ${c.estacion} a la línea ${c.ruta}${c.referencia ? ` después de ${c.referencia}` : ''}`;
    case 'QUITAR': return `Quitó ${c.estacion} de la línea ${c.ruta}`;
    case 'CREAR_ESTACION': return `Creó la estación ${c.estacion}`;
    case 'ELIMINAR_ESTACION': return `Eliminó la estación ${c.estacion}${c.cantidad ? ` (estaba en ${c.cantidad} ${c.cantidad === 1 ? 'línea' : 'líneas'})` : ''}`;
    case 'CREAR_RUTA': return `Creó la línea ${c.ruta} (${c.cantidad} paradas)`;
    case 'ELIMINAR_RUTA': return `Eliminó la línea ${c.ruta}`;
    default: return c.tipo;
  }
}

/** "31 oct · 14:52" */
export function fechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const fecha = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ');
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fecha} · ${hora}`;
}

// ----------------------------------------------------------------- avisos (tipo Sonner)
export const avisos = $state(/** @type {{id:number, texto:string, tipo:string}[]} */ ([]));
let siguiente = 1;
export function avisar(texto, tipo = 'ok') {
  const id = siguiente++;
  avisos.push({ id, texto, tipo });
  setTimeout(() => {
    const i = avisos.findIndex((a) => a.id === id);
    if (i >= 0) avisos.splice(i, 1);
  }, 2600);
}

// ----------------------------------------------------------------- utilidades de presentación
export function horaActual() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function sumarMinutos(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m + min) % 1440) + 1440) % 1440;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

export function minutosEntre(desde, hasta) {
  const a = desde.split(':').map(Number), b = hasta.split(':').map(Number);
  return (((b[0] * 60 + b[1]) - (a[0] * 60 + a[1])) % 1440 + 1440) % 1440;
}

// ================================================================= jornada de servicio
// TransMilenio no opera 24 horas: abre hacia las 04:00 y los últimos buses pasan poco después de la
// medianoche (las horas 24:xx del GTFS). El motor (R4) responde None cuando ya no hay más buses ese día
// (como pide el enunciado) y la app, para el viajero, vuelve a preguntar desde las 00:00 (proximoBus); la app usa la jornada para decir "fuera de servicio" o "mañana" en vez de
// "en 10 h 54 min". La jornada sale de los mismos horarios, no de un número fijo.
const CORTE = 3 * 60; // las 00:00–02:59 cuentan como el final de la jornada anterior
const aJornada = (m) => (m < CORTE ? m + 1440 : m);
const aMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
export const horaDeJornada = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

function jornada(textoHorarios) {
  let inicio = Infinity, fin = -Infinity;
  const lineas = textoHorarios.split('\n');
  const cab = lineas[0].split(',').map((x) => x.trim().toLowerCase());
  const c = Math.max(0, cab.indexOf('hora'));
  for (let i = 1; i < lineas.length; i++) {
    const v = lineas[i].split(',')[c];
    if (!v || v.indexOf(':') < 0) continue;
    const m = aJornada(aMin(v) % 1440);
    if (m < inicio) inicio = m;
    if (m > fin) fin = m;
  }
  return isFinite(inicio) ? { inicio, fin } : { inicio: 4 * 60, fin: 24 * 60 };
}

// R4 devuelve null cuando ya no hay más buses ese día (el contrato no da la vuelta a la medianoche).
// Para mostrarle algo útil al viajero preguntamos de nuevo desde las 00:00: el primer bus del día siguiente.
export function proximoBus(estacion, ruta, hora) {
  const m = motor();
  return m.proximo_bus(estacion, ruta, hora) ?? m.proximo_bus(estacion, ruta, '00:00');
}

export function enServicio(hhmm) {
  const m = aJornada(aMin(hhmm));
  return m >= app.servicio.inicio && m <= app.servicio.fin;
}

/**
 * Cómo decir la espera hasta el próximo bus que dio el motor (R4).
 * @returns {{ texto: string, tipo: 'ya'|'pronto'|'hoy'|'manana', minutos: number }}
 */
export function espera(hora, proximo) {
  const h = aJornada(aMin(hora)), p = aJornada(aMin(proximo));
  const abierto = h >= app.servicio.inicio && h <= app.servicio.fin;
  if (abierto && p >= h) {
    const min = p - h;
    return { texto: min === 0 ? 'ya pasa' : `en ${duracion(min)}`, tipo: min <= 5 ? 'pronto' : 'hoy', minutos: min };
  }
  // ya no pasa en esta jornada, o el sistema está cerrado: el próximo es el de la siguiente jornada
  const mismoDia = aMin(proximo) > aMin(hora); // de madrugada el primer bus todavía es "hoy"
  const cuando = `${mismoDia ? 'hoy' : 'mañana'} a las ${proximo}`;
  const texto = abierto ? `ya no pasa ${h >= 1440 ? 'esta noche' : 'hoy'} · ${cuando}` : cuando;
  return { texto, tipo: 'manana', minutos: -1 };
}

// Minutos legibles: 45 → "45 min", 60 → "1 h", 654 → "10 h 54 min".
export function duracion(min) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function formatoNumero(n) {
  return new Intl.NumberFormat('es-CO').format(n);
}

// Haptic sutil donde existe (Android). En iPhone Safari no hay API de vibración: no hace nada.
export function vibrar(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* sin soporte */ }
}
