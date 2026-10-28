from .estructuras import Cola


def simular_fila(llegadas, frecuencia, capacidad):
    """
    R10: Simula la fila de abordaje en hora pico en orden estricto FIFO (O(1) por operacion).
    Parametros:
      - llegadas: arreglo/lista de enteros donde llegadas[t] indica cuantos pasajeros llegan en el minuto t,
                  o lista de tiempos de llegada de pasajeros.
      - frecuencia: cada cuantos minutos pasa un bus (entero > 0).
      - capacidad: cupo maximo de pasajeros por bus (entero > 0).
    Retorna diccionario/estructura o tupla de metricas de abordaje segun convencion.
    """
    cola_pasajeros = Cola()
    total_abordados = 0
    buses_despachados = 0
    espera_acumulada = 0
    historial_ciclos = []

    n = len(llegadas)
    minuto = 0
    while minuto < n:
        nuevos = llegadas[minuto]
        p = 0
        while p < nuevos:
            cola_pasajeros.encolar(minuto)
            p += 1

        abordaron_en_minuto = 0
        if frecuencia > 0 and ((minuto + 1) % frecuencia == 0 or minuto == 0):
            buses_despachados += 1
            cupo = capacidad
            while cupo > 0 and not cola_pasajeros.esta_vacia():
                minuto_llegada = cola_pasajeros.desencolar()
                espera_acumulada += (minuto - minuto_llegada)
                abordaron_en_minuto += 1
                total_abordados += 1
                cupo -= 1

        historial_ciclos.append((minuto, nuevos, abordaron_en_minuto, len(cola_pasajeros)))
        minuto += 1

    return (total_abordados, len(cola_pasajeros), buses_despachados, espera_acumulada, historial_ciclos)
