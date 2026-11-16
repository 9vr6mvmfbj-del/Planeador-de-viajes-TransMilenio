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
// Solo los nombres de un ranking (nombre, buses_por_dia).
static vector<string> nombresDe(const vector<std::pair<string, int>>& r) {
    vector<string> v;
    for (auto& p : r) v.push_back(p.first);
    return v;
}

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
    CHECK(red.proximo_bus("A", "R1", "23:50") == "23:50");  // el último bus del día: justo a la hora
    CHECK(red.proximo_bus("A", "R1", "23:51") == "");       // ya no hay más ese día: None (no da la vuelta)
    CHECK(red.proximo_bus("A", "R1", "00:00") == "05:30");  // el primero del día
    CHECK(red.proximo_bus("A", "R1", "7:05") == "23:50");   // hora sin cero a la izquierda
    CHECK(red.proximo_bus("c", "r2", "07:00") == "07:00");  // nombres en minúscula
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
    CHECK(nombresDe(red.ranking(2)) == V({"A", "C"}));
    CHECK(red.ranking(0).empty());
    CHECK(red.ranking(-3).empty());
    CHECK(red.ranking(1) == (vector<std::pair<string, int>>{{"A", 3}}));  // (nombre, buses_por_dia)
    CHECK(red.ranking(3) == (vector<std::pair<string, int>>{{"A", 3}, {"C", 3}, {"D", 2}}));  // empate: alfabético
    CHECK(red.ranking(100).size() == 11);  // k mayor que n: salen todas las abiertas (las de 0 buses al final)
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
    CHECK(nombresDe(red.ranking(1)) == V({"A"}));
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

static vector<int> ids(const vector<Red::Cambio>& v) {
    vector<int> r;
    for (const auto& c : v) r.push_back(c.id);
    return r;
}

