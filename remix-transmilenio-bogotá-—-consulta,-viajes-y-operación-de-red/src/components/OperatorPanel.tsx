import React, { useState, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  ArrowLeftRight,
  Trash2,
  Power,
  Map,
  LogOut,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AccionOperador, InfoEstacionRed } from '../engine/red';
import { simularFila, ResultadoSimulacionFila } from '../engine/fila';
import { TRONCALES_BOGOTA } from '../engine/datosBogota';
import {
  ModernSelect,
  ModernNumberInput,
  SelectOption,
} from './ModernControls';
import { TransmiActionButton } from './TransmiVisualAssets';
import {
  TroncalSchematicSvg,
  getTroncalColorByCode,
} from './TroncalMapModal';
import regeneratedImg1 from '../assets/images/regenerated_image_1793015788815.png';
import regeneratedImg2 from '../assets/images/regenerated_image_1793015789293.png';
import regeneratedImg3 from '../assets/images/regenerated_image_1793019929661.png';
import regeneratedImg4 from '../assets/images/regenerated_image_1793019930152.png';

interface OperatorPanelProps {
  operatorName: string;
  onLogout: () => void;
  estaciones: InfoEstacionRed[];
  rutasDisponibles: string[];
  obtenerRecorrido: (ruta: string, alReves: boolean) => string[];
  onAgregarParada: (ruta: string, nueva: string, despuesDe: string) => boolean;
  onQuitarParada: (ruta: string, estacion: string) => boolean;
  onCerrarEstacion: (nombre: string) => boolean;
  onReabrirEstacion: (nombre: string) => boolean;
  onDeshacer: () => AccionOperador | null;
  onRehacer: () => AccionOperador | null;
  historialDeshacer: AccionOperador[];
  historialRehacer: AccionOperador[];
  onVerRutaEnMapa: (ruta: string, paradas: string[]) => void;
}

