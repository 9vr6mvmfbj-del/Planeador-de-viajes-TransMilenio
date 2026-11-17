// Puente entre el motor en C++ y la app web (JavaScript).
// Se compila a WebAssembly con:  make wasm   ->  web/public/motor.wasm
// Cada función recibe textos (char*) y devuelve un JSON (char*) que JavaScript lee.
// Este archivo NO es parte de motor/: solo traduce llamadas, no tiene lógica de requisitos.
#include <cstdlib>
#include <string>
#include <vector>

#include "../motor/motor.h"
#include "../rendimiento/medicion.h"

using namespace motor;

// El motor se compila sin excepciones; libc++ pide estos dos símbolos al enlazar.
extern "C" void* __cxa_allocate_exception(size_t) { abort(); }
extern "C" void __cxa_throw(void*, void*, void (*)(void*)) { abort(); }

static Red* red = nullptr;
static std::string salida;

static std::string esc(const std::string& s) {
    std::string r = "\"";
    for (char c : s) {
        if (c == '"' || c == '\\') { r += '\\'; r += c; }
        else if (c == '\n') r += "\\n";
        else r += c;
    }
    return r + "\"";
}
static std::string lista(const std::vector<std::string>& v) {
    std::string r = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) r += ","; r += esc(v[i]); }
    return r + "]";
}
static const char* devolver(const std::string& s) { salida = s; return salida.c_str(); }
static const char* booleano(bool b) { return devolver(b ? "true" : "false"); }
static std::string resumen() {
    return "{\"estaciones\":" + std::to_string(red->num_estaciones()) +
           ",\"abiertas\":" + std::to_string(red->num_estaciones_abiertas()) +
           ",\"rutas\":" + std::to_string(red->num_rutas()) +
           ",\"horarios\":" + std::to_string(red->num_horarios()) +
           ",\"puedeDeshacer\":" + (red->puede_deshacer() ? "true" : "false") +
           ",\"puedeRehacer\":" + (red->puede_rehacer() ? "true" : "false") + "}";
}

#define EXPORTAR __attribute__((visibility("default")))
extern "C" {

EXPORTAR const char* m_cargar(const char* e, const char* r, const char* h) {
    delete red;
    red = new Red(Red::desdeTexto(e, r, h));
    return devolver(resumen());
}
EXPORTAR const char* m_resumen() { return devolver(resumen()); }

EXPORTAR const char* m_estado(const char* n) { return devolver(esc(red->estado(n))); }
EXPORTAR const char* m_autocompletar(const char* p, int k) { return devolver(lista(red->autocompletar(p, k))); }
EXPORTAR const char* m_rango(const char* d, const char* h) { return devolver(lista(red->rango(d, h))); }
// R4: "" del motor (no hay más buses ese día) llega a JavaScript como null, el None del contrato.
EXPORTAR const char* m_proximo_bus(const char* e, const char* r, const char* h) {
    std::string b = red->proximo_bus(e, r, h);
    return devolver(b.empty() ? std::string("null") : esc(b));
}

EXPORTAR const char* m_viaje(const char* o, const char* d) {
    Viaje v = red->viaje(o, d);
    std::string s = "{\"encontrado\":" + std::string(v.encontrado ? "true" : "false") +
                    ",\"paradas\":" + std::to_string(v.paradas) + ",\"tramos\":[";
    for (size_t i = 0; i < v.tramos.size(); i++) {
        const Tramo& t = v.tramos[i];
        if (i) s += ",";
        s += "{\"ruta\":" + esc(t.ruta) + ",\"sube\":" + esc(t.sube) + ",\"baja\":" + esc(t.baja) +
             ",\"paradas\":" + std::to_string(t.paradas) + ",\"recorrido\":" + lista(red->recorrido(t.ruta)) + "}";
    }
    return devolver(s + "]}");
}

EXPORTAR const char* m_ranking(int k) {
    std::vector<std::pair<std::string, int>> v = red->ranking(k);
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) {
        if (i) s += ",";
        s += "{\"nombre\":" + esc(v[i].first) + ",\"buses\":" + std::to_string(v[i].second) + "}";
    }
    return devolver(s + "]");
}

EXPORTAR const char* m_agregar_parada(const char* r, const char* n, const char* d) { return booleano(red->agregar_parada(r, n, d)); }
EXPORTAR const char* m_quitar_parada(const char* r, const char* e) { return booleano(red->quitar_parada(r, e)); }
EXPORTAR const char* m_recorrido(const char* r, int al_reves) { return devolver(lista(red->recorrido(r, al_reves != 0))); }
EXPORTAR const char* m_cerrar(const char* n) { return booleano(red->cerrar(n)); }
EXPORTAR const char* m_reabrir(const char* n) { return booleano(red->reabrir(n)); }
EXPORTAR const char* m_deshacer() { return booleano(red->deshacer()); }
EXPORTAR const char* m_rehacer() { return booleano(red->rehacer()); }

