import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TRONCALES_BOGOTA,
  ESTACIONES_ESQUEMATICAS,
  EstacionEsquematica,
} from '../engine/datosBogota';
import { InfoEstacionRed, PlanViaje } from '../engine/red';
import {
  TransmiActionButton,
  AnimatedBogotaOfficialLogo,
  AnimatedTransMilenioOfficialLogo,
} from './TransmiVisualAssets';
import regeneratedImg3 from '../assets/images/regenerated_image_1793019929661.png';

export function getTroncalColorByCode(codeOrRoute: string): {
  bg: string;
  text: string;
} {
  const letter = (codeOrRoute || '').trim().charAt(0).toUpperCase();
  const found = TRONCALES_BOGOTA.find((t) => t.codigo === letter);
  if (found) {
    return { bg: found.color, text: found.textoColor };
  }
  return { bg: '#EF0014', text: '#FFFFFF' };
}

export interface TroncalSchematicSvgProps {
  estacionesInfo: InfoEstacionRed[];
  activePlan?: PlanViaje | null;
  highlightedRouteStops?: string[];
  selectedTroncalFilter?: string;
  selectedStationName?: string | null;
  pendingOrigin?: string | null;
  pendingDestination?: string | null;
  cleanMapOnly?: boolean;
  zoom?: number;
  autoFitRoute?: boolean;
  onSelectStation?: (est: EstacionEsquematica) => void;
  className?: string;
}

interface ViewBoxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Interpolación suave a 60fps del viewBox SVG para garantizar que el centrado
 * horizontal y vertical de la ruta (y el zoom) sea matemáticamente exacto.
 */
function useAnimatedViewBox(target: ViewBoxRect): ViewBoxRect {
  const [current, setCurrent] = useState<ViewBoxRect>(target);
  const currentRef = useRef<ViewBoxRect>(target);

  useEffect(() => {
    let rafId = 0;
    const start = { ...currentRef.current };
    const startTime = performance.now();
    const duration = 680;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - t, 3);
      const next: ViewBoxRect = {
        x: start.x + (target.x - start.x) * ease,
        y: start.y + (target.y - start.y) * ease,
        w: start.w + (target.w - start.w) * ease,
        h: start.h + (target.h - start.h) * ease,
      };
      currentRef.current = next;
      setCurrent(next);
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [target.x, target.y, target.w, target.h]);

  return current;
}

/**
 * Lienzo SVG oficial del Mapa Esquemático de Troncales (1140x650) compartido
 * entre la ventana "Mapa de Troncales" y el "Monitor Maestro de Red" del Operador.
 * Centra tanto vertical como horizontalmente cualquier ruta activa y la ajusta a su tamaño.
 */
