// Estructuras de datos manuales desde cero (TablaHash, ListaDobleRuta, Pila, Cola, Trie, MergeSort, BusquedaBinaria)
// Espejo fiel en TypeScript del paquete motor/ en Python para ejecucion interactiva en tiempo real.

export class NodoHash<V> {
  clave: string;
  valor: V;
  siguiente: NodoHash<V> | null;

  constructor(clave: string, valor: V, siguiente: NodoHash<V> | null = null) {
    this.clave = clave;
    this.valor = valor;
    this.siguiente = siguiente;
  }
}

export class TablaHash<V> {
  private cap: number;
  private tam: number;
  private cubetas: Array<NodoHash<V> | null>;

  constructor(capacidadInicial = 128) {
    this.cap = capacidadInicial;
    this.tam = 0;
    this.cubetas = new Array(this.cap).fill(null);
  }

  private hash(clave: string): number {
    let h = 5381;
    for (let i = 0; i < clave.length; i++) {
      h = ((h * 33) + clave.charCodeAt(i)) >>> 0;
    }
    return h % this.cap;
  }

  private redimensionar(): void {
    const viejaCap = this.cap;
    const viejas = this.cubetas;
    this.cap = viejaCap * 2;
    this.cubetas = new Array(this.cap).fill(null);
    this.tam = 0;
    for (let i = 0; i < viejaCap; i++) {
      let actual = viejas[i];
      while (actual !== null) {
        this.insertar(actual.clave, actual.valor);
        actual = actual.siguiente;
      }
    }
  }

  insertar(clave: string, valor: V): void {
    if ((this.tam + 1) * 4 >= this.cap * 3) {
      this.redimensionar();
    }
    const idx = this.hash(clave);
    let actual = this.cubetas[idx];
    while (actual !== null) {
      if (actual.clave === clave) {
        actual.valor = valor;
        return;
      }
      actual = actual.siguiente;
    }
    this.cubetas[idx] = new NodoHash(clave, valor, this.cubetas[idx]);
    this.tam++;
  }

  obtener(clave: string): V | null {
    const idx = this.hash(clave);
    let actual = this.cubetas[idx];
    while (actual !== null) {
      if (actual.clave === clave) {
        return actual.valor;
      }
      actual = actual.siguiente;
    }
    return null;
  }

  contiene(clave: string): boolean {
    return this.obtener(clave) !== null;
  }

  eliminar(clave: string): boolean {
    const idx = this.hash(clave);
    let actual = this.cubetas[idx];
    let previo: NodoHash<V> | null = null;
    while (actual !== null) {
      if (actual.clave === clave) {
        if (previo === null) {
          this.cubetas[idx] = actual.siguiente;
        } else {
          previo.siguiente = actual.siguiente;
        }
        this.tam--;
        return true;
      }
      previo = actual;
      actual = actual.siguiente;
    }
    return false;
  }

  claves(): string[] {
    const res: string[] = [];
    for (let i = 0; i < this.cap; i++) {
      let actual = this.cubetas[i];
      while (actual !== null) {
        res.push(actual.clave);
        actual = actual.siguiente;
      }
    }
    return res;
  }
}

export class NodoDoble {
  valor: string;
  anterior: NodoDoble | null = null;
  siguiente: NodoDoble | null = null;

  constructor(valor: string) {
    this.valor = valor;
  }
}

export class ListaDobleRuta {
  cabeza: NodoDoble | null = null;
  cola: NodoDoble | null = null;
  tamano = 0;
  private nodosPorEstacion = new TablaHash<NodoDoble>(64);

  agregarAlFinal(estacion: string): boolean {
    if (this.nodosPorEstacion.contiene(estacion)) {
      return false;
    }
    const nodo = new NodoDoble(estacion);
    if (this.cabeza === null || this.cola === null) {
      this.cabeza = nodo;
      this.cola = nodo;
    } else {
      nodo.anterior = this.cola;
      this.cola.siguiente = nodo;
      this.cola = nodo;
    }
    this.nodosPorEstacion.insertar(estacion, nodo);
    this.tamano++;
    return true;
  }

  insertarDespuesDe(nueva: string, despuesDe: string): boolean {
    if (this.nodosPorEstacion.contiene(nueva)) {
      return false;
    }
    const nodoRef = this.nodosPorEstacion.obtener(despuesDe);
    if (nodoRef === null) {
      return false;
    }
    const nuevo = new NodoDoble(nueva);
    const sig = nodoRef.siguiente;
    nuevo.anterior = nodoRef;
    nuevo.siguiente = sig;
    nodoRef.siguiente = nuevo;
    if (sig !== null) {
      sig.anterior = nuevo;
    } else {
      this.cola = nuevo;
    }
    this.nodosPorEstacion.insertar(nueva, nuevo);
    this.tamano++;
    return true;
  }

