// Búsqueda de estaciones/rutas para la app (fuera de motor/: aquí sí se puede usar cualquier JS).
// El motor responde R2 por PREFIJO del nombre completo (así lo pide el contrato). Para la persona
// eso se queda corto: quien escribe "100" espera "CALLE 100". Este módulo completa los resultados:
//   1. nombre que empieza con lo escrito            (lo que ya hace R2)
//   2. alguna palabra del nombre empieza con eso     "100"  → CALLE 100, AV. SUBA - CALLE 100
//   3. el texto aparece dentro de una palabra        "ALER" → ALQUERIA no, pero "ALERIA" sí
// Con varias palabras ("calle 10") todas deben aparecer, en cualquier orden.

/** Mayúsculas, sin tildes y con espacios simples (igual que los nombres de los CSV). */
export function normalizar(t) {
  return String(t)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const esLetra = (c) => (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');

/** Busca un trozo en el nombre; prefiere el comienzo de una palabra. Devuelve { ini, nivel } o null. */
function ubicar(nombre, trozo) {
  let interna = -1;
  let desde = 0;
  for (;;) {
    const i = nombre.indexOf(trozo, desde);
    if (i < 0) break;
    if (i === 0) return { ini: 0, nivel: 0 };
    if (!esLetra(nombre[i - 1])) return { ini: i, nivel: 1 };
    if (interna < 0) interna = i;
    desde = i + 1;
  }
  return interna >= 0 ? { ini: interna, nivel: 2 } : null;
}

/** Zonas [ini, fin) del nombre que coinciden con la consulta, o null si no coincide. */
function zonas(nombre, tokens) {
  const lista = [];
  let puntaje = 0;
  for (const t of tokens) {
    const u = ubicar(nombre, t);
    if (!u) return null;
    lista.push([u.ini, u.ini + t.length]);
    puntaje += u.nivel === 0 ? 0 : u.nivel === 1 ? 1 + u.ini / 1000 : 3;
  }
  lista.sort((a, b) => a[0] - b[0]);
  const unidas = [];
  for (const z of lista) {
    const ult = unidas[unidas.length - 1];
    if (ult && z[0] <= ult[1]) ult[1] = Math.max(ult[1], z[1]);
    else unidas.push([z[0], z[1]]);
  }
  return { zonas: unidas, puntaje };
}

/** Parte un nombre en trozos { t, m } donde m = true si ese trozo es lo que se buscó. */
export function marcar(nombre, consulta) {
  const q = normalizar(consulta);
  if (!q) return [{ t: nombre, m: false }];
  const z = zonas(nombre, q.split(' '));
  if (!z) return [{ t: nombre, m: false }];
  const partes = [];
  let pos = 0;
  for (const [a, b] of z.zonas) {
    if (a > pos) partes.push({ t: nombre.slice(pos, a), m: false });
    partes.push({ t: nombre.slice(a, b), m: true });
    pos = b;
  }
  if (pos < nombre.length) partes.push({ t: nombre.slice(pos), m: false });
  return partes;
}

/** Los k mejores nombres para la consulta, del más al menos relevante. */
export function buscar(nombres, consulta, k) {
  const q = normalizar(consulta);
  if (!q) return [];
  const tokens = q.split(' ');
  const hallados = [];
  for (const n of nombres) {
    const z = zonas(n, tokens);
    if (z) hallados.push({ n, p: n === q ? -1 : z.puntaje });
  }
  hallados.sort((a, b) => a.p - b.p || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0));
  return hallados.slice(0, k).map((h) => h.n);
}
