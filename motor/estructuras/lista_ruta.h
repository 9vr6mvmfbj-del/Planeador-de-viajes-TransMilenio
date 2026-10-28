// =============================================================================
// Recorridos de las rutas: listas doblemente enlazadas hechas a mano.
//
// Cada ruta es una lista doble de paradas (sesión 4). Todas las listas comparten
// un mismo arreglo de nodos y se enlazan por índice.
//
// Por qué lista doble y no arreglo:
//   R7 agrega y quita paradas "todo el tiempo". En un arreglo, insertar en medio
//   corre todos los elementos siguientes: O(L). En la lista doble, si ya tenemos
//   el nodo (la Red lo encuentra con una tabla hash (ruta, estación) -> nodo),
//   insertar o quitar es cambiar 4 punteros: O(1).
//   El "doble" (anterior + siguiente) permite quitar sin buscar el anterior y
//   recorrer al revés en O(L) para recorrido(ruta, al_reves=true).
// =============================================================================
#pragma once
#include <vector>

namespace motor {

class ListasDeRutas {
public:
    struct Nodo {
        int estacion;
        int anterior;
        int siguiente;
    };
    struct Lista {
        int cabeza = -1;
        int cola = -1;
        int largo = 0;
    };

    int nuevaLista() {
        listas_.push_back(Lista{});
        return static_cast<int>(listas_.size()) - 1;
    }

    const Lista& lista(int r) const { return listas_[r]; }
    const Nodo& nodo(int n) const { return nodos_[n]; }

    // Inserta 'estacion' después del nodo 'previo' de la lista r. previo = -1: al inicio.
    // Devuelve el índice del nodo nuevo. O(1).
    int insertarDespues(int r, int previo, int estacion) {
        int n = crearNodo(estacion);
        Lista& L = listas_[r];
        int sig = (previo == -1) ? L.cabeza : nodos_[previo].siguiente;
        nodos_[n].anterior = previo;
        nodos_[n].siguiente = sig;
        if (previo == -1) L.cabeza = n;
        else nodos_[previo].siguiente = n;
        if (sig == -1) L.cola = n;
        else nodos_[sig].anterior = n;
        L.largo++;
        return n;
    }

    int agregarAlFinal(int r, int estacion) { return insertarDespues(r, listas_[r].cola, estacion); }

    // Quita el nodo n de la lista r. O(1).
    void quitar(int r, int n) {
        Lista& L = listas_[r];
        int a = nodos_[n].anterior, s = nodos_[n].siguiente;
        if (a == -1) L.cabeza = s;
        else nodos_[a].siguiente = s;
        if (s == -1) L.cola = a;
        else nodos_[s].anterior = a;
        L.largo--;
        nodos_[n].siguiente = libre_;  // se recicla
        libre_ = n;
    }

private:
    int crearNodo(int estacion) {
        if (libre_ != -1) {
            int n = libre_;
            libre_ = nodos_[n].siguiente;
            nodos_[n] = Nodo{estacion, -1, -1};
            return n;
        }
        nodos_.push_back(Nodo{estacion, -1, -1});
        return static_cast<int>(nodos_.size()) - 1;
    }

    std::vector<Nodo> nodos_;
    std::vector<Lista> listas_;
    int libre_ = -1;
};

}  // namespace motor
