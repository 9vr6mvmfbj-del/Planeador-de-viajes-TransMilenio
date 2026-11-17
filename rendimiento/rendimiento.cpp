// Mide cómo crece el tiempo de cada operación con redes de 10.000, 20.000, 40.000 y 80.000 estaciones
// (el método del profesor: mediana de varias repeticiones y pendiente log-log).
// Uso: make rendimiento        (o ./build/rendimiento --json para la salida en JSON)
#include <cstdio>
#include <cstring>

#include "medicion.h"

int main(int argc, char** argv) {
    bool json = argc > 1 && std::strcmp(argv[1], "--json") == 0;
    medicion::Resultado r = medicion::medirCrecimiento({10000, 20000, 40000, 80000});
    if (json) {
        std::printf("%s\n", medicion::aJSON(r).c_str());
        return 0;
    }
    std::printf("Microsegundos por operación (mediana). Pendiente log-log: 0 = constante, 1 = lineal.\n");
    std::printf("Estaciones:");
    for (int t : r.estaciones) std::printf(" %d", t);
    std::printf("\nRed(carpeta) carga (ms):");
    for (double c : r.cargaMs) std::printf(" %.0f", c);
    std::printf("\n\n%-30s %-16s", "operación", "esperado");
    for (int t : r.estaciones) std::printf(" %10d", t);
    std::printf("  pendiente\n");
    for (auto& op : r.ops) {
        std::printf("%-30s %-16s", op.nombre, op.esperado);
        for (double t : op.tiempos) std::printf(" %10.3f", t);
        std::printf("  %8.2f\n", medicion::pendiente(r.estaciones, op.tiempos));
    }
    return 0;
}
