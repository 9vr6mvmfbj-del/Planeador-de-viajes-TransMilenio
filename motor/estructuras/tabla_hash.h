// =============================================================================
// TablaHash: tabla hash hecha a mano (encadenamiento separado).
//
// Uso en el motor:
//   - nombre de estación  -> id de estación          (R1, y todas las demás)
//   - nombre de ruta      -> id de ruta              (R4, R7)
//   - (ruta, estación)    -> nodo de la lista / horarios (R4, R7)
//
// Costos (n = elementos guardados):
//   buscar / insertar / borrar: O(1) promedio, O(n) peor caso (todas en una cubeta).
//   Se mantiene el factor de carga <= 0.75 duplicando las cubetas: así las
//   cadenas tienen en promedio menos de 1 elemento.
//
// Los nodos viven en un arreglo (std::vector usado como arreglo) y se enlazan
// por índice: menos memoria y menos tiempo que pedir memoria nodo por nodo.
// =============================================================================
#pragma once
#include <cstdint>
#include <string>
#include <vector>

namespace motor {

// Funciones hash. FNV-1a para texto; mezcla de bits para enteros de 64 bits.
inline uint64_t hashClave(const std::string& s) {
    uint64_t h = 1469598103934665603ULL;
    for (unsigned char c : s) {
        h ^= c;
        h *= 1099511628211ULL;
    }
    return h;
}

inline uint64_t hashClave(uint64_t x) {
    x ^= x >> 33;
    x *= 0xff51afd7ed558ccdULL;
    x ^= x >> 33;
    x *= 0xc4ceb9fe1a85ec53ULL;
    x ^= x >> 33;
    return x;
}

template <typename K, typename V>
class TablaHash {
public:
    explicit TablaHash(int capacidadInicial = 64) {
        int cap = 8;
        while (cap < capacidadInicial) cap *= 2;
        cubetas_.assign(cap, -1);
    }

    int tamano() const { return tamano_; }

    // Devuelve un puntero al valor o nullptr si la clave no está.
    V* buscar(const K& clave) {
        int i = cubetas_[indice(clave)];
        while (i != -1) {
            if (nodos_[i].clave == clave) return &nodos_[i].valor;
            i = nodos_[i].siguiente;
        }
        return nullptr;
    }
    const V* buscar(const K& clave) const {
        return const_cast<TablaHash*>(this)->buscar(clave);
    }

    bool contiene(const K& clave) const { return buscar(clave) != nullptr; }

    // Inserta o reemplaza.
    void poner(const K& clave, const V& valor) {
        V* existente = buscar(clave);
        if (existente) {
            *existente = valor;
            return;
        }
        if ((tamano_ + 1) * 4 > static_cast<int>(cubetas_.size()) * 3) redimensionar();
        int nuevo;
        if (libre_ != -1) {  // reutiliza un nodo borrado
            nuevo = libre_;
            libre_ = nodos_[libre_].siguiente;
            nodos_[nuevo] = Nodo{clave, valor, -1};
        } else {
            nuevo = static_cast<int>(nodos_.size());
            nodos_.push_back(Nodo{clave, valor, -1});
        }
        uint64_t c = indice(clave);
        nodos_[nuevo].siguiente = cubetas_[c];
        cubetas_[c] = nuevo;
        tamano_++;
    }

    bool borrar(const K& clave) {
        uint64_t c = indice(clave);
        int i = cubetas_[c], previo = -1;
        while (i != -1) {
            if (nodos_[i].clave == clave) {
                if (previo == -1) cubetas_[c] = nodos_[i].siguiente;
                else nodos_[previo].siguiente = nodos_[i].siguiente;
                nodos_[i].siguiente = libre_;
                libre_ = i;
                tamano_--;
                return true;
            }
            previo = i;
            i = nodos_[i].siguiente;
        }
        return false;
    }

private:
    struct Nodo {
        K clave;
        V valor;
        int siguiente;
    };

    uint64_t indice(const K& clave) const {
        // capacidad potencia de 2: el módulo es un AND
        return hashClave(clave) & (cubetas_.size() - 1);
    }

    void redimensionar() {
        std::vector<int> nuevas(cubetas_.size() * 2, -1);
        uint64_t mascara = nuevas.size() - 1;
        for (size_t c = 0; c < cubetas_.size(); c++) {
            int i = cubetas_[c];
            while (i != -1) {
                int sig = nodos_[i].siguiente;
                uint64_t d = hashClave(nodos_[i].clave) & mascara;
                nodos_[i].siguiente = nuevas[d];
                nuevas[d] = i;
                i = sig;
            }
        }
        cubetas_.swap(nuevas);
    }

    std::vector<int> cubetas_;  // índice del primer nodo de cada cubeta, -1 = vacía
    std::vector<Nodo> nodos_;
    int libre_ = -1;  // lista de nodos borrados para reutilizar
    int tamano_ = 0;
};

}  // namespace motor
