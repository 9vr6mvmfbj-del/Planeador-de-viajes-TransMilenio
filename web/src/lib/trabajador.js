// Corre la medición de rendimiento (R11) en un hilo aparte para no congelar la pantalla.
// Dos trabajos: 'generar' (redes sintéticas de varios tamaños) y 'archivos' (los tres CSV de una red del profesor).
import { cargarMotor } from './motor_boff.js';
import { generarRed } from './redes.js';

self.onmessage = async (e) => {
  try {
    const { wasm, tarea, tamanos, csv, consultas = 10000, reps = 5 } = e.data;
    const red = await cargarMotor(wasm);
    const redes = tarea === 'generar' ? tamanos : [null];
    for (const S of redes) {
      const datos = S ? generarRed(S) : csv;
      self.postMessage({ progreso: S ? `Generando red de ${S.toLocaleString('es-CO')} estaciones…` : 'Cargando la red…' });
      const t0 = performance.now();
      red.cargar(datos.estaciones, datos.rutas, datos.horarios); // Red(carpeta): solo se mide cuánto tarda
      const cargaMs = performance.now() - t0;
      self.postMessage({ progreso: 'Midiendo cada operación…' });
      const medida = red.medir_red(consultas, reps);
      self.postMessage({ red: { ...medida, cargaMs } });
    }
    self.postMessage({ fin: true });
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
