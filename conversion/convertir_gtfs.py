"""
Conversión del GTFS de TransMilenio (julio 2021, ~54 MB) a los 3 CSV que lee el motor.

    python conversion/convertir_gtfs.py GTFS-2021-07-14.zip datos/          (día hábil)
    python conversion/convertir_gtfs.py GTFS-2021-07-14.zip datos/ saturday (otro día)

El zip oficial (Secretaría de Movilidad, fuente TransMilenio) se descarga de:
    https://www.arcgis.com/sharing/rest/content/items/6def68cda70c43ab8d93d74f43c5915a/data
Solo usa la librería estándar de Python (csv, zipfile, re, unicodedata).

Genera en la carpeta de salida:
    estaciones.csv  -> nombre
    rutas.csv       -> ruta, orden, estacion
    horarios.csv    -> ruta, estacion, hora   (HH:MM)

Este script vive FUERA de motor/, así que aquí sí se permite cualquier librería.
Con el GTFS 2021-07-14 produce exactamente los mismos CSV que entregó el profesor
(147 estaciones, 181 rutas, 140.492 horarios).

Decisiones (van también al README):
 1. Solo rutas TRONCALES (routes.route_desc == "TRONCAL"). Alimentadores, urbanos,
    etc. no paran en estaciones de TransMilenio.
 2. Un solo día de servicio: un día hábil (lunes por defecto). Se toman los viajes
    cuyo service_id está activo ese día en calendar.txt.
 3. Estación = nombre de la parada sin el vagón/plataforma ("Calle 100 A - 2 ó 5" ->
    "CALLE 100", "Portal Sur T9" -> "PORTAL SUR"), en mayúsculas y sin tildes.
 4. Si un viaje para dos veces seguidas en la misma estación (dos vagones), se deja
    una sola parada con la primera hora.
 5. Viajes que cruzan la medianoche: el GTFS trae algunos con horas 00:xx y el
    stop_sequence corrido. Se reordenan por hora (sumando 24 h a las horas de
    madrugada) para recuperar el orden real del recorrido.
 6. Cada ruta va en un solo sentido: un mismo código (ej. "B74") con recorridos
    distintos se parte en variantes "B74-1", "B74-2"... numeradas de la más
    frecuente a la menos frecuente. Si solo tiene un recorrido, conserva el código.
 7. Viajes parciales (recorren un tramo continuo de un recorrido más largo, ej. un
    bus que sale a mitad de ruta) se cuentan como viajes de ese recorrido.
    Recorridos raros (menos de 3 viajes al día y que no son tramo de otro) se descartan.
 8. Hora = arrival_time truncada a minutos. Horas >= 24 del GTFS (ej. 25:10) se
    escriben módulo 24 (01:10): son buses de la madrugada del mismo día de servicio.
"""

import csv
import io
import re
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

DIAS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
MIN_VIAJES_RECORRIDO = 3


# ---------------------------------------------------------------- utilidades
def leer_tabla(zf, nombre):
    """Itera las filas de un .txt del GTFS como diccionarios (sin descomprimir a disco)."""
    with zf.open(nombre) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))


def nombre_estacion(stop_name):
    n = stop_name.replace("º", "").replace("°", "")
    n = unicodedata.normalize("NFKD", n)
    n = "".join(c for c in n if not unicodedata.combining(c))  # quita tildes, ñ->n, ç->c
    n = n.upper().strip()
    n = re.sub(r"\s+[A-Z]\s*-\s*\d.*$", "", n)  # vagón: "A - 2 ó 5", "B -1 ó 5"
    n = re.sub(r"\s+T\s*-?\s*\d.*$", "", n)  # plataforma de portal: "T-3B", "T9"
    return re.sub(r"\s+", " ", n).strip()


def a_segundos(hhmmss):
    h, m, s = hhmmss.strip().split(":")
    return int(h) * 3600 + int(m) * 60 + int(s)


def a_hhmm(hhmmss):
    h, m, _ = hhmmss.strip().split(":")
    return f"{int(h) % 24:02d}:{int(m):02d}"


def es_tramo(corto, largo):
    """True si 'corto' aparece como tramo continuo dentro de 'largo'."""
    n = len(corto)
    return n < len(largo) and any(largo[i:i + n] == corto for i in range(len(largo) - n + 1))


