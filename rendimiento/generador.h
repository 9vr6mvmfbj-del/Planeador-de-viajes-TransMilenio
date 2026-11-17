// Generador de redes sintéticas con el mismo formato de los CSV, de tamaño escalable.
// Escala 1 se parece a la red real (150 estaciones, 180 rutas, ~126.000 horarios);
// escala 2 es el doble de todo, etc. Lo usan el benchmark y el panel de rendimiento (R11).
// (Fuera de motor/: aquí se puede usar cualquier cosa.)
#pragma once
#include <cstdint>
#include <string>
#include <vector>

struct RedSintetica {
    std::string estaciones, rutas, horarios;
    std::vector<std::string> nombresEstaciones;  // en el orden de creación
    std::vector<std::string> nombresRutas;
    std::vector<std::vector<int>> paradas;       // por ruta: índices de estaciones
};

// Generador pseudoaleatorio simple y reproducible (xorshift).
struct Azar {
    uint64_t s;
    explicit Azar(uint64_t semilla) : s(semilla * 2654435761ULL + 1) {}
    uint64_t sig() { s ^= s << 13; s ^= s >> 7; s ^= s << 17; return s; }
    int entero(int n) { return static_cast<int>(sig() % static_cast<uint64_t>(n)); }
};

inline std::string nombreAleatorio(Azar& az, int i) {
    static const char* palabras[] = {"CALLE", "AV.", "PORTAL", "CRA.", "SAN", "SANTA", "LA", "EL", "NQS", "SUBA"};
    std::string n = palabras[az.entero(10)];
    n += ' ';
    for (int j = 0; j < 5; j++) n += static_cast<char>('A' + az.entero(26));
    n += ' ';
    n += std::to_string(i);  // garantiza nombres únicos
    return n;
}

inline std::string horaTexto(int m) {
    char b[6];
    b[0] = '0' + (m / 60) / 10; b[1] = '0' + (m / 60) % 10; b[2] = ':';
    b[3] = '0' + (m % 60) / 10; b[4] = '0' + (m % 60) % 10; b[5] = 0;
    return b;
}

// Red de S estaciones, R rutas de L paradas y H horarios por parada (mismo formato de los tres CSV).
inline RedSintetica generarRedTam(int S, int R, int L, int H, uint64_t semilla = 42) {
    Azar az(semilla);
    RedSintetica red;
    red.estaciones = "nombre\n";
    for (int i = 0; i < S; i++) {
        red.nombresEstaciones.push_back(nombreAleatorio(az, i));
        red.estaciones += red.nombresEstaciones.back() + "\n";
    }
    red.rutas = "ruta,orden,estacion\n";
    red.horarios = "ruta,estacion,hora\n";
    for (int r = 0; r < R; r++) {
        std::string nr = "R" + std::to_string(r);
        red.nombresRutas.push_back(nr);
        // recorrido: caminata por estaciones "cercanas" (índices próximos) para que haya transbordos
        std::vector<int> ps;
        int actual = az.entero(S);
        while (static_cast<int>(ps.size()) < L) {
            bool repetida = false;
            for (int p : ps) if (p == actual) repetida = true;
            if (!repetida) ps.push_back(actual);
            actual = (actual + 1 + az.entero(7)) % S;
        }
        red.paradas.push_back(ps);
        for (int o = 0; o < L; o++) {
            red.rutas += nr + "," + std::to_string(o + 1) + "," + red.nombresEstaciones[ps[o]] + "\n";
            int salida = 270 + az.entero(60);  // primer bus entre 4:30 y 5:30
            int paso = H > 0 ? 1200 / H : 15;   // reparte los H buses a lo largo de la jornada
            for (int h = 0; h < H; h++) {
                int m = (salida + h * paso + o * 3) % 1440;
                red.horarios += nr + "," + red.nombresEstaciones[ps[o]] + "," + horaTexto(m) + "\n";
            }
        }
    }
    return red;
}

// Escala 1 se parece a la red real (150 estaciones, 180 rutas, ~126.000 horarios); escala 2 es el doble de todo.
inline RedSintetica generarRed(int escala, uint64_t semilla = 42) {
    return generarRedTam(150 * escala, 180 * escala, 10, 70, semilla);
}
