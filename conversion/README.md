# Conversión GTFS → CSV

Convierte el GTFS oficial de TransMilenio (julio 2021, ~54 MB) en los tres CSV que lee el motor:
`estaciones.csv`, `rutas.csv` y `horarios.csv` (quedan en `datos/`).

## Cómo correrlo

1. Descargar el zip oficial (Secretaría de Movilidad, fuente TransMilenio):
   https://www.arcgis.com/sharing/rest/content/items/6def68cda70c43ab8d93d74f43c5915a/data
   y guardarlo como `GTFS-2021-07-14.zip` en la raíz del repositorio.
2. Ejecutar:

```
python conversion/convertir_gtfs.py GTFS-2021-07-14.zip datos
```

Salida esperada: `estaciones: 147 | rutas: 181 | horarios: 140492`.
Solo usa la librería estándar de Python. El zip no se sube al repositorio.

## Decisiones

1. Solo rutas troncales (`route_desc == TRONCAL`).
2. Un día hábil (servicio activo el lunes en `calendar.txt`).
3. Estación = nombre de la parada sin vagón ni plataforma, en mayúsculas y sin tildes
   ("Calle 100 A - 2 ó 5" → `CALLE 100`, "Portal Sur T9" → `PORTAL SUR`).
4. Dos andenes seguidos de la misma estación en un viaje → una sola parada (primera hora).
5. Viajes que cruzan la medianoche vienen desordenados en el GTFS: se reordenan por hora.
6. Cada ruta va en un solo sentido: un código con varios recorridos se parte en `B74-1`, `B74-2`…,
   de la variante con más viajes a la de menos.
7. Viajes parciales (un tramo continuo de un recorrido) cuentan para ese recorrido; recorridos raros
   (menos de 3 viajes y que no son tramo de otro) se descartan.
8. Hora = `arrival_time` truncada a HH:MM. Horas ≥ 24 (ej. 25:10) se escriben módulo 24 (01:10).

Con el GTFS 2021-07-14 el resultado coincide exactamente con los CSV entregados por el profesor.
