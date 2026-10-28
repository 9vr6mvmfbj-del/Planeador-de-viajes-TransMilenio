// Mide cómo crece el tiempo de cada operación al duplicar la red (método del Taller 1).
// Uso: make rendimiento        (o ./build/rendimiento --json para la salida en JSON)
#include <cstdio>
#include <cstring>

#include "medicion.h"

int main(int argc, char** argv) {
    bool json = argc > 1 && std::strcmp(argv[1], "--json") == 0;
    medicion::Resultado r = medicion::medirCrecimiento({1, 2, 4, 8, 16});
    if (json) {
        std::printf("%s\n", medicion::aJSON(r).c_str());
        return 0;
    }
    std::printf("Microsegundos por operación (mejor de 9). Entre paréntesis: cuánto creció al duplicar la red.\n");
    std::printf("Estaciones por escala:");
    for (int t : r.estaciones) std::printf(" %d", t);
    std::printf("   (R10: 100k, 200k, ... pasajeros)\n\n");
    std::printf("%-28s %-16s", "operación", "esperado");
    for (int esc : r.escalas) std::printf("   n×%-2d          ", esc);
    std::printf("\n");
    for (auto& op : r.ops) {
        std::printf("%-28s %-16s", op.nombre, op.esperado);
        for (size_t i = 0; i < op.tiempos.size(); i++) {
            if (i == 0) std::printf(" %9.3f        ", op.tiempos[i]);
            else std::printf(" %9.3f (x%.2f)", op.tiempos[i], op.tiempos[i] / op.tiempos[i - 1]);
        }
        std::printf("\n");
    }
    return 0;
}
