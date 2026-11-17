// Medición del crecimiento por operación (la usan el programa de consola y la app web vía WebAssembly).
#pragma once
#include <chrono>
#include <cstdio>
#include <string>
#include <vector>

#include "../motor/motor.h"
#include "generador.h"

namespace medicion {
using namespace motor;
using Reloj = std::chrono::steady_clock;

inline volatile long long sumidero = 0;  // evita que el compilador borre el trabajo medido

// Corre 'fn' q veces, repite 'reps' veces y se queda con el mejor tiempo. Devuelve µs por operación.
template <typename F>
double medir(int q, int reps, F fn) {
    double mejor = 1e18;
    for (int rep = 0; rep < reps; rep++) {
        auto t = Reloj::now();
        for (int i = 0; i < q; i++) fn(i);
        double us = std::chrono::duration<double, std::micro>(Reloj::now() - t).count() / q;
        if (us < mejor) mejor = us;
    }
    return mejor;
}

struct Operacion {
    const char* nombre;
    const char* esperado;
    std::vector<double> tiempos;
};

struct Resultado {
    std::vector<int> escalas;
    std::vector<int> estaciones;
    std::vector<Operacion> ops;
};

inline Resultado medirCrecimiento(const std::vector<int>& escalas, int Q = 50000, int reps = 9) {
    Resultado res;
    res.escalas = escalas;
    std::vector<Operacion>& ops = res.ops;
    ops = {
        {"R1 estado", "O(1)", {}},
        {"R2 autocompletar (k=10)", "O(log n + k)", {}},
        {"R3 rango (20 resultados)", "O(log n + m)", {}},
        {"R4 proximo_bus", "O(1) + O(log h)", {}},
        {"R5 viaje (no se mide)", "O(L_o + L_d)", {}},
        {"R6 ranking (k=10)", "O(log n + k)", {}},
        {"R7 agregar + quitar parada", "O(log n)", {}},
        {"R7 recorrido", "O(L)", {}},
        {"R8 cerrar + reabrir", "O(log n)", {}},
        {"R9 deshacer + rehacer", "O(log n)", {}},
        {"R10 simular_fila", "O(P)", {}},
    };
    for (int esc : escalas) {
        RedSintetica sint = generarRed(esc);
        Red red = Red::desdeTexto(sint.estaciones, sint.rutas, sint.horarios);
        res.estaciones.push_back(red.num_estaciones());
        int S = static_cast<int>(sint.nombresEstaciones.size());
        int R = static_cast<int>(sint.nombresRutas.size());
        Azar az(7);
        std::vector<std::string> ordenadas = red.rango("", "~");
                std::vector<int> e(Q), e2(Q), r(Q), h(Q);
        for (int i = 0; i < Q; i++) { e[i] = az.entero(S); e2[i] = az.entero(S); r[i] = az.entero(R); h[i] = az.entero(1440); }
        std::vector<std::string> prefijos(Q), horas(Q);
        for (int i = 0; i < Q; i++) {
            prefijos[i] = sint.nombresEstaciones[e[i]].substr(0, sint.nombresEstaciones[e[i]].find(' ') + 2);
            horas[i] = horaTexto(h[i]);
        }
        int k = 0;
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int i) { sumidero += red.estado(sint.nombresEstaciones[e[i]]).size(); }));
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int i) { sumidero += red.autocompletar(prefijos[i], 10).size(); }));
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int i) {
            int a = e[i] % (S - 20);
            sumidero += red.rango(ordenadas[a], ordenadas[a + 19]).size();
        }));
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int i) {
            const auto& ps = sint.paradas[r[i]];
            sumidero += red.proximo_bus(sint.nombresEstaciones[ps[i % ps.size()]], sint.nombresRutas[r[i]], horas[i]).size();
        }));
        ops[k++].tiempos.push_back(medir(Q / 25 > 0 ? Q / 25 : 1, reps, [&](int i) {
            sumidero += red.viaje(sint.nombresEstaciones[e[i]], sint.nombresEstaciones[e2[i]]).paradas;
        }));
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int) { sumidero += red.ranking(10).size(); }));
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int i) {
            const auto& ps = sint.paradas[r[i]];
            const std::string& nueva = sint.nombresEstaciones[(ps[0] + S / 2) % S];
            if (red.agregar_parada(sint.nombresRutas[r[i]], nueva, sint.nombresEstaciones[ps[0]]))
                red.quitar_parada(sint.nombresRutas[r[i]], nueva);
        }));
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int i) { sumidero += red.recorrido(sint.nombresRutas[r[i]]).size(); }));
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int i) {
            red.cerrar(sint.nombresEstaciones[e[i]]);
            red.reabrir(sint.nombresEstaciones[e[i]]);
        }));
        red.cerrar(sint.nombresEstaciones[0]);
        ops[k++].tiempos.push_back(medir(Q, reps, [&](int) { red.deshacer(); red.rehacer(); }));
        {
            long long P = 100000LL * esc;  // en R10, n = pasajeros
            std::vector<long long> llegadas(P);
            for (long long i = 0; i < P; i++) llegadas[i] = i / 40;
            ops[k++].tiempos.push_back(medir(1, reps > 3 ? 3 : reps, [&](int) { sumidero += simular_fila(llegadas, 4, 150).size(); }));
        }
    }

    return res;
}

inline std::string aJSON(const Resultado& r) {
    std::string s = "{\"escalas\":[";
    char b[64];
    for (size_t i = 0; i < r.escalas.size(); i++) { std::snprintf(b, sizeof b, "%s%d", i ? "," : "", r.escalas[i]); s += b; }
    s += "],\"estaciones\":[";
    for (size_t i = 0; i < r.estaciones.size(); i++) { std::snprintf(b, sizeof b, "%s%d", i ? "," : "", r.estaciones[i]); s += b; }
    s += "],\"operaciones\":[";
    for (size_t o = 0; o < r.ops.size(); o++) {
        s += o ? ",{" : "{";
        s += std::string("\"nombre\":\"") + r.ops[o].nombre + "\",\"esperado\":\"" + r.ops[o].esperado + "\",\"us\":[";
        for (size_t i = 0; i < r.ops[o].tiempos.size(); i++) { std::snprintf(b, sizeof b, "%s%.4f", i ? "," : "", r.ops[o].tiempos[i]); s += b; }
        s += "]}";
    }
    return s + "]}";
}

}  // namespace medicion
