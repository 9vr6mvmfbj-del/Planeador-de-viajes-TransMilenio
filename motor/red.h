// =============================================================================
// Red: el motor del planeador de viajes TransMilenio.
//
// Contrato del enunciado (mismos nombres y parámetros):
//   Red(carpeta)                                 carga estaciones.csv, rutas.csv, horarios.csv
//   red.estado(nombre)                           R1
//   red.autocompletar(prefijo, k)                R2
//   red.rango(desde, hasta)                      R3
//   red.proximo_bus(estacion, ruta, hora)        R4
//   red.viaje(origen, destino)                   R5
//   red.ranking(k)                               R6
//   red.agregar_parada(ruta, nueva, despues_de)  R7
//   red.quitar_parada(ruta, estacion)            R7
//   red.recorrido(ruta, al_reves = false)        R7
//   red.cerrar(nombre), red.reabrir(nombre)      R8
//   red.deshacer(), red.rehacer()                R9
//   simular_fila(llegadas, frecuencia, capacidad) R10 (función suelta, en fila.h)
//
// Reglas del motor: no se usa ninguna estructura ni algoritmo de la librería
// estándar (unordered_map, map, set, sort, find, queue, stack, list, ...).
// Solo std::vector como arreglo y std::string. Todo lo demás está en estructuras/.
// =============================================================================
#pragma once
#include <cstdint>
#include <string>
#include <vector>

#include "estructuras/avl.h"
#include "estructuras/lista_ruta.h"
#include "estructuras/pila_cola.h"
#include "estructuras/tabla_hash.h"

namespace motor {

// Respuestas de R1.
extern const char* const ABIERTA;    // "ABIERTA"
extern const char* const CERRADA;    // "CERRADA"
extern const char* const NO_EXISTE;  // "NO EXISTE"

// Un tramo de viaje: subir en 'sube', bajar en 'baja' por la ruta 'ruta'.
struct Tramo {
    std::string ruta;
    std::string sube;
    std::string baja;
    int paradas;  // paradas recorridas en este tramo
};

// Resultado de R5.
struct Viaje {
    bool encontrado = false;
    int paradas = 0;           // total de paradas recorridas
    std::vector<Tramo> tramos; // 1 tramo = directo, 2 tramos = con transbordo
    std::string transbordo() const { return tramos.size() == 2 ? tramos[0].baja : ""; }
};

class Red {
public:
    explicit Red(const std::string& carpeta);

    // Igual que Red(carpeta) pero recibiendo el contenido de los 3 CSV (la usa la app web).
    static Red desdeTexto(const std::string& estacionesCsv, const std::string& rutasCsv,
                          const std::string& horariosCsv);

    // ---- R1 a R10 (contrato) ----
    std::string estado(const std::string& nombre) const;
    std::vector<std::string> autocompletar(const std::string& prefijo, int k) const;
    std::vector<std::string> rango(const std::string& desde, const std::string& hasta) const;
    std::string proximo_bus(const std::string& estacion, const std::string& ruta,
                            const std::string& hora) const;
    Viaje viaje(const std::string& origen, const std::string& destino) const;
    std::vector<std::string> ranking(int k) const;
    bool agregar_parada(const std::string& ruta, const std::string& nueva,
                        const std::string& despues_de);
    bool quitar_parada(const std::string& ruta, const std::string& estacion);
    std::vector<std::string> recorrido(const std::string& ruta, bool al_reves = false) const;
    bool cerrar(const std::string& nombre);
    bool reabrir(const std::string& nombre);
    bool deshacer();
    bool rehacer();

    // ---- Consultas extra para la app (no son parte del contrato) ----
    int buses_dia(const std::string& nombre) const;              // -1 si no existe
    std::vector<std::string> rutas_de(const std::string& estacion) const;
    std::vector<std::string> horarios(const std::string& estacion, const std::string& ruta) const;
    std::vector<std::string> nombres_rutas() const;
    int num_estaciones() const { return estacionesExistentes_; }
    int num_estaciones_abiertas() const { return arbolNombres_.tamano(); }
    int num_rutas() const { return static_cast<int>(rutas_.size()); }
    int num_horarios() const { return totalHorarios_; }
    bool puede_deshacer() const { return !pilaDeshacer_.vacia(); }
    bool puede_rehacer() const { return !pilaRehacer_.vacia(); }

private:
    Red() = default;
    void cargar(const std::string& estacionesCsv, const std::string& rutasCsv,
                const std::string& horariosCsv);

