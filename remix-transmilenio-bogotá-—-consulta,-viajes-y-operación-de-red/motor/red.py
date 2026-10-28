import csv
from .estructuras import (
    ArregloDinamico,
    TablaHash,
    ListaDobleRuta,
    Pila,
    Cola,
    merge_sort,
    busqueda_binaria_limite_inferior,
)


def _a_minutos(hora_str):
    partes = hora_str.strip().split(":")
    if len(partes) != 2:
        return 0
    return int(partes[0]) * 60 + int(partes[1])


class _InfoEstacion:
    def __init__(self, nombre):
        self.nombre = nombre
        self.abierta = True
        self.buses_dia = 0


class Red:
    """
    Motor de la Red de TransMilenio (Requisitos R1 a R9).
    Cumple todas las restricciones de estructuras de datos manuales y complejidad.
    """

    def __init__(self, carpeta):
        self.estaciones_hash = TablaHash(256)
        self.nombres_estaciones_ord = []
        self.rutas_hash = TablaHash(128)
        self.horarios_hash = TablaHash(512)
        self.pila_deshacer = Pila()
        self.pila_rehacer = Pila()
        self._ranking_cache = None

        self._cargar_csvs(carpeta)

    def _cargar_csvs(self, carpeta):
        ruta_base = carpeta.rstrip("/\\")
        # 1. Cargar estaciones.csv
        lista_est = ArregloDinamico(128)
        with open(ruta_base + "/estaciones.csv", mode="r", encoding="utf-8") as f:
            lector = csv.reader(f)
            encabezado = True
            for fila in lector:
                if encabezado:
                    encabezado = False
                    continue
                if len(fila) > 0:
                    nom = fila[0].strip().upper()
                    if nom != "" and not self.estaciones_hash.contiene(nom):
                        self.estaciones_hash.insertar(nom, _InfoEstacion(nom))
                        lista_est.agregar(nom)

        self.nombres_estaciones_ord = merge_sort(
            lista_est.a_lista_nativa(), lambda a, b: a < b
        )

        # 2. Cargar rutas.csv
        temp_rutas = TablaHash(128)
        with open(ruta_base + "/rutas.csv", mode="r", encoding="utf-8") as f:
            lector = csv.reader(f)
            encabezado = True
            for fila in lector:
                if encabezado:
                    encabezado = False
                    continue
                if len(fila) >= 3:
                    r_nom = fila[0].strip().upper()
                    orden = int(fila[1].strip())
                    est_nom = fila[2].strip().upper()
                    if not self.estaciones_hash.contiene(est_nom):
                        self.estaciones_hash.insertar(est_nom, _InfoEstacion(est_nom))
                    arr = temp_rutas.obtener(r_nom)
                    if arr is None:
                        arr = ArregloDinamico(32)
                        temp_rutas.insertar(r_nom, arr)
                    arr.agregar((orden, est_nom))

        claves_r = temp_rutas.claves()
        i = 0
        while i < len(claves_r):
            r_nom = claves_r.obtener(i)
            pares = temp_rutas.obtener(r_nom).a_lista_nativa()
            pares_ord = merge_sort(pares, lambda a, b: a[0] < b[0])
            lista_doble = ListaDobleRuta()
            j = 0
            while j < len(pares_ord):
                lista_doble.agregar_al_final(pares_ord[j][1])
                j += 1
            self.rutas_hash.insertar(r_nom, lista_doble)
            i += 1

        # 3. Cargar horarios.csv
        temp_horarios = TablaHash(512)
        with open(ruta_base + "/horarios.csv", mode="r", encoding="utf-8") as f:
            lector = csv.reader(f)
            encabezado = True
            for fila in lector:
                if encabezado:
                    encabezado = False
                    continue
                if len(fila) >= 3:
                    r_nom = fila[0].strip().upper()
                    est_nom = fila[1].strip().upper()
                    hora_txt = fila[2].strip()
                    clave_re = est_nom + "|" + r_nom
                    arr = temp_horarios.obtener(clave_re)
                    if arr is None:
                        arr = ArregloDinamico(32)
                        temp_horarios.insertar(clave_re, arr)
                    arr.agregar((_a_minutos(hora_txt), hora_txt))

                    info_est = self.estaciones_hash.obtener(est_nom)
                    if info_est is not None:
                        info_est.buses_dia += 1

        claves_h = temp_horarios.claves()
        k = 0
        while k < len(claves_h):
            clave_re = claves_h.obtener(k)
            arr_h = temp_horarios.obtener(clave_re).a_lista_nativa()
            arr_ord = merge_sort(arr_h, lambda a, b: a[0] < b[0])
            self.horarios_hash.insertar(clave_re, arr_ord)
            k += 1

    # R1: Estado de una estacion en O(1) promedio
    def estado(self, nombre):
        nom = nombre.strip().upper()
        info = self.estaciones_hash.obtener(nom)
        if info is None:
            return "NO EXISTE"
        return "ABIERTA" if info.abierta else "CERRADA"

    # R2: Autocompletar nombres de estaciones abiertas por prefijo en orden alfabetico
    def autocompletar(self, prefijo, k):
        pref = prefijo.strip().upper()
        if k <= 0:
            return []
        idx = busqueda_binaria_limite_inferior(self.nombres_estaciones_ord, pref)
        res = ArregloDinamico(k)
        n = len(self.nombres_estaciones_ord)
        while idx < n and len(res) < k:
            candidato = self.nombres_estaciones_ord[idx]
            if not candidato.startswith(pref):
                break
            info = self.estaciones_hash.obtener(candidato)
            if info is not None and info.abierta:
                res.agregar(candidato)
            idx += 1
        return res.a_lista_nativa()

    # R3: Listar estaciones abiertas en un rango alfabetico [desde, hasta]
    def rango(self, desde, hasta):
        d = desde.strip().upper()
        h = hasta.strip().upper()
        if d > h:
            return []
        idx = busqueda_binaria_limite_inferior(self.nombres_estaciones_ord, d)
        res = ArregloDinamico(32)
        n = len(self.nombres_estaciones_ord)
        while idx < n:
            actual = self.nombres_estaciones_ord[idx]
            if actual > h:
                break
            info = self.estaciones_hash.obtener(actual)
            if info is not None and info.abierta:
                res.agregar(actual)
            idx += 1
        return res.a_lista_nativa()

    # R4: Proximo bus usando busqueda binaria O(log H)
    def proximo_bus(self, estacion, ruta, hora):
        est = estacion.strip().upper()
        rut = ruta.strip().upper()
        info = self.estaciones_hash.obtener(est)
        if info is None or not info.abierta:
            return None
        clave_re = est + "|" + rut
        horarios = self.horarios_hash.obtener(clave_re)
        if horarios is None or len(horarios) == 0:
            return None
        objetivo_min = _a_minutos(hora)
        bajo = 0
        alto = len(horarios)
        while bajo < alto:
            medio = (bajo + alto) // 2
            if horarios[medio][0] < objetivo_min:
                bajo = medio + 1
            else:
                alto = medio
        if bajo < len(horarios):
            return horarios[bajo][1]
        return None

    # R5: Planear viaje directo o con maximo 1 transbordo con menos paradas
    def viaje(self, origen, destino):
        orig = origen.strip().upper()
        dest = destino.strip().upper()
        info_o = self.estaciones_hash.obtener(orig)
        info_d = self.estaciones_hash.obtener(dest)
        if info_o is None or info_d is None or not info_o.abierta or not info_d.abierta:
            return None
        if orig == dest:
            return {"tipo": "DIRECTO", "rutas": [], "paradas": [orig], "total_paradas": 0}

        mejor_plan = None
        claves_r = self.rutas_hash.claves()
        num_rutas = len(claves_r)

        # 1. Evaluar viajes directos (0 transbordos)
        i = 0
        while i < num_rutas:
            r_nom = claves_r.obtener(i)
            paradas = self.rutas_hash.obtener(r_nom).recorrer(False)
            pos_o = -1
            pos_d = -1
            p = 0
            while p < len(paradas):
                if paradas[p] == orig:
                    pos_o = p
                elif paradas[p] == dest and pos_o != -1:
                    pos_d = p
                    break
                p += 1
            if pos_o != -1 and pos_d != -1 and pos_d > pos_o:
                tramo = []
                k = pos_o
                while k <= pos_d:
                    tramo.append(paradas[k])
                    k += 1
                num_p = pos_d - pos_o
                if mejor_plan is None or num_p < mejor_plan["total_paradas"]:
                    mejor_plan = {
                        "tipo": "DIRECTO",
                        "rutas": [r_nom],
                        "transbordo": None,
                        "paradas": tramo,
                        "total_paradas": num_p,
                    }
            i += 1

        # 2. Evaluar viajes con 1 transbordo en estacion abierta
        i = 0
        while i < num_rutas:
            r1 = claves_r.obtener(i)
            paradas1 = self.rutas_hash.obtener(r1).recorrer(False)
            pos_o = -1
            p = 0
            while p < len(paradas1):
                if paradas1[p] == orig:
                    pos_o = p
                    break
                p += 1
            if pos_o != -1:
                j = 0
                while j < num_rutas:
                    if i != j:
                        r2 = claves_r.obtener(j)
                        paradas2 = self.rutas_hash.obtener(r2).recorrer(False)
                        pos_d = -1
                        q = 0
                        while q < len(paradas2):
                            if paradas2[q] == dest:
                                pos_d = q
                                break
                            q += 1
                        if pos_d > 0:
                            idx_t1 = pos_o + 1
                            while idx_t1 < len(paradas1):
                                est_t = paradas1[idx_t1]
                                info_t = self.estaciones_hash.obtener(est_t)
                                if info_t is not None and info_t.abierta:
                                    idx_t2 = 0
                                    while idx_t2 < pos_d:
                                        if paradas2[idx_t2] == est_t:
                                            total_p = (idx_t1 - pos_o) + (pos_d - idx_t2)
                                            if (
                                                mejor_plan is None
                                                or total_p < mejor_plan["total_paradas"]
                                            ):
                                                secuencia = []
                                                a = pos_o
                                                while a <= idx_t1:
                                                    secuencia.append(paradas1[a])
                                                    a += 1
                                                b = idx_t2 + 1
                                                while b <= pos_d:
                                                    secuencia.append(paradas2[b])
                                                    b += 1
                                                mejor_plan = {
                                                    "tipo": "TRANSBORDO",
                                                    "rutas": [r1, r2],
                                                    "transbordo": est_t,
                                                    "paradas": secuencia,
                                                    "total_paradas": total_p,
                                                }
                                            break
                                        idx_t2 += 1
                                idx_t1 += 1
                    j += 1
            i += 1

        return mejor_plan

    # R6: Top k estaciones abiertas con mas buses al dia (con cache precalculado)
    def ranking(self, k):
        if k <= 0:
            return []
        if self._ranking_cache is None:
            abiertas = ArregloDinamico(len(self.nombres_estaciones_ord))
            i = 0
            while i < len(self.nombres_estaciones_ord):
                nom = self.nombres_estaciones_ord[i]
                info = self.estaciones_hash.obtener(nom)
                if info is not None and info.abierta:
                    abiertas.agregar((info.buses_dia, nom))
                i += 1
            self._ranking_cache = merge_sort(
                abiertas.a_lista_nativa(),
                lambda a, b: (a[0] > b[0]) if a[0] != b[0] else (a[1] < b[1]),
            )
        limite = k if k < len(self._ranking_cache) else len(self._ranking_cache)
        res = [None] * limite
        idx = 0
        while idx < limite:
            res[idx] = self._ranking_cache[idx][1]
            idx += 1
        return res

    # R7: Editar rutas y consultar recorrido
    def agregar_parada(self, ruta, nueva, despues_de):
        r_nom = ruta.strip().upper()
        n_nom = nueva.strip().upper()
        d_nom = despues_de.strip().upper()
        lista = self.rutas_hash.obtener(r_nom)
        if lista is None:
            return False
        if not self.estaciones_hash.contiene(n_nom):
            self.estaciones_hash.insertar(n_nom, _InfoEstacion(n_nom))
            arr = ArregloDinamico(len(self.nombres_estaciones_ord) + 1)
            i = 0
            while i < len(self.nombres_estaciones_ord):
                arr.agregar(self.nombres_estaciones_ord[i])
                i += 1
            arr.agregar(n_nom)
            self.nombres_estaciones_ord = merge_sort(arr.a_lista_nativa(), lambda a, b: a < b)
        exito = lista.insertar_despues_de(n_nom, d_nom)
        if exito:
            self.pila_deshacer.apilar(("AGREGAR_PARADA", r_nom, n_nom, d_nom))
            self.pila_rehacer.limpiar()
            self._ranking_cache = None
        return exito

    def quitar_parada(self, ruta, estacion):
        r_nom = ruta.strip().upper()
        e_nom = estacion.strip().upper()
        lista = self.rutas_hash.obtener(r_nom)
        if lista is None:
            return False
        res = lista.eliminar_estacion(e_nom)
        if res is not None and res[0]:
            ant_nom = res[1]
            self.pila_deshacer.apilar(("QUITAR_PARADA", r_nom, e_nom, ant_nom))
            self.pila_rehacer.limpiar()
            self._ranking_cache = None
            return True
        return False

    def recorrido(self, ruta, al_reves=False):
        r_nom = ruta.strip().upper()
        lista = self.rutas_hash.obtener(r_nom)
        if lista is None:
            return []
        return lista.recorrer(al_reves)

    # R8: Cerrar y reabrir estaciones
    def cerrar(self, nombre):
        nom = nombre.strip().upper()
        info = self.estaciones_hash.obtener(nom)
        if info is None or not info.abierta:
            return False
        info.abierta = False
        self.pila_deshacer.apilar(("CERRAR", nom))
        self.pila_rehacer.limpiar()
        self._ranking_cache = None
        return True

    def reabrir(self, nombre):
        nom = nombre.strip().upper()
        info = self.estaciones_hash.obtener(nom)
        if info is None or info.abierta:
            return False
        info.abierta = True
        self.pila_deshacer.apilar(("REABRIR", nom))
        self.pila_rehacer.limpiar()
        self._ranking_cache = None
        return True

    # R9: Deshacer y rehacer operaciones
    def deshacer(self):
        if self.pila_deshacer.esta_vacia():
            return False
        accion = self.pila_deshacer.desapilar()
        tipo = accion[0]
        if tipo == "CERRAR":
            nom = accion[1]
            info = self.estaciones_hash.obtener(nom)
            if info is not None:
                info.abierta = True
        elif tipo == "REABRIR":
            nom = accion[1]
            info = self.estaciones_hash.obtener(nom)
            if info is not None:
                info.abierta = False
        elif tipo == "AGREGAR_PARADA":
            r_nom, n_nom, _ = accion[1], accion[2], accion[3]
            lista = self.rutas_hash.obtener(r_nom)
            if lista is not None:
                lista.eliminar_estacion(n_nom)
        elif tipo == "QUITAR_PARADA":
            r_nom, e_nom, ant_nom = accion[1], accion[2], accion[3]
            lista = self.rutas_hash.obtener(r_nom)
            if lista is not None:
                if ant_nom is None:
                    lista.insertar_al_inicio(e_nom)
                else:
                    lista.insertar_despues_de(e_nom, ant_nom)
        self.pila_rehacer.apilar(accion)
        self._ranking_cache = None
        return True

    def rehacer(self):
        if self.pila_rehacer.esta_vacia():
            return False
        accion = self.pila_rehacer.desapilar()
        tipo = accion[0]
        if tipo == "CERRAR":
            nom = accion[1]
            info = self.estaciones_hash.obtener(nom)
            if info is not None:
                info.abierta = False
        elif tipo == "REABRIR":
            nom = accion[1]
            info = self.estaciones_hash.obtener(nom)
            if info is not None:
                info.abierta = True
        elif tipo == "AGREGAR_PARADA":
            r_nom, n_nom, d_nom = accion[1], accion[2], accion[3]
            lista = self.rutas_hash.obtener(r_nom)
            if lista is not None:
                lista.insertar_despues_de(n_nom, d_nom)
        elif tipo == "QUITAR_PARADA":
            r_nom, e_nom, _ = accion[1], accion[2], accion[3]
            lista = self.rutas_hash.obtener(r_nom)
            if lista is not None:
                lista.eliminar_estacion(e_nom)
        self.pila_deshacer.apilar(accion)
        self._ranking_cache = None
        return True