  insertarAlInicio(nueva: string): boolean {
    if (this.nodosPorEstacion.contiene(nueva)) {
      return false;
    }
    const nuevo = new NodoDoble(nueva);
    if (this.cabeza === null || this.cola === null) {
      this.cabeza = nuevo;
      this.cola = nuevo;
    } else {
      nuevo.siguiente = this.cabeza;
      this.cabeza.anterior = nuevo;
      this.cabeza = nuevo;
    }
    this.nodosPorEstacion.insertar(nueva, nuevo);
    this.tamano++;
    return true;
  }

  eliminarEstacion(estacion: string): { exito: boolean; anteriorNombre: string | null } {
    const nodo = this.nodosPorEstacion.obtener(estacion);
    if (nodo === null) {
      return { exito: false, anteriorNombre: null };
    }
    const anteriorNombre = nodo.anterior ? nodo.anterior.valor : null;
    if (nodo.anterior !== null) {
      nodo.anterior.siguiente = nodo.siguiente;
    } else {
      this.cabeza = nodo.siguiente;
    }
    if (nodo.siguiente !== null) {
      nodo.siguiente.anterior = nodo.anterior;
    } else {
      this.cola = nodo.anterior;
    }
    this.nodosPorEstacion.eliminar(estacion);
    this.tamano--;
    return { exito: true, anteriorNombre };
  }

  recorrer(alReves = false): string[] {
    const resultado: string[] = [];
    if (!alReves) {
      let actual = this.cabeza;
      while (actual !== null) {
        resultado.push(actual.valor);
        actual = actual.siguiente;
      }
    } else {
      let actual = this.cola;
      while (actual !== null) {
        resultado.push(actual.valor);
        actual = actual.anterior;
      }
    }
    return resultado;
  }
}

class NodoSimple<T> {
  valor: T;
  siguiente: NodoSimple<T> | null;
  constructor(valor: T, siguiente: NodoSimple<T> | null = null) {
    this.valor = valor;
    this.siguiente = siguiente;
  }
}

export class Pila<T> {
  private tope: NodoSimple<T> | null = null;
  private tam = 0;

  apilar(valor: T): void {
    this.tope = new NodoSimple(valor, this.tope);
    this.tam++;
  }

  desapilar(): T | null {
    if (this.tope === null) return null;
    const val = this.tope.valor;
    this.tope = this.tope.siguiente;
    this.tam--;
    return val;
  }

  estaVacia(): boolean {
    return this.tope === null;
  }

  limpiar(): void {
    this.tope = null;
    this.tam = 0;
  }

  aArreglo(): T[] {
    const arr: T[] = [];
    let actual = this.tope;
    while (actual !== null) {
      arr.push(actual.valor);
      actual = actual.siguiente;
    }
    return arr;
  }

  tamano(): number {
    return this.tam;
  }
}

export class Cola<T> {
  private frente: NodoSimple<T> | null = null;
  private final: NodoSimple<T> | null = null;
  private tam = 0;

  encolar(valor: T): void {
    const nuevo = new NodoSimple(valor, null);
    if (this.final === null) {
      this.frente = nuevo;
      this.final = nuevo;
    } else {
      this.final.siguiente = nuevo;
      this.final = nuevo;
    }
    this.tam++;
  }

  desencolar(): T | null {
    if (this.frente === null) return null;
    const val = this.frente.valor;
    this.frente = this.frente.siguiente;
    if (this.frente === null) {
      this.final = null;
    }
    this.tam--;
    return val;
  }

  estaVacia(): boolean {
    return this.frente === null;
  }

  tamano(): number {
    return this.tam;
  }
}

export function mergeSort<T>(arreglo: T[], menorQue: (a: T, b: T) => boolean): T[] {
  const n = arreglo.length;
  if (n <= 1) {
    return n === 1 ? [arreglo[0]] : [];
  }
  const mitad = Math.floor(n / 2);
  const izq: T[] = new Array(mitad);
  const der: T[] = new Array(n - mitad);
  for (let i = 0; i < mitad; i++) izq[i] = arreglo[i];
  for (let j = 0; j < n - mitad; j++) der[j] = arreglo[mitad + j];
  return mezclar(mergeSort(izq, menorQue), mergeSort(der, menorQue), menorQue);
}

function mezclar<T>(izq: T[], der: T[], menorQue: (a: T, b: T) => boolean): T[] {
  const res: T[] = new Array(izq.length + der.length);
  let i = 0;
  let j = 0;
  let k = 0;
  while (i < izq.length && j < der.length) {
    if (menorQue(izq[i], der[j])) {
      res[k++] = izq[i++];
    } else {
      res[k++] = der[j++];
    }
  }
  while (i < izq.length) res[k++] = izq[i++];
  while (j < der.length) res[k++] = der[j++];
  return res;
}

export function busquedaBinariaLimiteInferior(arregloOrdenado: string[], objetivo: string): number {
  let bajo = 0;
  let alto = arregloOrdenado.length;
  while (bajo < alto) {
    const medio = Math.floor((bajo + alto) / 2);
    if (arregloOrdenado[medio] < objetivo) {
      bajo = medio + 1;
    } else {
      alto = medio;
    }
  }
  return bajo;
}
