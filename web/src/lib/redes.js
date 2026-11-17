// Redes de prueba y cuentas del panel de rendimiento (R11). Esto está FUERA del motor: la app puede usar
// cualquier cosa, y aquí solo se arman los datos de entrada y se calcula la pendiente de las mediciones.

// Generador pseudoaleatorio simple y reproducible (xorshift32).
function azar(semilla) {
  let s = (semilla * 2654435761) >>> 0 || 1;
  return (n) => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s % n;
  };
}

const PALABRAS = ['CALLE', 'AV.', 'PORTAL', 'CRA.', 'SAN', 'SANTA', 'LA', 'EL', 'NQS', 'SUBA'];
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

/**
 * Red sintética con el mismo formato de los tres CSV: S estaciones, S/4 rutas de 10 paradas y 8 horarios
 * por parada (así la red de 80.000 estaciones tiene 1,6 millones de horarios y cabe en el navegador).
 */
export function generarRed(S, semilla = 42) {
  const az = azar(semilla);
  const R = Math.max(1, Math.floor(S / 4)), L = 10, H = 8;
  const nombres = new Array(S);
  const est = ['nombre'];
  for (let i = 0; i < S; i++) {
    let n = PALABRAS[az(10)] + ' ';
    for (let j = 0; j < 5; j++) n += String.fromCharCode(65 + az(26));
    nombres[i] = n + ' ' + i; // el número garantiza nombres únicos
    est.push(nombres[i]);
  }
  const rutas = ['ruta,orden,estacion'];
  const horarios = ['ruta,estacion,hora'];
  const paso = Math.floor(1200 / H);
  for (let r = 0; r < R; r++) {
    const nr = 'R' + r;
    const usadas = new Set();
    let actual = az(S);
    const ps = [];
    while (ps.length < L) {
      if (!usadas.has(actual)) { usadas.add(actual); ps.push(actual); }
      actual = (actual + 1 + az(7)) % S;
    }
    const salida = 270 + az(60); // primer bus entre 4:30 y 5:30
    for (let o = 0; o < L; o++) {
      rutas.push(`${nr},${o + 1},${nombres[ps[o]]}`);
      for (let h = 0; h < H; h++) horarios.push(`${nr},${nombres[ps[o]]},${hhmm((salida + h * paso + o * 3) % 1440)}`);
    }
  }
  return { estaciones: est.join('\n') + '\n', rutas: rutas.join('\n') + '\n', horarios: horarios.join('\n') + '\n' };
}

/** Pendiente de log(tiempo) contra log(n) por mínimos cuadrados: 0 = constante, 1 = lineal. */
export function pendiente(ns, tiempos) {
  const m = ns.length;
  if (m < 2) return 0;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < m; i++) {
    const x = Math.log(ns[i]), y = Math.log(Math.max(tiempos[i], 1e-6));
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const d = m * sxx - sx * sx;
  return d === 0 ? 0 : (m * sxy - sx * sy) / d;
}

/** Pendiente que debe tener cada clase y hasta dónde la damos por buena (la caché del procesador la sube un poco). */
export const CLASES = {
  constante: { esperada: 0, maxima: 0.35, texto: 'O(1): el tiempo no cambia' },
  log: { esperada: 0.1, maxima: 0.45, texto: 'O(log n): sube muy poco' },
  lineal: { esperada: 1, maxima: 1.25, minima: 0.8, texto: 'O(n): se duplica al duplicar n' },
  nlogn: { esperada: 1.1, maxima: 1.35, minima: 0.85, texto: 'O(n log n): un poco más que lineal' },
};

export function veredicto(clase, pend) {
  const c = CLASES[clase];
  return pend <= c.maxima && (c.minima === undefined || pend >= c.minima);
}
