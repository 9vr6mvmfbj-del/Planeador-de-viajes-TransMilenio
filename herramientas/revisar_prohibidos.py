"""
Revisa que el motor no use nada prohibido por el enunciado.

Las reglas del profesor (pensadas para Python) se traducen a C++ así:
  dict, set                       -> std::map, std::unordered_map, std::set, std::unordered_set, std::multimap...
  sorted, .sort()                 -> std::sort, std::stable_sort, std::partial_sort, .sort()
  min / max sobre colecciones     -> std::min_element, std::max_element, std::minmax_element
  x in lista, .index(), .count()  -> std::find, std::count, std::binary_search, std::lower_bound...
  bisect, heapq, collections,     -> <algorithm>, <map>, <set>, <unordered_map>, <unordered_set>,
  functools, librerías externas      <queue>, <stack>, <deque>, <list>, <forward_list>, <functional>,
                                     <numeric>, <ranges>, std::priority_queue, std::make_heap, boost...
Permitido: std::vector (como arreglo), std::string, <cstdio>, <cstdint>.

Uso: python herramientas/revisar_prohibidos.py motor
"""

import re
import sys
from pathlib import Path

PROHIBIDO = [
    (r"#\s*include\s*<(algorithm|map|set|unordered_map|unordered_set|queue|stack|deque|list|forward_list|"
     r"functional|numeric|ranges|bitset|array|tuple|valarray|execution)>", "cabecera prohibida"),
    (r"\bstd::(sort|stable_sort|partial_sort|nth_element|find|find_if|count|count_if|binary_search|"
     r"lower_bound|upper_bound|equal_range|min_element|max_element|minmax_element|make_heap|push_heap|"
     r"pop_heap|sort_heap|priority_queue|map|multimap|set|multiset|unordered_map|unordered_set|queue|"
     r"stack|deque|list|forward_list|accumulate|reverse|unique)\b", "función/estructura de la STL"),
    (r"\.\s*(sort|find)\s*\(", "método de búsqueda/orden de un contenedor"),
    (r"#\s*include\s*<boost", "librería externa"),
]


def revisar(carpeta: str) -> int:
    problemas = 0
    archivos = sorted(Path(carpeta).rglob("*.[ch]pp")) + sorted(Path(carpeta).rglob("*.h"))
    for archivo in archivos:
        for num, linea in enumerate(archivo.read_text(encoding="utf-8").splitlines(), 1):
            codigo = linea.split("//", 1)[0]  # ignora comentarios de línea
            for patron, motivo in PROHIBIDO:
                if re.search(patron, codigo):
                    print(f"{archivo}:{num}: {motivo}: {linea.strip()}")
                    problemas += 1
    print(f"{len(archivos)} archivos revisados, {problemas} problemas")
    return problemas


if __name__ == "__main__":
    sys.exit(1 if revisar(sys.argv[1] if len(sys.argv) > 1 else "motor") else 0)
