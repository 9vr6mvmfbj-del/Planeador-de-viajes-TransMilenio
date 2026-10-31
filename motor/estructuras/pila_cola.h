// =============================================================================
// Pila (LIFO) y Cola (FIFO) hechas a mano sobre un arreglo.
//
//   Pila : deshacer / rehacer (R9). apilar, desapilar, tope: O(1) amortizado.
//   Cola : fila de abordaje (R10). Arreglo circular: encolar y desencolar O(1)
//          amortizado, sin mover elementos (a diferencia de borrar el primero
//          de un arreglo, que cuesta O(n)).
// =============================================================================
#pragma once
#include <vector>

namespace motor {

template <typename T>
class Pila {
public:
    void apilar(const T& x) { datos_.push_back(x); }
    T desapilar() {
        T x = datos_.back();
        datos_.pop_back();
        return x;
    }
    const T& tope() const { return datos_.back(); }
    // Mirar el elemento i contando desde el tope (0 = tope), sin sacarlo: O(1). Solo para listar el historial.
    const T& desdeTope(int i) const { return datos_[datos_.size() - 1 - i]; }
    bool vacia() const { return datos_.empty(); }
    int tamano() const { return static_cast<int>(datos_.size()); }
    void vaciar() { datos_.clear(); }

private:
    std::vector<T> datos_;
};

template <typename T>
class Cola {
public:
    explicit Cola(int capacidad = 16) : datos_(capacidad < 1 ? 1 : capacidad) {}

    void encolar(const T& x) {
        if (tamano_ == static_cast<int>(datos_.size())) crecer();
        datos_[(inicio_ + tamano_) % datos_.size()] = x;
        tamano_++;
    }
    T desencolar() {
        T x = datos_[inicio_];
        inicio_ = (inicio_ + 1) % static_cast<int>(datos_.size());
        tamano_--;
        return x;
    }
    const T& frente() const { return datos_[inicio_]; }
    bool vacia() const { return tamano_ == 0; }
    int tamano() const { return tamano_; }

private:
    void crecer() {
        std::vector<T> nuevo(datos_.size() * 2);
        for (int i = 0; i < tamano_; i++) nuevo[i] = datos_[(inicio_ + i) % datos_.size()];
        datos_.swap(nuevo);
        inicio_ = 0;
    }

    std::vector<T> datos_;
    int inicio_ = 0;
    int tamano_ = 0;
};

}  // namespace motor
