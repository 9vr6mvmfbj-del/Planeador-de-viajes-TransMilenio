import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Map,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  LocateFixed,
  MapPin,
  Route,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RedTransMilenio, PlanViaje, InfoEstacionRed } from './engine/red';
import { TRONCALES_BOGOTA } from './engine/datosBogota';
import {
  BogotaTransmiHeaderLogo,
  AnimatedBogotaOfficialLogo,
  AnimatedTransMilenioOfficialLogo,
  BogotaIntroSplash,
  HeroCyclingTransmiBus,
  TransmiActionButton,
  TopDownTransbordoAnimator,
} from './components/TransmiVisualAssets';
import {
  ModernSelect,
  ModernNumberInput,
  ModernTimeSelector,
  SelectOption,
  getCurrentRealTimeHHMM,
} from './components/ModernControls';
import {
  TroncalMapModal,
  getTroncalColorByCode,
} from './components/TroncalMapModal';
import { OperatorLoginModal } from './components/OperatorLoginModal';
import { OperatorPanel } from './components/OperatorPanel';
import regeneratedImg1 from './assets/images/regenerated_image_1793015788815.png';
import regeneratedImg2 from './assets/images/regenerated_image_1793015789293.png';
import regeneratedImg3 from './assets/images/regenerated_image_1793019929661.png';
import regeneratedImg4 from './assets/images/regenerated_image_1793019930152.png';

type ActiveModule = 'CONSULTAR' | 'VIAJAR' | 'OPERAR';