# ---------------------------------------------------------------- conversión
def convertir(ruta_zip, carpeta_salida, dia="monday"):
    zf = zipfile.ZipFile(ruta_zip)

    rutas_troncales = {
        r["route_id"]: r["route_short_name"].strip().upper()
        for r in leer_tabla(zf, "routes.txt")
        if r["route_desc"].strip().upper() == "TRONCAL"
    }
    servicios = {c["service_id"] for c in leer_tabla(zf, "calendar.txt") if c[dia] == "1"}

    viajes = {}  # trip_id -> codigo de ruta, en el orden de trips.txt
    for t in leer_tabla(zf, "trips.txt"):
        if t["route_id"] in rutas_troncales and t["service_id"] in servicios:
            viajes[t["trip_id"]] = rutas_troncales[t["route_id"]]

    paradas = {s["stop_id"]: nombre_estacion(s["stop_name"]) for s in leer_tabla(zf, "stops.txt")}

    # stop_times.txt pesa ~300 MB: se lee en streaming y solo se guardan los viajes troncales
    crudo = defaultdict(list)
    for st in leer_tabla(zf, "stop_times.txt"):
        if st["trip_id"] in viajes:
            crudo[st["trip_id"]].append((int(st["stop_sequence"]), st["arrival_time"], st["stop_id"]))

    # 1) secuencia de (estacion, hora) de cada viaje
    secuencias = {}
    for trip_id in viajes:
        filas = sorted(crudo.get(trip_id, []))
        if not filas:
            continue
        segs = [a_segundos(a) for _, a, _ in filas]
        if max(segs) >= 20 * 3600 and min(segs) < 4 * 3600:  # cruza la medianoche (decisión 5)
            ajustadas = [s + 86400 if s < 12 * 3600 else s for s in segs]
            filas = [f for _, f in sorted(zip(ajustadas, filas), key=lambda x: x[0])]
        seq = []
        for _, hora, stop_id in filas:
            est = paradas[stop_id]
            if seq and seq[-1][0] == est:  # mismo andén repetido (decisión 4)
                continue
            seq.append((est, hora))
        secuencias[trip_id] = seq

    # 2) agrupar viajes por (codigo, recorrido)
    viajes_por_patron = defaultdict(list)
    for trip_id, seq in secuencias.items():
        patron = tuple(e for e, _ in seq)
        viajes_por_patron[(viajes[trip_id], patron)].append(trip_id)

    patrones_por_codigo = defaultdict(list)
    for codigo, patron in viajes_por_patron:
        patrones_por_codigo[codigo].append(patron)

    # 3) recorridos principales y a cuál pertenece cada viaje (decisiones 6 y 7)
    nombre_de = {}  # (codigo, patron) -> nombre final de la ruta
    recorrido_de = {}  # nombre de ruta -> lista de estaciones
    for codigo, patrones in patrones_por_codigo.items():
        principales = [
            p for p in patrones
            if not any(es_tramo(p, q) for q in patrones)
            and len(viajes_por_patron[(codigo, p)]) >= MIN_VIAJES_RECORRIDO
        ]
        dueno = {}
        for p in patrones:
            if p in principales:
                dueno[p] = p
            else:
                contenedores = [q for q in principales if es_tramo(p, q)]
                if contenedores:
                    dueno[p] = contenedores[0]
        total = Counter()
        for p, q in dueno.items():
            total[q] += len(viajes_por_patron[(codigo, p)])
        # más viajes primero; empate: más viajes propios; luego orden de aparición (sort estable)
        orden = sorted(principales, key=lambda q: (-total[q], -len(viajes_por_patron[(codigo, q)])))
        nombre_variante = {}
        for i, q in enumerate(orden):
            nombre = codigo if len(orden) == 1 else f"{codigo}-{i + 1}"
            nombre_variante[q] = nombre
            recorrido_de[nombre] = list(q)
        for p, q in dueno.items():
            nombre_de[(codigo, p)] = nombre_variante[q]

    # 4) escribir CSV
    salida = Path(carpeta_salida)
    salida.mkdir(parents=True, exist_ok=True)

    estaciones = sorted({e for rec in recorrido_de.values() for e in rec})
    with open(salida / "estaciones.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["nombre"])
        w.writerows([e] for e in estaciones)

    with open(salida / "rutas.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ruta", "orden", "estacion"])
        for nombre in sorted(recorrido_de):
            for i, est in enumerate(recorrido_de[nombre], start=1):
                w.writerow([nombre, i, est])

    filas_horario = defaultdict(list)
    for trip_id, seq in secuencias.items():
        nombre = nombre_de.get((viajes[trip_id], tuple(e for e, _ in seq)))
        if nombre is None:
            continue  # recorrido raro descartado (decisión 7)
        for est, hora in seq:
            filas_horario[nombre].append((est, a_hhmm(hora)))
    total_horarios = 0
    with open(salida / "horarios.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ruta", "estacion", "hora"])
        for nombre in sorted(filas_horario):
            for est, hora in filas_horario[nombre]:
                w.writerow([nombre, est, hora])
                total_horarios += 1

    print(f"estaciones: {len(estaciones)} | rutas: {len(recorrido_de)} | horarios: {total_horarios}")
    print(f"CSV escritos en {salida.resolve()}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python convertir_gtfs.py <GTFS.zip> <carpeta_salida> [dia: monday..sunday]")
        sys.exit(1)
    dia = sys.argv[3].lower() if len(sys.argv) > 3 else "monday"
    if dia not in DIAS:
        sys.exit(f"Día inválido: {dia}. Usa uno de {DIAS}")
    convertir(sys.argv[1], sys.argv[2], dia)