export const TroncalSchematicSvg: React.FC<TroncalSchematicSvgProps> = ({
  estacionesInfo,
  activePlan = null,
  highlightedRouteStops = [],
  selectedTroncalFilter = 'ALL',
  selectedStationName = null,
  pendingOrigin = null,
  pendingDestination = null,
  cleanMapOnly = false,
  zoom = 1,
  autoFitRoute = true,
  onSelectStation,
  className = 'w-full h-full max-w-[1140px] max-h-full object-contain',
}) => {
  const estadoMap = useMemo(() => {
    const map = new Map<string, InfoEstacionRed>();
    for (let i = 0; i < estacionesInfo.length; i++) {
      map.set(estacionesInfo[i].nombre, estacionesInfo[i]);
    }
    return map;
  }, [estacionesInfo]);

  const coordMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (let i = 0; i < ESTACIONES_ESQUEMATICAS.length; i++) {
      const e = ESTACIONES_ESQUEMATICAS[i];
      map.set(e.nombre, { x: e.x, y: e.y });
    }
    return map;
  }, []);

  const activeStopsList = useMemo(() => {
    if (activePlan && activePlan.paradas.length > 0) {
      return activePlan.paradas;
    }
    if (highlightedRouteStops.length > 0) {
      return highlightedRouteStops;
    }
    return [];
  }, [activePlan, highlightedRouteStops]);

  const activeStopsSet = useMemo(() => new Set(activeStopsList), [activeStopsList]);

  const activeRoutePolyline = useMemo(() => {
    if (activeStopsList.length < 2) return null;
    const pts: string[] = [];
    for (let i = 0; i < activeStopsList.length; i++) {
      const c = coordMap.get(activeStopsList[i]);
      if (c) pts.push(`${c.x},${c.y}`);
    }
    return pts.length >= 2 ? pts.join(' ') : null;
  }, [activeStopsList, coordMap]);

  // Cálculo exacto de viewBox para centrar tanto vertical como horizontalmente y ajustar al tamaño de la ruta
  const targetViewBox = useMemo<ViewBoxRect>(() => {
    const safeZoom = Math.max(0.65, Math.min(2.6, zoom));

    // Si hay una ruta activa (>= 2 paradas), calculamos su caja envolvente exacta
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let count = 0;

    for (let i = 0; i < activeStopsList.length; i++) {
      const c = coordMap.get(activeStopsList[i]);
      if (c) {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
        count++;
      }
    }

    if (count >= 2 && autoFitRoute) {
      const routeCenterX = (minX + maxX) / 2;
      const routeCenterY = (minY + maxY) / 2;
      const spanW = maxX - minX;
      const spanH = maxY - minY;

      // Margen amplio para que toda la red y la ruta queden centradas sin recortar troncales de los bordes
      const padX = 145;
      const padY = 88;
      const rawW = Math.max(980, spanW + padX * 2);
      const rawH = Math.max(610, spanH + padY * 2);

      // Aplicar el zoom adicional del usuario manteniendo el centro exacto (routeCenterX, routeCenterY)
      const finalW = Math.max(150, rawW / safeZoom);
      const finalH = Math.max(110, rawH / safeZoom);

      return {
        x: routeCenterX - finalW / 2,
        y: routeCenterY - finalH / 2,
        w: finalW,
        h: finalH,
      };
    }

    // Si no hay ruta activa o autoFitRoute está desactivado, centramos sobre la ruta o sobre el centro real de la red
    let focusX = 535;
    let focusY = 325;
    if (count >= 2) {
      focusX = (minX + maxX) / 2;
      focusY = (minY + maxY) / 2;
    } else if (selectedStationName && safeZoom > 1) {
      const sc = coordMap.get(selectedStationName);
      if (sc) {
        focusX = sc.x;
        focusY = sc.y;
      }
    }

    const w = 1060 / safeZoom;
    const h = 620 / safeZoom;
    return {
      x: focusX - w / 2,
      y: focusY - h / 2,
      w,
      h,
    };
  }, [activeStopsList, autoFitRoute, coordMap, selectedStationName, zoom]);

  const animatedVB = useAnimatedViewBox(targetViewBox);
  const effectiveScale = 1140 / Math.max(1, animatedVB.w);

  // Estado de paneo libre (arrastrar con mouse o touch para recorrer todo el mapa libremente en cualquier nivel de zoom)
  const [panOffset, setPanOffset] = useState<{ dx: number; dy: number }>({
    dx: 0,
    dy: 0,
  });
  const svgElementRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    origDx: 0,
    origDy: 0,
  });

  // Cuando cambia la ruta o el filtro de troncal o se reinicia el zoom, centramos limpiamente
  const routeKey = activeStopsList.join('|');
  useEffect(() => {
    setPanOffset({ dx: 0, dy: 0 });
  }, [routeKey, selectedTroncalFilter, selectedStationName]);

  useEffect(() => {
    if (zoom === 1 && autoFitRoute) {
      setPanOffset({ dx: 0, dy: 0 });
    }
  }, [zoom, autoFitRoute]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      origDx: panOffset.dx,
      origDy: panOffset.dy,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStateRef.current.active || !svgElementRef.current) return;
    const deltaPxX = e.clientX - dragStateRef.current.startX;
    const deltaPxY = e.clientY - dragStateRef.current.startY;
    if (Math.hypot(deltaPxX, deltaPxY) > 4) {
      dragStateRef.current.moved = true;
    }
    const rect = svgElementRef.current.getBoundingClientRect();
    const scaleX = animatedVB.w / Math.max(1, rect.width);
    const scaleY = animatedVB.h / Math.max(1, rect.height);
    const nextDx = Math.max(
      -950,
      Math.min(950, dragStateRef.current.origDx - deltaPxX * scaleX)
    );
    const nextDy = Math.max(
      -650,
      Math.min(650, dragStateRef.current.origDy - deltaPxY * scaleY)
    );
    setPanOffset({ dx: nextDx, dy: nextDy });
  };

  const handlePointerUp = () => {
    dragStateRef.current.active = false;
  };

  const finalViewBoxX = animatedVB.x + panOffset.dx;
  const finalViewBoxY = animatedVB.y + panOffset.dy;

  return (
    <motion.svg
      ref={svgElementRef}
      width="1140"
      height="650"
      viewBox={`${finalViewBoxX.toFixed(2)} ${finalViewBoxY.toFixed(
        2
      )} ${animatedVB.w.toFixed(2)} ${animatedVB.h.toFixed(2)}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-3xl border border-white/[0.08] bg-[#0b0b0e] shadow-[0_25px_70px_rgba(0,0,0,0.85)] select-none cursor-grab active:cursor-grabbing touch-none ${className}`}
    >
      <defs>
        <pattern
          id="stationGrid"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 30 0 L 0 0 0 30"
            fill="none"
            stroke="rgba(247, 181, 0, 0.045)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {/* Retícula técnica de fondo extendida para cubrir cualquier zoom/encuadre */}
      <rect
        x="-600"
        y="-400"
        width="2400"
        height="1500"
        fill="url(#stationGrid)"
      />

      <g>
        {/* 1. Trazado de las líneas Troncales */}
        {TRONCALES_BOGOTA.map((troncal, idx) => {
          const dimmed =
            selectedTroncalFilter !== 'ALL' &&
            selectedTroncalFilter !== troncal.codigo;
          return (
            <motion.g
              key={troncal.codigo}
              initial={{ opacity: 0 }}
              animate={{ opacity: dimmed ? 0.16 : 1 }}
              transition={{ duration: 0.55, delay: idx * 0.03 }}
            >
              {/* Halo sutil de la troncal */}
              <path
                d={troncal.trazo}
                fill="none"
                stroke={troncal.color}
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.14}
              />
              {/* Línea principal de la troncal */}
              <motion.path
                d={troncal.trazo}
                fill="none"
                stroke={troncal.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={troncal.punteado ? '4 4' : undefined}
                initial={{ pathLength: 0.15, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.95, ease: 'easeOut', delay: idx * 0.035 }}
              />
              {/* Cuadro identificador de Troncal [A], [B], [C]... en tipografía legible, negrilla, mayúscula y en su color oficial */}
              <g
                transform={`translate(${troncal.labelX - 16}, ${
                  troncal.labelY - 16
                })`}
              >
                <rect
                  x="0"
                  y="0"
                  width="32"
                  height="32"
                  rx="7"
                  fill={troncal.color}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />
                <text
                  x="16"
                  y="22"
                  textAnchor="middle"
                  fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                  fontWeight="900"
                  fontSize="17"
                  fill={troncal.textoColor}
                  style={{ textTransform: 'uppercase' }}
                >
                  {troncal.codigo.toUpperCase()}
                </text>
              </g>
            </motion.g>
          );
        })}

        {/* 2. Resaltado animado cuando hay un Viaje Planeado (R5) o Ruta Seleccionada (R7) */}
        {activeRoutePolyline && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <polyline
              points={activeRoutePolyline}
              fill="none"
              stroke="#F7B500"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.28"
            />
            <polyline
              points={activeRoutePolyline}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 6"
              className="animate-route-dash"
            />
          </motion.g>
        )}

        {/* 3. Nodos de Estaciones y Portales */}
        {ESTACIONES_ESQUEMATICAS.map((est) => {
          const info = estadoMap.get(est.nombre);
          const abierta = info ? info.abierta : true;
          const enRutaActiva = activeStopsSet.has(est.nombre);
          const esSeleccionada = selectedStationName === est.nombre;
          const esOrigen =
            pendingOrigin === est.nombre ||
            (activeStopsList.length > 0 && activeStopsList[0] === est.nombre);
          const esDestino =
            pendingDestination === est.nombre ||
            (activeStopsList.length > 1 &&
              activeStopsList[activeStopsList.length - 1] === est.nombre);
          const esTransbordo = activePlan?.transbordo === est.nombre;
          const dimmed =
            selectedTroncalFilter !== 'ALL' &&
            selectedTroncalFilter !== est.troncal &&
            !enRutaActiva &&
            !esSeleccionada &&
            !esOrigen &&
            !esDestino;

          // Posición de la etiqueta para evitar solapamientos
          let tx = est.x;
          let ty = est.y - 10;
          let anchor: 'middle' | 'start' | 'end' = 'middle';
          if (est.labelPos === 'bottom') {
            ty = est.y + 16;
          } else if (est.labelPos === 'left') {
            tx = est.x - 10;
            ty = est.y + 3;
            anchor = 'end';
          } else if (est.labelPos === 'right') {
            tx = est.x + 10;
            ty = est.y + 3;
            anchor = 'start';
          }

          return (
            <g
              key={est.nombre}
              opacity={dimmed ? 0.2 : 1}
              onClick={() => {
                if (onSelectStation) onSelectStation(est);
              }}
              className="cursor-pointer group transition-opacity duration-300"
            >
              {/* Halo pulsante para Estación Seleccionada, Origen, Transbordo o Destino */}
              {(esSeleccionada || esOrigen || esDestino || esTransbordo) && (
                <motion.circle
                  cx={est.x}
                  cy={est.y}
                  r={esSeleccionada ? 15 : 13}
                  fill={esSeleccionada ? 'rgba(239, 0, 20, 0.24)' : 'none'}
                  stroke={
                    esOrigen
                      ? '#10B981'
                      : esDestino
                      ? '#EF0014'
                      : esTransbordo || esSeleccionada
                      ? '#F7B500'
                      : '#EF0014'
                  }
                  strokeWidth="2.5"
                  initial={{ scale: 0.7, opacity: 0.5 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Círculo de estación estilo plano oficial TransMilenio */}
              {!abierta ? (
                <circle
                  cx={est.x}
                  cy={est.y}
                  r="6.5"
                  fill="#EF0014"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              ) : esSeleccionada ? (
                <circle
                  cx={est.x}
                  cy={est.y}
                  r="8"
                  fill="#EF0014"
                  stroke="#F7B500"
                  strokeWidth="3"
                />
              ) : est.esPortal ? (
                <circle
                  cx={est.x}
                  cy={est.y}
                  r="7.5"
                  fill="#FFFFFF"
                  stroke="#070708"
                  strokeWidth="3.5"
                />
              ) : est.esIntercambio || enRutaActiva ? (
                <circle
                  cx={est.x}
                  cy={est.y}
                  r={enRutaActiva ? '6.5' : '5.5'}
                  fill={
                    esTransbordo
                      ? '#F7B500'
                      : enRutaActiva
                      ? '#FFFFFF'
                      : '#070708'
                  }
                  stroke={enRutaActiva ? '#EF0014' : '#FFFFFF'}
                  strokeWidth="2.2"
                />
              ) : (
                <circle
                  cx={est.x}
                  cy={est.y}
                  r="3.6"
                  fill="#FFFFFF"
                  stroke="#070708"
                  strokeWidth="1.2"
                />
              )}

              {/* Etiqueta legible de la estación */}
              {!cleanMapOnly &&
                (est.esPortal ||
                  est.esIntercambio ||
                  enRutaActiva ||
                  esSeleccionada ||
                  esOrigen ||
                  esDestino ||
                  !abierta ||
                  zoom >= 1.15 ||
                  effectiveScale >= 1.15 ||
                  selectedTroncalFilter !== 'ALL') && (
                  <text
                    x={tx}
                    y={ty}
                    textAnchor={anchor}
                    fontFamily="Plus Jakarta Sans, Inter, sans-serif"
                    fontWeight={
                      est.esPortal || enRutaActiva || esSeleccionada || esOrigen || esDestino
                        ? '800'
                        : '600'
                    }
                    fontSize={
                      est.esPortal || enRutaActiva || esSeleccionada || esOrigen || esDestino
                        ? '9.5'
                        : '7.8'
                    }
                    fill={
                      !abierta
                        ? '#FCA5A5'
                        : esOrigen
                        ? '#6EE7B7'
                        : esDestino
                        ? '#FCA5A5'
                        : esSeleccionada || enRutaActiva
                        ? '#F7B500'
                        : est.esPortal
                        ? '#FFFFFF'
                        : '#CBD5E1'
                    }
                  >
                    {est.nombre}
                  </text>
                )}
            </g>
          );
        })}
      </g>
    </motion.svg>
  );
};

interface TroncalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  estacionesInfo: InfoEstacionRed[];
  activePlan: PlanViaje | null;
  highlightedRouteStops?: string[];
  highlightedRouteName?: string;
  onSelectAsOrigin?: (estacion: string) => void;
  onSelectAsDestination?: (estacion: string) => void;
  onConfirmTripToMain?: (origen: string, destino: string) => void;
  calcularViaje?: (origen: string, destino: string) => PlanViaje | null;
  onInspectStation?: (estacion: string) => void;
}