export function App() {
  // Video de intro en HD enviado por el usuario (vista limpia y completa)
  const [showIntroSplash, setShowIntroSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
    }
    return true;
  });

  // Instancia única del motor de Estructuras de Datos (R1 a R10)
  const [red] = useState(() => new RedTransMilenio());
  const [versionRed, setVersionRed] = useState<number>(0);

  // Navegación principal y autenticación de Administrador
  const [activeModule, setActiveModule] = useState<ActiveModule>('VIAJAR');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('ADMIN');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  // Estado del Mapa Esquemático
  const [mapModalOpen, setMapModalOpen] = useState<boolean>(false);
  const [mapHighlightedRoute, setMapHighlightedRoute] = useState<{
    name: string;
    stops: string[];
  } | null>(null);

  // Referencias y llaves de animación interactiva para todos los botones
  const resultadosSugeridosRef = useRef<HTMLElement | null>(null);
  const proximoBusCardRef = useRef<HTMLDivElement | null>(null);
  const r1ResultCardRef = useRef<HTMLDivElement | null>(null);

  const [routePulseKey, setRoutePulseKey] = useState<number>(0);
  const [nextBusPulseKey, setNextBusPulseKey] = useState<number>(0);
  const [r1PulseKey, setR1PulseKey] = useState<number>(0);
  const [r3PulseKey, setR3PulseKey] = useState<number>(0);

  // ================= ESTADO MÓDULO 1: CONSULTAR ESTACIONES (R1, R2, R3) =================
  const [r1Query, setR1Query] = useState<string>('PORTAL NORTE');
  const [r1Consultada, setR1Consultada] = useState<string>('PORTAL NORTE');

  // Límite K fijo siempre en 6 como pide el documento .md
  const [r2Prefijo, setR2Prefijo] = useState<string>('PORTAL');
  const r2LimiteK = 6;

  const [r3Desde, setR3Desde] = useState<string>('AV JIMENEZ');
  const [r3Hasta, setR3Hasta] = useState<string>('CALLE 85');
  const [r3Ejecutado, setR3Ejecutado] = useState<{ desde: string; hasta: string }>({
    desde: 'AV JIMENEZ',
    hasta: 'CALLE 85',
  });

  // ================= ESTADO MÓDULO 2: VIAJAR (R4, R5, R6) =================
  const [r5Origen, setR5Origen] = useState<string>('PORTAL NORTE');
  const [r5Destino, setR5Destino] = useState<string>('PORTAL AMERICAS');
  const [r5PlanCalculado, setR5PlanCalculado] = useState<PlanViaje | null>(() =>
    red.viaje('PORTAL NORTE', 'PORTAL AMERICAS')
  );

  // Hora inicializada con la hora en tiempo real
  const [r4Estacion, setR4Estacion] = useState<string>('HEROES');
  const [r4Ruta, setR4Ruta] = useState<string>('B12');
  const [r4Hora, setR4Hora] = useState<string>(() => getCurrentRealTimeHHMM());
  const [r4Consulta, setR4Consulta] = useState<{
    estacion: string;
    ruta: string;
    hora: string;
  }>(() => ({
    estacion: 'HEROES',
    ruta: 'B12',
    hora: getCurrentRealTimeHHMM(),
  }));

  const [r6TopK, setR6TopK] = useState<number>(8);
  const [r6TroncalFiltro, setR6TroncalFiltro] = useState<string>('ALL');

  const todasEstaciones: InfoEstacionRed[] = useMemo(
    () => red.obtenerTodasLasEstaciones(),
    [red, versionRed]
  );

  const rutasDisponibles: string[] = useMemo(
    () => red.obtenerNombresRutas(),
    [red, versionRed]
  );

  const opcionesTodasEstaciones: SelectOption[] = useMemo(
    () =>
      todasEstaciones.map((e) => ({
        value: e.nombre,
        label: e.nombre,
        badgeText: e.troncal,
        badgeColor: e.colorTroncal,
      })),
    [todasEstaciones]
  );

  const opcionesEstacionesAbiertas: SelectOption[] = useMemo(
    () =>
      todasEstaciones
        .filter((e) => e.abierta)
        .map((e) => ({
          value: e.nombre,
          label: e.nombre,
          badgeText: e.troncal,
          badgeColor: e.colorTroncal,
        })),
    [todasEstaciones]
  );

  const opcionesRutas: SelectOption[] = useMemo(
    () =>
      rutasDisponibles.map((r) => {
        const tc = getTroncalColorByCode(r);
        return {
          value: r,
          label: `Ruta ${r}`,
          badgeText: r,
          badgeColor: tc.bg,
        };
      }),
    [rutasDisponibles]
  );

  const r1Estado = useMemo(
    () => red.estado(r1Consultada),
    [red, r1Consultada, versionRed]
  );
  const r1Detalle = useMemo(
    () => red.obtenerDetalleEstacion(r1Consultada),
    [red, r1Consultada, versionRed]
  );

  const r2Sugerencias = useMemo(() => {
    const q = r2Prefijo.trim().toUpperCase();
    if (!q) {
      return todasEstaciones.slice(0, r2LimiteK).map((e) => e.nombre);
    }
    const porPrefijo = red.autocompletar(q, r2LimiteK);
    if (porPrefijo.length > 0) return porPrefijo;
    // Fallback por coincidencia parcial para que siempre permita seleccionar estaciones
    return todasEstaciones
      .filter((e) => e.nombre.includes(q))
      .slice(0, r2LimiteK)
      .map((e) => e.nombre);
  }, [red, r2Prefijo, r2LimiteK, todasEstaciones, versionRed]);

  const r3Resultados = useMemo(() => {
    const d = r3Ejecutado.desde.trim().toUpperCase();
    const h = r3Ejecutado.hasta.trim().toUpperCase();
    if (d <= h) {
      return red.rango(d, h);
    }
    return red.rango(h, d).reverse();
  }, [red, r3Ejecutado, versionRed]);

  const r4Proximo = useMemo(
    () => red.proximoBus(r4Consulta.estacion, r4Consulta.ruta, r4Consulta.hora),
    [red, r4Consulta, versionRed]
  );
  const r4ListaSiguientes = useMemo(
    () =>
      red.proximosBusesLista(
        r4Consulta.estacion,
        r4Consulta.ruta,
        r4Consulta.hora,
        4
      ),
    [red, r4Consulta, versionRed]
  );

  const r6Ranking = useMemo(() => {
    const todos = red.ranking(todasEstaciones.length || 115);
    const filtrados =
      r6TroncalFiltro === 'ALL'
        ? todos
        : todos.filter((e) => e.troncal === r6TroncalFiltro);
    return filtrados.slice(0, r6TopK);
  }, [red, r6TopK, r6TroncalFiltro, todasEstaciones.length, versionRed]);

  const planViajeVigente = useMemo(
    () => red.viaje(r5Origen, r5Destino),
    [red, r5Origen, r5Destino, versionRed]
  );

  const handleOpenOperatorModule = () => {
    setActiveModule('OPERAR');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEncontrarRuta = () => {
    const nuevoPlan = red.viaje(r5Origen, r5Destino);
    setR5PlanCalculado(nuevoPlan);
    setRoutePulseKey((k) => k + 1);
    if (nuevoPlan && nuevoPlan.rutas.length > 0) {
      const primeraRuta = nuevoPlan.rutas[0];
      setR4Estacion(r5Origen);
      setR4Ruta(primeraRuta);
      setR4Consulta((prev) => ({
        ...prev,
        estacion: r5Origen,
        ruta: primeraRuta,
      }));
    }
  };

  const handleConsultarProximoBus = () => {
    setR4Consulta({
      estacion: r4Estacion,
      ruta: r4Ruta,
      hora: r4Hora,
    });
    setNextBusPulseKey((k) => k + 1);
  };

  const handleConsultarEstacionExacta = (nombreEst?: string) => {
    const raw = (nombreEst ?? r1Query).trim().toUpperCase();
    if (!raw) return;
    // Si coincide exactamente con una estación o si es búsqueda parcial, resolvemos con inteligencia
    const exacta = todasEstaciones.find((e) => e.nombre === raw);
    const parcial =
      exacta ||
      todasEstaciones.find((e) => e.nombre.startsWith(raw)) ||
      todasEstaciones.find((e) => e.nombre.includes(raw));
    const target = parcial ? parcial.nombre : raw;
    setR1Query(target);
    setR1Consultada(target);
    setR1PulseKey((k) => k + 1);
  };

  const handleFiltrarRango = () => {
    setR3Ejecutado({ desde: r3Desde, hasta: r3Hasta });
    setR3PulseKey((k) => k + 1);
  };

  const refreshRed = () => setVersionRed((v) => v + 1);

  return (
    <div className="min-h-screen flex flex-col bg-[#070708] text-white px-5 py-5 sm:px-8 sm:py-6 gap-5 overflow-x-hidden">
      {/* 1. VIDEO DE INTRO EN HD ENTREGADO POR EL USUARIO (VISTA COMPLETA Y LIMPIA) */}
      <AnimatePresence>
        {showIntroSplash && (
          <BogotaIntroSplash onFinish={() => setShowIntroSplash(false)} />
        )}
      </AnimatePresence>

      {/* 2. BANER DEL MENÚ DE ARRIBA (SE MANTIENE EN TODAS LAS VENTANAS, SIN BOTÓN ACCESO ADMIN, CON PNG DE TRANSMILENIO + "TransMilenio") */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        className="mx-auto w-full max-w-[1480px] flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4"
      >
        {/* Zona 1: Logo Oficial de Bogotá + Logo PNG TransMilenio + "TransMilenio" */}
        <motion.a
          href="#inicio"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.preventDefault();
            setActiveModule('VIAJAR');
          }}
          className="flex items-center gap-3.5 shrink-0 focus:outline-none whitespace-nowrap cursor-pointer"
        >
          <BogotaTransmiHeaderLogo className="h-9 sm:h-11 w-auto" />
        </motion.a>

        {/* Zona 2: Navegación Principal con Motion */}
        <nav
          aria-label="Navegación Principal"
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-clean"
        >
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            onClick={() => setActiveModule('VIAJAR')}
            className={`pb-1 font-clean text-xs font-extrabold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeModule === 'VIAJAR'
                ? 'text-[#EF0014] border-b-2 border-[#EF0014]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Buscar Ruta
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            onClick={() => setActiveModule('CONSULTAR')}
            className={`pb-1 font-clean text-xs font-extrabold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeModule === 'CONSULTAR'
                ? 'text-[#EF0014] border-b-2 border-[#EF0014]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Ver Estaciones
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            onClick={() => {
              setMapHighlightedRoute(null);
              setMapModalOpen(true);
            }}
            className="pb-1 font-clean text-xs font-extrabold uppercase tracking-wider text-[#F7B500] hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Mapa Troncales
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            onClick={handleOpenOperatorModule}
            className={`pb-1 font-clean text-xs font-extrabold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeModule === 'OPERAR'
                ? 'text-[#EF0014] border-b-2 border-[#EF0014]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Operar Red
          </motion.button>
        </nav>
      </motion.header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="mx-auto w-full max-w-[1480px] flex-1 flex flex-col gap-5">
        {/* ==================== MÓDULO 2: VIAJAR (R4, R5, R6) ==================== */}
        {activeModule === 'VIAJAR' && (
          <motion.div
            key="modulo-viajar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            className="grid grid-cols-1 xl:grid-cols-[390px_1fr] gap-5 items-stretch flex-1"
          >
            {/* SIDEBAR IZQUIERDO (390px): PLANEA TU RUTA (R5) + RESULTADOS SUGERIDOS ALINEADO HASTA ABAJO */}
            <aside className="flex flex-col gap-5 min-w-0 h-full">
              {/* Card 1: PLANEA TU RUTA */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                className="v11-card p-6 flex flex-col gap-4 relative z-30"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="display text-xl font-extrabold uppercase text-white">
                    Planea tu Ruta
                  </h2>
                  {/* Botón de mapa superior: SOLO el icono del mapa, sin texto */}
                  <motion.button
                    type="button"
                    aria-label="Ver Mapa"
                    title="Abrir Mapa de Troncales"
                    whileHover={{
                      scale: 1.1,
                      y: -2,
                      boxShadow: '0 8px 20px rgba(247, 181, 0, 0.28)',
                    }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                    onClick={() => {
                      setMapHighlightedRoute(null);
                      setMapModalOpen(true);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black text-[#F7B500] hover:border-[#F7B500] hover:bg-[#F7B500]/10 transition-colors cursor-pointer shrink-0"
                  >
                    <Map className="pointer-events-none h-4 w-4" />
                  </motion.button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* Selector de Origen: Icono a la izquierda + solo letra/color y nombre de estación */}
                  <ModernSelect
                    id="r5-origen"
                    value={r5Origen}
                    options={opcionesEstacionesAbiertas}
                    leftIcon={
                      <LocateFixed className="h-4 w-4 text-[#10b981]" />
                    }
                    onChange={(val) => {
                      setR5Origen(val);
                      setR5PlanCalculado(red.viaje(val, r5Destino));
                    }}
                  />

                  <div className="flex items-center justify-center my-0.5">
                    <motion.button
                      type="button"
                      whileHover={{
                        scale: 1.06,
                        y: -1,
                        boxShadow: '0 8px 20px rgba(239, 0, 20, 0.25)',
                      }}
                      whileTap={{ scale: 0.92, rotate: 180 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                      aria-label="Intercambiar origen y destino"
                      onClick={() => {
                        const temp = r5Origen;
                        setR5Origen(r5Destino);
                        setR5Destino(temp);
                        setR5PlanCalculado(red.viaje(r5Destino, temp));
                        setRoutePulseKey((k) => k + 1);
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-black px-4 py-2 font-clean text-xs font-extrabold uppercase tracking-tight text-white/85 hover:border-[#EF0014] hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="pointer-events-none h-3.5 w-3.5 text-[#EF0014]" />
                      <span className="pointer-events-none">Invertir</span>
                    </motion.button>
                  </div>

                  {/* Selector de Destino: Icono relacionado con destino a la izquierda + solo letra/color y nombre */}
                  <ModernSelect
                    id="r5-destino"
                    value={r5Destino}
                    options={opcionesEstacionesAbiertas}
                    leftIcon={<MapPin className="h-4 w-4 text-[#EF0014]" />}
                    onChange={(val) => {
                      setR5Destino(val);
                      setR5PlanCalculado(red.viaje(r5Origen, val));
                    }}
                  />

                  <div className="pt-1.5">
                    <TransmiActionButton
                      label="Buscar Ruta"
                      withBusIcon={true}
                      iconSrc={regeneratedImg3}
                      onClick={handleEncontrarRuta}
                      className="w-full"
                    />
                  </div>
                </div>
              </motion.section>

              {/* Card 2: RESULTADOS SUGERIDOS (Misma tipografía de título, lleno y alineado hasta abajo con los otros divs, con TransMi visto desde arriba) */}
              <motion.section
                ref={resultadosSugeridosRef}
                id="resultados-sugeridos"
                key={`resultados-${routePulseKey}`}
                initial={{ opacity: 0, x: -20, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  borderColor:
                    routePulseKey > 0
                      ? ['rgba(247,181,0,0.85)', 'rgba(255,255,255,0.08)']
                      : 'rgba(255,255,255,0.08)',
                }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="v11-card p-6 flex-1 flex flex-col justify-between gap-4"
              >
                {(() => {
                  const plan = r5PlanCalculado || planViajeVigente;
                  if (!plan) {
                    return (
                      <div className="space-y-3">
                        <h2 className="display text-xl font-extrabold uppercase text-white">
                          Resultados Sugeridos
                        </h2>
                        <div className="rounded-xl border border-[#EF0014]/30 bg-[#EF0014]/10 p-4 text-xs font-bold text-red-200 flex items-center gap-2.5">
                          <AlertCircle className="h-4 w-4 text-[#EF0014] shrink-0" />
                          <div>
                            Selecciona dos estaciones distintas entre{' '}
                            <strong>{r5Origen}</strong> y{' '}
                            <strong>{r5Destino}</strong>.
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="display text-lg sm:text-xl font-extrabold uppercase text-white leading-tight">
                            Resultados Sugeridos
                          </h2>
                          <motion.button
                            type="button"
                            whileHover={{ x: 3, scale: 1.06 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                              type: 'spring',
                              stiffness: 320,
                              damping: 16,
                            }}
                            onClick={() => {
                              setMapHighlightedRoute(null);
                              setMapModalOpen(true);
                            }}
                            className="font-clean text-xs font-extrabold uppercase tracking-tight text-[#F7B500] hover:underline cursor-pointer shrink-0"
                          >
                            Ver Mapa
                          </motion.button>
                        </div>

                        {/* Animación del TransMilenio visto desde arriba recorriendo cada punto de cambio de bus hasta la estación final */}
                        <TopDownTransbordoAnimator
                          origen={r5Origen}
                          destino={r5Destino}
                          rutas={plan.rutas}
                          transbordo={plan.transbordo}
                          onSelectStepStation={(est, r) => {
                            setR4Estacion(est);
                            setR4Ruta(r);
                            setR4Consulta({
                              estacion: est,
                              ruta: r,
                              hora: r4Hora,
                            });
                            setNextBusPulseKey((k) => k + 1);
                          }}
                        />
                      </div>

                      {/* Tiempo estimado + Paradas que se hacen en el mismo estilo */}
                      <div className="flex flex-col gap-2.5 pt-1">
                        <motion.div
                          whileHover={{ scale: 1.015 }}
                          className="rounded-xl border border-white/[0.07] bg-black/80 px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#F7B500]" />
                            <span className="font-mono text-xs font-bold uppercase text-white/70">
                              Tiempo
                            </span>
                          </div>
                          <div className="font-clean text-2xl font-extrabold text-[#F7B500] tabular-nums leading-none">
                            ~{plan.tiempoEstimadoMin} MIN
                          </div>
                        </motion.div>

                        <motion.div
                          whileHover={{ scale: 1.015 }}
                          className="rounded-xl border border-white/[0.07] bg-black/80 px-4 py-3 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Route className="h-4 w-4 text-[#10b981]" />
                              <span className="font-mono text-xs font-bold uppercase text-white/70">
                                Paradas
                              </span>
                            </div>
                            <div className="font-clean text-xl font-extrabold text-[#10b981] tabular-nums leading-none">
                              {plan.paradas.length} ESTACIONES
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-white/[0.06] max-h-[68px] overflow-y-auto">
                            {plan.paradas.map((parada, pIdx) => (
                              <React.Fragment key={`${parada}-${pIdx}`}>
                                <span
                                  className={`font-clean text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    pIdx === 0
                                      ? 'bg-[#EF0014]/20 text-white'
                                      : pIdx === plan.paradas.length - 1
                                      ? 'bg-[#10b981]/20 text-[#10b981]'
                                      : parada === plan.transbordo
                                      ? 'bg-[#F7B500]/20 text-[#F7B500]'
                                      : 'text-white/60'
                                  }`}
                                >
                                  {parada}
                                </span>
                                {pIdx < plan.paradas.length - 1 && (
                                  <span className="text-[9px] text-white/30">
                                    →
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </>
                  );
                })()}
              </motion.section>
            </aside>

            {/* MAIN CONTENT DERECHO (1fr): HERO BANNER MINIMALISTA + LIVE GRID ALINEADO HASTA ABAJO */}
            <div className="flex flex-col gap-5 min-w-0 h-full">
              {/* HERO BANNER — Minimalista */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-gradient-to-br from-[#111112] to-[#050505] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
              >
                <div className="pattern-dot" />

                <div className="lg:col-span-5 z-10 space-y-2 min-w-0">
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                    className="display text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold uppercase leading-[0.88] tracking-[-0.04em] text-white"
                  >
                    BOGOTÁ
                    <br />
                    <motion.span
                      animate={{
                        textShadow: [
                          '0px 0px 0px rgba(247,181,0,0)',
                          '0px 0px 24px rgba(247,181,0,0.45)',
                          '0px 0px 0px rgba(247,181,0,0)',
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-[#F7B500] inline-block"
                    >
                      URBAN
                    </motion.span>
                    <br />
                    MOTION
                  </motion.h1>
                </div>

                {/* Bus Articulado Hero pasando entre Edificios y Árboles de Bogotá de Estación en Estación */}
                <div className="lg:col-span-7 z-10 flex flex-col items-end justify-center min-w-0">
                  <HeroCyclingTransmiBus />
                </div>
              </motion.div>

              {/* LIVE GRID (2 COLUMNAS): TOP ESTACIONES (R6) + PRÓXIMO BUS (R4) ALINEADOS AL FINAL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch flex-1">
                {/* Columna Izquierda: Top Estaciones (R6) */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                  className="v11-card p-6 flex flex-col justify-between gap-4 h-full"
                >
                  <div className="flex flex-col gap-3.5 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="display text-lg font-extrabold uppercase text-white">
                        Top Estaciones
                      </h3>
                      <motion.button
                        type="button"
                        whileHover={{ x: 3, scale: 1.06 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          type: 'spring',
                          stiffness: 320,
                          damping: 16,
                        }}
                        onClick={() => setActiveModule('CONSULTAR')}
                        className="font-clean text-xs font-extrabold uppercase tracking-tight text-[#F7B500] hover:underline cursor-pointer"
                      >
                        Ver Todas
                      </motion.button>
                    </div>

                    {/* Pequeño seleccionador de letra y color de estación (Troncal) + "Todas" arriba del selector +/- */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-1 pt-0.5">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.06, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setR6TroncalFiltro('ALL')}
                        className={`rounded-lg px-2.5 py-1 font-clean text-[11px] font-extrabold uppercase transition-colors shrink-0 cursor-pointer ${
                          r6TroncalFiltro === 'ALL'
                            ? 'bg-[#EF0014] text-white shadow-[0_4px_12px_rgba(239,0,20,0.4)]'
                            : 'bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white'
                        }`}
                      >
                        Todas
                      </motion.button>
                      {TRONCALES_BOGOTA.map((t) => {
                        const active = r6TroncalFiltro === t.codigo;
                        return (
                          <motion.button
                            key={t.codigo}
                            type="button"
                            whileHover={{ scale: 1.08, y: -1 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() =>
                              setR6TroncalFiltro(active ? 'ALL' : t.codigo)
                            }
                            title={`Filtrar por Troncal ${t.codigo} (${t.nombre})`}
                            style={{
                              backgroundColor: active
                                ? t.color
                                : 'rgba(255,255,255,0.04)',
                              color: active ? t.textoColor : '#ffffff',
                              borderColor: t.color,
                            }}
                            className={`flex h-7 min-w-[26px] items-center justify-center rounded-lg border px-2 font-clean text-xs font-extrabold uppercase transition-all shrink-0 cursor-pointer ${
                              active
                                ? 'shadow-[0_0_12px_rgba(255,255,255,0.25)] scale-105'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                          >
                            {t.codigo}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Selector de cantidad con botón "-" funcional desde 1 estación */}
                    <ModernNumberInput
                      id="r6-topk"
                      label="Top k"
                      value={r6TopK}
                      min={1}
                      max={25}
                      suffix="estaciones"
                      onChange={setR6TopK}
                    />

                    <div className="divide-y divide-white/[0.08] max-h-[500px] overflow-y-auto pr-1 flex-1">
                      {r6Ranking.map((est, index) => (
                        <motion.button
                          key={est.nombre}
                          type="button"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 220,
                            damping: 20,
                            delay: index * 0.03,
                          }}
                          whileHover={{ x: 6 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            const rutaEst = est.rutasQueParan[0] || r4Ruta;
                            setR4Estacion(est.nombre);
                            setR4Ruta(rutaEst);
                            setR4Consulta({
                              estacion: est.nombre,
                              ruta: rutaEst,
                              hora: r4Hora,
                            });
                            setNextBusPulseKey((k) => k + 1);
                          }}
                          className="w-full py-2.5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.04] rounded-xl px-2 transition-colors cursor-pointer"
                        >
                          <div className="pointer-events-none flex items-center gap-4 min-w-0">
                            <span className="display text-2xl font-extrabold text-white/15 w-10 shrink-0 tabular-nums">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <div className="font-clean text-sm font-extrabold uppercase tracking-tight text-white truncate">
                                {est.nombre}
                              </div>
                              <div className="font-mono text-xs font-bold text-[#F7B500] tabular-nums">
                                {est.busesDia} BUSES
                              </div>
                            </div>
                          </div>
                          <span
                            className="pointer-events-none trunk-id shrink-0 text-white font-clean font-extrabold uppercase"
                            style={{ backgroundColor: est.colorTroncal }}
                          >
                            {est.troncal}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.section>

                {/* Columna Derecha: Próximo Bus Estimado (R4) */}
                <motion.section
                  ref={proximoBusCardRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 170, damping: 22 }}
                  className="v11-card p-6 flex flex-col justify-between gap-5 h-full relative z-20"
                >
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="display text-lg font-extrabold uppercase text-white">
                        Próximo Bus
                      </h3>
                      <span className="font-mono text-xs font-bold text-[#F7B500]">
                        {r4Consulta.hora} HRS
                      </span>
                    </div>

                    <motion.div
                      key={`${r4Consulta.estacion}-${r4Consulta.ruta}-${r4Consulta.hora}-${nextBusPulseKey}`}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        borderColor:
                          nextBusPulseKey > 0
                            ? ['rgba(247,181,0,0.85)', 'rgba(255,255,255,0.08)']
                            : 'rgba(255,255,255,0.08)',
                      }}
                      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                      className="rounded-3xl border border-white/[0.08] bg-[#161618] p-6 text-center flex-1 flex flex-col items-center justify-center gap-3"
                    >
                      {r4Proximo ? (
                        <>
                          <span
                            style={{
                              backgroundColor: getTroncalColorByCode(
                                r4Consulta.ruta
                              ).bg,
                              color: getTroncalColorByCode(r4Consulta.ruta).text,
                            }}
                            className="inline-block rounded-lg px-3.5 py-1 font-clean text-xs font-extrabold uppercase tracking-wider shadow"
                          >
                            {r4Consulta.ruta} — {r4Consulta.estacion}
                          </span>
                          <motion.div
                            initial={{ scale: 0.85, y: 8 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{
                              type: 'spring',
                              stiffness: 260,
                              damping: 16,
                            }}
                            className="display text-5xl sm:text-6xl font-extrabold text-[#F7B500] my-1 tabular-nums leading-none"
                          >
                            {r4Proximo}
                          </motion.div>
                          <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                            PRÓXIMA SALIDA PROGRAMADA
                          </div>

                          {r4ListaSiguientes.length > 1 && (
                            <div className="w-full mt-2 pt-3 border-t border-white/[0.07]">
                              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-2">
                                SIGUIENTES FRECUENCIAS
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                {r4ListaSiguientes.slice(1, 4).map((h, i) => (
                                  <motion.button
                                    key={h}
                                    type="button"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    whileHover={{ scale: 1.04, y: -1 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                      setR4Hora(h);
                                      setR4Consulta((prev) => ({
                                        ...prev,
                                        hora: h,
                                      }));
                                    }}
                                    className="rounded-xl bg-black py-2.5 px-2 text-center border border-white/[0.08] hover:border-[#F7B500] transition-colors cursor-pointer"
                                  >
                                    <div className="pointer-events-none font-mono text-sm sm:text-base font-extrabold text-white tabular-nums">
                                      {h}
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-4 flex flex-col items-center gap-3 text-xs text-amber-200 max-w-xs mx-auto">
                          <AlertCircle className="h-5 w-5 text-[#F7B500]" />
                          <div>
                            Sin parada en <strong>{r4Consulta.estacion}</strong>.
                          </div>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => {
                              const primera =
                                red.recorrido(r4Consulta.ruta, false)[0] ||
                                'HEROES';
                              setR4Estacion(primera);
                              setR4Consulta({
                                estacion: primera,
                                ruta: r4Consulta.ruta,
                                hora: r4Consulta.hora,
                              });
                              setNextBusPulseKey((k) => k + 1);
                            }}
                            className="rounded-xl bg-[#F7B500] px-4 py-2 font-clean text-xs font-extrabold uppercase text-black cursor-pointer"
                          >
                            Cambiar Estación
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ModernSelect
                        id="r4-estacion"
                        label="Estación"
                        value={r4Estacion}
                        options={opcionesTodasEstaciones}
                        onChange={(val) => {
                          setR4Estacion(val);
                          setR4Consulta((prev) => ({ ...prev, estacion: val }));
                        }}
                      />

                      <ModernSelect
                        id="r4-ruta"
                        label="Ruta Troncal"
                        value={r4Ruta}
                        options={opcionesRutas}
                        onChange={(val) => {
                          setR4Ruta(val);
                          const paradasDeRuta = red.recorrido(val, false);
                          const nextEst = paradasDeRuta.includes(r4Estacion)
                            ? r4Estacion
                            : paradasDeRuta[0] || r4Estacion;
                          setR4Estacion(nextEst);
                          setR4Consulta({
                            estacion: nextEst,
                            ruta: val,
                            hora: r4Hora,
                          });
                        }}
                      />
                    </div>

                    <ModernTimeSelector
                      label="Hora (HH:MM)"
                      value={r4Hora}
                      onChange={(val) => {
                        setR4Hora(val);
                        setR4Consulta((prev) => ({ ...prev, hora: val }));
                      }}
                    />

                    <TransmiActionButton
                      label="Próximo Bus"
                      withBusIcon={true}
                      iconSrc={regeneratedImg4}
                      onClick={handleConsultarProximoBus}
                      className="w-full"
                    />
                  </div>
                </motion.section>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== MÓDULO 1: VER ESTACIONES (R1, R2, R3) ==================== */}
        {activeModule === 'CONSULTAR' && (
          <motion.div
            key="modulo-consultar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* R1: Buscar Estación Exacta */}
              <motion.section
                transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                className="lg:col-span-6 v11-card p-6 flex flex-col justify-between gap-5 relative z-30"
              >
                <div className="space-y-5">
                  <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between gap-4">
                    <h2 className="display text-xl font-extrabold uppercase text-white">
                      Buscar Estación
                    </h2>
                    <span className="badge-red">DIRECTA</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ModernSelect
                      id="r1-select"
                      label="Seleccionar estación"
                      value={r1Consultada}
                      options={opcionesTodasEstaciones}
                      onChange={(val) => handleConsultarEstacionExacta(val)}
                    />

                    <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-black px-4 py-3 focus-within:border-[#EF0014]">
                      <label htmlFor="r1-input-manual" className="label-mono">
                        Nombre exacto
                      </label>
                      <input
                        id="r1-input-manual"
                        type="text"
                        value={r1Query}
                        onChange={(e) =>
                          setR1Query(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConsultarEstacionExacta(r1Query);
                          }
                        }}
                        placeholder="HEROES"
                        className="mt-1 w-full bg-transparent font-mono text-sm font-bold text-white placeholder-white/35 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <TransmiActionButton
                      label="Buscar Estación"
                      onClick={() => handleConsultarEstacionExacta(r1Query)}
                      className="w-full sm:w-auto"
                      iconSrc={regeneratedImg1}
                    />
                  </div>
                </div>

                <motion.div
                  ref={r1ResultCardRef}
                  key={`${r1Consultada}-${r1PulseKey}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    borderColor:
                      r1PulseKey > 0
                        ? ['rgba(239,0,20,0.85)', 'rgba(255,255,255,0.08)']
                        : 'rgba(255,255,255,0.08)',
                  }}
                  transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                  className="rounded-2xl border border-white/[0.08] bg-black p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {r1Detalle && (
                        <span
                          className="inline-flex h-6 min-w-[24px] items-center justify-center rounded px-1.5 font-clean text-xs font-extrabold uppercase text-white"
                          style={{ backgroundColor: r1Detalle.colorTroncal }}
                        >
                          {r1Detalle.troncal}
                        </span>
                      )}
                      <h3 className="font-clean text-xl font-extrabold uppercase tracking-tight text-white">
                        {r1Consultada || '—'}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-extrabold ${
                        r1Estado === 'ABIERTA'
                          ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                          : r1Estado === 'CERRADA'
                          ? 'bg-[#EF0014]/20 text-red-300 border border-[#EF0014]/40'
                          : 'bg-white/[0.06] text-white/70 border border-white/10'
                      }`}
                    >
                      {r1Estado === 'ABIERTA' && (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {r1Estado === 'CERRADA' && <XCircle className="h-4 w-4" />}
                      {r1Estado === 'NO EXISTE' && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span>{r1Estado}</span>
                    </span>
                  </div>

                  {r1Detalle && (
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-4 text-xs">
                      <div>
                        <span className="label-mono">Troncal</span>
                        <div className="mt-1 font-clean font-extrabold text-white">
                          {r1Detalle.troncal} · {r1Detalle.nombreTroncal}
                        </div>
                      </div>
                      <div>
                        <span className="label-mono">Frecuencia</span>
                        <div className="mt-1 font-mono font-extrabold text-white tabular-nums">
                          {r1Detalle.busesDia} buses/día
                        </div>
                      </div>
                      <div>
                        <span className="label-mono">Rutas</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r1Detalle.rutasQueParan.length > 0 ? (
                            r1Detalle.rutasQueParan.map((r) => {
                              const tc = getTroncalColorByCode(r);
                              return (
                                <span
                                  key={r}
                                  style={{
                                    backgroundColor: tc.bg,
                                    color: tc.text,
                                  }}
                                  className="rounded px-1.5 py-0.5 font-clean text-[11px] font-extrabold uppercase"
                                >
                                  {r}
                                </span>
                              );
                            })
                          ) : (
                            <span className="font-mono font-extrabold text-[#F7B500]">
                              Troncal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.section>

              {/* R2: Autocompletar por Prefijo (Límite K fijo en 6, sin "M", "CA" ni "SUBA") */}
              <motion.section
                transition={{ type: 'spring', stiffness: 180, damping: 20 }}
                className="lg:col-span-6 v11-card p-6 flex flex-col justify-between gap-5 relative z-20"
              >
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between gap-4">
                    <h2 className="display text-xl font-extrabold uppercase text-white">
                      Autocompletar
                    </h2>
                    <span className="label-mono">PREFIJO</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="r2-prefijo" className="label-mono">
                      Prefijo o nombre de estación
                    </label>
                    <div className="relative flex items-center">
                      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-white/40" />
                      <input
                        id="r2-prefijo"
                        type="text"
                        value={r2Prefijo}
                        onChange={(e) =>
                          setR2Prefijo(e.target.value.toUpperCase())
                        }
                        placeholder="PORTAL, CALLE, AV..."
                        className="h-[48px] w-full rounded-xl border border-white/[0.08] bg-black pl-10 pr-4 font-mono text-sm font-bold text-white placeholder-white/35 focus:border-[#EF0014] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Botones de prefijo sin "M", "CA" ni "SUBA" como pide el .md */}
                  <div className="flex flex-wrap items-center gap-2">
                    {['PORTAL', 'CALLE', 'AV'].map((pref) => (
                      <motion.button
                        key={pref}
                        type="button"
                        whileHover={{ scale: 1.06, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          type: 'spring',
                          stiffness: 320,
                          damping: 16,
                        }}
                        onClick={() => setR2Prefijo(pref)}
                        className={`rounded-lg px-3.5 py-1.5 font-clean text-xs font-extrabold uppercase tracking-tight transition-colors cursor-pointer ${
                          r2Prefijo === pref
                            ? 'bg-[#EF0014] text-white shadow-[0_4px_14px_rgba(239,0,20,0.4)]'
                            : 'bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white'
                        }`}
                      >
                        {pref}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-black p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {r2Sugerencias.map((nom, idx) => {
                      const isSelected = r1Consultada === nom;
                      return (
                        <motion.button
                          key={nom}
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02, x: 3 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 18,
                          }}
                          onClick={() => handleConsultarEstacionExacta(nom)}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#EF0014] bg-[#EF0014]/20 text-white'
                              : 'border-white/[0.06] bg-white/[0.03] text-white hover:border-[#EF0014] hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="pointer-events-none font-clean font-extrabold uppercase tracking-tight text-white truncate">
                            {nom}
                          </span>
                          <span className="pointer-events-none font-mono text-[10px] text-[#F7B500] font-bold tabular-nums">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            </div>

            {/* R3: Filtrar por Rango Alfabético */}
            <motion.section
              transition={{ type: 'spring', stiffness: 180, damping: 20 }}
              className="v11-card p-6 space-y-5 relative z-10"
            >
              <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between gap-4">
                <h2 className="display text-xl font-extrabold uppercase text-white">
                  Rango Alfabético
                </h2>
                <span className="font-mono text-xs text-[#F7B500] font-bold tabular-nums">
                  {r3Resultados.length} ESTACIONES
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                  <ModernSelect
                    id="r3-desde"
                    label="Desde"
                    value={r3Desde}
                    options={opcionesTodasEstaciones}
                    onChange={(val) => {
                      setR3Desde(val);
                      setR3Ejecutado({ desde: val, hasta: r3Hasta });
                    }}
                  />
                </div>

                <div className="md:col-span-4">
                  <ModernSelect
                    id="r3-hasta"
                    label="Hasta"
                    value={r3Hasta}
                    options={opcionesTodasEstaciones}
                    onChange={(val) => {
                      setR3Hasta(val);
                      setR3Ejecutado({ desde: r3Desde, hasta: val });
                    }}
                  />
                </div>

                <div className="md:col-span-4">
                  <TransmiActionButton
                    label="Filtrar Rango"
                    onClick={handleFiltrarRango}
                    className="w-full"
                    iconSrc={regeneratedImg2}
                  />
                </div>
              </div>

              <motion.div
                key={`rango-box-${r3PulseKey}-${r3Ejecutado.desde}-${r3Ejecutado.hasta}`}
                initial={{ opacity: 0.75, scale: 0.99 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  borderColor:
                    r3PulseKey > 0
                      ? ['rgba(247,181,0,0.8)', 'rgba(255,255,255,0.08)']
                      : 'rgba(255,255,255,0.08)',
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="rounded-2xl border border-white/[0.08] bg-black p-4"
              >
                <div className="flex flex-wrap gap-2">
                  {r3Resultados.map((est, idx) => (
                    <motion.button
                      key={`${est}-${r3PulseKey}`}
                      type="button"
                      initial={{ opacity: 0, scale: 0.9, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 18,
                        delay: Math.min(0.4, idx * 0.012),
                      }}
                      whileHover={{
                        scale: 1.05,
                        y: -2,
                        boxShadow: '0 8px 20px rgba(239, 0, 20, 0.25)',
                      }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        handleConsultarEstacionExacta(est);
                        window.setTimeout(() => {
                          r1ResultCardRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        }, 60);
                      }}
                      className={`rounded-xl border px-3.5 py-2 font-clean text-xs font-extrabold uppercase tracking-tight transition-colors cursor-pointer ${
                        r1Consultada === est
                          ? 'border-[#EF0014] bg-[#EF0014] text-white'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/90 hover:border-[#EF0014] hover:text-white'
                      }`}
                    >
                      {est}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.section>
          </motion.div>
        )}

        {/* ==================== MÓDULO 3: OPERAR RED (CENTRADO ARRIBA Y ABAJO AL ENTRAR) ==================== */}
        {activeModule === 'OPERAR' && (
          <motion.div
            key="modulo-operar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            className="flex-1 flex flex-col justify-center"
          >
            {!isAdminLoggedIn ? (
              <OperatorLoginModal
                isOpen={true}
                inlineMode={true}
                onClose={() => setActiveModule('VIAJAR')}
                onLoginSuccess={(user) => {
                  setAdminUsername(user);
                  setIsAdminLoggedIn(true);
                }}
              />
            ) : (
              <OperatorPanel
                operatorName={adminUsername}
                onLogout={() => {
                  setIsAdminLoggedIn(false);
                  setActiveModule('VIAJAR');
                }}
                estaciones={todasEstaciones}
                rutasDisponibles={rutasDisponibles}
                obtenerRecorrido={(ruta, alReves) =>
                  red.recorrido(ruta, alReves)
                }
                onAgregarParada={(ruta, nueva, despuesDe) => {
                  const ok = red.agregarParada(ruta, nueva, despuesDe);
                  if (ok) refreshRed();
                  return ok;
                }}
                onQuitarParada={(ruta, estacion) => {
                  const ok = red.quitarParada(ruta, estacion);
                  if (ok) refreshRed();
                  return ok;
                }}
                onCerrarEstacion={(nombre) => {
                  const ok = red.cerrar(nombre);
                  if (ok) refreshRed();
                  return ok;
                }}
                onReabrirEstacion={(nombre) => {
                  const ok = red.reabrir(nombre);
                  if (ok) refreshRed();
                  return ok;
                }}
                onDeshacer={() => {
                  const acc = red.deshacer();
                  if (acc) refreshRed();
                  return acc;
                }}
                onRehacer={() => {
                  const acc = red.rehacer();
                  if (acc) refreshRed();
                  return acc;
                }}
                onVerRutaEnMapa={(ruta, paradas) => {
                  setMapHighlightedRoute({ name: ruta, stops: paradas });
                  setMapModalOpen(true);
                }}
                historialDeshacer={red.obtenerHistorialDeshacer()}
                historialRehacer={red.obtenerHistorialRehacer()}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* BANER DE ABAJO (FOOTER): LOGOS DE BOGOTÁ Y TRANSMILENIO + AUTORES EN ESTILO PROFESIONAL Y REALISTA */}
      <footer className="mx-auto w-full max-w-[1480px] border-t border-white/[0.08] pt-5 pb-2 flex flex-col gap-4 font-mono text-xs text-white/55">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AnimatedBogotaOfficialLogo
              replayKey="footer-bogota-logo"
              className="h-7 sm:h-8 w-auto"
            />
            <span className="h-5 w-[1.5px] bg-white/15 shrink-0" />
            <AnimatedTransMilenioOfficialLogo
              replayKey="footer-tm-logo"
              className="h-7 sm:h-8 w-auto"
            />
            <span className="font-clean text-xs sm:text-sm font-extrabold tracking-wider text-white/80">
              TransMilenio — Bogotá
            </span>
          </div>

          <div className="flex items-center gap-6 font-clean">
            <motion.button
              type="button"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowIntroSplash(true)}
              className="font-clean text-xs font-extrabold uppercase tracking-wider hover:text-[#EF0014] transition-colors cursor-pointer"
            >
              Ver Intro
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMapModalOpen(true)}
              className="font-clean text-xs font-extrabold uppercase tracking-wider hover:text-[#F7B500] transition-colors cursor-pointer"
            >
              Ver Mapa
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenOperatorModule}
              className="font-clean text-xs font-extrabold uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
            >
              Operar Red
            </motion.button>
          </div>
        </div>

        {/* Créditos de los creadores en estilo profesional y realista */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-3 text-[11px] text-white/50 font-clean">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[#F7B500]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
              Desarrollado por:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-clean text-xs font-bold text-white/80">
            <motion.span whileHover={{ y: -1, color: '#F7B500' }}>
              Juan David Bello
            </motion.span>
            <span className="text-white/20">·</span>
            <motion.span whileHover={{ y: -1, color: '#F7B500' }}>
              Juan David Lara
            </motion.span>
            <span className="text-white/20">·</span>
            <motion.span whileHover={{ y: -1, color: '#F7B500' }}>
              Valeria Alvarado
            </motion.span>
            <span className="text-white/20">·</span>
            <motion.span whileHover={{ y: -1, color: '#F7B500' }}>
              Danna Garay
            </motion.span>
          </div>
        </div>
      </footer>

      {/* Modal del Mapa Esquemático de Troncales */}
      <TroncalMapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        estacionesInfo={todasEstaciones}
        activePlan={
          mapHighlightedRoute ? null : r5PlanCalculado || planViajeVigente
        }
        highlightedRouteStops={
          mapHighlightedRoute ? mapHighlightedRoute.stops : []
        }
        highlightedRouteName={
          mapHighlightedRoute ? mapHighlightedRoute.name : undefined
        }
        calcularViaje={(orig, dest) => red.viaje(orig, dest)}
        onSelectAsOrigin={(est) => {
          setR5Origen(est);
        }}
        onSelectAsDestination={(est) => {
          setR5Destino(est);
        }}
        onConfirmTripToMain={(orig, dest) => {
          setR5Origen(orig);
          setR5Destino(dest);
          setR5PlanCalculado(red.viaje(orig, dest));
          setActiveModule('VIAJAR');
          setRoutePulseKey((k) => k + 1);
          window.setTimeout(() => {
            resultadosSugeridosRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 250);
        }}
        onInspectStation={(est) => {
          setR1Query(est);
          setR1Consultada(est);
        }}
      />

      {/* Modal de Inicio de Sesión de Administrador (si se invoca como modal) */}
      <OperatorLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setAdminUsername(user);
          setIsAdminLoggedIn(true);
          setLoginModalOpen(false);
          setActiveModule('OPERAR');
        }}
      />
    </div>
  );
}

export default App;
