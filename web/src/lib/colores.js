// Color de cada ruta para dibujarla. Se calcula a partir del nombre (no está amarrado a nuestra red):
// la letra inicial se asocia a una paleta inspirada en las troncales; los números (rutas "1-1", "8-4")
// van en tonos azul petróleo; cualquier otro nombre cae en la paleta por hash.
const PALETA = {
  A: '#0a84ff', B: '#34a853', C: '#f4b400', D: '#8e44ad', E: '#e67e22', F: '#e3001b',
  G: '#00a6a6', H: '#d35400', J: '#c2185b', K: '#6d4c41', L: '#2e7d32', M: '#5e35b1',
};
const EXTRA = ['#0a84ff', '#34a853', '#f4b400', '#8e44ad', '#e67e22', '#e3001b', '#00a6a6', '#c2185b', '#5e35b1', '#2e7d32'];

export function colorRuta(nombre = '') {
  const c = nombre.charAt(0).toUpperCase();
  if (PALETA[c]) return PALETA[c];
  if (c >= '0' && c <= '9') return '#0f6e8c';
  let h = 0;
  for (const ch of nombre) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return EXTRA[h % EXTRA.length];
}

// Texto blanco u oscuro según el fondo, para que el chip siempre se lea.
export function tintaSobre(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#1d1d1f' : '#ffffff';
}
