// Pruebas del motor. Compilar y correr:  make pruebas
// (Este archivo está FUERA de motor/, así que aquí sí se usa la STL libremente.)
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <map>
#include <random>
#include <set>
#include <string>
#include <vector>

#include "../motor/motor.h"

using namespace motor;
using std::string;
using std::vector;

static int fallas = 0, total = 0;
#define CHECK(cond)                                                              \
    do {                                                                         \
        total++;                                                                 \
        if (!(cond)) { fallas++; std::printf("  FALLA línea %d: %s\n", __LINE__, #cond); } \
    } while (0)

static vector<string> V(std::initializer_list<string> l) { return vector<string>(l); }

static void escribir(const string& ruta, const string& texto) {
    std::ofstream f(ruta, std::ios::binary);
    f << texto;
}

// Red pequeña hecha a mano para probar cada regla.
//   R1: A B C D E      R2: X C Y E      R3: E D (sentido contrario)
static void redPequena(const string& carpeta) {
    if (std::system(("mkdir -p " + carpeta).c_str()) != 0) std::printf("no se pudo crear %s\n", carpeta.c_str());
    escribir(carpeta + "/estaciones.csv", "nombre\nA\nB\nC\nD\nE\nX\nY\nCALLE 26\nCALLE 30\nCALLE 80\nZ\n");
    escribir(carpeta + "/rutas.csv",
             "ruta,orden,estacion\nR1,1,A\nR1,2,B\nR1,3,C\nR1,4,D\nR1,5,E\n"
             "R2,2,C\nR2,1,X\nR2,3,Y\nR2,4,E\nR3,1,E\nR3,2,D\n");  // R2 viene desordenada a propósito
    escribir(carpeta + "/horarios.csv",
             "ruta,estacion,hora\nR1,A,06:00\nR1,A,05:30\nR1,A,23:50\nR1,B,06:05\nR1,C,06:10\n"
             "R2,C,07:00\nR2,C,25:10\nR2,X,06:50\nR3,E,08:00\nR3,D,08:05\nR1,D,06:15\n");
}

static void pruebasBasicas() {
    std::printf("Red pequeña\n");
    redPequena("/tmp/red_pequena");
    Red red("/tmp/red_pequena");

    // R1
    CHECK(red.estado("A") == "ABIERTA");
    CHECK(red.estado(" a ") == "ABIERTA");  // normaliza espacios y mayúsculas
    CHECK(red.estado("NADA") == "NO EXISTE");
    // R2
    CHECK(red.autocompletar("CALLE", 2) == V({"CALLE 26", "CALLE 30"}));
    CHECK(red.autocompletar("CALLE", 10) == V({"CALLE 26", "CALLE 30", "CALLE 80"}));
    CHECK(red.autocompletar("CALLE", 0).empty());
    CHECK(red.autocompletar("Q", 5).empty());
    CHECK(red.autocompletar("", 3) == V({"A", "B", "C"}));
    // R3
    CHECK(red.rango("B", "D") == V({"B", "C", "CALLE 26", "CALLE 30", "CALLE 80", "D"}));
    CHECK(red.rango("CALLE 26", "CALLE 30") == V({"CALLE 26", "CALLE 30"}));
    CHECK(red.rango("D", "B").empty());
    CHECK(red.rango("BB", "BZ").empty());
    // R4 (horarios desordenados en el CSV; 25:10 -> 01:10)
    CHECK(red.proximo_bus("A", "R1", "05:00") == "05:30");
    CHECK(red.proximo_bus("A", "R1", "05:30") == "05:30");  // justo a la hora: alcanza
    CHECK(red.proximo_bus("A", "R1", "05:31") == "06:00");
    CHECK(red.proximo_bus("A", "R1", "23:55") == "05:30");  // ya no hay: el primero del día
    CHECK(red.proximo_bus("C", "R2", "00:30") == "01:10");
    CHECK(red.proximo_bus("C", "R2", "02:00") == "07:00");
    CHECK(red.proximo_bus("E", "R1", "06:00") == "");       // no hay horarios
    CHECK(red.proximo_bus("A", "R2", "06:00") == "");       // R2 no para en A
    CHECK(red.proximo_bus("A", "NOEXISTE", "06:00") == "");
    CHECK(red.proximo_bus("A", "R1", "hora mala") == "");
    // R5
    Viaje v = red.viaje("A", "D");
    CHECK(v.encontrado && v.paradas == 3 && v.tramos.size() == 1 && v.tramos[0].ruta == "R1");
    v = red.viaje("X", "D");  // X -R2-> C -R1-> D  (1 + 1 = 2)  vs  X -R2-> E -R3-> D (3 + 1 = 4)
    CHECK(v.encontrado && v.paradas == 2 && v.tramos.size() == 2 && v.transbordo() == "C");
    v = red.viaje("D", "A");  // no hay forma de volver
    CHECK(!v.encontrado);
    v = red.viaje("A", "A");
    CHECK(v.encontrado && v.paradas == 0);
    // R6 (A: 3 buses; C: 3 (R1 06:10 + R2 07:00 y 01:10); E: 1; D: 2; B: 1; X: 1)
    CHECK(red.ranking(2) == V({"A", "C"}));
    CHECK(red.ranking(0).empty());
    CHECK(red.buses_dia("D") == 2);
    // R7
    CHECK(red.recorrido("R2") == V({"X", "C", "Y", "E"}));
    CHECK(red.recorrido("R2", true) == V({"E", "Y", "C", "X"}));
    CHECK(red.recorrido("NADA").empty());
}

static void pruebasOperacion() {
    std::printf("Cerrar, editar, deshacer y rehacer\n");
    Red red("/tmp/red_pequena");

    // R8: cerrada desaparece de todo
    CHECK(red.cerrar("C"));
    CHECK(!red.cerrar("C"));          // ya estaba cerrada
    CHECK(!red.cerrar("NADA"));
    CHECK(red.estado("C") == "CERRADA");
    CHECK(red.autocompletar("C", 5) == V({"CALLE 26", "CALLE 30", "CALLE 80"}));
    CHECK(red.rango("B", "CZ") == V({"B", "CALLE 26", "CALLE 30", "CALLE 80"}));
    CHECK(red.ranking(1) == V({"A"}));
    CHECK(red.proximo_bus("C", "R1", "06:00") == "");  // nadie sube en una cerrada
    Viaje v = red.viaje("X", "D");                       // ya no se puede transbordar en C
    CHECK(v.encontrado && v.paradas == 4 && v.transbordo() == "E");
    CHECK(!red.viaje("C", "D").encontrado);              // ni subir
    CHECK(red.viaje("A", "D").encontrado);               // pero el bus sí pasa por C
    CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "E"}));

    // R9
    CHECK(red.deshacer());
    CHECK(red.estado("C") == "ABIERTA");
    CHECK(red.viaje("X", "D").paradas == 2);
    CHECK(red.rehacer());
    CHECK(red.estado("C") == "CERRADA");
    CHECK(!red.rehacer());  // no hay más
    CHECK(red.reabrir("C"));
    CHECK(!red.reabrir("C"));

    // R7: quitar y agregar
    CHECK(red.quitar_parada("R1", "B"));
    CHECK(!red.quitar_parada("R1", "B"));
    CHECK(red.recorrido("R1") == V({"A", "C", "D", "E"}));
    CHECK(red.buses_dia("B") == 0);                   // sus horarios de R1 ya no cuentan
    CHECK(red.proximo_bus("B", "R1", "06:00") == "");
    CHECK(red.quitar_parada("R1", "A"));              // quitar la primera
    CHECK(red.recorrido("R1") == V({"C", "D", "E"}));
    CHECK(red.agregar_parada("R1", "Z", "E"));        // agregar al final
    CHECK(red.recorrido("R1") == V({"C", "D", "E", "Z"}));
    CHECK(!red.agregar_parada("R1", "Z", "C"));       // ya está
    CHECK(!red.agregar_parada("R1", "Y", "A"));       // A ya no está en R1
    CHECK(!red.agregar_parada("NADA", "Y", "C"));
    CHECK(red.agregar_parada("R2", "NUEVA", "X"));    // estación nueva en la red
    CHECK(red.estado("NUEVA") == "ABIERTA");
    CHECK(red.recorrido("R2") == V({"X", "NUEVA", "C", "Y", "E"}));
    CHECK(red.autocompletar("NU", 3) == V({"NUEVA"}));

    // Deshacer todo en orden inverso
    CHECK(red.deshacer());  // agregar NUEVA
    CHECK(red.estado("NUEVA") == "NO EXISTE");
    CHECK(red.recorrido("R2") == V({"X", "C", "Y", "E"}));
    CHECK(red.deshacer());  // agregar Z
    CHECK(red.deshacer());  // quitar A -> vuelve al inicio
    CHECK(red.recorrido("R1") == V({"A", "C", "D", "E"}));
    CHECK(red.deshacer());  // quitar B -> vuelve después de A
    CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "E"}));
    CHECK(red.buses_dia("B") == 1);
    CHECK(red.proximo_bus("B", "R1", "06:00") == "06:05");
    CHECK(red.deshacer());  // reabrir C -> C queda cerrada
    CHECK(red.estado("C") == "CERRADA");
    CHECK(red.deshacer());  // cerrar C (el rehacer de antes) -> abierta
    CHECK(red.estado("C") == "ABIERTA");
    CHECK(!red.deshacer());

    // Rehacer todo
    for (int i = 0; i < 6; i++) CHECK(red.rehacer());
    CHECK(!red.rehacer());
    CHECK(red.estado("NUEVA") == "ABIERTA");
    CHECK(red.recorrido("R2") == V({"X", "NUEVA", "C", "Y", "E"}));
    CHECK(red.recorrido("R1") == V({"C", "D", "E", "Z"}));

    // Un cambio nuevo borra el rehacer
    CHECK(red.deshacer());
    CHECK(red.cerrar("Y"));
    CHECK(!red.rehacer());
}