    struct Estacion {
        std::string nombre;
        bool existe = true;     // false si se creó con agregar_parada y luego se deshizo
        bool abierta = true;
        int buses = 0;          // buses por día que paran aquí (suma de horarios de rutas activas)
        std::vector<int> rutas; // rutas que pasan por aquí (para R5)
    };
    struct Ruta {
        std::string nombre;
        int lista;  // índice en listas_
    };
    struct ClaveRanking {
        int buses;
        std::string nombre;
    };
    struct MenorNombre {
        static bool menor(const std::string& a, const std::string& b) { return a < b; }
    };
    struct MenorRanking {  // más buses primero; empate: orden alfabético
        static bool menor(const ClaveRanking& a, const ClaveRanking& b) {
            if (a.buses != b.buses) return a.buses > b.buses;
            return a.nombre < b.nombre;
        }
    };
    enum TipoOp { OP_CERRAR, OP_REABRIR, OP_AGREGAR, OP_QUITAR };
    struct Operacion {
        TipoOp tipo;
        int estacion;
        int ruta = -1;
        int referencia = -1;  // AGREGAR: estación 'despues_de'. QUITAR: estación anterior (-1 = era la primera)
        bool creoEstacion = false;
    };

    static uint64_t par(int ruta, int estacion) {
        return (static_cast<uint64_t>(static_cast<uint32_t>(ruta)) << 32) | static_cast<uint32_t>(estacion);
    }
    int idEstacion(const std::string& nombreNormalizado) const;
    int idRuta(const std::string& nombreNormalizado) const;
    int crearEstacion(const std::string& nombre);
    int crearRuta(const std::string& nombre);
    void meterEnArboles(int e);
    void sacarDeArboles(int e);
    void sumarBuses(int e, int delta);
    int cantidadHorarios(int ruta, int estacion) const;

    // Operaciones primitivas: las usan tanto las públicas como deshacer/rehacer.
    void ponerAbierta(int e, bool abierta);
    void insertarParada(int r, int e, int previoEstacion);  // previoEstacion = -1: al inicio
    void borrarParada(int r, int e);
    void revivirEstacion(int e);
    void borrarEstacion(int e);
    void aplicar(const Operacion& op, bool alReves);
    void registrar(const Operacion& op);

    std::vector<Estacion> estaciones_;
    std::vector<Ruta> rutas_;
    ListasDeRutas listas_;
    TablaHash<std::string, int> idEstacion_{256};
    TablaHash<std::string, int> idRuta_{256};
    TablaHash<uint64_t, int> nodoDe_{4096};      // (ruta, estación) -> nodo en la lista de la ruta
    TablaHash<uint64_t, int> horariosDe_{4096};  // (ruta, estación) -> índice en horarios_
    std::vector<std::vector<int>> horarios_;     // minutos del día (0..1439), ordenados
    ArbolAVL<std::string, MenorNombre> arbolNombres_;
    ArbolAVL<ClaveRanking, MenorRanking> arbolRanking_;
    Pila<Operacion> pilaDeshacer_;
    Pila<Operacion> pilaRehacer_;
    int estacionesExistentes_ = 0;
    int totalHorarios_ = 0;

    // Arreglos de trabajo de R5 (se reutilizan entre consultas, marcados con 'ronda').
    mutable std::vector<int> marca_, mejorDist_, mejorRuta_, segDist_, segRuta_;
    mutable int ronda_ = 0;
};

// Utilidades compartidas.
std::string normalizar(const std::string& s);  // quita espacios de los lados y pasa a MAYÚSCULAS
int aMinutos(const std::string& hora);         // "HH:MM" -> minutos 0..1439 (horas >= 24 se toman módulo 24); -1 si es inválida
std::string aHora(int minutos);                // minutos -> "HH:MM"

}  // namespace motor
