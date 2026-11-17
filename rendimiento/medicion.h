// Medición del crecimiento por operación (la usan el programa de consola y la app web vía WebAssembly).
//
// Método del profesor: se mide cada operación del contrato (menos R5) en redes de 10.000, 20.000, 40.000 y
// 80.000 estaciones, con consultas del mismo tipo, y se toma la MEDIANA de varias repeticiones. Con los
// tiempos se calcula la pendiente de log(tiempo) contra log(n): 0 = constante, 1 = lineal.
#pragma once
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <string>
#include <vector>

#include "../motor/motor.h"
#include "generador.h"

namespace medicion {
using namespace motor;
using Reloj = std::chrono::steady_clock;

inline volatile long long sumidero = 0;  // evita que el compilador borre el trabajo medido

// Corre 'fn' q veces, repite 'reps' veces y devuelve la mediana de los µs por operación.
template <typename F>
double medir(int q, int reps, F fn) {
    std::vector<double> v;
    for (int rep = 0; rep < reps; rep++) {
        auto t = Reloj::now();
        for (int i = 0; i < q; i++) fn(i);
        v.push_back(std::chrono::duration<double, std::micro>(Reloj::now() - t).count() / q);
    }
    std::sort(v.begin(), v.end());
    return v[v.size() / 2];
}

// Clases de crecimiento esperado (pendiente aproximada en la escala log-log).
enum Clase { CONSTANTE, LOGARITMICA, LINEAL, NLOGN };

struct Operacion {
    const char* nombre;
    const char* esperado;
    Clase clase;
    std::vector<double> tiempos;  // µs por operación, una por red
};

struct Resultado {
    std::vector<int> estaciones;       // n de cada red
    std::vector<double> cargaMs;       // lo que tardó Red(carpeta) en cada red
    std::vector<Operacion> ops;
};

inline std::vector<Operacion> operaciones() {
    return {
        {"R1 estado", "O(1)", CONSTANTE, {}},
        {"R2 autocompletar (k=10)", "O(log n + k)", LOGARITMICA, {}},
        {"R3 rango (20 resultados)", "O(log n + m)", LOGARITMICA, {}},
        {"R4 proximo_bus", "O(1) + O(log h)", LOGARITMICA, {}},
        {"R5 viaje (no se mide)", "O(L_o + L_d)", CONSTANTE, {}},
        {"R6 ranking (k=10)", "O(log n + k)", LOGARITMICA, {}},
        {"R7 agregar + quitar parada", "O(log n)", LOGARITMICA, {}},
        {"R7 recorrido", "O(L)", CONSTANTE, {}},
        {"R8 cerrar + reabrir", "O(log n)", LOGARITMICA, {}},
        {"R9 deshacer + rehacer", "O(log n)", LOGARITMICA, {}},
        {"R10 simular_fila (P = 10 n)", "O(P log P)", NLOGN, {}},
    };
}

// Mide cada operación sobre la red YA cargada, con consultas sacadas de la propia red
// (sus estaciones y rutas), así sirve para cualquier red con el formato de los tres CSV.
// Devuelve µs por operación, en el orden de operaciones().
inline std::vector<double> medirRed(Red& red, int Q = 20000, int reps = 5) {
    std::vector<std::string> nombres = red.rango("", "~");       // todas las estaciones, ordenadas
    std::vector<std::string> rutas = red.nombres_rutas();
    int S = static_cast<int>(nombres.size());
    int R = static_cast<int>(rutas.size());
    std::vector<double> t;
    if (S < 25 || R < 1) { t.assign(operaciones().size(), 0.0); return t; }
    std::vector<std::vector<std::string>> paradas(R);
    for (int r = 0; r < R; r++) paradas[r] = red.recorrido(rutas[r]);

    Azar az(7);
    std::vector<int> e(Q), e2(Q), r(Q);
    std::vector<std::string> prefijos(Q), horas(Q);
    for (int i = 0; i < Q; i++) {
        e[i] = az.entero(S); e2[i] = az.entero(S); r[i] = az.entero(R);
        const std::string& n = nombres[e[i]];
        size_t sp = n.find(' ');
        prefijos[i] = n.substr(0, sp == std::string::npos || sp + 2 > n.size() ? n.size() : sp + 2);
        horas[i] = horaTexto(az.entero(1440));
    }
    t.push_back(medir(Q, reps, [&](int i) { sumidero += red.estado(nombres[e[i]]).size(); }));
    t.push_back(medir(Q, reps, [&](int i) { sumidero += red.autocompletar(prefijos[i], 10).size(); }));
    t.push_back(medir(Q, reps, [&](int i) {
        int a = e[i] % (S - 20);
        sumidero += red.rango(nombres[a], nombres[a + 19]).size();
    }));
    t.push_back(medir(Q, reps, [&](int i) {
        const auto& ps = paradas[r[i]];
        if (!ps.empty()) sumidero += red.proximo_bus(ps[i % ps.size()], rutas[r[i]], horas[i]).size();
    }));
    t.push_back(medir(Q / 25 > 0 ? Q / 25 : 1, reps, [&](int i) {
        sumidero += red.viaje(nombres[e[i]], nombres[e2[i]]).paradas;
    }));
    t.push_back(medir(Q, reps, [&](int) { sumidero += red.ranking(10).size(); }));
    t.push_back(medir(Q, reps, [&](int i) {
        const auto& ps = paradas[r[i]];
        if (ps.empty()) return;
        const std::string& nueva = nombres[(e[i] + S / 2) % S];
        if (red.agregar_parada(rutas[r[i]], nueva, ps[0])) red.quitar_parada(rutas[r[i]], nueva);
    }));
    t.push_back(medir(Q, reps, [&](int i) { sumidero += red.recorrido(rutas[r[i]]).size(); }));
    t.push_back(medir(Q, reps, [&](int i) {
        red.cerrar(nombres[e[i]]);
        red.reabrir(nombres[e[i]]);
    }));
    red.cerrar(nombres[0]);
    t.push_back(medir(Q, reps, [&](int) { red.deshacer(); red.rehacer(); }));
    red.reabrir(nombres[0]);
    {
        long long P = 10LL * S;  // en R10, n = pasajeros: crecen con la red
        std::vector<long long> llegadas(P);
        for (long long i = 0; i < P; i++) llegadas[i] = az.entero(7200);  // desordenadas, durante dos horas
        t.push_back(medir(1, reps, [&](int) { sumidero += simular_fila(llegadas, 10, 160).size(); }));
    }
    return t;
}

// Para la consola: genera redes sintéticas de 'tamaños' estaciones, las carga y las mide.
inline Resultado medirCrecimiento(const std::vector<int>& tamanos, int Q = 20000, int reps = 5) {
    Resultado res;
    res.ops = operaciones();
    for (int S : tamanos) {
        RedSintetica sint = generarRedTam(S, S / 4, 10, 8);
        auto t0 = Reloj::now();
        Red red = Red::desdeTexto(sint.estaciones, sint.rutas, sint.horarios);
        res.cargaMs.push_back(std::chrono::duration<double, std::milli>(Reloj::now() - t0).count());
        res.estaciones.push_back(red.num_estaciones());
        std::vector<double> t = medirRed(red, Q, reps);
        for (size_t k = 0; k < t.size(); k++) res.ops[k].tiempos.push_back(t[k]);
    }
    return res;
}

// Pendiente de log(tiempo) contra log(n) por mínimos cuadrados (0 = constante, 1 = lineal).
inline double pendiente(const std::vector<int>& n, const std::vector<double>& us) {
    int m = static_cast<int>(n.size());
    if (m < 2) return 0;
    double sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (int i = 0; i < m; i++) {
        double x = std::log(static_cast<double>(n[i])), y = std::log(us[i] > 1e-6 ? us[i] : 1e-6);
        sx += x; sy += y; sxx += x * x; sxy += x * y;
    }
    double d = m * sxx - sx * sx;
    return d == 0 ? 0 : (m * sxy - sx * sy) / d;
}

inline const char* nombreClase(Clase c) {
    return c == CONSTANTE ? "constante" : c == LOGARITMICA ? "log" : c == LINEAL ? "lineal" : "nlogn";
}

inline std::string aJSON(const Resultado& r) {
    std::string s = "{\"estaciones\":[";
    char b[64];
    for (size_t i = 0; i < r.estaciones.size(); i++) { std::snprintf(b, sizeof b, "%s%d", i ? "," : "", r.estaciones[i]); s += b; }
    s += "],\"cargaMs\":[";
    for (size_t i = 0; i < r.cargaMs.size(); i++) { std::snprintf(b, sizeof b, "%s%.3f", i ? "," : "", r.cargaMs[i]); s += b; }
    s += "],\"operaciones\":[";
    for (size_t o = 0; o < r.ops.size(); o++) {
        s += o ? ",{" : "{";
        s += std::string("\"nombre\":\"") + r.ops[o].nombre + "\",\"esperado\":\"" + r.ops[o].esperado +
             "\",\"clase\":\"" + nombreClase(r.ops[o].clase) + "\",\"us\":[";
        for (size_t i = 0; i < r.ops[o].tiempos.size(); i++) { std::snprintf(b, sizeof b, "%s%.4f", i ? "," : "", r.ops[o].tiempos[i]); s += b; }
        s += "]}";
    }
    return s + "]}";
}

}  // namespace medicion