static void pruebasFila() {
    std::printf("Fila de abordaje\n");
    ResultadoFila r = simular_fila({0, 0, 1, 2, 3, 10, 10, 10}, 5, 2);
    CHECK(r.pasajeros == 8 && r.buses == 4 && r.espera_maxima == 7 && r.espera_promedio == 3.0);
    r = simular_fila({10, 0, 0, 3, 2, 1, 10, 10}, 5, 2);  // desordenadas: mismo resultado
    CHECK(r.pasajeros == 8 && r.buses == 4 && r.espera_maxima == 7 && r.espera_promedio == 3.0);
    r = simular_fila({}, 5, 2);
    CHECK(r.pasajeros == 0 && r.buses == 0);
    r = simular_fila({1, 2}, 0, 2);
    CHECK(r.buses == 0);
    r = simular_fila({1000000}, 7, 1);  // salta directo al bus útil
    CHECK(r.buses == 1 && r.ultima_salida == 1000006 && r.espera_maxima == 6);
    vector<long long> muchos(300000);
    for (size_t i = 0; i < muchos.size(); i++) muchos[i] = static_cast<long long>(i / 50);  // 50 por minuto
    r = simular_fila(muchos, 3, 150);  // llegan 150 cada 3 min y cabe 150: nadie se queda
    // el bus del minuto 0 lleva 50 y el último (minuto 6000) lleva 100; los demás salen llenos
    CHECK(r.pasajeros == 300000 && r.buses == 2001 && r.buses_llenos == 1999 && r.espera_maxima == 2);
}

