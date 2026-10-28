#include "fila.h"

#include "estructuras/orden.h"
#include "estructuras/pila_cola.h"

namespace motor {

ResultadoFila simular_fila(const std::vector<long long>& llegadas, long long frecuencia, long long capacidad) {
    ResultadoFila res;
    if (llegadas.empty() || frecuencia <= 0 || capacidad <= 0) return res;

    // Si las llegadas no vienen en orden, se ordena una copia (merge sort, estable).
    const std::vector<long long>* datos = &llegadas;
    std::vector<long long> copia;
    for (size_t i = 1; i < llegadas.size(); i++) {
        if (llegadas[i] < llegadas[i - 1]) {
            copia = llegadas;
            ordenarMezcla(copia, [](long long a, long long b) { return a < b; });
            datos = &copia;
            break;
        }
    }
    const std::vector<long long>& L = *datos;
    long long P = static_cast<long long>(L.size());

    Cola<long long> fila(1024);
    long long siguiente = 0;  // próximo pasajero por llegar
    long long salida = 0;     // minuto del próximo bus
    long long sumaEspera = 0;

    while (siguiente < P || !fila.vacia()) {
        if (fila.vacia()) {
            // Nadie esperando: saltar al primer bus en o después de la próxima llegada.
            long long t = L[siguiente];
            long long bus = (t >= 0 ? (t + frecuencia - 1) / frecuencia : -((-t) / frecuencia)) * frecuencia;
            if (bus > salida) salida = bus;
        }
        while (siguiente < P && L[siguiente] <= salida) fila.encolar(L[siguiente++]);

        long long cupo = capacidad;
        while (cupo > 0 && !fila.vacia()) {
            long long espera = salida - fila.desencolar();
            sumaEspera += espera;
            if (espera > res.espera_maxima) res.espera_maxima = espera;
            cupo--;
        }
        res.buses++;
        if (cupo == 0) res.buses_llenos++;
        res.ultima_salida = salida;
        salida += frecuencia;
    }
    res.pasajeros = P;
    res.espera_promedio = static_cast<double>(sumaEspera) / static_cast<double>(P);
    return res;
}

}  // namespace motor