static void pruebasAdmin() {
    std::printf("Panel de admin: crear/eliminar estaciones y líneas, deshacer cualquier cambio\n");
    {
        Red red("/tmp/red_pequena");
        // crear estación
        CHECK(red.crear_estacion(" nueva estacion "));
        CHECK(red.estado("NUEVA ESTACION") == "ABIERTA");
        CHECK(!red.crear_estacion("NUEVA ESTACION"));  // repetida
        CHECK(!red.crear_estacion("   "));
        CHECK(red.autocompletar("NUEVA", 3) == V({"NUEVA ESTACION"}));
        CHECK(red.rutas_de("NUEVA ESTACION").empty());
        CHECK(red.deshacer());
        CHECK(red.estado("NUEVA ESTACION") == "NO EXISTE");
        CHECK(red.autocompletar("NUEVA", 3).empty());
        CHECK(red.rehacer());
        CHECK(red.estado("NUEVA ESTACION") == "ABIERTA");
    }
    {
        Red red("/tmp/red_pequena");
        int est = red.num_estaciones();
        // eliminar estación: sale de todas sus rutas, de búsquedas, ranking y viajes
        CHECK(red.eliminar_estacion("C"));
        CHECK(!red.eliminar_estacion("C"));
        CHECK(red.estado("C") == "NO EXISTE");
        CHECK(red.num_estaciones() == est - 1);
        CHECK(red.recorrido("R1") == V({"A", "B", "D", "E"}));
        CHECK(red.recorrido("R2") == V({"X", "Y", "E"}));
        CHECK(nombresDe(red.ranking(2)) == V({"A", "D"}));
        Viaje v = red.viaje("X", "D");  // ya no hay transbordo en C: X -R2-> E -R3-> D
        CHECK(v.encontrado && v.paradas == 3 && v.transbordo() == "E");
        CHECK(red.proximo_bus("C", "R2", "06:00") == "");
        // deshacer: vuelve en su lugar exacto de cada ruta, con sus buses
        CHECK(red.deshacer());
        CHECK(red.estado("C") == "ABIERTA");
        CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "E"}));
        CHECK(red.recorrido("R2") == V({"X", "C", "Y", "E"}));
        CHECK(red.buses_dia("C") == 3);
        CHECK(nombresDe(red.ranking(2)) == V({"A", "C"}));
        CHECK(red.viaje("X", "D").paradas == 2);
        CHECK(red.proximo_bus("C", "R2", "06:00") == "07:00");
        CHECK(red.rehacer());
        CHECK(red.estado("C") == "NO EXISTE");
        CHECK(red.deshacer());
        // una estación cerrada que se elimina vuelve cerrada
        CHECK(red.cerrar("C"));
        CHECK(red.eliminar_estacion("C"));
        CHECK(red.deshacer());
        CHECK(red.estado("C") == "CERRADA");
        CHECK(red.recorrido("R2") == V({"X", "C", "Y", "E"}));
        CHECK(nombresDe(red.ranking(2)) == V({"A", "D"}));  // cerrada: sigue fuera del ranking
        CHECK(red.deshacer());                   // cerrar C
        CHECK(nombresDe(red.ranking(2)) == V({"A", "C"}));
        CHECK(red.eliminar_estacion("A"));       // la primera de R1
        CHECK(red.recorrido("R1") == V({"B", "C", "D", "E"}));
        CHECK(red.deshacer());
        CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "E"}));
    }
    {
        Red red("/tmp/red_pequena");
        int rutas = red.num_rutas(), horarios = red.num_horarios();
        // crear línea con horarios generados
        CHECK(!red.crear_ruta("R1", V({"A", "D"}), "06:00", "07:00", 10, 5));        // nombre repetido
        CHECK(!red.crear_ruta("NUEVA", V({"A"}), "06:00", "07:00", 10, 5));          // una sola parada
        CHECK(!red.crear_ruta("NUEVA", V({"A", "NADA"}), "06:00", "07:00", 10, 5));  // no existe
        CHECK(!red.crear_ruta("NUEVA", V({"A", "D", "A"}), "06:00", "07:00", 10, 5)); // repetida
        CHECK(!red.crear_ruta("NUEVA", V({"A", "D"}), "6h", "07:00", 10, 5));        // hora mala
        CHECK(!red.crear_ruta("NUEVA", V({"A", "D"}), "06:00", "07:00", 0, 5));      // frecuencia 0
        CHECK(red.num_rutas() == rutas);
        CHECK(red.crear_ruta("nueva", V({"A", "d", "X"}), "06:00", "06:20", 10, 5));
        CHECK(red.num_rutas() == rutas + 1);
        CHECK(red.num_horarios() == horarios + 9);
        CHECK(red.recorrido("NUEVA") == V({"A", "D", "X"}));
        CHECK(red.recorrido("NUEVA", true) == V({"X", "D", "A"}));
        CHECK(red.horarios("D", "NUEVA") == V({"06:05", "06:15", "06:25"}));
        CHECK(red.proximo_bus("D", "NUEVA", "06:06") == "06:15");
        CHECK(red.proximo_bus("X", "NUEVA", "07:00") == "");       // ya no hay más ese día
        CHECK(red.buses_dia("A") == 6);
        Viaje v = red.viaje("A", "X");
        CHECK(v.encontrado && v.paradas == 2 && v.tramos.size() == 1 && v.tramos[0].ruta == "NUEVA");
        CHECK(red.deshacer());
        CHECK(red.num_rutas() == rutas);
        CHECK(red.num_horarios() == horarios);
        CHECK(red.recorrido("NUEVA").empty());
        CHECK(red.proximo_bus("D", "NUEVA", "06:06") == "");
        CHECK(red.buses_dia("A") == 3);
        CHECK(red.rehacer());
        CHECK(red.recorrido("NUEVA") == V({"A", "D", "X"}));
        CHECK(red.buses_dia("A") == 6);
        // pasa la medianoche: los horarios quedan ordenados
        CHECK(red.crear_ruta("NOCHE", V({"A", "B"}), "23:50", "00:10", 10, 15));
        CHECK(red.horarios("B", "NOCHE") == V({"00:05", "00:15", "00:25"}));
        CHECK(red.proximo_bus("B", "NOCHE", "00:00") == "00:05");
    }
    {
        Red red("/tmp/red_pequena");
        int rutas = red.num_rutas();
        // eliminar línea
        CHECK(red.eliminar_ruta("R2"));
        CHECK(!red.eliminar_ruta("R2"));
        CHECK(red.num_rutas() == rutas - 1);
        CHECK(red.recorrido("R2").empty());
        CHECK(red.estado("X") == "ABIERTA");  // la estación sigue, solo sin esa línea
        CHECK(red.buses_dia("C") == 1);
        CHECK(!red.viaje("X", "D").encontrado);
        CHECK(red.rutas_de("C") == V({"R1"}));
        CHECK(red.deshacer());
        CHECK(red.recorrido("R2") == V({"X", "C", "Y", "E"}));
        CHECK(red.buses_dia("C") == 3);
        CHECK(red.viaje("X", "D").paradas == 2);
        CHECK(red.num_rutas() == rutas);
        // una línea eliminada y otra creada con el mismo nombre no se mezclan
        CHECK(red.eliminar_ruta("R3"));
        CHECK(red.crear_ruta("R3", V({"A", "B"}), "05:00", "05:00", 10, 1));
        CHECK(red.recorrido("R3") == V({"A", "B"}));
        CHECK(red.deshacer());
        CHECK(red.deshacer());
        CHECK(red.recorrido("R3") == V({"E", "D"}));
        CHECK(red.proximo_bus("E", "R3", "07:00") == "08:00");
    }
    {
        Red red("/tmp/red_pequena");
        // deshacer y rehacer cualquier cambio del historial
        CHECK(red.cerrar("A"));                    // id 1
        CHECK(red.quitar_parada("R1", "B"));       // id 2
        CHECK(red.crear_estacion("W"));            // id 3
        CHECK(red.agregar_parada("R1", "W", "D")); // id 4
        CHECK(red.cerrar("Y"));                    // id 5
        CHECK(ids(red.cambios_hechos()) == std::vector<int>({5, 4, 3, 2, 1}));
        auto h = red.cambios_hechos();
        CHECK(h[1].tipo == "AGREGAR" && h[1].estacion == "W" && h[1].ruta == "R1" && h[1].referencia == "D");
        CHECK(!red.deshacer_cambio(5));
        CHECK(!red.deshacer_cambio(-1));
        // deshacer solo "quitar B" (posición 3): B vuelve, todo lo demás sigue hecho
        CHECK(red.deshacer_cambio(3));
        CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "W", "E"}));
        CHECK(red.estado("A") == "CERRADA" && red.estado("Y") == "CERRADA" && red.estado("W") == "ABIERTA");
        CHECK(ids(red.cambios_hechos()) == std::vector<int>({5, 4, 3, 1}));
        CHECK(ids(red.cambios_deshechos()) == std::vector<int>({2}));
        // "crear W" no se puede deshacer solo: "agregar W" depende de él. No cambia nada.
        CHECK(!red.deshacer_cambio(2));
        CHECK(red.conflicto() == 4);
        CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "W", "E"}));
        CHECK(red.estado("W") == "ABIERTA");
        CHECK(ids(red.cambios_hechos()) == std::vector<int>({5, 4, 3, 1}));
        // rehacer "quitar B" aunque no sea lo último
        CHECK(red.rehacer_cambio(0));
        CHECK(red.recorrido("R1") == V({"A", "C", "D", "W", "E"}));
        CHECK(ids(red.cambios_hechos()) == std::vector<int>({2, 5, 4, 3, 1}));
        CHECK(!red.rehacer_cambio(0));
        // deshacer el más viejo (cerrar A): A se reabre, el resto sigue
        CHECK(red.deshacer_cambio(4));
        CHECK(red.estado("A") == "ABIERTA" && red.estado("Y") == "CERRADA");
        CHECK(red.recorrido("R1") == V({"A", "C", "D", "W", "E"}));
        // varios deshechos: rehacer el de abajo de la pila de rehacer
        CHECK(red.deshacer_cambio(0));  // quitar B -> pila de rehacer: [2, 1]
        CHECK(ids(red.cambios_deshechos()) == std::vector<int>({2, 1}));
        CHECK(red.rehacer_cambio(1));   // vuelve a cerrar A; "quitar B" sigue para rehacer
        CHECK(red.estado("A") == "CERRADA");
        CHECK(ids(red.cambios_deshechos()) == std::vector<int>({2}));
        CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "W", "E"}));
        // y el deshacer/rehacer normal (R9) sigue funcionando encima de todo esto
        CHECK(red.rehacer());
        CHECK(red.recorrido("R1") == V({"A", "C", "D", "W", "E"}));
        CHECK(red.deshacer());
        CHECK(red.recorrido("R1") == V({"A", "B", "C", "D", "W", "E"}));
        // un cambio nuevo borra lo que había para rehacer
        CHECK(red.cerrar("X"));
        CHECK(!red.puede_rehacer());
        CHECK(red.cambios_deshechos().empty());
    }
    {
        // Prueba al azar: muchas operaciones mezcladas y luego deshacer todo deja la red como al inicio.
        Red red("/tmp/red_pequena");
        std::mt19937 gen(7);
        vector<string> est = {"A", "B", "C", "D", "E", "X", "Y", "Z", "CALLE 26", "N1", "N2"};
        vector<string> rut = {"R1", "R2", "R3", "L1", "L2"};
        auto foto = [&]() {
            string s;
            for (const string& r : red.nombres_rutas()) { s += r + ":"; for (const string& e : red.recorrido(r)) s += e + ","; s += ";"; }
            for (const string& e : est) s += e + "=" + red.estado(e) + std::to_string(red.buses_dia(e)) + ";";
            for (const string& r : nombresDe(red.ranking(20))) s += r + ",";
            s += std::to_string(red.num_rutas()) + "/" + std::to_string(red.num_horarios()) + "/" + std::to_string(red.num_estaciones());
            return s;
        };
        string inicio = foto();
        int hechos = 0;
        for (int i = 0; i < 400; i++) {
            const string& e = est[gen() % est.size()];
            const string& e2 = est[gen() % est.size()];
            const string& r = rut[gen() % rut.size()];
            bool ok = false;
            switch (gen() % 9) {
                case 0: ok = red.cerrar(e); break;
                case 1: ok = red.reabrir(e); break;
                case 2: ok = red.quitar_parada(r, e); break;
                case 3: ok = red.agregar_parada(r, e, e2); break;
                case 4: ok = red.crear_estacion(e); break;
                case 5: ok = red.eliminar_estacion(e); break;
                case 6: ok = red.crear_ruta(r, V({e, e2}), "06:00", "07:00", 15, 3); break;
                case 7: ok = red.eliminar_ruta(r); break;
                case 8: {
                    int n = static_cast<int>(red.cambios_hechos().size());
                    if (n) red.deshacer_cambio(static_cast<int>(gen() % n));
                    break;
                }
            }
            if (ok) hechos++;
        }
        CHECK(hechos > 50);
        while (red.deshacer()) {}
        CHECK(foto() == inicio);
        while (red.rehacer()) {}
        while (red.deshacer()) {}
        CHECK(foto() == inicio);
    }
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
    pruebasAdmin();
    pruebasFila();
    pruebasViajeReal();
    std::printf("\n%d de %d pruebas pasaron%s\n", total - fallas, total, fallas ? "" : " ✔");
    return fallas ? 1 : 0;
}
