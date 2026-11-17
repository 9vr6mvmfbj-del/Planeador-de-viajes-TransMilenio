// =============================================================================
// R10: simular_fila(llegadas, frecuencia, capacidad) — función suelta, fuera de Red.
//
//   llegadas   : segundo en que llega cada pasajero a la estación (uno por pasajero).
//   frecuencia : cada cuántos segundos sale un bus (buses en los segundos f, 2f, 3f, ...).
//   capacidad  : cupo de cada bus.
//
// Devuelve, en el mismo orden de 'llegadas', el segundo en que salió el bus de cada pasajero.
//
// Reglas: la gente sube en orden de llegada (FIFO; si dos llegan en el mismo segundo, sube primero el
// que aparece antes en la lista). Un pasajero que llega justo en el segundo de salida alcanza a subir.
// Un bus sale aunque no se llene. Si frecuencia <= 0 o capacidad <= 0 nadie puede subir y devuelve [].
//
// Estructura: Cola FIFO sobre arreglo circular (estructuras/pila_cola.h) + merge sort de las llegadas.
// Costo: O(P log P) por ordenar las llegadas (P = pasajeros) y O(P) por la simulación: cada pasajero
// entra y sale de la cola una sola vez y los buses sin nadie esperando se saltan. Si las llegadas ya
// vienen en orden no se ordena y todo es O(P).
// =============================================================================
#pragma once
#include <vector>

namespace motor {

std::vector<long long> simular_fila(const std::vector<long long>& llegadas, long long frecuencia, long long capacidad);

}  // namespace motor
