// Copia los CSV de ../datos a public/datos para que la app los cargue (funciona en Windows, Mac y Linux).
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, '..', '..', 'datos');
const destino = join(aqui, '..', 'public', 'datos');
mkdirSync(destino, { recursive: true });
for (const f of ['estaciones.csv', 'rutas.csv', 'horarios.csv']) cpSync(join(origen, f), join(destino, f));
console.log('Datos copiados a public/datos');
