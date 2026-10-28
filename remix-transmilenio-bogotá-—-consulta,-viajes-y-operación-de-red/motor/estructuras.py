# Implementacion de estructuras de datos propias desde cero para el paquete motor/
# Reglas cumplidas:
# - Cero uso de dict, set, sorted(), .sort(), min(), max(), x in lista, .index(), .count()
# - Cero librerias externas ni bisect/heapq/collections/functools
# - Solo se usa list como arreglo indexado y nodos enlazados propios


class ArregloDinamico:
    """Arreglo dinamico redimensionable en O(1) amortizado usando solo list preasignada."""

    def __init__(self, capacidad_inicial=8):
        self._cap = capacidad_inicial if capacidad_inicial > 0 else 8
        self._tam = 0
        self._datos = [None] * self._cap

    def __len__(self):
        return self._tam

    def obtener(self, idx):
        return self._datos[idx]

    def asignar(self, idx, valor):
        self._datos[idx] = valor

    def agregar(self, valor):
        if self._tam == self._cap:
            nueva_cap = self._cap * 2
            nuevo = [None] * nueva_cap
            i = 0
            while i < self._tam:
                nuevo[i] = self._datos[i]
                i += 1
            self._datos = nuevo
            self._cap = nueva_cap
        self._datos[self._tam] = valor
        self._tam += 1

    def quitar_ultimo(self):
        if self._tam == 0:
            return None
        self._tam -= 1
        val = self._datos[self._tam]
        self._datos[self._tam] = None
        return val

    def a_lista_nativa(self):
        res = [None] * self._tam
        i = 0
        while i < self._tam:
            res[i] = self._datos[i]
            i += 1
        return res


class _NodoHash:
    def __init__(self, clave, valor, siguiente=None):
        self.clave = clave
        self.valor = valor
        self.siguiente = siguiente


class TablaHash:
    """Tabla Hash con encadenamiento separado y factor de carga controlado O(1) promedio."""

    def __init__(self, capacidad_inicial=64):
        self._cap = capacidad_inicial
        self._tam = 0
        self._cubetas = [None] * self._cap

    def _hash(self, clave):
        h = 5381
        texto = str(clave)
        for ch in texto:
            h = ((h * 33) + ord(ch)) & 0x7FFFFFFF
        return h % self._cap

    def _redimensionar(self):
        vieja_cap = self._cap
        viejas = self._cubetas
        self._cap = vieja_cap * 2
        self._cubetas = [None] * self._cap
        self._tam = 0
        i = 0
        while i < vieja_cap:
            actual = viejas[i]
            while actual is not None:
                self.insertar(actual.clave, actual.valor)
                actual = actual.siguiente
            i += 1

    def insertar(self, clave, valor):
        if (self._tam + 1) * 4 >= self._cap * 3:
            self._redimensionar()
        idx = self._hash(clave)
        actual = self._cubetas[idx]
        while actual is not None:
            if actual.clave == clave:
                actual.valor = valor
                return
            actual = actual.siguiente
        nuevo = _NodoHash(clave, valor, self._cubetas[idx])
        self._cubetas[idx] = nuevo
        self._tam += 1

    def obtener(self, clave):
        idx = self._hash(clave)
        actual = self._cubetas[idx]
        while actual is not None:
            if actual.clave == clave:
                return actual.valor
            actual = actual.siguiente
        return None

    def contiene(self, clave):
        idx = self._hash(clave)
        actual = self._cubetas[idx]
        while actual is not None:
            if actual.clave == clave:
                return True
            actual = actual.siguiente
        return False

    def eliminar(self, clave):
        idx = self._hash(clave)
        actual = self._cubetas[idx]
        previo = None
        while actual is not None:
            if actual.clave == clave:
                if previo is None:
                    self._cubetas[idx] = actual.siguiente
                else:
                    previo.siguiente = actual.siguiente
                self._tam -= 1
                return True
            previo = actual
            actual = actual.siguiente
        return False

    def claves(self):
        arr = ArregloDinamico(self._tam if self._tam > 0 else 8)
        i = 0
        while i < self._cap:
            actual = self._cubetas[i]
            while actual is not None:
                arr.agregar(actual.clave)
                actual = actual.siguiente
            i += 1
        return arr


class NodoDoble:
    def __init__(self, valor):
        self.valor = valor
        self.anterior = None
        self.siguiente = None


