// =============================================================================
// ArbolAVL: árbol binario de búsqueda autobalanceado, hecho a mano.
//
// Por qué AVL y no un BST simple (sesión 8): los nombres de estaciones llegan
// ORDENADOS en estaciones.csv. Un BST simple con datos ordenados se degenera en
// una lista (altura n). El AVL rota al insertar/borrar y garantiza altura
// <= 1.44·log2(n), así que todo cuesta O(log n) siempre.
//
// Uso en el motor:
//   - arbolNombres : estaciones ABIERTAS ordenadas por nombre      (R2, R3)
//   - arbolRanking : estaciones ABIERTAS ordenadas por buses/día   (R6)
//   Cerrar una estación la saca de los dos árboles; reabrirla la vuelve a meter.
//   Así las búsquedas nunca recorren estaciones cerradas.
//
// Costos (n = elementos en el árbol, h = altura = O(log n)):
//   insertar, borrar, contiene: O(log n)
//   recorrerDesde(x, visitante): O(log n + k), k = elementos visitados
// =============================================================================
#pragma once
#include <vector>

namespace motor {

// Menor debe ser un tipo con  static bool menor(const K& a, const K& b).
template <typename K, typename Menor>
class ArbolAVL {
public:
    int tamano() const { return tamano_; }

    bool insertar(const K& clave) {
        bool insertado = false;
        raiz_ = insertarEn(raiz_, clave, insertado);
        if (insertado) tamano_++;
        return insertado;
    }

    bool borrar(const K& clave) {
        bool borrado = false;
        raiz_ = borrarEn(raiz_, clave, borrado);
        if (borrado) tamano_--;
        return borrado;
    }

    bool contiene(const K& clave) const {
        int n = raiz_;
        while (n != -1) {
            if (Menor::menor(clave, nodos_[n].clave)) n = nodos_[n].izq;
            else if (Menor::menor(nodos_[n].clave, clave)) n = nodos_[n].der;
            else return true;
        }
        return false;
    }

    // Recorre en orden (de menor a mayor) empezando por el primer elemento >= desde.
    // El visitante devuelve false para detenerse. Costo O(log n + k).
    template <typename Visitante>
    void recorrerDesde(const K& desde, Visitante visitar) const {
        pila_.clear();
        int n = raiz_;
        // Bajar buscando el límite inferior y guardar el camino de "pendientes".
        while (n != -1) {
            if (Menor::menor(nodos_[n].clave, desde)) {
                n = nodos_[n].der;  // este nodo y su izquierda quedan antes de 'desde'
            } else {
                pila_.push_back(n);
                n = nodos_[n].izq;
            }
        }
        while (!pila_.empty()) {
            int actual = pila_.back();
            pila_.pop_back();
            if (!visitar(nodos_[actual].clave)) return;
            int m = nodos_[actual].der;
            while (m != -1) {
                pila_.push_back(m);
                m = nodos_[m].izq;
            }
        }
    }

    // Recorre todo el árbol en orden. Costo O(log n + k).
    template <typename Visitante>
    void recorrerTodo(Visitante visitar) const {
        pila_.clear();
        int n = raiz_;
        while (n != -1) {
            pila_.push_back(n);
            n = nodos_[n].izq;
        }
        while (!pila_.empty()) {
            int actual = pila_.back();
            pila_.pop_back();
            if (!visitar(nodos_[actual].clave)) return;
            int m = nodos_[actual].der;
            while (m != -1) {
                pila_.push_back(m);
                m = nodos_[m].izq;
            }
        }
    }

    int altura() const { return alt(raiz_); }

private:
    struct Nodo {
        K clave;
        int izq, der, altura;
    };

    int alt(int n) const { return n == -1 ? -1 : nodos_[n].altura; }
    int mayor(int a, int b) const { return a > b ? a : b; }
    void actualizar(int n) { nodos_[n].altura = 1 + mayor(alt(nodos_[n].izq), alt(nodos_[n].der)); }
    int balance(int n) const { return alt(nodos_[n].izq) - alt(nodos_[n].der); }

    int rotarDerecha(int y) {
        int x = nodos_[y].izq;
        nodos_[y].izq = nodos_[x].der;
        nodos_[x].der = y;
        actualizar(y);
        actualizar(x);
        return x;
    }

    int rotarIzquierda(int x) {
        int y = nodos_[x].der;
        nodos_[x].der = nodos_[y].izq;
        nodos_[y].izq = x;
        actualizar(x);
        actualizar(y);
        return y;
    }

    int rebalancear(int n) {
        actualizar(n);
        int b = balance(n);
        if (b > 1) {  // cargado a la izquierda
            if (balance(nodos_[n].izq) < 0) nodos_[n].izq = rotarIzquierda(nodos_[n].izq);
            return rotarDerecha(n);
        }
        if (b < -1) {  // cargado a la derecha
            if (balance(nodos_[n].der) > 0) nodos_[n].der = rotarDerecha(nodos_[n].der);
            return rotarIzquierda(n);
        }
        return n;
    }

    int nuevoNodo(const K& clave) {
        if (libre_ != -1) {
            int n = libre_;
            libre_ = nodos_[n].izq;
            nodos_[n] = Nodo{clave, -1, -1, 0};
            return n;
        }
        nodos_.push_back(Nodo{clave, -1, -1, 0});
        return static_cast<int>(nodos_.size()) - 1;
    }

    void liberar(int n) {
        nodos_[n].izq = libre_;
        libre_ = n;
    }

    int insertarEn(int n, const K& clave, bool& insertado) {
        if (n == -1) {
            insertado = true;
            return nuevoNodo(clave);
        }
        if (Menor::menor(clave, nodos_[n].clave)) {
            int hijo = insertarEn(nodos_[n].izq, clave, insertado);
            nodos_[n].izq = hijo;
        } else if (Menor::menor(nodos_[n].clave, clave)) {
            int hijo = insertarEn(nodos_[n].der, clave, insertado);
            nodos_[n].der = hijo;
        } else {
            return n;  // ya estaba
        }
        return rebalancear(n);
    }

    int borrarEn(int n, const K& clave, bool& borrado) {
        if (n == -1) return -1;
        if (Menor::menor(clave, nodos_[n].clave)) {
            int hijo = borrarEn(nodos_[n].izq, clave, borrado);
            nodos_[n].izq = hijo;
        } else if (Menor::menor(nodos_[n].clave, clave)) {
            int hijo = borrarEn(nodos_[n].der, clave, borrado);
            nodos_[n].der = hijo;
        } else {
            borrado = true;
            int izq = nodos_[n].izq, der = nodos_[n].der;
            if (izq == -1 || der == -1) {  // casos 1 y 2: 0 o 1 hijo
                liberar(n);
                return izq != -1 ? izq : der;
            }
            // caso 3: dos hijos -> se reemplaza por el sucesor (mínimo de la derecha)
            int s = der;
            while (nodos_[s].izq != -1) s = nodos_[s].izq;
            nodos_[n].clave = nodos_[s].clave;
            bool aux = false;
            int hijo = borrarEn(der, nodos_[s].clave, aux);
            nodos_[n].der = hijo;
        }
        return rebalancear(n);
    }

    std::vector<Nodo> nodos_;
    mutable std::vector<int> pila_;  // pila del recorrido en orden (sesión 8: DFS con pila)
    int raiz_ = -1;
    int libre_ = -1;
    int tamano_ = 0;
};

}  // namespace motor
