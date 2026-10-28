#include "red.h"

#include "csv.h"
#include "estructuras/orden.h"

namespace motor {

const char* const ABIERTA = "ABIERTA";
const char* const CERRADA = "CERRADA";
const char* const NO_EXISTE = "NO EXISTE";

static const int INFINITO = 1 << 30;

// ----------------------------------------------------------------- utilidades
std::string normalizar(const std::string& s) {
    size_t a = 0, b = s.size();
    while (a < b && (s[a] == ' ' || s[a] == '\t')) a++;
    while (b > a && (s[b - 1] == ' ' || s[b - 1] == '\t')) b--;
    std::string r = s.substr(a, b - a);
    for (char& c : r)
        if (c >= 'a' && c <= 'z') c = static_cast<char>(c - 'a' + 'A');
    return r;
}

int aMinutos(const std::string& hora) {
    std::string h = normalizar(hora);
    size_t i = 0;
    int horas = 0, minutos = 0, digitos = 0;
    while (i < h.size() && h[i] >= '0' && h[i] <= '9') { horas = horas * 10 + (h[i] - '0'); i++; digitos++; }
    if (digitos == 0 || digitos > 2 || i >= h.size() || h[i] != ':') return -1;
    i++;
    digitos = 0;
    while (i < h.size() && h[i] >= '0' && h[i] <= '9') { minutos = minutos * 10 + (h[i] - '0'); i++; digitos++; }
    if (digitos != 2 || minutos > 59 || (i < h.size() && h[i] != ':')) return -1;  // admite HH:MM:SS
    return (horas % 24) * 60 + minutos;
}

std::string aHora(int minutos) {
    std::string r = "00:00";
    r[0] = static_cast<char>('0' + (minutos / 60) / 10);
    r[1] = static_cast<char>('0' + (minutos / 60) % 10);
    r[3] = static_cast<char>('0' + (minutos % 60) / 10);
    r[4] = static_cast<char>('0' + (minutos % 60) % 10);
    return r;
}

static int aEntero(const std::string& s) {
    std::string t = normalizar(s);
    int v = 0;
    bool neg = false;
    size_t i = 0;
    if (i < t.size() && t[i] == '-') { neg = true; i++; }
    for (; i < t.size() && t[i] >= '0' && t[i] <= '9'; i++) v = v * 10 + (t[i] - '0');
    return neg ? -v : v;
}

// Busca la columna por nombre en el encabezado; si no está, usa la posición por defecto.
static int columna(const std::vector<std::string>& encabezado, const char* nombre, int defecto) {
    std::string buscado = normalizar(nombre);
    for (size_t i = 0; i < encabezado.size(); i++)
        if (normalizar(encabezado[i]) == buscado) return static_cast<int>(i);
    return defecto;
}

static void ordenarTexto(std::vector<std::string>& v) {
    ordenarMezcla(v, [](const std::string& a, const std::string& b) { return a < b; });
}

// ----------------------------------------------------------------- carga
Red::Red(const std::string& carpeta) {
    std::string base = carpeta;
    if (!base.empty() && base.back() != '/' && base.back() != '\\') base += '/';
    std::string e, r, h;
    leerArchivo(base + "estaciones.csv", e);
    leerArchivo(base + "rutas.csv", r);
    leerArchivo(base + "horarios.csv", h);
    cargar(e, r, h);
}

Red Red::desdeTexto(const std::string& estacionesCsv, const std::string& rutasCsv,
                    const std::string& horariosCsv) {
    Red red;
    red.cargar(estacionesCsv, rutasCsv, horariosCsv);
    return red;
}

void Red::cargar(const std::string& estacionesCsv, const std::string& rutasCsv,
                 const std::string& horariosCsv) {
    // 1) estaciones.csv: nombre
    {
        bool encabezado = true;
        int cNombre = 0;
        recorrerCsv(estacionesCsv, [&](const std::vector<std::string>& f) {
            if (encabezado) { encabezado = false; cNombre = columna(f, "nombre", 0); return; }
            if (cNombre >= static_cast<int>(f.size())) return;
            std::string n = normalizar(f[cNombre]);
            if (!n.empty() && idEstacion(n) < 0) crearEstacion(n);
        });
    }
    // 2) rutas.csv: ruta, orden, estacion. Se ordenan por (ruta, orden) y se arma cada lista.
    {
        struct Fila { int ruta, orden, estacion; };
        std::vector<Fila> filas;
        bool encabezado = true;
        int cRuta = 0, cOrden = 1, cEst = 2;
        recorrerCsv(rutasCsv, [&](const std::vector<std::string>& f) {
            if (encabezado) {
                encabezado = false;
                cRuta = columna(f, "ruta", 0); cOrden = columna(f, "orden", 1); cEst = columna(f, "estacion", 2);
                return;
            }
            int maximo = cRuta > cOrden ? cRuta : cOrden;
            if (cEst > maximo) maximo = cEst;
            if (maximo >= static_cast<int>(f.size())) return;
            std::string rn = normalizar(f[cRuta]), en = normalizar(f[cEst]);
            if (rn.empty() || en.empty()) return;
            int r = idRuta(rn);
            if (r < 0) r = crearRuta(rn);
            int e = idEstacion(en);
            if (e < 0) e = crearEstacion(en);  // estación que no venía en estaciones.csv
            filas.push_back(Fila{r, aEntero(f[cOrden]), e});
        });
        ordenarMezcla(filas, [](const Fila& a, const Fila& b) {
            return a.ruta < b.ruta || (a.ruta == b.ruta && a.orden < b.orden);
        });
        for (const Fila& f : filas) {
            uint64_t k = par(f.ruta, f.estacion);
            if (nodoDe_.contiene(k)) continue;  // estación repetida en la misma ruta
            int n = listas_.agregarAlFinal(rutas_[f.ruta].lista, f.estacion);
            nodoDe_.poner(k, n);
            estaciones_[f.estacion].rutas.push_back(f.ruta);
        }
    }
    // 3) horarios.csv: ruta, estacion, hora
    {
        std::vector<uint64_t> claveDe;  // índice de horarios_ -> (ruta, estación)
        bool encabezado = true;
        int cRuta = 0, cEst = 1, cHora = 2;
        recorrerCsv(horariosCsv, [&](const std::vector<std::string>& f) {
            if (encabezado) {
                encabezado = false;
                cRuta = columna(f, "ruta", 0); cEst = columna(f, "estacion", 1); cHora = columna(f, "hora", 2);
                return;
            }
            int maximo = cRuta > cEst ? cRuta : cEst;
            if (cHora > maximo) maximo = cHora;
            if (maximo >= static_cast<int>(f.size())) return;
            std::string rn = normalizar(f[cRuta]), en = normalizar(f[cEst]);
            int m = aMinutos(f[cHora]);
            if (rn.empty() || en.empty() || m < 0) return;
            int r = idRuta(rn);
            if (r < 0) r = crearRuta(rn);
            int e = idEstacion(en);
            if (e < 0) e = crearEstacion(en);
            uint64_t k = par(r, e);
            int* idx = horariosDe_.buscar(k);
            int i;
            if (idx) i = *idx;
            else {
                i = static_cast<int>(horarios_.size());
                horarios_.push_back(std::vector<int>());
                claveDe.push_back(k);
                horariosDe_.poner(k, i);
            }
            horarios_[i].push_back(m);
            totalHorarios_++;
        });
        for (size_t i = 0; i < horarios_.size(); i++) {
            ordenarMezcla(horarios_[i], [](int a, int b) { return a < b; });
            if (nodoDe_.contiene(claveDe[i])) {  // la ruta sí para ahí: cuenta para R6
                int e = static_cast<int>(claveDe[i] & 0xffffffffULL);
                estaciones_[e].buses += static_cast<int>(horarios_[i].size());
            }
        }
    }
    // 4) Todas las estaciones empiezan abiertas: entran a los dos árboles.
    for (size_t e = 0; e < estaciones_.size(); e++) meterEnArboles(static_cast<int>(e));
}

// ----------------------------------------------------------------- ayudantes
int Red::idEstacion(const std::string& n) const {
    const int* id = idEstacion_.buscar(n);
    return id ? *id : -1;
}

int Red::idRuta(const std::string& n) const {
    const int* id = idRuta_.buscar(n);
    return id ? *id : -1;
}

int Red::crearEstacion(const std::string& nombre) {
    Estacion e;
    e.nombre = nombre;
    estaciones_.push_back(e);
    int id = static_cast<int>(estaciones_.size()) - 1;
    idEstacion_.poner(nombre, id);
    estacionesExistentes_++;
    return id;
}

int Red::crearRuta(const std::string& nombre) {
    Ruta r;
    r.nombre = nombre;
    r.lista = listas_.nuevaLista();
    rutas_.push_back(r);
    int id = static_cast<int>(rutas_.size()) - 1;
    idRuta_.poner(nombre, id);
    return id;
}

void Red::meterEnArboles(int e) {
    arbolNombres_.insertar(estaciones_[e].nombre);
    arbolRanking_.insertar(ClaveRanking{estaciones_[e].buses, estaciones_[e].nombre});
}

void Red::sacarDeArboles(int e) {
    arbolNombres_.borrar(estaciones_[e].nombre);
    arbolRanking_.borrar(ClaveRanking{estaciones_[e].buses, estaciones_[e].nombre});
}

// Cambia los buses/día de una estación manteniendo el árbol del ranking al día: O(log n).
void Red::sumarBuses(int e, int delta) {
    if (delta == 0) return;
    Estacion& est = estaciones_[e];
    bool enArbol = est.existe && est.abierta;
    if (enArbol) arbolRanking_.borrar(ClaveRanking{est.buses, est.nombre});
    est.buses += delta;
    if (enArbol) arbolRanking_.insertar(ClaveRanking{est.buses, est.nombre});
}

int Red::cantidadHorarios(int ruta, int estacion) const {
    const int* i = horariosDe_.buscar(par(ruta, estacion));
    return i ? static_cast<int>(horarios_[*i].size()) : 0;
}

void Red::ponerAbierta(int e, bool abierta) {
    Estacion& est = estaciones_[e];
    if (est.abierta == abierta) return;
    if (abierta) {
        est.abierta = true;
        meterEnArboles(e);
    } else {
        sacarDeArboles(e);
        est.abierta = false;
    }
}

void Red::insertarParada(int r, int e, int previoEstacion) {
    int previoNodo = -1;
    if (previoEstacion >= 0) previoNodo = *nodoDe_.buscar(par(r, previoEstacion));
    int n = listas_.insertarDespues(rutas_[r].lista, previoNodo, e);
    nodoDe_.poner(par(r, e), n);
    estaciones_[e].rutas.push_back(r);
    sumarBuses(e, cantidadHorarios(r, e));  // si esa ruta ya tenía horarios ahí, vuelven a contar
}

void Red::borrarParada(int r, int e) {
    uint64_t k = par(r, e);
    listas_.quitar(rutas_[r].lista, *nodoDe_.buscar(k));
    nodoDe_.borrar(k);
    std::vector<int>& rs = estaciones_[e].rutas;  // quitar r de las rutas de la estación
    for (size_t i = 0; i < rs.size(); i++) {
        if (rs[i] == r) {
            rs[i] = rs.back();
            rs.pop_back();
            break;
        }
    }
    sumarBuses(e, -cantidadHorarios(r, e));
}

void Red::revivirEstacion(int e) {
    Estacion& est = estaciones_[e];
    est.existe = true;
    est.abierta = true;
    idEstacion_.poner(est.nombre, e);
    estacionesExistentes_++;
    meterEnArboles(e);
}

void Red::borrarEstacion(int e) {
    Estacion& est = estaciones_[e];
    if (est.abierta) sacarDeArboles(e);
    idEstacion_.borrar(est.nombre);
    est.existe = false;
    estacionesExistentes_--;
}

void Red::registrar(const Operacion& op) {
    pilaDeshacer_.apilar(op);
    pilaRehacer_.vaciar();  // un cambio nuevo borra lo que había para rehacer
}

// Aplica una operación (alReves = false) o la deshace (alReves = true).
void Red::aplicar(const Operacion& op, bool alReves) {
    switch (op.tipo) {
        case OP_CERRAR: ponerAbierta(op.estacion, alReves); break;
        case OP_REABRIR: ponerAbierta(op.estacion, !alReves); break;
        case OP_AGREGAR:
            if (alReves) {
                borrarParada(op.ruta, op.estacion);
                if (op.creoEstacion) borrarEstacion(op.estacion);
            } else {
                if (op.creoEstacion) revivirEstacion(op.estacion);
                insertarParada(op.ruta, op.estacion, op.referencia);
            }
            break;
        case OP_QUITAR:
            if (alReves) insertarParada(op.ruta, op.estacion, op.referencia);
            else borrarParada(op.ruta, op.estacion);
            break;
    }
}

// ----------------------------------------------------------------- R1
std::string Red::estado(const std::string& nombre) const {
    int e = idEstacion(normalizar(nombre));
    if (e < 0) return NO_EXISTE;
    return estaciones_[e].abierta ? ABIERTA : CERRADA;
}

// ----------------------------------------------------------------- R2
std::vector<std::string> Red::autocompletar(const std::string& prefijo, int k) const {
    std::vector<std::string> res;
    if (k <= 0) return res;
    std::string p = normalizar(prefijo);
    arbolNombres_.recorrerDesde(p, [&](const std::string& s) {
        if (s.compare(0, p.size(), p) != 0) return false;  // ya no empieza por el prefijo
        res.push_back(s);
        return static_cast<int>(res.size()) < k;
    });
    return res;
}

// ----------------------------------------------------------------- R3
std::vector<std::string> Red::rango(const std::string& desde, const std::string& hasta) const {
    std::vector<std::string> res;
    std::string d = normalizar(desde), h = normalizar(hasta);
    if (h < d) return res;
    arbolNombres_.recorrerDesde(d, [&](const std::string& s) {
        if (h < s) return false;
        res.push_back(s);
        return true;
    });
    return res;
}

// ----------------------------------------------------------------- R4
std::string Red::proximo_bus(const std::string& estacion, const std::string& ruta,
                             const std::string& hora) const {
    int e = idEstacion(normalizar(estacion));
    int r = idRuta(normalizar(ruta));
    int m = aMinutos(hora);
    if (e < 0 || r < 0 || m < 0 || !estaciones_[e].abierta) return "";
    uint64_t k = par(r, e);
    if (!nodoDe_.contiene(k)) return "";  // la ruta (ya) no para en esa estación
    const int* i = horariosDe_.buscar(k);
    if (!i || horarios_[*i].empty()) return "";
    const std::vector<int>& v = horarios_[*i];
    int pos = primeraPosicionNoMenor(v, m);
    if (pos == static_cast<int>(v.size())) pos = 0;  // ya no hay más hoy: el primero del día siguiente
    return aHora(v[pos]);
}

// ----------------------------------------------------------------- R5
Viaje Red::viaje(const std::string& origen, const std::string& destino) const {
    Viaje v;
    int eo = idEstacion(normalizar(origen)), ed = idEstacion(normalizar(destino));
    if (eo < 0 || ed < 0 || !estaciones_[eo].abierta || !estaciones_[ed].abierta) return v;
    if (eo == ed) { v.encontrado = true; return v; }

    size_t n = estaciones_.size();
    if (marca_.size() < n) {
        marca_.resize(n, 0); mejorDist_.resize(n); mejorRuta_.resize(n); segDist_.resize(n); segRuta_.resize(n);
    }
    ronda_++;

    struct Candidato { int total = INFINITO, transbordos = 0, rA = -1, t = -1, rB = -1, d1 = 0, d2 = 0; };
    Candidato mejor;
    auto esMejor = [&](const Candidato& c) {
        if (c.total != mejor.total) return c.total < mejor.total;
        if (c.transbordos != mejor.transbordos) return c.transbordos < mejor.transbordos;
        if (rutas_[c.rA].nombre != rutas_[mejor.rA].nombre) return rutas_[c.rA].nombre < rutas_[mejor.rA].nombre;
        return c.rB >= 0 && mejor.rB >= 0 && rutas_[c.rB].nombre < rutas_[mejor.rB].nombre;
    };

    // Paso 1: desde el destino hacia atrás por cada ruta que llega a él.
    // Para cada estación t anotamos la menor distancia a 'destino' (y por qué ruta),
    // guardando también la segunda mejor por una ruta distinta.
    for (int B : estaciones_[ed].rutas) {
        int m = listas_.nodo(*nodoDe_.buscar(par(B, ed))).anterior;
        int d = 0;
        while (m != -1) {
            d++;
            int t = listas_.nodo(m).estacion;
            if (t == eo) {  // viaje directo por B
                Candidato c; c.total = d; c.rA = B; c.d1 = d;
                if (mejor.rA == -1 || esMejor(c)) mejor = c;
                break;  // más atrás solo hay caminos más largos
            }
            if (estaciones_[t].abierta) {  // solo se transborda en estaciones abiertas
                if (marca_[t] != ronda_) {
                    marca_[t] = ronda_;
                    mejorDist_[t] = d; mejorRuta_[t] = B; segDist_[t] = INFINITO; segRuta_[t] = -1;
                } else if (d < mejorDist_[t]) {
                    segDist_[t] = mejorDist_[t]; segRuta_[t] = mejorRuta_[t];
                    mejorDist_[t] = d; mejorRuta_[t] = B;
                } else if (d < segDist_[t]) {
                    segDist_[t] = d; segRuta_[t] = B;
                }
            }
            m = listas_.nodo(m).anterior;
        }
    }
    // Paso 2: desde el origen hacia adelante por cada ruta que sale de él.
    // En cada estación marcada se puede transbordar a una ruta distinta que llega al destino.
    for (int A : estaciones_[eo].rutas) {
        int m = listas_.nodo(*nodoDe_.buscar(par(A, eo))).siguiente;
        int d1 = 0;
        while (m != -1) {
            d1++;
            int t = listas_.nodo(m).estacion;
            if (t == ed) break;  // el directo por A ya se contó en el paso 1
            if (marca_[t] == ronda_) {
                int d2 = mejorDist_[t], B = mejorRuta_[t];
                if (B == A) { d2 = segDist_[t]; B = segRuta_[t]; }
                if (B >= 0) {
                    Candidato c; c.total = d1 + d2; c.transbordos = 1; c.rA = A; c.t = t; c.rB = B; c.d1 = d1; c.d2 = d2;
                    if (mejor.rA == -1 || esMejor(c)) mejor = c;
                }
            }
            m = listas_.nodo(m).siguiente;
        }
    }

    if (mejor.rA == -1) return v;
    v.encontrado = true;
    v.paradas = mejor.total;
    if (mejor.transbordos == 0) {
        v.tramos.push_back(Tramo{rutas_[mejor.rA].nombre, estaciones_[eo].nombre, estaciones_[ed].nombre, mejor.d1});
    } else {
        v.tramos.push_back(Tramo{rutas_[mejor.rA].nombre, estaciones_[eo].nombre, estaciones_[mejor.t].nombre, mejor.d1});
        v.tramos.push_back(Tramo{rutas_[mejor.rB].nombre, estaciones_[mejor.t].nombre, estaciones_[ed].nombre, mejor.d2});
    }
    return v;
}

// ----------------------------------------------------------------- R6
std::vector<std::string> Red::ranking(int k) const {
    std::vector<std::string> res;
    if (k <= 0) return res;
    arbolRanking_.recorrerTodo([&](const ClaveRanking& c) {
        res.push_back(c.nombre);
        return static_cast<int>(res.size()) < k;
    });
    return res;
}

// ----------------------------------------------------------------- R7
bool Red::agregar_parada(const std::string& ruta, const std::string& nueva, const std::string& despues_de) {
    int r = idRuta(normalizar(ruta));
    int d = idEstacion(normalizar(despues_de));
    std::string nn = normalizar(nueva);
    if (r < 0 || d < 0 || nn.empty() || !nodoDe_.contiene(par(r, d))) return false;
    int e = idEstacion(nn);
    if (e >= 0 && nodoDe_.contiene(par(r, e))) return false;  // ya está en la ruta
    bool creo = false;
    if (e < 0) {  // estación nueva en la red
        e = crearEstacion(nn);
        meterEnArboles(e);
        creo = true;
    }
    insertarParada(r, e, d);
    Operacion op;
    op.tipo = OP_AGREGAR; op.estacion = e; op.ruta = r; op.referencia = d; op.creoEstacion = creo;
    registrar(op);
    return true;
}

bool Red::quitar_parada(const std::string& ruta, const std::string& estacion) {
    int r = idRuta(normalizar(ruta));
    int e = idEstacion(normalizar(estacion));
    if (r < 0 || e < 0) return false;
    const int* n = nodoDe_.buscar(par(r, e));
    if (!n) return false;
    int anterior = listas_.nodo(*n).anterior;
    Operacion op;
    op.tipo = OP_QUITAR; op.estacion = e; op.ruta = r;
    op.referencia = anterior == -1 ? -1 : listas_.nodo(anterior).estacion;
    borrarParada(r, e);
    registrar(op);
    return true;
}

std::vector<std::string> Red::recorrido(const std::string& ruta, bool al_reves) const {
    std::vector<std::string> res;
    int r = idRuta(normalizar(ruta));
    if (r < 0) return res;
    const ListasDeRutas::Lista& L = listas_.lista(rutas_[r].lista);
    int m = al_reves ? L.cola : L.cabeza;
    while (m != -1) {
        res.push_back(estaciones_[listas_.nodo(m).estacion].nombre);
        m = al_reves ? listas_.nodo(m).anterior : listas_.nodo(m).siguiente;
    }
    return res;
}

// ----------------------------------------------------------------- R8
bool Red::cerrar(const std::string& nombre) {
    int e = idEstacion(normalizar(nombre));
    if (e < 0 || !estaciones_[e].abierta) return false;
    ponerAbierta(e, false);
    Operacion op;
    op.tipo = OP_CERRAR; op.estacion = e;
    registrar(op);
    return true;
}

bool Red::reabrir(const std::string& nombre) {
    int e = idEstacion(normalizar(nombre));
    if (e < 0 || estaciones_[e].abierta) return false;
    ponerAbierta(e, true);
    Operacion op;
    op.tipo = OP_REABRIR; op.estacion = e;
    registrar(op);
    return true;
}

// ----------------------------------------------------------------- R9
bool Red::deshacer() {
    if (pilaDeshacer_.vacia()) return false;
    Operacion op = pilaDeshacer_.desapilar();
    aplicar(op, true);
    pilaRehacer_.apilar(op);
    return true;
}

bool Red::rehacer() {
    if (pilaRehacer_.vacia()) return false;
    Operacion op = pilaRehacer_.desapilar();
    aplicar(op, false);
    pilaDeshacer_.apilar(op);
    return true;
}

// ----------------------------------------------------------------- extras para la app
int Red::buses_dia(const std::string& nombre) const {
    int e = idEstacion(normalizar(nombre));
    return e < 0 ? -1 : estaciones_[e].buses;
}

std::vector<std::string> Red::rutas_de(const std::string& estacion) const {
    std::vector<std::string> res;
    int e = idEstacion(normalizar(estacion));
    if (e < 0) return res;
    for (int r : estaciones_[e].rutas) res.push_back(rutas_[r].nombre);
    ordenarTexto(res);
    return res;
}

std::vector<std::string> Red::horarios(const std::string& estacion, const std::string& ruta) const {
    std::vector<std::string> res;
    int e = idEstacion(normalizar(estacion)), r = idRuta(normalizar(ruta));
    if (e < 0 || r < 0 || !nodoDe_.contiene(par(r, e))) return res;
    const int* i = horariosDe_.buscar(par(r, e));
    if (!i) return res;
    for (int m : horarios_[*i]) res.push_back(aHora(m));
    return res;
}

std::vector<std::string> Red::nombres_rutas() const {
    std::vector<std::string> res;
    for (const Ruta& r : rutas_) res.push_back(r.nombre);
    ordenarTexto(res);
    return res;
}

}  // namespace motor