class ListaDobleRuta:
    """Lista doblemente enlazada apoyada en TablaHash para insercion/eliminacion en O(1)."""

    def __init__(self):
        self.cabeza = None
        self.cola = None
        self.tamano = 0
        self.nodos_por_estacion = TablaHash(32)

    def agregar_al_final(self, estacion):
        if self.nodos_por_estacion.contiene(estacion):
            return False
        nodo = NodoDoble(estacion)
        if self.cabeza is None:
            self.cabeza = nodo
            self.cola = nodo
        else:
            nodo.anterior = self.cola
            self.cola.siguiente = nodo
            self.cola = nodo
        self.nodos_por_estacion.insertar(estacion, nodo)
        self.tamano += 1
        return True

    def insertar_despues_de(self, nueva, despues_de):
        if self.nodos_por_estacion.contiene(nueva):
            return False
        nodo_ref = self.nodos_por_estacion.obtener(despues_de)
        if nodo_ref is None:
            return False
        nuevo = NodoDoble(nueva)
        sig = nodo_ref.siguiente
        nuevo.anterior = nodo_ref
        nuevo.siguiente = sig
        nodo_ref.siguiente = nuevo
        if sig is not None:
            sig.anterior = nuevo
        else:
            self.cola = nuevo
        self.nodos_por_estacion.insertar(nueva, nuevo)
        self.tamano += 1
        return True

    def insertar_al_inicio(self, nueva):
        if self.nodos_por_estacion.contiene(nueva):
            return False
        nuevo = NodoDoble(nueva)
        if self.cabeza is None:
            self.cabeza = nuevo
            self.cola = nuevo
        else:
            nuevo.siguiente = self.cabeza
            self.cabeza.anterior = nuevo
            self.cabeza = nuevo
        self.nodos_por_estacion.insertar(nueva, nuevo)
        self.tamano += 1
        return True

    def eliminar_estacion(self, estacion):
        nodo = self.nodos_por_estacion.obtener(estacion)
        if nodo is None:
            return None
        ant_nombre = nodo.anterior.valor if nodo.anterior is not None else None
        if nodo.anterior is not None:
            nodo.anterior.siguiente = nodo.siguiente
        else:
            self.cabeza = nodo.siguiente
        if nodo.siguiente is not None:
            nodo.siguiente.anterior = nodo.anterior
        else:
            self.cola = nodo.anterior
        self.nodos_por_estacion.eliminar(estacion)
        self.tamano -= 1
        return (True, ant_nombre)

    def recorrer(self, al_reves=False):
        res = [None] * self.tamano
        idx = 0
        if not al_reves:
            actual = self.cabeza
            while actual is not None:
                res[idx] = actual.valor
                idx += 1
                actual = actual.siguiente
        else:
            actual = self.cola
            while actual is not None:
                res[idx] = actual.valor
                idx += 1
                actual = actual.anterior
        return res


class _NodoSimple:
    def __init__(self, valor, siguiente=None):
        self.valor = valor
        self.siguiente = siguiente


class Pila:
    """Pila LIFO en O(1) para Deshacer/Rehacer (R9)."""

    def __init__(self):
        self._tope = None
        self._tam = 0

    def apilar(self, valor):
        self._tope = _NodoSimple(valor, self._tope)
        self._tam += 1

    def desapilar(self):
        if self._tope is None:
            return None
        val = self._tope.valor
        self._tope = self._tope.siguiente
        self._tam -= 1
        return val

    def esta_vacia(self):
        return self._tope is None

    def limpiar(self):
        self._tope = None
        self._tam = 0


class Cola:
    """Cola FIFO en O(1) para BFS (R5) y Simulador de Fila (R10)."""

    def __init__(self):
        self._frente = None
        self._final = None
        self._tam = 0

    def encolar(self, valor):
        nuevo = _NodoSimple(valor, None)
        if self._final is None:
            self._frente = nuevo
            self._final = nuevo
        else:
            self._final.siguiente = nuevo
            self._final = nuevo
        self._tam += 1

    def desencolar(self):
        if self._frente is None:
            return None
        val = self._frente.valor
        self._frente = self._frente.siguiente
        if self._frente is None:
            self._final = None
        self._tam -= 1
        return val

    def esta_vacia(self):
        return self._frente is None

    def __len__(self):
        return self._tam


def merge_sort(arreglo, func_menor_que):
    """Ordenamiento MergeSort propio en O(N log N) sin usar sorted() ni .sort()."""
    n = len(arreglo)
    if n <= 1:
        copia = [None] * n
        if n == 1:
            copia[0] = arreglo[0]
        return copia
    mitad = n // 2
    izq = [None] * mitad
    der = [None] * (n - mitad)
    i = 0
    while i < mitad:
        izq[i] = arreglo[i]
        i += 1
    j = 0
    while mitad + j < n:
        der[j] = arreglo[mitad + j]
        j += 1
    izq_ord = merge_sort(izq, func_menor_que)
    der_ord = merge_sort(der, func_menor_que)
    return _mezclar(izq_ord, der_ord, func_menor_que)


def _mezclar(izq, der, func_menor_que):
    n_izq = len(izq)
    n_der = len(der)
    res = [None] * (n_izq + n_der)
    i = 0
    j = 0
    k = 0
    while i < n_izq and j < n_der:
        if func_menor_que(izq[i], der[j]):
            res[k] = izq[i]
            i += 1
        else:
            res[k] = der[j]
            j += 1
        k += 1
    while i < n_izq:
        res[k] = izq[i]
        i += 1
        k += 1
    while j < n_der:
        res[k] = der[j]
        j += 1
        k += 1
    return res


def busqueda_binaria_limite_inferior(arreglo_ordenado, objetivo):
    """Devuelve el primer indice i tal que arreglo_ordenado[i] >= objetivo en O(log N)."""
    bajo = 0
    alto = len(arreglo_ordenado)
    while bajo < alto:
        medio = (bajo + alto) // 2
        if arreglo_ordenado[medio] < objetivo:
            bajo = medio + 1
        else:
            alto = medio
    return bajo
