# Motor en C++ del Planeador TransMilenio
#   make pruebas      compila y corre las pruebas
#   make rendimiento  mide cada operación en redes de 10.000, 20.000, 40.000 y 80.000 estaciones
#   make prohibidos   revisa que motor/ no use nada prohibido
#   make wasm         compila el motor a WebAssembly para la app web

CXX      ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra
MOTOR    := motor/red.cpp motor/fila.cpp
HEADERS  := $(wildcard motor/*.h motor/estructuras/*.h)

.PHONY: pruebas rendimiento prohibidos wasm todo

todo: prohibidos pruebas

build/pruebas: pruebas/pruebas.cpp $(MOTOR) $(HEADERS)
	@mkdir -p build
	$(CXX) $(CXXFLAGS) -o $@ pruebas/pruebas.cpp $(MOTOR)

pruebas: build/pruebas
	./build/pruebas

build/rendimiento: rendimiento/rendimiento.cpp rendimiento/medicion.h rendimiento/generador.h $(MOTOR) $(HEADERS)
	@mkdir -p build
	$(CXX) $(CXXFLAGS) -o $@ rendimiento/rendimiento.cpp $(MOTOR)

rendimiento: build/rendimiento
	./build/rendimiento

prohibidos:
	python3 herramientas/revisar_prohibidos.py motor

# WebAssembly sin Emscripten: clang + wasi-libc (paquetes wasi-libc y libc++-dev-wasm32)
WASM_FLAGS := --target=wasm32-wasi --sysroot=/usr -std=c++17 -O2 -fno-exceptions -fvisibility=hidden -nostartfiles \
              -Wl,--no-entry -Wl,--strip-all -Wl,--export=malloc -Wl,--export=free -Wl,--export=__wasm_call_ctors \
              -Wl,--export=m_cargar -Wl,--export=m_resumen -Wl,--export=m_estado -Wl,--export=m_autocompletar -Wl,--export=m_rango -Wl,--export=m_proximo_bus -Wl,--export=m_viaje -Wl,--export=m_ranking -Wl,--export=m_agregar_parada -Wl,--export=m_quitar_parada -Wl,--export=m_recorrido -Wl,--export=m_cerrar -Wl,--export=m_reabrir -Wl,--export=m_deshacer -Wl,--export=m_rehacer -Wl,--export=m_estacion -Wl,--export=m_horarios -Wl,--export=m_rutas -Wl,--export=m_cerradas -Wl,--export=m_simular_fila -Wl,--export=m_resumen_fila -Wl,--export=m_medir_red \
              -Wl,--export=m_crear_estacion -Wl,--export=m_eliminar_estacion -Wl,--export=m_crear_ruta -Wl,--export=m_eliminar_ruta -Wl,--export=m_deshacer_cambio -Wl,--export=m_rehacer_cambio -Wl,--export=m_historial -Wl,--export=m_error
wasm: $(MOTOR) $(HEADERS) wasm/puente.cpp
	@mkdir -p web/public
	clang++ $(WASM_FLAGS) -o web/public/motor_boff.wasm wasm/puente.cpp $(MOTOR)
