// Lector de CSV mínimo hecho a mano (los CSV del proyecto no traen comillas ni comas
// dentro de los campos, pero igual se soportan comillas dobles por si acaso).
#pragma once
#include <cstdio>
#include <string>
#include <vector>

namespace motor {

inline bool leerArchivo(const std::string& ruta, std::string& contenido) {
    FILE* f = std::fopen(ruta.c_str(), "rb");
    if (!f) return false;
    contenido.clear();
    char buf[1 << 16];
    size_t n;
    while ((n = std::fread(buf, 1, sizeof(buf), f)) > 0) contenido.append(buf, n);
    std::fclose(f);
    return true;
}

// Recorre las filas del texto CSV; 'fila' recibe los campos de cada línea no vacía.
template <typename Visitante>
void recorrerCsv(const std::string& texto, Visitante fila) {
    std::vector<std::string> campos;
    std::string campo;
    size_t i = 0, n = texto.size();
    if (n >= 3 && (unsigned char)texto[0] == 0xEF && (unsigned char)texto[1] == 0xBB &&
        (unsigned char)texto[2] == 0xBF)
        i = 3;  // BOM de UTF-8
    while (i < n) {
        campos.clear();
        campo.clear();
        bool comillas = false;
        while (i < n) {
            char c = texto[i++];
            if (comillas) {
                if (c == '"') {
                    if (i < n && texto[i] == '"') { campo += '"'; i++; }
                    else comillas = false;
                } else campo += c;
            } else if (c == '"') comillas = true;
            else if (c == ',') { campos.push_back(campo); campo.clear(); }
            else if (c == '\n') break;
            else if (c != '\r') campo += c;
        }
        campos.push_back(campo);
        if (!(campos.size() == 1 && campos[0].empty())) fila(campos);
    }
}

}  // namespace motor