export const OperatorPanel: React.FC<OperatorPanelProps> = ({
  operatorName,
  onLogout,
  estaciones,
  rutasDisponibles,
  obtenerRecorrido,
  onAgregarParada,
  onQuitarParada,
  onCerrarEstacion,
  onReabrirEstacion,
  onDeshacer,
  onRehacer,
  historialDeshacer,
  historialRehacer,
  onVerRutaEnMapa,
}) => {
  // Controles de vista del Monitor Maestro de Red (mismo mapa que Mapa de Troncales)
  const [cleanMapVista, setCleanMapVista] = useState<boolean>(false);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [selectedTroncalFilter, setSelectedTroncalFilter] = useState<string>('ALL');

  // R7 State: Editor de Rutas
  const [selectedRuta, setSelectedRuta] = useState<string>(rutasDisponibles[0] || 'B12');
  const [alReves, setAlReves] = useState<boolean>(false);
  const [nuevaParadaSelect, setNuevaParadaSelect] = useState<string>('CALLE 76');
  const [nuevaParadaCustom, setNuevaParadaCustom] = useState<string>('');
  const [despuesDeParada, setDespuesDeParada] = useState<string>('HEROES');
  const [feedbackR7, setFeedbackR7] = useState<string | null>(null);

  // R8 State: Cerrar y Reabrir Estaciones (Por defecto AV JIMENEZ como en Variation 5)
  const [filtroEstacionR8, setFiltroEstacionR8] = useState<string>('');
  const [estacionSeleccionadaR8, setEstacionSeleccionadaR8] = useState<string>('AV JIMENEZ');

  // R10 State: Simulador Hora Pico FIFO
  const [frecuenciaMin, setFrecuenciaMin] = useState<number>(3);
  const [capacidadBus, setCapacidadBus] = useState<number>(160);
  const [llegadasTexto, setLlegadasTexto] = useState<string>(
    '65, 80, 95, 110, 75, 90, 120, 85, 60, 70, 95, 80'
  );
  const [ resultadoFila, setResultadoFila ] = useState<ResultadoSimulacionFila>(() =>
    simularFila([65, 80, 95, 110, 75, 90, 120, 85, 60, 70, 95, 80], 3, 160)
  );
  const [simWaveIndex, setSimWaveIndex] = useState<number>(0);
  const [simPulseKey, setSimPulseKey] = useState<number>(0);
  const [monitorToast, setMonitorToast] = useState<string | null>(null);

  // Recorrido actual de la ruta seleccionada (R7)
  const paradasRutaActual = useMemo(
    () => obtenerRecorrido(selectedRuta, alReves),
    [obtenerRecorrido, selectedRuta, alReves, historialDeshacer.length, historialRehacer.length]
  );

  const paradasRutaNormal = useMemo(
    () => obtenerRecorrido(selectedRuta, false),
    [obtenerRecorrido, selectedRuta, historialDeshacer.length, historialRehacer.length]
  );

  // Opciones para selectores modernos
  const routeOptions: SelectOption[] = useMemo(
    () =>
      rutasDisponibles.map((r) => ({
        value: r,
        label: `Servicio Troncal ${r}`,
        badgeText: r,
        badgeColor: '#EF0014',
      })),
    [rutasDisponibles]
  );

  const paradasEnRutaOptions: SelectOption[] = useMemo(
    () =>
      paradasRutaNormal.map((p, idx) => ({
        value: p,
        label: `${idx + 1}. ${p}`,
        badgeText: `${idx + 1}`,
        badgeColor: '#334155',
      })),
    [paradasRutaNormal]
  );

  const todasEstacionesOptions: SelectOption[] = useMemo(
    () =>
      estaciones.map((e) => ({
        value: e.nombre,
        label: e.nombre,
        badgeText: e.troncal,
        badgeColor: e.colorTroncal,
      })),
    [estaciones]
  );

  const estacionesFiltradasR8 = useMemo(() => {
    const q = filtroEstacionR8.trim().toUpperCase();
    if (!q) return estaciones;
    return estaciones.filter(
      (e) =>
        e.nombre.includes(q) ||
        e.troncal.includes(q) ||
        e.nombreTroncal.toUpperCase().includes(q)
    );
  }, [estaciones, filtroEstacionR8]);

  const totalCerradas = useMemo(
    () => estaciones.filter((e) => !e.abierta).length,
    [estaciones]
  );

  const infoEstacionSeleccionada = useMemo(
    () =>
      estaciones.find((e) => e.nombre === estacionSeleccionadaR8) ||
      estaciones[0] ||
      null,
    [estaciones, estacionSeleccionadaR8]
  );

  const estacionesInsertablesOptions: SelectOption[] = useMemo(() => {
    const actuales = new Set(paradasRutaNormal);
    const disponibles = estaciones.filter((e) => !actuales.has(e.nombre));
    const lista = disponibles.length > 0 ? disponibles : estaciones;
    return lista.map((e) => ({
      value: e.nombre,
      label: e.nombre,
      badgeText: e.troncal,
      badgeColor: e.colorTroncal,
    }));
  }, [estaciones, paradasRutaNormal]);

  const estacionElegidaParaInsertar = useMemo(() => {
    if (
      estacionesInsertablesOptions.some((o) => o.value === nuevaParadaSelect)
    ) {
      return nuevaParadaSelect;
    }
    return estacionesInsertablesOptions[0]?.value || 'CALLE 85';
  }, [estacionesInsertablesOptions, nuevaParadaSelect]);

  const handleInsertarParada = () => {
    const nombreInsertar =
      nuevaParadaCustom.trim() !== ''
        ? nuevaParadaCustom.trim().toUpperCase()
        : estacionElegidaParaInsertar;
    const refParada = paradasRutaNormal.includes(despuesDeParada)
      ? despuesDeParada
      : paradasRutaNormal[0];
    const ok = onAgregarParada(selectedRuta, nombreInsertar, refParada);
    if (ok) {
      setFeedbackR7(
        `Parada "${nombreInsertar}" insertada en ${selectedRuta} después de "${refParada}".`
      );
      setMonitorToast(
        `Parada "${nombreInsertar}" agregada a la ruta ${selectedRuta}`
      );
      setNuevaParadaCustom('');
    } else {
      setFeedbackR7(
        `La estación "${nombreInsertar}" ya hace parte de la ruta ${selectedRuta}.`
      );
    }
  };

  const PEAK_WAVES = [
    {
      freq: 3,
      cap: 160,
      text: '65, 80, 95, 110, 75, 90, 120, 85, 60, 70, 95, 80',
    },
    {
      freq: 2,
      cap: 180,
      text: '90, 115, 130, 140, 105, 120, 150, 110, 95, 85, 100, 90',
    },
    {
      freq: 4,
      cap: 150,
      text: '55, 70, 85, 95, 110, 125, 100, 90, 80, 75, 65, 60',
    },
    {
      freq: 3,
      cap: 200,
      text: '80, 95, 110, 125, 135, 115, 105, 95, 85, 90, 100, 110',
    },
  ];

  const handleEjecutarSimulacion = (advanceWave = false) => {
    if (advanceWave) {
      const nextIdx = (simWaveIndex + 1) % PEAK_WAVES.length;
      const wave = PEAK_WAVES[nextIdx];
      setSimWaveIndex(nextIdx);
      setFrecuenciaMin(wave.freq);
      setCapacidadBus(wave.cap);
      setLlegadasTexto(wave.text);
      const nums = wave.text
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 0);
      setResultadoFila(simularFila(nums, wave.freq, wave.cap));
      setSimPulseKey((k) => k + 1);
      setMonitorToast(
        `Simulación actualizada (Frecuencia: ${wave.freq}m · Cupo: ${wave.cap})`
      );
      return;
    }
    const nums = llegadasTexto
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 0);
    const vector = nums.length > 0 ? nums : [50, 70, 90, 60, 80, 100];
    setResultadoFila(simularFila(vector, frecuenciaMin, capacidadBus));
    setSimPulseKey((k) => k + 1);
    setMonitorToast(
      `Simulación recalculada (${vector.length} ciclos · Frecuencia ${frecuenciaMin}m)`
    );
  };

  const saturacionMaximaPct = useMemo(() => {
    const maxCola = resultadoFila.ciclos.reduce(
      (acc, c) => Math.max(acc, c.enFila),
      0
    );
    const denom = Math.max(1, capacidadBus * 3);
    return Math.min(100, Math.round((maxCola / denom) * 100));
  }, [resultadoFila, capacidadBus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* ==================== VARIATION 5 MAIN LAYOUT: MONITOR MAESTRO DE RED + SIDEBAR (ESTACIÓN SELECCIONADA & SIMULACIÓN DE FILA) ==================== */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-stretch">
        {/* Columna Izquierda: Monitor Maestro de Red (.map-container) */}
        <motion.div
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4 min-w-0"
        >
          {/* Header Card del Monitor Maestro + Acciones R9 (Deshacer / Rehacer / Salir) */}
          <motion.div className="v11-card px-6 py-4 sm:px-8 sm:py-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="display text-xl sm:text-2xl font-extrabold uppercase text-white">
                  Monitor Maestro
                </h2>
                <AnimatePresence mode="wait">
                  {monitorToast && (
                    <motion.span
                      key={monitorToast}
                      initial={{ opacity: 0, y: -6, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      className="rounded-lg border border-[#F7B500]/40 bg-[#F7B500]/15 px-3 py-1 font-clean text-xs font-extrabold text-[#F7B500]"
                    >
                      {monitorToast}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  onClick={() => {
                    const acc = onDeshacer();
                    if (acc) {
                      setMonitorToast(`Deshecho: ${acc.descripcion}`);
                    } else {
                      setMonitorToast(
                        'No hay acciones para deshacer aún (cierra una estación o edita una parada)'
                      );
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 font-clean text-xs font-extrabold uppercase tracking-tight backdrop-blur-md transition-colors cursor-pointer ${
                    historialDeshacer.length > 0
                      ? 'border-[#F7B500]/60 bg-[#F7B500]/15 text-white hover:bg-[#F7B500] hover:text-black'
                      : 'border-white/[0.12] bg-black/80 text-white/75 hover:border-[#F7B500] hover:text-white'
                  }`}
                >
                  <Undo2 className="pointer-events-none h-3.5 w-3.5 text-[#F7B500]" />
                  <span className="pointer-events-none">
                    Deshacer ({historialDeshacer.length})
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  onClick={() => {
                    const acc = onRehacer();
                    if (acc) {
                      setMonitorToast(`Rehecho: ${acc.descripcion}`);
                    } else {
                      setMonitorToast('No hay acciones deshechas para rehacer');
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 font-clean text-xs font-extrabold uppercase tracking-tight backdrop-blur-md transition-colors cursor-pointer ${
                    historialRehacer.length > 0
                      ? 'border-[#10b981]/60 bg-[#10b981]/15 text-white hover:bg-[#10b981] hover:text-black'
                      : 'border-white/[0.12] bg-black/80 text-white/75 hover:border-[#F7B500] hover:text-white'
                  }`}
                >
                  <Redo2 className="pointer-events-none h-3.5 w-3.5 text-[#F7B500]" />
                  <span className="pointer-events-none">
                    Rehacer ({historialRehacer.length})
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{
                    scale: 1.04,
                    y: -1,
                    boxShadow: '0 10px 24px rgba(239, 0, 20, 0.35)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  onClick={onLogout}
                  className="flex items-center gap-1.5 rounded-xl border border-[#EF0014] bg-black/80 px-3.5 py-2.5 font-clean text-xs font-extrabold uppercase tracking-tight text-[#EF0014] transition-colors hover:bg-[#EF0014] hover:text-white cursor-pointer"
                >
                  <LogOut className="pointer-events-none h-3.5 w-3.5" />
                  <span className="pointer-events-none">Cerrar Sesión</span>
                </motion.button>
              </div>
            </div>

            {/* Filtro rápido de troncales integrado en el Monitor Maestro */}
            {!cleanMapVista && (
              <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.08] pt-3 font-clean">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                  onClick={() => setSelectedTroncalFilter('ALL')}
                  className={`rounded-lg px-2.5 py-1.5 font-clean text-xs font-extrabold uppercase tracking-tight transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedTroncalFilter === 'ALL'
                      ? 'bg-[#EF0014] text-white shadow-[0_4px_14px_rgba(239,0,20,0.4)]'
                      : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white'
                  }`}
                >
                  Todas
                </motion.button>
                {TRONCALES_BOGOTA.map((t) => {
                  const active = selectedTroncalFilter === t.codigo;
                  const shortTroncal = t.nombre.split(' ').slice(0, 2).join(' ');
                  return (
                    <motion.button
                      key={t.codigo}
                      type="button"
                      whileHover={{ scale: 1.06, y: -2 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                      onClick={() =>
                        setSelectedTroncalFilter(active ? 'ALL' : t.codigo)
                      }
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-clean text-xs font-bold uppercase tracking-tight transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-[#F7B500] bg-white/[0.12] text-white'
                          : 'border-white/[0.08] bg-black text-white/75 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center rounded font-mono text-[10px] font-extrabold"
                        style={{ backgroundColor: t.color, color: t.textoColor }}
                      >
                        {t.codigo}
                      </span>
                      <span className="font-clean tracking-tight">{shortTroncal}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Lienzo Esquemático Oficial idéntico al Mapa de Troncales */}
          <div className="relative flex-1 min-h-[520px] rounded-[24px] border border-white/[0.08] bg-[#0b0b0e] overflow-hidden flex items-center justify-center p-4">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(rgba(247, 181, 0, 0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            <TroncalSchematicSvg
              estacionesInfo={estaciones}
              highlightedRouteStops={paradasRutaActual}
              selectedTroncalFilter={selectedTroncalFilter}
              selectedStationName={estacionSeleccionadaR8}
              cleanMapOnly={cleanMapVista}
              zoom={mapZoom}
              autoFitRoute={true}
              onSelectStation={(est) => setEstacionSeleccionadaR8(est.nombre)}
              className="w-full h-full max-w-[1140px] max-h-[560px] object-contain"
            />

            {/* Controles Inferiores Derechos (.map-controls Variation 5) */}
            <div className="absolute bottom-4 right-4 flex flex-wrap items-center gap-2 z-10 font-clean">
              <motion.button
                type="button"
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                onClick={() => setCleanMapVista((v) => !v)}
                className="rounded-xl border border-white/[0.08] bg-black/85 px-3.5 py-2 font-clean text-xs font-extrabold uppercase tracking-tight text-white backdrop-blur-md transition-colors hover:border-[#F7B500] cursor-pointer"
              >
                {cleanMapVista ? 'Ver Nombres' : 'Limpiar Vista'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                onClick={() => {
                  setEstacionSeleccionadaR8('AV JIMENEZ');
                  setSelectedTroncalFilter('ALL');
                  setCleanMapVista(false);
                  setMapZoom(1);
                }}
                className="rounded-xl border border-white/[0.08] bg-black/85 px-3.5 py-2 font-clean text-xs font-extrabold uppercase tracking-tight text-white backdrop-blur-md transition-colors hover:border-[#F7B500] cursor-pointer"
              >
                Reiniciar Mapa
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                onClick={() =>
                  setMapZoom((z) => (z === 1 ? 1.25 : z === 1.25 ? 1.5 : 1))
                }
                className="rounded-xl border border-white/[0.08] bg-black/85 px-3.5 py-2 font-clean text-xs font-extrabold uppercase tracking-tight text-white backdrop-blur-md transition-colors hover:border-[#F7B500] cursor-pointer"
              >
                Zoom {Math.round(mapZoom * 100)}%
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                onClick={() => onVerRutaEnMapa(selectedRuta, paradasRutaActual)}
                className="rounded-xl border border-[#F7B500]/40 bg-black/85 px-3.5 py-2 font-clean text-xs font-extrabold uppercase tracking-tight text-[#F7B500] backdrop-blur-md transition-colors hover:bg-[#F7B500] hover:text-black cursor-pointer"
              >
                Ampliar Mapa
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Columna Derecha: Sidebar de Estación Seleccionada (R8) + Simulación de Fila (R10) */}
        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="flex flex-col gap-4 min-w-0"
        >
          {/* Card 1: Estación Seleccionada */}
          <motion.div
            whileHover={{ borderColor: 'rgba(239, 0, 20, 0.35)' }}
            className="v11-card p-6 sm:p-7"
          >
            <span className="label-mono block">Estación Seleccionada</span>
            <AnimatePresence mode="wait">
              <motion.h3
                key={infoEstacionSeleccionada?.nombre || estacionSeleccionadaR8}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="font-clean text-xl font-extrabold uppercase tracking-tight text-white mt-1 mb-2"
              >
                {infoEstacionSeleccionada?.nombre || estacionSeleccionadaR8}
              </motion.h3>
            </AnimatePresence>

            {infoEstacionSeleccionada?.abierta !== false ? (
              <span className="inline-block rounded-md border border-[#10b981]/25 bg-[#10b981]/10 px-3 py-1 font-clean text-[11px] font-bold text-[#10b981]">
                Operativa 100%
              </span>
            ) : (
              <span className="inline-block rounded-md border border-[#EF0014]/35 bg-[#EF0014]/15 px-3 py-1 font-clean text-[11px] font-bold text-red-300">
                Cerrada
              </span>
            )}

            {/* Selector rápido para elegir cualquiera de las 115 estaciones */}
            <div className="mt-4">
              <ModernSelect
                id="r8-sidebar-select"
                label="Cambiar estación inspeccionada"
                value={estacionSeleccionadaR8}
                options={todasEstacionesOptions}
                onChange={(val) => setEstacionSeleccionadaR8(val)}
              />
            </div>

            <div className="mt-5 border-t border-white/[0.08] pt-4">
              <span className="label-mono block">Servicios</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(infoEstacionSeleccionada?.rutasQueParan.length
                  ? infoEstacionSeleccionada.rutasQueParan
                  : ['B12', 'H75', 'J23']
                ).map((ruta) => {
                  const tc = getTroncalColorByCode(ruta);
                  return (
                    <motion.span
                      key={ruta}
                      whileHover={{ scale: 1.08, y: -1 }}
                      style={{ backgroundColor: tc.bg, color: tc.text }}
                      className="rounded-md px-2.5 py-1 font-clean text-xs font-extrabold uppercase tracking-wide shadow-sm"
                    >
                      {ruta.toUpperCase()}
                    </motion.span>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <TransmiActionButton
                label={
                  infoEstacionSeleccionada?.abierta !== false
                    ? 'Cerrar Estación'
                    : 'Abrir Estación'
                }
                iconSrc={regeneratedImg1}
                onClick={() => {
                  if (infoEstacionSeleccionada?.abierta !== false) {
                    onCerrarEstacion(estacionSeleccionadaR8);
                    setMonitorToast(
                      `Estación "${estacionSeleccionadaR8}" cerrada temporalmente`
                    );
                  } else {
                    onReabrirEstacion(estacionSeleccionadaR8);
                    setMonitorToast(
                      `Estación "${estacionSeleccionadaR8}" reabierta al servicio`
                    );
                  }
                }}
                className="w-full"
              />
            </div>
          </motion.div>

          {/* Card 2: Simulación de Fila (R10 Summary Card) */}
          <motion.div
            key={`sim-summary-${simPulseKey}`}
            whileHover={{ borderColor: 'rgba(239, 0, 20, 0.35)', y: -2 }}
            className="v11-card p-6 sm:p-7 flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="display text-lg font-extrabold uppercase text-white">
                  Simulación de Fila
                </h3>
                <span className="rounded-md bg-[#F7B500]/15 border border-[#F7B500]/40 px-2 py-0.5 font-mono text-[10px] font-bold text-[#F7B500]">
                  Cada {frecuenciaMin}m · {capacidadBus} cupos
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                >
                  <span className="label-mono block">Llegadas</span>
                  <div className="font-clean text-2xl font-extrabold text-white mt-1 tabular-nums">
                    {resultadoFila.totalLlegadas.toLocaleString()}
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                >
                  <span className="label-mono block" style={{ fontSize: '0.55rem' }}>
                    Abordaron
                  </span>
                  <div className="font-clean text-2xl font-extrabold text-[#10b981] mt-1 tabular-nums">
                    {resultadoFila.totalAbordados.toLocaleString()}
                  </div>
                </motion.div>
              </div>

              <div className="mt-5">
                <span className="label-mono block">Estado de Operación</span>
                <div className="mt-2 font-clean text-xs leading-relaxed text-white/60 space-y-1">
                  <div>
                    Buses despachados:{' '}
                    <span className="font-mono font-bold text-white">
                      {resultadoFila.busesDespachados}
                    </span>
                  </div>
                  <div>
                    Espera promedio:{' '}
                    <span className="font-mono font-bold text-white">
                      {resultadoFila.esperaPromedioMinutos} min
                    </span>
                  </div>
                  <div>
                    Máxima saturación:{' '}
                    <span className="font-mono font-bold text-[#F7B500]">
                      {saturacionMaximaPct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <TransmiActionButton
                label="Simular Fila"
                iconSrc={regeneratedImg2}
                variant="secondary"
                onClick={() => handleEjecutarSimulacion(true)}
                className="w-full"
              />
            </div>
          </motion.div>
        </motion.aside>
      </div>

      {/* ==================== CONTROLES DETALLADOS DE OPERACIÓN (R7, R8, R9, R10) ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* R7: Editor Interactivo de Rutas (Lista Doblemente Enlazada) */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="lg:col-span-7 v11-card p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <div className="label-mono">Gestión de Servicios Troncales</div>
              <h3 className="display text-xl font-extrabold uppercase text-white mt-1">
                Editor de Recorridos y Paradas
              </h3>
            </div>
            <div className="flex items-center gap-2 font-clean">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                onClick={() => setAlReves((prev) => !prev)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 font-clean text-xs font-extrabold uppercase tracking-tight transition-colors cursor-pointer ${
                  alReves
                    ? 'border-[#F7B500] bg-[#F7B500]/15 text-[#F7B500]'
                    : 'border-white/10 bg-black text-white/85 hover:border-white/25'
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>{alReves ? 'Sentido Regreso' : 'Sentido Ida'}</span>
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                onClick={() => onVerRutaEnMapa(selectedRuta, paradasRutaActual)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black px-3.5 py-2 font-clean text-xs font-extrabold uppercase tracking-tight text-white hover:border-[#F7B500] transition-colors cursor-pointer"
              >
                <Map className="h-3.5 w-3.5 text-[#F7B500]" />
                <span>Ver Mapa</span>
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModernSelect
              id="r7-select-ruta"
              label="Ruta a editar o consultar"
              value={selectedRuta}
              options={routeOptions}
              onChange={(val) => {
                setSelectedRuta(val);
                const nuevas = obtenerRecorrido(val, false);
                if (nuevas.length > 0) setDespuesDeParada(nuevas[0]);
                setFeedbackR7(null);
              }}
            />

            <ModernSelect
              id="r7-select-despues"
              label="Insertar nueva parada después de"
              value={
                paradasRutaNormal.includes(despuesDeParada)
                  ? despuesDeParada
                  : paradasRutaNormal[0] || ''
              }
              options={paradasEnRutaOptions}
              onChange={(val) => setDespuesDeParada(val)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            <ModernSelect
              id="r7-select-nueva"
              label="Seleccionar estación para insertar"
              value={estacionElegidaParaInsertar}
              options={estacionesInsertablesOptions}
              onChange={(val) => setNuevaParadaSelect(val)}
            />

            <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-black px-4 py-3 focus-within:border-[#EF0014]">
              <label
                htmlFor="r7-custom-stop"
                className="label-mono"
              >
                O escribir nueva estación (opcional)
              </label>
              <input
                id="r7-custom-stop"
                type="text"
                value={nuevaParadaCustom}
                onChange={(e) => setNuevaParadaCustom(e.target.value.toUpperCase())}
                placeholder="Ej. CALLE 100 NORTE"
                className="mt-1 w-full bg-transparent font-clean text-sm font-bold text-white placeholder-white/35 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <TransmiActionButton
              label="Insertar Parada"
              iconSrc={regeneratedImg3}
              onClick={handleInsertarParada}
            />
            <AnimatePresence>
              {feedbackR7 && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="font-clean text-xs font-medium text-[#F7B500]"
                >
                  {feedbackR7}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Secuencia visual de nodos de la Lista Doblemente Enlazada */}
          <div className="rounded-2xl border border-white/[0.08] bg-black p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white/80">
                Secuencia de Paradas ({paradasRutaActual.length} estaciones) ·{' '}
                {alReves ? 'Recorrido de Cola a Cabeza' : 'Recorrido de Cabeza a Cola'}
              </span>
              <span className="label-mono" style={{ letterSpacing: '0.05em' }}>
                Quitar parada
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <AnimatePresence initial={false}>
                {paradasRutaActual.map((estNombre, index) => (
                  <motion.div
                    key={`${estNombre}-${index}`}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-extrabold text-[#F7B500] w-6 shrink-0 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate font-semibold text-white">
                        {estNombre}
                      </span>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`Quitar parada ${estNombre} de ${selectedRuta}`}
                      disabled={paradasRutaActual.length <= 2}
                      onClick={() => {
                        const ok = onQuitarParada(selectedRuta, estNombre);
                        if (ok) {
                          setFeedbackR7(
                            `Parada "${estNombre}" eliminada de la ruta ${selectedRuta}.`
                          );
                        }
                      }}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-[#EF0014]/20 hover:text-[#EF0014] disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* R8 + R9: Listado de Estaciones y Bitácora de Cambios */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="lg:col-span-5 v11-card p-6 space-y-5"
        >
          <div className="border-b border-white/[0.08] pb-4">
            <h3 className="display text-xl font-extrabold uppercase text-white">
              Cerrar y Reabrir Estaciones
            </h3>
          </div>

          {/* Buscador y listado rápido con interruptores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={filtroEstacionR8}
                onChange={(e) => setFiltroEstacionR8(e.target.value)}
                placeholder="Filtrar estaciones por nombre o troncal..."
                className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-black px-3.5 text-xs text-white placeholder-white/40 focus:border-[#EF0014] focus:outline-none"
              />
              <span className="font-mono text-xs text-[#F7B500] font-bold tabular-nums shrink-0">
                {totalCerradas} cerradas
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {estacionesFiltradasR8.map((est) => (
                <motion.div
                  key={est.nombre}
                  whileHover={{ x: 2 }}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                    est.abierta
                      ? 'border-white/[0.06] bg-white/[0.03]'
                      : 'border-[#EF0014]/40 bg-[#EF0014]/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold text-white"
                      style={{ backgroundColor: est.colorTroncal }}
                    >
                      {est.troncal}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-white">
                        {est.nombre}
                      </div>
                      <div className="text-[10px] text-white/50">
                        {est.abierta ? 'Operativa · Abierta' : 'Fuera de servicio · Cerrada'}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06, y: -1 }}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                    onClick={() =>
                      est.abierta
                        ? onCerrarEstacion(est.nombre)
                        : onReabrirEstacion(est.nombre)
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-clean text-xs font-extrabold uppercase tracking-tight transition-colors cursor-pointer shrink-0 ${
                      est.abierta
                        ? 'bg-[#EF0014]/15 text-red-200 border border-[#EF0014]/30 hover:bg-[#EF0014]/30'
                        : 'bg-[#10b981]/20 text-emerald-300 border border-[#10b981]/40 hover:bg-[#10b981]/30'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    <span>{est.abierta ? 'Cerrar' : 'Reabrir'}</span>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bitácora R9 */}
          <div className="border-t border-white/[0.08] pt-4 space-y-2.5">
            <div className="rounded-2xl border border-white/[0.08] bg-black px-4 py-3">
              <div className="label-mono">
                Último Cambio Aplicado (Pila Deshacer)
              </div>
              <div className="mt-1 text-xs font-medium text-white/85 truncate">
                {historialDeshacer.length > 0
                  ? `${historialDeshacer[0].timestamp} — ${historialDeshacer[0].descripcion}`
                  : 'Sin cambios pendientes por deshacer'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-black px-4 py-3">
              <div className="label-mono">
                Acciones Deshechas (Pila Rehacer)
              </div>
              <div className="mt-1 text-xs font-medium text-white/85 truncate">
                {historialRehacer.length > 0
                  ? `${historialRehacer[0].timestamp} — ${historialRehacer[0].descripcion}`
                  : 'Historial de rehacer vacío'}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* R10: Simulador de Fila de Abordaje en Hora Pico (Parámetros y Tabla Minuto a Minuto) */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="v11-card p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <div className="label-mono">Simulación Operativa de Plataforma</div>
            <h3 className="display text-xl font-extrabold uppercase text-white mt-1">
              Parámetros y Evolución Minuto a Minuto (FIFO)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <ModernNumberInput
              id="r10-frecuencia"
              label="Frecuencia de paso de buses"
              value={frecuenciaMin}
              min={1}
              max={15}
              suffix="min"
              onChange={setFrecuenciaMin}
            />
          </div>
          <div className="md:col-span-3">
            <ModernNumberInput
              id="r10-capacidad"
              label="Capacidad por bus articulado"
              value={capacidadBus}
              min={20}
              max={250}
              step={10}
              suffix="cupos"
              onChange={setCapacidadBus}
            />
          </div>
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label
              htmlFor="r10-llegadas"
              className="label-mono"
            >
              Llegadas de pasajeros por minuto (separadas por coma)
            </label>
            <input
              id="r10-llegadas"
              type="text"
              value={llegadasTexto}
              onChange={(e) => setLlegadasTexto(e.target.value)}
              className="h-[46px] rounded-xl border border-white/[0.08] bg-black px-3.5 font-mono text-xs text-white focus:border-[#EF0014] focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <TransmiActionButton
              label="Simular Fila"
              iconSrc={regeneratedImg4}
              onClick={() => handleEjecutarSimulacion(false)}
              className="w-full"
            />
          </div>
        </div>

        {/* Tabla de evolución minuto a minuto */}
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03] text-white/60">
                <th className="py-2.5 px-4 font-semibold">Minuto</th>
                <th className="py-2.5 px-4 font-semibold text-right">Nuevos en Fila</th>
                <th className="py-2.5 px-4 font-semibold">Paso de Bus</th>
                <th className="py-2.5 px-4 font-semibold text-right">Pasajeros Abordados</th>
                <th className="py-2.5 px-4 font-semibold text-right">Personas Restantes en Cola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-mono tabular-nums">
              {resultadoFila.ciclos.map((c, idx) => (
                <motion.tr
                  key={c.minuto}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.015 }}
                  className="hover:bg-white/[0.03]"
                >
                  <td className="py-2 px-4 font-bold text-white">Min {c.minuto}</td>
                  <td className="py-2 px-4 text-right text-white/80">+{c.nuevosPasajeros}</td>
                  <td className="py-2 px-4 font-sans">
                    {c.pasoBus ? (
                      <span className="inline-flex items-center gap-1.5 text-[#10b981] font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Abordaje Articulado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-white/40">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Acumulando fila</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-[#10b981]">
                    {c.abordaron > 0 ? `-${c.abordaron}` : '0'}
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-[#F7B500]">
                    {c.enFila}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </motion.div>
  );
};