export const TroncalMapModal: React.FC<TroncalMapModalProps> = ({
  isOpen,
  onClose,
  estacionesInfo,
  activePlan,
  highlightedRouteStops = [],
  highlightedRouteName,
  onSelectAsOrigin,
  onSelectAsDestination,
  onConfirmTripToMain,
  calcularViaje,
  onInspectStation,
}) => {
  const [zoom, setZoom] = useState(1);
  const [autoFitRoute, setAutoFitRoute] = useState(true);
  const [cleanMapOnly, setCleanMapOnly] = useState(false);
  const [selectedTroncalFilter, setSelectedTroncalFilter] = useState<string>('ALL');
  const [selectedStation, setSelectedStation] = useState<EstacionEsquematica | null>(
    () => ESTACIONES_ESQUEMATICAS.find((e) => e.nombre === 'PORTAL NORTE') || null
  );

  // Selección interactiva de Origen y Destino dentro del mapa sin cerrar la ventana
  const [pendingOrigin, setPendingOrigin] = useState<string | null>(null);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAutoFitRoute(true);
      setZoom(1);
    }
  }, [isOpen, activePlan, pendingOrigin, pendingDestination]);

  const estadoMap = useMemo(() => {
    const map = new Map<string, InfoEstacionRed>();
    for (let i = 0; i < estacionesInfo.length; i++) {
      map.set(estacionesInfo[i].nombre, estacionesInfo[i]);
    }
    return map;
  }, [estacionesInfo]);

  const selectedStationInfo = selectedStation
    ? estadoMap.get(selectedStation.nombre) || null
    : null;

  // Si el usuario ya marcó tanto Origen como Destino en el mapa, calculamos su ruta en vivo
  const customMapPlan = useMemo(() => {
    if (pendingOrigin && pendingDestination && calcularViaje) {
      return calcularViaje(pendingOrigin, pendingDestination);
    }
    return null;
  }, [pendingOrigin, pendingDestination, calcularViaje]);

  // El plan que se muestra y se encuadra en el mapa:
  // Si el usuario está armando un viaje en el mapa, sólo traza cuando ya eligió AMBOS (Origen y Destino).
  const displayedPlan = useMemo(() => {
    if (pendingOrigin || pendingDestination) {
      return pendingOrigin && pendingDestination ? customMapPlan : null;
    }
    return activePlan;
  }, [pendingOrigin, pendingDestination, customMapPlan, activePlan]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="troncal-map-modal"
          initial={{ opacity: 0, scale: 0.94, rotateX: 8 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.95, rotateX: -6 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          style={{ perspective: '1400px' }}
          className="fixed inset-0 z-[200] flex flex-col bg-[#070708]/95 backdrop-blur-md"
        >
          {/* Barra superior minimalista con el Logo Oficial de Bogotá + TRANSMILENIO */}
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#111112] px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <AnimatedBogotaOfficialLogo className="h-8 sm:h-9 w-auto select-none" />
              <span className="h-6 w-[1.5px] bg-white/15 shrink-0" />
              <AnimatedTransMilenioOfficialLogo className="h-8 sm:h-9 w-auto" />
              <h2 className="font-clean text-base sm:text-lg font-extrabold tracking-wider text-white">
                TransMilenio · MAPA
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, y: -2, rotateX: 5 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                onClick={() => {
                  setCleanMapOnly((prev) => !prev);
                  if (!cleanMapOnly) setSelectedStation(null);
                }}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-clean text-xs font-extrabold uppercase tracking-[0.03em] transition-colors cursor-pointer ${
                  cleanMapOnly
                    ? 'border-[#F7B500] bg-[#F7B500] text-black'
                    : 'border-white/[0.08] bg-black/80 text-white hover:border-[#F7B500]'
                }`}
              >
                {cleanMapOnly ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Ver Controles</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Limpiar Vista</span>
                  </>
                )}
              </motion.button>

              {/* Controles de Zoom (mantiene centrada la ruta tanto vertical como horizontalmente) */}
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/80 p-1">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(239,0,20,0.25)' }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 16 }}
                  aria-label="Alejar mapa"
                  onClick={() => {
                    setZoom((z) => Math.max(0.75, +(z - 0.2).toFixed(2)));
                  }}
                  className="rounded-lg p-1.5 text-white/70 hover:text-white cursor-pointer"
                >
                  <ZoomOut className="h-4 w-4" />
                </motion.button>
                <span className="px-2.5 font-mono text-xs font-bold text-white tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.15, backgroundColor: 'rgba(239,0,20,0.25)' }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 16 }}
                  aria-label="Acercar mapa"
                  onClick={() => {
                    setZoom((z) => Math.min(2.2, +(z + 0.2).toFixed(2)));
                  }}
                  className="rounded-lg p-1.5 text-white/70 hover:text-white cursor-pointer"
                >
                  <ZoomIn className="h-4 w-4" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ rotate: -45, scale: 1.15, backgroundColor: 'rgba(247,181,0,0.25)' }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 16 }}
                  aria-label="Centrar ruta y restablecer zoom"
                  onClick={() => {
                    setZoom(1);
                    setAutoFitRoute(true);
                    setSelectedTroncalFilter('ALL');
                  }}
                  className="rounded-lg p-1.5 text-white/70 hover:text-white cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              <motion.button
                type="button"
                whileHover={{
                  scale: 1.05,
                  y: -2,
                  rotateX: 5,
                  boxShadow: '0 12px 28px rgba(239, 0, 20, 0.4)',
                }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                aria-label="Cerrar mapa"
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl bg-[#EF0014] px-4 py-2.5 font-clean text-xs font-extrabold uppercase tracking-[0.03em] text-white hover:bg-[#d40012] cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Cerrar Mapa</span>
              </motion.button>
            </div>
          </motion.div>

          {/* CSS selector 1 & 2: Filtro rápido de troncales con tipografía limpia y legible que NO se esparrama horizontalmente */}
          <AnimatePresence>
            {!cleanMapOnly && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.08] bg-[#0b0b0e] px-6 py-2.5 font-clean"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -1.5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                  onClick={() => setSelectedTroncalFilter('ALL')}
                  className={`rounded-lg px-3.5 py-1.5 font-clean text-xs font-bold tracking-normal transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedTroncalFilter === 'ALL'
                      ? 'bg-[#EF0014] text-white shadow-[0_4px_14px_rgba(239,0,20,0.4)]'
                      : 'bg-white/[0.05] text-white/75 hover:bg-white/[0.1] hover:text-white'
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
                      whileHover={{ scale: 1.05, y: -1.5 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                      onClick={() =>
                        setSelectedTroncalFilter(active ? 'ALL' : t.codigo)
                      }
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-clean text-xs font-semibold tracking-normal transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'border-[#F7B500] bg-white/[0.12] text-white shadow-[0_4px_14px_rgba(247,181,0,0.25)]'
                          : 'border-white/[0.08] bg-[#111112] text-white/80 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded font-clean text-[11px] font-extrabold uppercase shadow-sm"
                        style={{ backgroundColor: t.color, color: t.textoColor }}
                      >
                        {t.codigo}
                      </span>
                      <span className="font-clean font-extrabold uppercase tracking-normal">
                        {shortTroncal}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lienzo central del Mapa Esquemático (centrado tanto vertical como horizontalmente) */}
          <div className="relative flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden p-4 md:p-6 flex items-center justify-center bg-[#070708]">
              <div className="w-full h-full flex items-center justify-center">
                <TroncalSchematicSvg
                  estacionesInfo={estacionesInfo}
                  activePlan={displayedPlan}
                  highlightedRouteStops={
                    pendingOrigin || pendingDestination ? [] : highlightedRouteStops
                  }
                  selectedTroncalFilter={selectedTroncalFilter}
                  selectedStationName={selectedStation?.nombre || null}
                  pendingOrigin={pendingOrigin}
                  pendingDestination={pendingDestination}
                  cleanMapOnly={cleanMapOnly}
                  zoom={zoom}
                  autoFitRoute={autoFitRoute}
                  onSelectStation={(est) => {
                    setSelectedStation(est);
                    if (onInspectStation) onInspectStation(est.nombre);
                  }}
                  className="w-full h-full max-w-[1140px] max-h-full object-contain"
                />
              </div>
            </div>

            {/* Panel lateral de inspección de estación o ruta (se oculta en Modo Solo Mapa) */}
            <AnimatePresence>
              {!cleanMapOnly && (
                <motion.aside
                  initial={{ x: 48, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 48, opacity: 0 }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                  className="w-80 sm:w-96 shrink-0 border-l border-white/[0.08] bg-[#111112] p-5 overflow-y-auto flex flex-col gap-5"
                >
                  {/* 1. Tarjeta superior de Estado de Ruta / Selección Origen y Destino en el Mapa */}
                  <div className="rounded-xl border border-white/[0.08] bg-black/70 p-4 space-y-3 font-clean">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="display text-base sm:text-lg font-extrabold uppercase text-white leading-tight">
                        Viaje en Mapa
                      </h3>
                      {(pendingOrigin || pendingDestination) && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.08, y: -1 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            setPendingOrigin(null);
                            setPendingDestination(null);
                          }}
                          className="font-clean text-[11px] font-bold uppercase tracking-wide text-[#F7B500] hover:underline cursor-pointer"
                        >
                          Reiniciar
                        </motion.button>
                      )}
                    </div>

                    {/* Indicadores de Origen y Destino elegidos */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-white/[0.07] bg-[#111113] p-2.5">
                        <span className="font-mono text-[9px] uppercase text-[#10b981] block">
                          Origen
                        </span>
                        <div className="font-clean font-bold text-white truncate mt-0.5">
                          {pendingOrigin ||
                            (displayedPlan ? displayedPlan.paradas[0] : 'Sin marcar')}
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/[0.07] bg-[#111113] p-2.5">
                        <span className="font-mono text-[9px] uppercase text-[#EF0014] block">
                          Destino
                        </span>
                        <div className="font-clean font-bold text-white truncate mt-0.5">
                          {pendingDestination ||
                            (displayedPlan
                              ? displayedPlan.paradas[displayedPlan.paradas.length - 1]
                              : 'Sin marcar')}
                        </div>
                      </div>
                    </div>

                    {/* Mensaje cuando falta marcar uno de los dos puntos */}
                    {(pendingOrigin && !pendingDestination) ||
                    (!pendingOrigin && pendingDestination) ? (
                      <div className="rounded-lg bg-[#111113] border border-white/[0.07] px-3 py-2 font-clean text-[11px] text-amber-200">
                        {pendingOrigin && !pendingDestination
                          ? 'Haz clic en otra estación del mapa y pulsa "Destino".'
                          : 'Haz clic en otra estación del mapa y pulsa "Origen".'}
                      </div>
                    ) : null}

                    {/* CSS selector 4 & 5: Resumen de la ruta con tipografía legible, grande y sin esparramarse horizontalmente */}
                    {displayedPlan && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-2.5 border-t border-white/[0.08] pt-3 font-clean"
                      >
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#111113] px-3.5 py-2.5">
                          <span className="font-mono text-[10px] font-semibold uppercase text-white/60">
                            Buses a tomar:
                          </span>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {displayedPlan.rutas.map((r, idx) => {
                              const tc = getTroncalColorByCode(r);
                              return (
                                <React.Fragment key={`${r}-${idx}`}>
                                  {idx > 0 && (
                                    <span className="font-clean text-sm font-extrabold text-white/60">
                                      →
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      backgroundColor: tc.bg,
                                      color: tc.text,
                                    }}
                                    className="rounded-lg px-2.5 py-1 font-clean text-sm sm:text-base font-extrabold uppercase tracking-wide shadow-sm"
                                  >
                                    {r.toUpperCase()}
                                  </span>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                        {/* TIEMPO ESTIMADO: GRANDE, LEGIBLE Y SIN ESPARRAMARSE */}
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#111113] px-3.5 py-2.5">
                          <span className="font-mono text-[10px] font-semibold uppercase text-white/60">
                            Tiempo estimado:
                          </span>
                          <span className="font-clean text-xl sm:text-2xl font-extrabold tracking-tight text-[#F7B500] tabular-nums">
                            ~{displayedPlan.tiempoEstimadoMin} MIN
                          </span>
                        </div>
                        <div className="font-clean text-xs text-white/75 px-1">
                          {displayedPlan.transbordo ? (
                            <>
                              Transbordo en:{' '}
                              <strong className="font-extrabold text-[#F7B500]">
                                {displayedPlan.transbordo}
                              </strong>
                            </>
                          ) : (
                            <span>Servicio directo (sin transbordo)</span>
                          )}
                        </div>

                        {/* CSS selector 3: Botón del mapa con el TransMilenio y texto de máximo 2 palabras ("Ver Ruta") */}
                        {onConfirmTripToMain && (
                          <div className="pt-1.5">
                            <TransmiActionButton
                              label="Ver Ruta"
                              withBusIcon={true}
                              iconSrc={regeneratedImg3}
                              onClick={() => {
                                const orig =
                                  pendingOrigin || displayedPlan.paradas[0];
                                const dest =
                                  pendingDestination ||
                                  displayedPlan.paradas[
                                    displayedPlan.paradas.length - 1
                                  ];
                                onConfirmTripToMain(orig, dest);
                                window.setTimeout(() => {
                                  onClose();
                                }, 1150);
                              }}
                              className="w-full"
                            />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* 2. Detalle de la estación seleccionada con clic en el mapa */}
                  {selectedStation && selectedStationInfo ? (
                    <motion.div
                      key={selectedStationInfo.nombre}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="rounded-2xl border border-white/[0.08] bg-black p-5 flex flex-col gap-3.5 font-clean"
                    >
                      {/* div:nth-of-type(1) */}
                      <div className="flex items-center justify-between">
                        <span
                          className="rounded px-2.5 py-1 font-mono text-[10px] font-bold text-white"
                          style={{
                            backgroundColor: selectedStationInfo.colorTroncal,
                          }}
                        >
                          Troncal {selectedStationInfo.troncal} ·{' '}
                          {selectedStationInfo.nombreTroncal}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            selectedStationInfo.abierta
                              ? 'text-[#10b981]'
                              : 'text-[#EF0014]'
                          }`}
                        >
                          {selectedStationInfo.abierta ? 'ABIERTA' : 'CERRADA'}
                        </span>
                      </div>

                      {/* div:nth-of-type(2) */}
                      <div>
                        <span className="label-mono">Estación Seleccionada</span>
                        <h3 className="font-clean text-lg font-extrabold uppercase tracking-tight text-white mt-0.5">
                          {selectedStationInfo.nombre}
                        </h3>
                        <p className="mt-1 font-clean text-xs text-white/60">
                          Frecuencia diaria:{' '}
                          <strong className="font-mono text-[#F7B500] tabular-nums">
                            {selectedStationInfo.busesDia}
                          </strong>{' '}
                          buses/día
                        </p>
                      </div>

                      {/* div:nth-of-type(3) */}
                      <div>
                        <div className="label-mono">
                          Rutas en esta estación
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {selectedStationInfo.rutasQueParan.length > 0 ? (
                            selectedStationInfo.rutasQueParan.map((r) => {
                              const tc = getTroncalColorByCode(r);
                              return (
                                <span
                                  key={r}
                                  style={{
                                    backgroundColor: tc.bg,
                                    color: tc.text,
                                  }}
                                  className="rounded-md px-2.5 py-1 font-clean text-xs font-extrabold uppercase tracking-wide shadow-sm"
                                >
                                  {r.toUpperCase()}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-white/50">
                              Conexión troncal
                            </span>
                          )}
                        </div>
                      </div>

                      {/* div:nth-of-type(4): Botones "Origen" y "Destino" con 3D Motion */}
                      {selectedStationInfo.abierta && (
                        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.08]">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05, y: -2, rotateX: 6 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setPendingOrigin(selectedStationInfo.nombre);
                              setAutoFitRoute(true);
                              if (onSelectAsOrigin) {
                                onSelectAsOrigin(selectedStationInfo.nombre);
                              }
                            }}
                            className={`rounded-xl border py-3 px-4 font-clean text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                              pendingOrigin === selectedStationInfo.nombre
                                ? 'border-[#10b981] bg-[#10b981] text-black'
                                : 'border-[#10b981]/50 bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25'
                            }`}
                          >
                            Origen
                          </motion.button>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05, y: -2, rotateX: 6 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setPendingDestination(selectedStationInfo.nombre);
                              setAutoFitRoute(true);
                              if (onSelectAsDestination) {
                                onSelectAsDestination(selectedStationInfo.nombre);
                              }
                            }}
                            className={`rounded-xl border py-3 px-4 font-clean text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                              pendingDestination === selectedStationInfo.nombre
                                ? 'border-[#EF0014] bg-[#EF0014] text-white'
                                : 'border-[#EF0014]/50 bg-[#EF0014]/15 text-red-200 hover:bg-[#EF0014]/30'
                            }`}
                          >
                            Destino
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