// R5 contra fuerza bruta en la red real: el mejor viaje encontrado debe ser óptimo.
static void pruebasViajeReal() {
    std::printf("R5 contra fuerza bruta (red real)\n");
    Red red("datos");
    vector<string> rutas = red.nombres_rutas();
    std::map<string, vector<string>> rec;
    for (auto& r : rutas) rec[r] = red.recorrido(r);
    vector<string> est = red.rango("", "~");
    std::mt19937 gen(7);
    int comparados = 0;
    for (int caso = 0; caso < 400; caso++) {
        if (caso == 200) {  // a mitad, cerrar algunas estaciones grandes
            red.cerrar("RICAURTE"); red.cerrar("AV. JIMENEZ"); red.cerrar("CALLE 76");
            est = red.rango("", "~");
        }
        string o = est[gen() % est.size()], d = est[gen() % est.size()];
        if (o == d) continue;
        int mejor = 1 << 30;
        for (auto& A : rutas) {
            auto& la = rec[A];
            for (size_t i = 0; i < la.size(); i++) {
                if (la[i] != o) continue;
                for (size_t j = i + 1; j < la.size(); j++) {
                    if (la[j] == d && (int)(j - i) < mejor) mejor = j - i;
                    if (red.estado(la[j]) != "ABIERTA") continue;
                    for (auto& B : rutas) {
                        if (B == A) continue;
                        auto& lb = rec[B];
                        for (size_t p = 0; p < lb.size(); p++) {
                            if (lb[p] != la[j]) continue;
                            for (size_t q = p + 1; q < lb.size(); q++)
                                if (lb[q] == d && (int)(j - i + q - p) < mejor) mejor = j - i + q - p;
                        }
                    }
                }
            }
        }
        Viaje v = red.viaje(o, d);
        if (mejor == (1 << 30)) CHECK(!v.encontrado);
        else { CHECK(v.encontrado && v.paradas == mejor); comparados++; }
    }
    std::printf("  %d viajes comparados\n", comparados);
}

int main() {
    pruebasBasicas();
    pruebasOperacion();
    pruebasFila();
    pruebasViajeReal();
    std::printf("\n%d de %d pruebas pasaron%s\n", total - fallas, total, fallas ? "" : " ✔");
    return fallas ? 1 : 0;
}
