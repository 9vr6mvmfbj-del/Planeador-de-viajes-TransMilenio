// Corre la medición de rendimiento (R11) en un hilo aparte para no congelar la pantalla.
import { cargarMotor } from './motor_boff.js';

self.onmessage = async (e) => {
  try {
    const { wasm, maxEscala, consultas } = e.data;
    const red = await cargarMotor(wasm);
    self.postMessage({ ok: true, datos: red.rendimiento(maxEscala, consultas) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
