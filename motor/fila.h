// =============================================================================
// R10: simular_fila(llegadas, frecuencia, capacidad) — función suelta, fuera de Red.
//
//   llegadas   : minuto en que llega cada pasajero a la estación (uno por pasajero).
//   frecuencia : cada cuántos minutos sale un bus (buses en los minutos 0, f, 2f, ...).
//   capacidad  : cupo de cada bus.
//
// Reglas: los pasajeros suben en orden de llegada (FIFO); un pasajero que llega
// justo en el minuto de salida alcanza a subir; un bus sale aunque no se llene.
// Los buses que pasarían sin nadie esperando no se cuentan (la simulación salta
// directamente al siguiente bus útil), así el costo no depende de cuántas horas dure.
//
// Estructura: Cola FIFO sobre arreglo circular (estructuras/pila_cola.h).
// Costo: O(P) con P = número de pasajeros si las llegadas vienen en orden
// (cada pasajero entra y sale de la cola una sola vez). Si vienen desordenadas
// se ordenan primero con merge sort: O(P log P).
// =============================================================================
#pragma once
#include <vector>

namespace motor {

struct ResultadoFila {
    long long pasajeros = 0;      // pasajeros atendidos
    long long buses = 0;          // buses que salieron con al menos un pasajero
    double espera_promedio = 0;   // minutos
    long long espera_maxima = 0;  // minutos
    long long ultima_salida = 0;  // minuto en que sale el último bus
    long long buses_llenos = 0;   // buses que salieron sin cupo
};

ResultadoFila simular_fila(const std::vector<long long>& llegadas, long long frecuencia, long long capacidad);

}  // namespace motor