EXPORTAR const char* m_estacion(const char* n) {
    std::string s = "{\"nombre\":" + esc(normalizar(n)) + ",\"estado\":" + esc(red->estado(n)) +
                    ",\"buses\":" + std::to_string(red->buses_dia(n)) + ",\"rutas\":" + lista(red->rutas_de(n)) + "}";
    return devolver(s);
}
// ---- panel de admin ----
static std::vector<std::string> partir(const std::string& s, char sep) {
    std::vector<std::string> v;
    std::string actual;
    for (char c : s) {
        if (c == sep) { v.push_back(actual); actual.clear(); }
        else actual += c;
    }
    if (!actual.empty()) v.push_back(actual);
    return v;
}
static std::string cambios(const std::vector<Red::Cambio>& v) {
    std::string s = "[";
    for (size_t i = 0; i < v.size(); i++) {
        const Red::Cambio& c = v[i];
        if (i) s += ",";
        s += "{\"id\":" + std::to_string(c.id) + ",\"tipo\":" + esc(c.tipo) + ",\"estacion\":" + esc(c.estacion) +
             ",\"ruta\":" + esc(c.ruta) + ",\"referencia\":" + esc(c.referencia) +
             ",\"cantidad\":" + std::to_string(c.cantidad) + "}";
    }
    return s + "]";
}
EXPORTAR const char* m_crear_estacion(const char* n) { return booleano(red->crear_estacion(n)); }
EXPORTAR const char* m_eliminar_estacion(const char* n) { return booleano(red->eliminar_estacion(n)); }
// 'paradas' llega separado por '|' (ningún nombre de estación lo usa)
EXPORTAR const char* m_crear_ruta(const char* r, const char* paradas, const char* primera, const char* ultima, int frecuencia, int entre) {
    return booleano(red->crear_ruta(r, partir(paradas, '|'), primera, ultima, frecuencia, entre));
}
EXPORTAR const char* m_eliminar_ruta(const char* r) { return booleano(red->eliminar_ruta(r)); }
EXPORTAR const char* m_deshacer_cambio(int i) { return booleano(red->deshacer_cambio(i)); }
EXPORTAR const char* m_rehacer_cambio(int i) { return booleano(red->rehacer_cambio(i)); }
EXPORTAR const char* m_historial() {
    return devolver("{\"hechos\":" + cambios(red->cambios_hechos()) + ",\"deshechos\":" + cambios(red->cambios_deshechos()) + "}");
}
EXPORTAR const char* m_error() {
    return devolver("{\"error\":" + esc(red->ultimo_error()) + ",\"conflicto\":" + std::to_string(red->conflicto()) + "}");
}

EXPORTAR const char* m_horarios(const char* e, const char* r) { return devolver(lista(red->horarios(e, r))); }
EXPORTAR const char* m_rutas() { return devolver(lista(red->nombres_rutas())); }
EXPORTAR const char* m_cerradas() { return devolver(lista(red->estaciones_cerradas())); }

// R10: 'llegadas' es un arreglo de enteros de 32 bits (segundos) escrito por JavaScript en la memoria.
static std::vector<long long> leerLlegadas(const int* llegadas, int n) {
    std::vector<long long> v(n);
    for (int i = 0; i < n; i++) v[i] = llegadas[i];
    return v;
}
// Contrato: lista con el segundo de salida de cada pasajero, en el mismo orden de las llegadas.
EXPORTAR const char* m_simular_fila(const int* llegadas, int n, int frecuencia, int capacidad) {
    std::vector<long long> sal = simular_fila(leerLlegadas(llegadas, n), frecuencia, capacidad);
    std::string s = "[";
    for (size_t i = 0; i < sal.size(); i++) { if (i) s += ","; s += std::to_string(sal[i]); }
    return devolver(s + "]");
}
// Solo para la pantalla: resumen de la misma simulación (no es parte del contrato ni de motor/).
EXPORTAR const char* m_resumen_fila(const int* llegadas, int n, int frecuencia, int capacidad) {
    std::vector<long long> lleg = leerLlegadas(llegadas, n);
    std::vector<long long> sal = simular_fila(lleg, frecuencia, capacidad);
    long long suma = 0, maxEspera = 0, ultima = 0, buses = 0, llenos = 0;
    long long maxBus = 0;
    for (long long x : sal) if (x / frecuencia > maxBus) maxBus = x / frecuencia;
    std::vector<int> abordaron(sal.empty() ? 0 : maxBus + 1, 0);  // pasajeros por bus (bus k sale en k*f)
    for (size_t i = 0; i < sal.size(); i++) {
        long long e = sal[i] - lleg[i];
        suma += e;
        if (e > maxEspera) maxEspera = e;
        if (sal[i] > ultima) ultima = sal[i];
        abordaron[sal[i] / frecuencia]++;
    }
    for (int c : abordaron) { if (c > 0) buses++; if (c == capacidad) llenos++; }
    double promedio = sal.empty() ? 0.0 : static_cast<double>(suma) / static_cast<double>(sal.size());
    std::string s = "{\"pasajeros\":" + std::to_string(sal.size()) + ",\"buses\":" + std::to_string(buses) +
                    ",\"esperaPromedio\":" + std::to_string(promedio) +
                    ",\"esperaMaxima\":" + std::to_string(maxEspera) +
                    ",\"ultimaSalida\":" + std::to_string(ultima) +
                    ",\"busesLlenos\":" + std::to_string(llenos) + "}";
    return devolver(s);
}

// R11: mide cada operación sobre la red que está cargada (mediana de 'reps' repeticiones, 'consultas' consultas
// por repetición). Devuelve, en el orden de la tabla, nombre, esperado, clase y µs por operación.
EXPORTAR const char* m_medir_red(int consultas, int reps) {
    std::vector<double> t = medicion::medirRed(*red, consultas, reps);
    std::vector<medicion::Operacion> ops = medicion::operaciones();
    std::string s = "{\"estaciones\":" + std::to_string(red->num_estaciones()) + ",\"operaciones\":[";
    char b[64];
    for (size_t i = 0; i < ops.size() && i < t.size(); i++) {
        std::snprintf(b, sizeof b, "%.4f", t[i]);
        if (i) s += ",";
        s += std::string("{\"nombre\":\"") + ops[i].nombre + "\",\"esperado\":\"" + ops[i].esperado +
             "\",\"clase\":\"" + medicion::nombreClase(ops[i].clase) + "\",\"us\":" + b + "}";
    }
    return devolver(s + "]}");
}

}  // extern "C"
