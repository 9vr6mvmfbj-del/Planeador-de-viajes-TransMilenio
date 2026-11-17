#include "fila.h"

#include "estructuras/orden.h"
#include "estructuras/pila_cola.h"

namespace motor {

namespace {
struct Llegada {
    long long segundo;
    int pasajero;  // posición original en 'llegadas'
};
}  // namespace

std::vector<long long> simular_fila(const std::vector<long long>& llegadas, long long frecuencia, long long capacidad) {
    std::vector<long long> salidas;
    if (frecuencia <= 0 || capacidad <= 0) return salidas;
    int P = static_cast<int>(llegadas.size());
    salidas.assign(P, 0);
    if (P == 0) return salidas;

    // 1) Pasajeros en orden de llegada. Merge sort estable: el empate conserva el orden de la lista.
    std::vector<Llegada> orden(P);
    bool ordenadas = true;
    for (int i = 0; i < P; i++) {
        orden[i] = Llegada{llegadas[i], i};
        if (i > 0 && llegadas[i] < llegadas[i - 1]) ordenadas = false;
    }
    if (!ordenadas) ordenarMezcla(orden, [](const Llegada& a, const Llegada& b) { return a.segundo < b.segundo; });

    // 2) La fila es una cola FIFO: los pasajeros entran al llegar y cada bus saca hasta 'capacidad'.
    Cola<int> fila(1024);
    int siguiente = 0;           // próximo pasajero por llegar
    long long bus = frecuencia;  // segundo del próximo bus: f, 2f, 3f, ...
    while (siguiente < P || !fila.vacia()) {
        if (fila.vacia()) {
            // Nadie esperando: saltar al primer bus que sale en o después de la próxima llegada.
            long long t = orden[siguiente].segundo;
            long long k = t <= 0 ? 1 : (t + frecuencia - 1) / frecuencia;
            if (k * frecuencia > bus) bus = k * frecuencia;
        }
        while (siguiente < P && orden[siguiente].segundo <= bus) fila.encolar(orden[siguiente++].pasajero);

        long long cupo = capacidad;
        while (cupo > 0 && !fila.vacia()) {
            salidas[fila.desencolar()] = bus;
            cupo--;
        }
        bus += frecuencia;
    }
    return salidas;
}

}  // namespace motor
