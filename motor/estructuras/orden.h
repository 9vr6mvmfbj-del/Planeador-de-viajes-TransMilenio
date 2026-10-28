// =============================================================================
// Ordenamiento y búsqueda hechos a mano (sesiones 5 y 7).
//
//   ordenarMezcla : merge sort estable, O(n log n) en TODOS los casos.
//                   Se usa solo al cargar los CSV (ordenar paradas por 'orden' y
//                   horarios por hora) y en R10 si las llegadas vienen desordenadas.
//                   Se descartó quicksort: su peor caso es O(n²) justo con datos
//                   ya ordenados, que es como suelen venir los horarios.
//   primeraPosicionNoMenor : búsqueda binaria del límite inferior, O(log n).
// =============================================================================
#pragma once
#include <vector>

namespace motor {

// Menor: función/lambda bool(const T&, const T&). Estable: ante empate conserva el orden original.
template <typename T, typename Menor>
void ordenarMezcla(std::vector<T>& a, Menor menor) {
    int n = static_cast<int>(a.size());
    if (n < 2) return;
    std::vector<T> aux(n);
    // Versión iterativa (de abajo hacia arriba): mezcla bloques de 1, 2, 4, ...
    for (int ancho = 1; ancho < n; ancho *= 2) {
        for (int izq = 0; izq < n - ancho; izq += 2 * ancho) {
            int mitad = izq + ancho;
            int der = izq + 2 * ancho < n ? izq + 2 * ancho : n;
            int i = izq, j = mitad, k = izq;
            while (i < mitad && j < der) {
                if (menor(a[j], a[i])) aux[k++] = a[j++];  // estrictamente menor: estable
                else aux[k++] = a[i++];
            }
            while (i < mitad) aux[k++] = a[i++];
            while (j < der) aux[k++] = a[j++];
            for (int t = izq; t < der; t++) a[t] = aux[t];
        }
    }
}

// Primer índice i tal que !(a[i] < x). Si todos son menores devuelve a.size().
template <typename T>
int primeraPosicionNoMenor(const std::vector<T>& a, const T& x) {
    int bajo = 0, alto = static_cast<int>(a.size());
    while (bajo < alto) {
        int medio = bajo + (alto - bajo) / 2;
        if (a[medio] < x) bajo = medio + 1;
        else alto = medio;
    }
    return bajo;
}

}  // namespace motor
