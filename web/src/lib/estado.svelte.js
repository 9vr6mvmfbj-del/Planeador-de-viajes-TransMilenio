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
});

/** @type {Awaited<ReturnType<typeof cargarMotor>> | null} */
let red = null;

export function motor() {
  if (!red) throw new Error('El motor no está cargado');
  return red;
}

const base = import.meta.env.BASE_URL;

export async function iniciar() {
  try {
    const [m, e, r, h] = await Promise.all([
      cargarMotor(base + 'motor_boff.wasm'),
      fetch(base + 'datos/estaciones.csv').then((x) => x.text()),
      fetch(base + 'datos/rutas.csv').then((x) => x.text()),
      fetch(base + 'datos/horarios.csv').then((x) => x.text()),
    ]);
    red = m;
    app.resumen = red.cargar(e, r, h);
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

export function formatoNumero(n) {
  return new Intl.NumberFormat('es-CO').format(n);
}

// Haptic sutil donde existe (Android). En iPhone Safari no hay API de vibración: no hace nada.
export function vibrar(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* sin soporte */ }
}
