import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import defaultBtnBusImg from '../assets/images/regenerated_image_1793019929661.png';
import {
  ESTACIONES_ESQUEMATICAS,
  TRONCALES_BOGOTA,
} from '../engine/datosBogota';

// Ruta oficial del logo de Bogotá entregado por el usuario (NUNCA usar el escudo)
export const BOGOTA_LOGO_SRC =
  '/assets/aistudio/Bogota__marca_ciudad.svg_d09d097d.webp';

// Ruta oficial del logo PNG de TransMilenio enviado por el usuario
export const TRANSMILENIO_LOGO_PNG_SRC =
  '/assets/aistudio/png-transparent-transmilenio-logo-transport-n-cdr-angle-text_92fa7309.png';

// Video HD de intro enviado por el usuario (vista limpia y completa)
const REAL_DRONE_VIDEO_MP4 =
  '/assets/aistudio/Drone_tracking_bus_in_city_1080p_20261026150629_6588e006.mp4';

// Regiones exactas (clip-path) sobre el archivo oficial BOGOTA_LOGO_SRC (3840x1959)
// para que el logo se desprenda letra por letra (B-O-G-O-T-Á) y las 3 estrellitas bajen de arriba
const BOGOTA_LOGO_LETTER_CLIPS = [
  { id: 'B', clip: 'polygon(0% 50%, 12.1% 50%, 12.1% 90%, 0% 90%)' },
  { id: 'O1', clip: 'polygon(12.2% 50%, 29.8% 50%, 29.8% 90%, 12.2% 90%)' },
  { id: 'G', clip: 'polygon(29.9% 50%, 45.6% 50%, 45.6% 90%, 29.9% 90%)' },
  { id: 'O2', clip: 'polygon(45.7% 50%, 62.1% 50%, 62.1% 90%, 45.7% 90%)' },
  { id: 'T', clip: 'polygon(62.2% 50%, 77.6% 50%, 77.6% 62.5%, 73.5% 89%, 62.2% 89%)' },
  { id: 'A', clip: 'polygon(78.2% 46.8%, 91.5% 46.8%, 100% 66%, 100% 100%, 73.6% 100%, 77.7% 62.5%)' },
];

const BOGOTA_LOGO_STAR_CLIPS = [
  {
    id: 'star-left',
    clip: 'polygon(67.5% 22%, 77.2% 22%, 77.2% 38%, 67.5% 38%)',
    delay: 0.62,
  },
  {
    id: 'star-main',
    clip: 'polygon(72.8% 0%, 89.1% 0%, 89.1% 18.7%, 98.2% 18.7%, 98.2% 48.6%, 91.5% 46.7%, 77.3% 46.7%, 77.3% 21.9%, 72.8% 21.9%)',
    delay: 0.76,
  },
  {
    id: 'star-top-right',
    clip: 'polygon(89.2% 0%, 100% 0%, 100% 18.6%, 89.2% 18.6%)',
    delay: 0.9,
  },
];

/**
 * Logo Oficial de Bogotá idéntico al entregado por el usuario, animado con Motion:
 * - Cada letra (B - O - G - O - T - Á) se desprende y entra letra por letra.
 * - Las 3 estrellitas amarillas bajan desde arriba con rebote elástico.
 */
export const AnimatedBogotaOfficialLogo: React.FC<{
  className?: string;
  staggerSpeed?: number;
  replayKey?: number | string;
}> = ({ className = 'w-64', staggerSpeed = 0.095, replayKey = 'logo' }) => {
  return (
    <div
      key={replayKey}
      aria-label="Bogotá"
      className={`relative aspect-[3840/1959] select-none ${className}`}
    >
      {/* Imagen base invisible únicamente para mantener el layout exacto */}
      <img
        src={BOGOTA_LOGO_SRC}
        alt="Bogotá"
        className="w-full h-full object-contain opacity-0 pointer-events-none"
      />

      {/* Letras B - O - G - O - T - Á desprendiéndose letra por letra */}
      {BOGOTA_LOGO_LETTER_CLIPS.map((letter, idx) => (
        <motion.img
          key={`${replayKey}-letter-${letter.id}`}
          src={BOGOTA_LOGO_SRC}
          alt=""
          aria-hidden="true"
          initial={{
            opacity: 0,
            y: 38,
            x: (idx - 2.5) * 14,
            scale: 0.62,
            rotateZ: (idx - 2.5) * 7,
          }}
          animate={{
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            rotateZ: 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 220,
            damping: 16,
            delay: idx * staggerSpeed,
          }}
          style={{ clipPath: letter.clip }}
          className="pointer-events-none absolute inset-0 w-full h-full object-contain"
        />
      ))}

      {/* Las 3 estrellitas amarillas bajando desde arriba con rebote */}
      {BOGOTA_LOGO_STAR_CLIPS.map((star, idx) => (
        <motion.img
          key={`${replayKey}-star-${star.id}`}
          src={BOGOTA_LOGO_SRC}
          alt=""
          aria-hidden="true"
          initial={{
            opacity: 0,
            y: -75 - idx * 24,
            scale: 0.25,
            rotateZ: -38 + idx * 24,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            rotateZ: 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 250,
            damping: 13,
            delay: star.delay,
          }}
          style={{ clipPath: star.clip }}
          className="pointer-events-none absolute inset-0 w-full h-full object-contain"
        />
      ))}
    </div>
  );
};

const TRANSMI_BUS_REAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="220" viewBox="0 0 920 220">
  <defs>
    <linearGradient id="busBodyRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EF1A25"/>
      <stop offset="55%" stop-color="#D90410"/>
      <stop offset="100%" stop-color="#9E020B"/>
    </linearGradient>
    <linearGradient id="windowGlass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#BAE6FD"/>
      <stop offset="45%" stop-color="#E0F2FE"/>
      <stop offset="100%" stop-color="#7DD3FC"/>
    </linearGradient>
    <linearGradient id="bellowsGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4B5563"/>
      <stop offset="25%" stop-color="#6B7280"/>
      <stop offset="50%" stop-color="#374151"/>
      <stop offset="75%" stop-color="#6B7280"/>
      <stop offset="100%" stop-color="#4B5563"/>
    </linearGradient>
  </defs>
  <ellipse cx="460" cy="198" rx="430" ry="10" fill="rgba(0,0,0,0.55)"/>
  <rect x="75" y="22" width="18" height="8" rx="2" fill="#D90410"/>
  <rect x="130" y="22" width="24" height="8" rx="2" fill="#D90410"/>
  <rect x="215" y="22" width="18" height="8" rx="2" fill="#D90410"/>
  <rect x="295" y="22" width="22" height="8" rx="2" fill="#D90410"/>
  <rect x="520" y="22" width="140" height="8" rx="4" fill="#E30613"/>
  <path d="M24,34 Q24,28 32,28 L390,28 L390,174 L42,174 L24,162 Z" fill="url(#busBodyRed)" stroke="#7F1D1D" stroke-width="1.5"/>
  <g transform="translate(388, 25)">
    <rect x="0" y="0" width="84" height="151" fill="url(#bellowsGrad)" stroke="#1F2937" stroke-width="1.5"/>
    <line x1="12" y1="2" x2="12" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="24" y1="2" x2="24" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="36" y1="2" x2="36" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="42" y1="0" x2="42" y2="151" stroke="#111827" stroke-width="3"/>
    <line x1="54" y1="2" x2="54" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="66" y1="2" x2="66" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="76" y1="2" x2="76" y2="149" stroke="#1F2937" stroke-width="2"/>
  </g>
  <path d="M470,28 L862,28 Q882,28 890,54 L898,148 Q898,172 880,174 L470,174 Z" fill="url(#busBodyRed)" stroke="#7F1D1D" stroke-width="1.5"/>
  <rect x="34" y="42" width="352" height="66" rx="3" fill="#18181B"/>
  <rect x="474" y="42" width="380" height="66" rx="3" fill="#18181B"/>
  <rect x="40" y="48" width="24" height="54" rx="2" fill="url(#windowGlass)"/>
  <rect x="72" y="52" width="36" height="50" rx="2" fill="url(#windowGlass)"/>
  <rect x="118" y="48" width="48" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="118" y="63" width="48" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="172" y="48" width="52" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="172" y="63" width="52" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="230" y="48" width="52" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="230" y="63" width="52" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="288" y="48" width="48" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="288" y="63" width="48" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="342" y="48" width="38" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="342" y="63" width="38" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="478" y="48" width="18" height="54" rx="1" fill="url(#windowGlass)"/>
  <rect x="504" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="504" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="572" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="572" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="640" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="640" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="708" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="708" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="776" y="48" width="70" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="776" y="63" width="70" height="39" rx="1" fill="url(#windowGlass)"/>
  <path d="M858,50 L884,54 L890,126 L858,122 Z" fill="url(#windowGlass)" stroke="#18181B" stroke-width="3"/>
  <path d="M884,52 L904,58 L902,82 L896,82 L898,62 L884,57 Z" fill="#9CA3AF"/>
  <rect x="26" y="140" width="362" height="5" fill="#FFEE00"/>
  <rect x="472" y="140" width="408" height="5" fill="#FFEE00"/>
  <g transform="translate(132, 115)">
    <rect x="0" y="0" width="22" height="20" fill="#090D16"/>
    <path d="M-2,5 L24,2 L21,7 L-2,5 Z" fill="#FFEE00"/>
    <ellipse cx="11" cy="12" rx="1.6" ry="5.5" transform="rotate(14 11 12)" fill="#FFEE00"/>
  </g>
  <g transform="translate(508, 115)">
    <rect x="0" y="0" width="22" height="20" fill="#090D16"/>
    <path d="M-2,5 L24,2 L21,7 L-2,5 Z" fill="#FFEE00"/>
    <ellipse cx="11" cy="12" rx="1.6" ry="5.5" transform="rotate(14 11 12)" fill="#FFEE00"/>
  </g>
  <text x="646" y="131" font-family="Syne, Arial, sans-serif" font-weight="800" font-size="21" fill="#FFFFFF" letter-spacing="1.2">TransMilenio</text>
  <rect x="352" y="116" width="26" height="14" rx="1.5" fill="#F8FAFC" stroke="#1E293B" stroke-width="1"/>
  <text x="365" y="126" text-anchor="middle" font-family="monospace" font-weight="700" font-size="7" fill="#0F172A">TM-2026</text>
  <ellipse cx="892" cy="156" rx="4" ry="5" fill="#FEF08A"/>
  <circle cx="30" cy="140" r="3" fill="#FACC15"/>
  <circle cx="30" cy="152" r="3" fill="#EF4444"/>
  <g transform="translate(198, 168)">
    <circle cx="0" cy="0" r="28" fill="#1E293B"/>
    <circle cx="0" cy="0" r="25" fill="#334155" stroke="#0F172A" stroke-width="3"/>
    <circle cx="0" cy="0" r="15" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="9" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 2"/>
  </g>
  <g transform="translate(566, 168)">
    <circle cx="0" cy="0" r="28" fill="#1E293B"/>
    <circle cx="0" cy="0" r="25" fill="#334155" stroke="#0F172A" stroke-width="3"/>
    <circle cx="0" cy="0" r="15" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="9" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 2"/>
  </g>
  <g transform="translate(808, 168)">
    <circle cx="0" cy="0" r="28" fill="#1E293B"/>
    <circle cx="0" cy="0" r="25" fill="#334155" stroke="#0F172A" stroke-width="3"/>
    <circle cx="0" cy="0" r="15" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="9" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 2"/>
  </g>
</svg>`;

function svgToDataUri(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

function usePngDataUrl(svgString: string, width: number, height: number): string {
  const [src, setSrc] = useState<string>(() => svgToDataUri(svgString));

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0, width, height);
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.startsWith('data:image/png')) {
            setSrc(pngUrl);
          }
        }
      } catch {
        // Keep fallback
      }
    };
    img.src = svgToDataUri(svgString);
    return () => {
      active = false;
    };
  }, [svgString, width, height]);

  return src;
}

/**
 * Logo Oficial en PNG de TransMilenio enviado por el usuario, animado por capas con Motion:
 * - El bloque negro estructural entra con escala elástica.
 * - El ala superior amarilla de la "T" entra velozmente desde la izquierda.
 * - El mástil diagonal amarillo de la "T" desciende con rebote.
 * - El rótulo inferior "TRANSMILENIO" se revela con brillo.
 */
export const AnimatedTransMilenioOfficialLogo: React.FC<{
  className?: string;
  replayKey?: number | string;
}> = ({ className = 'h-9 w-auto', replayKey = 'tm-logo' }) => {
  return (
    <motion.div
      key={replayKey}
      aria-label="Logo TransMilenio"
      whileHover={{ scale: 1.08, rotateZ: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      className={`relative aspect-[444/366] select-none shrink-0 ${className}`}
    >
      {/* Capa 1: Fondo cuadrado negro */}
      <motion.img
        src={TRANSMILENIO_LOGO_PNG_SRC}
        alt="Logo Oficial TransMilenio"
        initial={{ opacity: 0, scale: 0.72, rotateZ: -6 }}
        animate={{ opacity: 1, scale: 1, rotateZ: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        style={{
          clipPath: 'polygon(13% 1%, 88% 1%, 88% 82%, 13% 82%)',
        }}
        className="pointer-events-none absolute inset-0 w-full h-full object-contain"
      />

      {/* Capa 2: Ala superior amarilla de la T cruzando con energía */}
      <motion.img
        src={TRANSMILENIO_LOGO_PNG_SRC}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, x: -22, scale: 0.85 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 15,
          delay: 0.14,
        }}
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 28%, 0% 28%)',
        }}
        className="pointer-events-none absolute inset-0 w-full h-full object-contain"
      />

      {/* Capa 3: Trazo vertical/diagonal amarillo de la T */}
      <motion.img
        src={TRANSMILENIO_LOGO_PNG_SRC}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, y: -16, scaleY: 0.4 }}
        animate={{ opacity: 1, y: 0, scaleY: 1 }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 14,
          delay: 0.26,
        }}
        style={{
          clipPath: 'polygon(30% 22%, 70% 22%, 70% 82%, 30% 82%)',
        }}
        className="pointer-events-none absolute inset-0 w-full h-full object-contain"
      />

      {/* Capa 4: Rótulo inferior TRANSMILENIO + imagen íntegra final */}
      <motion.img
        src={TRANSMILENIO_LOGO_PNG_SRC}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: 'spring',
          stiffness: 240,
          damping: 18,
          delay: 0.36,
        }}
        className="pointer-events-none relative w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
      />
    </motion.div>
  );
};

/**
 * Logo minimalista en el Header:
 * Conserva el logo oficial de Bogotá, el logo PNG oficial de TransMilenio animado con Motion
 * y el texto escrito exactamente "TransMilenio".
 */
export const BogotaTransmiHeaderLogo: React.FC<{ className?: string }> = ({
  className = 'h-9 sm:h-10',
}) => {
  const [replayCount, setReplayCount] = useState(0);
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 20, y: -6 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      whileHover={{ scale: 1.03 }}
      onHoverStart={() => setReplayCount((c) => c + 1)}
      transition={{ type: 'spring', stiffness: 240, damping: 18 }}
      className={`inline-flex items-center gap-3 select-none ${className}`}
    >
      <AnimatedBogotaOfficialLogo
        replayKey={`header-bogota-${replayCount}`}
        staggerSpeed={0.075}
        className="h-full w-auto"
      />
      <span className="h-6 w-[1.5px] bg-white/15 shrink-0" />
      <div className="flex items-center gap-2.5">
        <AnimatedTransMilenioOfficialLogo
          replayKey={`header-tm-${replayCount}`}
          className="h-8 sm:h-9 w-auto"
        />
        <span className="font-clean text-sm sm:text-base font-extrabold tracking-[0.12em] text-white">
          TransMilenio
        </span>
      </div>
    </motion.div>
  );
};

export const TransmiArticulatedBusImage: React.FC<{ className?: string }> = ({
  className = 'w-full h-auto',
}) => {
  const pngSrc = usePngDataUrl(TRANSMI_BUS_REAL_SVG, 920, 220);
  return (
    <img
      src={pngSrc}
      alt="Bus Articulado TransMilenio Bogotá"
      referrerPolicy="no-referrer"
      className={`select-none object-contain ${className}`}
    />
  );
};

/**
 * Animación cíclica 3D del Bus Articulado en el Hero:
 * - Entre estación y estación (`isMoving === true`), el TransMilenio pasa entre
 *   los edificios icónicos de Bogotá (Torre Colpatria, BD Bacatá, Torres del Parque)
 *   y árboles bogotanos (Eucaliptos, Guayacanes, Cauchos sabaneros) con parallax 3D.
 * - Al detenerse (`isMoving === false`), llega a la estación gris de TransMilenio.
 * - Recorre en bucle todas las 115 estaciones del sistema, permitiendo además hacer clic
 *   en las píldoras inferiores para saltar interactivamente de estación con Motion.
 */
export const HeroCyclingTransmiBus: React.FC = () => {
  const pngSrc = usePngDataUrl(TRANSMI_BUS_REAL_SVG, 920, 220);

  const estacionesCiclo = useMemo(() => {
    const colorMap = new Map<string, string>();
    for (let i = 0; i < TRONCALES_BOGOTA.length; i++) {
      colorMap.set(TRONCALES_BOGOTA[i].codigo, TRONCALES_BOGOTA[i].color);
    }
    return ESTACIONES_ESQUEMATICAS.map((est, index) => ({
      index,
      codigo: est.troncal,
      nombre: est.nombre,
      esPortal: Boolean(est.esPortal),
      color: colorMap.get(est.troncal) || '#EF0014',
    }));
  }, []);

  const totalEstaciones = estacionesCiclo.length; // 115 estaciones
  const [stationIdx, setStationIdx] = useState(0);
  const [isMoving, setIsMoving] = useState(true);

  useEffect(() => {
    let timeoutId: number;
    const interval = window.setInterval(() => {
      setIsMoving(true);
      timeoutId = window.setTimeout(() => {
        setStationIdx((prev) => (prev + 1) % totalEstaciones);
        setIsMoving(false);
      }, 2100);
    }, 4100);

    const initialStop = window.setTimeout(() => {
      setIsMoving(false);
    }, 1800);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeoutId);
      window.clearTimeout(initialStop);
    };
  }, [totalEstaciones]);

  const currentStation = estacionesCiclo[stationIdx] || estacionesCiclo[0];
  const nextStation =
    estacionesCiclo[(stationIdx + 1) % totalEstaciones] || estacionesCiclo[0];

  const windowStart = Math.floor(stationIdx / 4) * 4;
  const currentStepInWindow = stationIdx % 4;
  const visibleWindowStations = useMemo(() => {
    return [0, 1, 2, 3].map((offset) => {
      const idx = (windowStart + offset) % totalEstaciones;
      return estacionesCiclo[idx];
    });
  }, [estacionesCiclo, windowStart, totalEstaciones]);

  const segmentProgressPct = ((currentStepInWindow + 1) / 4) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -12, scale: 0.94 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      whileHover={{ rotateY: -4, rotateX: 3, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
      style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      className="w-full max-w-[490px] flex flex-col gap-2.5 select-none"
    >
      {/* Cabecera minimalista e interactiva de estación actual / siguiente en el bucle de 115 estaciones */}
      <motion.div
        layout
        className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-black/80 px-3.5 py-2 backdrop-blur-md"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.span
            key={`badge-${currentStation.nombre}-${stationIdx}`}
            initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-extrabold text-white shadow-md"
            style={{ backgroundColor: currentStation.color }}
          >
            {currentStation.codigo}
          </motion.span>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${currentStation.nombre}-${isMoving ? 'mov' : 'stop'}`}
              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: 0.28 }}
              className="font-mono text-xs font-bold text-white truncate"
            >
              {isMoving ? `→ ${nextStation.nombre}` : currentStation.nombre}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] font-bold text-white/45 tabular-nums">
            {stationIdx + 1}/{totalEstaciones}
          </span>
          <motion.span
            animate={{
              scale: isMoving ? [1, 1.35, 1] : 1,
              backgroundColor: isMoving ? '#F7B500' : '#10b981',
            }}
            transition={{ duration: 0.8, repeat: isMoving ? Infinity : 0 }}
            className="h-2.5 w-2.5 rounded-full shrink-0"
          />
        </div>
      </motion.div>

      {/* Escenario 3D: Edificios de Bogotá + Árboles (en tránsito) y Estación Gris (en parada) */}
      <div
        style={{ perspective: '900px', transformStyle: 'preserve-3d' }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0b0d13] via-[#10131c] to-[#090a0f] px-3 pt-4 pb-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
      >
        {/* CAPA 1: Cerros Orientales + Skyline de Edificios Icónicos de Bogotá */}
        <motion.div
          animate={{
            x: isMoving ? [0, -180] : -40,
            opacity: isMoving ? 1 : 0.42,
            scale: isMoving ? 1.03 : 0.98,
          }}
          transition={{
            x: {
              duration: isMoving ? 2.1 : 0.8,
              ease: isMoving ? 'linear' : 'easeOut',
            },
            opacity: { duration: 0.45 },
            scale: { duration: 0.5 },
          }}
          className="pointer-events-none absolute inset-x-0 top-1 z-0 w-[145%]"
        >
          <svg
            viewBox="0 0 720 140"
            className="w-full h-32 object-cover select-none"
            aria-hidden="true"
          >
            <path
              d="M0,125 L0,78 Q65,42 135,68 T270,50 T410,64 T560,44 T720,66 L720,125 Z"
              fill="#111827"
              opacity="0.75"
            />
            <g transform="translate(548, 30)">
              <rect x="0" y="6" width="16" height="8" fill="#E2E8F0" opacity="0.7" />
              <polygon points="8,0 4,6 12,6" fill="#F7B500" opacity="0.85" />
            </g>

            {[0, 340].map((offset) => (
              <g key={`bogota-city-${offset}`} transform={`translate(${offset}, 0)`}>
                {/* Torre Colpatria */}
                <g transform="translate(28, 12)">
                  <rect
                    x="0"
                    y="0"
                    width="34"
                    height="108"
                    rx="1.5"
                    fill="#1E293B"
                    stroke="#EF0014"
                    strokeWidth="0.9"
                  />
                  {[6, 13, 20, 27].map((lx) => (
                    <line
                      key={lx}
                      x1={lx}
                      y1="4"
                      x2={lx}
                      y2="104"
                      stroke="#EF0014"
                      strokeWidth="1.2"
                      opacity="0.75"
                    />
                  ))}
                  <rect x="4" y="0" width="26" height="3" fill="#F7B500" />
                </g>

                {/* Torres del Parque */}
                <g transform="translate(76, 36)">
                  <path
                    d="M0,84 L0,18 Q18,0 38,14 L38,84 Z"
                    fill="#7C2D12"
                    stroke="#EA580C"
                    strokeWidth="0.7"
                  />
                  {[24, 36, 48, 60, 72].map((wy) => (
                    <rect
                      key={wy}
                      x="6"
                      y={wy}
                      width="26"
                      height="3"
                      fill="#FDE68A"
                      opacity="0.55"
                    />
                  ))}
                </g>

                {/* BD Bacatá */}
                <g transform="translate(132, 6)">
                  <polygon
                    points="16,0 19,14 32,14 32,114 0,114 0,24 13,14"
                    fill="#0F172A"
                    stroke="#38BDF8"
                    strokeWidth="0.8"
                  />
                  {[24, 38, 52, 66, 80, 94].map((by) => (
                    <line
                      key={by}
                      x1="4"
                      y1={by}
                      x2="28"
                      y2={by}
                      stroke="#7DD3FC"
                      strokeWidth="1.2"
                      opacity="0.5"
                    />
                  ))}
                </g>

                {/* Edificio Avianca / Centro Internacional */}
                <g transform="translate(182, 24)">
                  <rect
                    x="0"
                    y="0"
                    width="36"
                    height="96"
                    fill="#1E293B"
                    stroke="#64748B"
                    strokeWidth="0.8"
                  />
                  {[12, 24, 36, 48, 60, 72, 84].map((ay) => (
                    <line
                      key={ay}
                      x1="4"
                      y1={ay}
                      x2="32"
                      y2={ay}
                      stroke="#94A3B8"
                      strokeWidth="1.4"
                      opacity="0.6"
                    />
                  ))}
                </g>

                {/* Edificios de ladrillo Chapinero / Teusaquillo */}
                <g transform="translate(234, 44)">
                  <rect
                    x="0"
                    y="0"
                    width="44"
                    height="76"
                    rx="1"
                    fill="#9A3412"
                    stroke="#F97316"
                    strokeWidth="0.6"
                  />
                  {[12, 26, 40, 54].map((cy) => (
                    <g key={cy}>
                      <rect x="6" y={cy} width="10" height="7" fill="#FEF08A" opacity="0.6" />
                      <rect x="24" y={cy} width="12" height="7" fill="#BAE6FD" opacity="0.5" />
                    </g>
                  ))}
                </g>

                {/* Torre Museo / San Martín */}
                <g transform="translate(292, 20)">
                  <rect
                    x="0"
                    y="0"
                    width="32"
                    height="100"
                    fill="#172554"
                    stroke="#60A5FA"
                    strokeWidth="0.7"
                  />
                </g>

                {/* Árboles Bogotanos */}
                {[14, 66, 120, 170, 224, 282, 326].map((tx, idx) => {
                  const isGuayacan = idx % 3 === 1;
                  return (
                    <g key={`tree-${tx}`} transform={`translate(${tx}, 76)`}>
                      <rect x="7" y="24" width="3.5" height="20" fill="#451A03" />
                      <circle
                        cx="9"
                        cy="18"
                        r="11"
                        fill={isGuayacan ? '#EAB308' : '#059669'}
                        opacity="0.92"
                      />
                      <circle
                        cx="4"
                        cy="22"
                        r="7.5"
                        fill={isGuayacan ? '#FACC15' : '#10B981'}
                        opacity="0.88"
                      />
                      <circle
                        cx="14"
                        cy="21"
                        r="8"
                        fill={isGuayacan ? '#CA8A04' : '#047857'}
                        opacity="0.9"
                      />
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </motion.div>

        {/* CAPA 2: Estación Gris de TransMilenio */}
        <motion.div
          animate={{
            x: isMoving ? -420 : 0,
            opacity: isMoving ? 0.12 : 0.98,
            scale: isMoving ? 0.92 : 1,
            rotateY: isMoving ? 14 : 0,
          }}
          transition={{
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative z-10 mx-auto w-full"
        >
          <svg
            viewBox="0 0 500 135"
            className="w-full h-auto select-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="grayRoof" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="50%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id="grayVagonBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              <linearGradient id="stationGlass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(148, 163, 184, 0.35)" />
                <stop offset="50%" stopColor="rgba(203, 213, 225, 0.2)" />
                <stop offset="100%" stopColor="rgba(71, 85, 105, 0.42)" />
              </linearGradient>
            </defs>

            <polygon
              points="18,18 482,18 494,30 6,30"
              fill="url(#grayRoof)"
              stroke="#CBD5E1"
              strokeWidth="0.7"
            />
            <rect x="22" y="30" width="456" height="6" fill="#334155" />

            <rect
              x="28"
              y="36"
              width="444"
              height="18"
              rx="2"
              fill="#1E293B"
              stroke="#64748B"
              strokeWidth="0.9"
            />
            <rect
              x="28"
              y="51"
              width="444"
              height="2.5"
              fill={currentStation.color}
            />
            <rect
              x="36"
              y="39"
              width="12"
              height="11"
              rx="1.5"
              fill={currentStation.color}
            />
            <text
              x="42"
              y="47.5"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="800"
              fontSize="8"
              fill="#FFFFFF"
            >
              {currentStation.codigo}
            </text>
            <text
              x="55"
              y="47.5"
              fontFamily="Syne, Inter, sans-serif"
              fontWeight="700"
              fontSize="8.5"
              fill="#F8FAFC"
              letterSpacing="0.8"
            >
              {currentStation.nombre}
            </text>
            <text
              x="462"
              y="47.5"
              textAnchor="end"
              fontFamily="monospace"
              fontWeight="600"
              fontSize="7"
              fill="#94A3B8"
            >
              VAGÓN 1
            </text>

            <rect
              x="32"
              y="54"
              width="436"
              height="56"
              fill="url(#grayVagonBody)"
              stroke="#64748B"
              strokeWidth="1"
            />

            {[40, 148, 256, 364].map((xPos) => (
              <g key={`louver-${xPos}`} transform={`translate(${xPos}, 58)`}>
                <rect
                  x="0"
                  y="0"
                  width="38"
                  height="48"
                  fill="#334155"
                  stroke="#64748B"
                  strokeWidth="0.7"
                />
                {[6, 12, 18, 24, 30, 36, 42].map((ly) => (
                  <line
                    key={ly}
                    x1="2"
                    y1={ly}
                    x2="36"
                    y2={ly}
                    stroke="#94A3B8"
                    strokeWidth="0.9"
                  />
                ))}
              </g>
            ))}

            {[84, 192, 300, 408].map((doorX) => {
              const gap = isMoving ? 0 : 4;
              return (
                <g key={`door-${doorX}`} transform={`translate(${doorX}, 57)`}>
                  <rect
                    x="0"
                    y="0"
                    width="56"
                    height="50"
                    fill="#0F172A"
                    stroke="#94A3B8"
                    strokeWidth="0.9"
                  />
                  <rect
                    x={2 - gap}
                    y="2"
                    width="25"
                    height="46"
                    fill="url(#stationGlass)"
                    stroke="#CBD5E1"
                    strokeWidth="0.8"
                  />
                  <rect
                    x={29 + gap}
                    y="2"
                    width="25"
                    height="46"
                    fill="url(#stationGlass)"
                    stroke="#CBD5E1"
                    strokeWidth="0.8"
                  />
                  <rect
                    x="2"
                    y="24"
                    width="52"
                    height="1.5"
                    fill="#FACC15"
                    opacity="0.7"
                  />
                </g>
              );
            })}

            <rect
              x="14"
              y="110"
              width="472"
              height="14"
              rx="2"
              fill="#475569"
              stroke="#64748B"
              strokeWidth="0.9"
            />
            <rect x="16" y="110" width="468" height="2.5" fill="#FACC15" />
            {[45, 165, 335, 455].map((px) => (
              <rect
                key={`pillar-${px}`}
                x={px}
                y="124"
                width="16"
                height="10"
                fill="#334155"
              />
            ))}
          </svg>
        </motion.div>

        {/* CAPA 3: Bus Articulado avanzando con física 3D */}
        <motion.div
          animate={{
            x: isMoving ? [-8, 12, -4, 6, 0] : 0,
            y: isMoving ? [0, -2.5, 0.5, -2, 0] : 0,
            rotateZ: isMoving ? [0, -0.4, 0.3, 0] : 0,
          }}
          transition={{
            duration: 1.1,
            repeat: isMoving ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="relative z-20 -mt-16 sm:-mt-19 px-2"
        >
          <img
            src={pngSrc}
            alt="Bus Articulado TransMilenio en recorrido por Bogotá"
            referrerPolicy="no-referrer"
            className="h-22 sm:h-25 w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.9)]"
          />
        </motion.div>

        {/* CAPA 4: Árboles en primer plano */}
        <AnimatePresence>
          {isMoving && (
            <motion.div
              key="foreground-trees"
              initial={{ x: 460, opacity: 0 }}
              animate={{ x: -480, opacity: [0, 0.9, 0.9, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.9, ease: 'linear' }}
              className="pointer-events-none absolute bottom-9 left-0 z-30 flex items-end gap-28"
            >
              {[0, 1, 2].map((treeIdx) => (
                <svg
                  key={treeIdx}
                  width="44"
                  height="54"
                  viewBox="0 0 44 54"
                  className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.75)]"
                >
                  <rect x="19" y="32" width="6" height="22" rx="1" fill="#451A03" />
                  <circle
                    cx="22"
                    cy="20"
                    r="15"
                    fill={treeIdx === 1 ? '#EAB308' : '#059669'}
                  />
                  <circle
                    cx="13"
                    cy="25"
                    r="10"
                    fill={treeIdx === 1 ? '#FACC15' : '#10B981'}
                  />
                  <circle
                    cx="30"
                    cy="25"
                    r="10"
                    fill={treeIdx === 1 ? '#CA8A04' : '#047857'}
                  />
                </svg>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Barra de recorrido inferior interactiva coordinada con las 115 estaciones */}
        <div className="relative z-20 mt-1.5 pt-2 border-t border-white/[0.06]">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              animate={{ width: `${segmentProgressPct}%` }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-[#EF0014] to-[#F7B500]"
            />
          </div>

          <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
            {visibleWindowStations.map((st, idx) => {
              const active = idx === currentStepInWindow;
              const passed = idx < currentStepInWindow;
              return (
                <motion.button
                  key={`${st.nombre}-${st.index}`}
                  type="button"
                  whileHover={{ scale: 1.08, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    setStationIdx(st.index);
                    setIsMoving(false);
                  }}
                  className="flex flex-col items-center min-w-0 cursor-pointer focus:outline-none"
                >
                  <motion.span
                    animate={{
                      scale: active ? 1.3 : 0.9,
                      backgroundColor: active
                        ? '#F7B500'
                        : passed
                        ? '#10b981'
                        : '#27272a',
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="h-2.5 w-2.5 -mt-[13px] rounded-full border border-[#09090b]"
                  />
                  <span
                    className={`mt-1 font-mono text-[8.5px] font-bold uppercase truncate w-full px-0.5 ${
                      active
                        ? 'text-[#F7B500]'
                        : passed
                        ? 'text-white/65'
                        : 'text-white/35'
                    }`}
                    title={st.nombre}
                  >
                    {st.nombre}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * VIDEO DE INTRO EN HD ENTREGADO POR EL USUARIO:
 * - Reproduce únicamente el video en vista completa y limpia al tamaño de la ventana.
 * - Apenas termina el video (`onEnded`), muestra inmediatamente la página principal.
 */
export const BogotaIntroSplash: React.FC<{ onFinish: () => void }> = ({
  onFinish,
}) => {
  useEffect(() => {
    // Fallback de seguridad amplio por si el navegador bloquea la reproducción automática
    const tFallback = window.setTimeout(() => onFinish(), 15000);
    return () => window.clearTimeout(tFallback);
  }, [onFinish]);

  return (
    <motion.div
      key="bogota-intro-drone-hd"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      onClick={onFinish}
      className="fixed inset-0 z-[999] w-screen h-screen overflow-hidden bg-black flex items-center justify-center select-none"
    >
      <video
        src={REAL_DRONE_VIDEO_MP4}
        autoPlay
        muted
        playsInline
        onEnded={onFinish}
        onError={onFinish}
        className="w-screen h-screen object-cover"
      />
    </motion.div>
  );
};

export const TransmiRedWhiteBusIcon: React.FC<{ className?: string }> = ({
  className = 'h-6 w-auto',
}) => {
  return (
    <img
      src={defaultBtnBusImg}
      alt="Icono TransMilenio"
      referrerPolicy="no-referrer"
      className={`select-none object-contain ${className}`}
    />
  );
};

interface TransmiActionButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'amber' | 'slate';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  ariaLabel?: string;
  iconSrc?: string;
  withBusIcon?: boolean;
}

/**
 * Botón interactivo oficial ("botón de transmi" cuando `withBusIcon={true}`):
 * - Sólo 3 botones en toda la web llevan `withBusIcon={true}`:
 *   1. "Buscar Ruta" (Planea tu Ruta)
 *   2. "Próximo Bus" (Próximo Bus)
 *   3. "Ver Ruta" (Viaje en Mapa)
 * - Texto centrado exactamente en todo el centro del botón en negrilla y legible.
 * - Toda la superficie del botón (esquinas, bordes, centro, imagen) acciona el clic al 100%.
 * - Al oprimirlo, el TransMilenio cruza todo el botón hacia la derecha y se va,
 *   y enseguida aparece otro asomando nuevamente la cabeza por la izquierda.
 */
export const TransmiActionButton: React.FC<TransmiActionButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  ariaLabel,
  withBusIcon = false,
}) => {
  const [busPhase, setBusPhase] = useState<'IDLE' | 'EXITING' | 'ENTERING'>('IDLE');
  const [busCycleKey, setBusCycleKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [clickBurst, setClickBurst] = useState(0);
  const timersRef = React.useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handlePress = () => {
    if (disabled) return;
    setClickBurst((c) => c + 1);
    if (withBusIcon) {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      setBusPhase('EXITING');
      const t1 = window.setTimeout(() => {
        setBusCycleKey((k) => k + 1);
        setBusPhase('ENTERING');
        const t2 = window.setTimeout(() => {
          setBusPhase('IDLE');
        }, 500);
        timersRef.current.push(t2);
      }, 640);
      timersRef.current.push(t1);
    }
    if (onClick) {
      onClick();
    }
  };

  const isAnimatingBus = busPhase !== 'IDLE';

  const baseStyles =
    variant === 'primary'
      ? 'bg-[#EF0014] hover:bg-[#d40012] text-white border-[#ff4d58]/35'
      : variant === 'amber'
      ? 'bg-[#F7B500] hover:bg-[#dfa300] text-black border-amber-300/40'
      : 'bg-[#18181b] hover:bg-[#222226] text-white border-white/15';

  return (
    <motion.button
      type={type}
      aria-label={ariaLabel || label}
      data-has-bus={withBusIcon ? 'true' : 'false'}
      disabled={disabled}
      onClick={handlePress}
      onHoverStart={() => !disabled && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={
        disabled
          ? undefined
          : {
              scale: 1.02,
              y: -2,
              boxShadow:
                variant === 'primary'
                  ? '0 14px 32px rgba(239, 0, 20, 0.42)'
                  : '0 14px 30px rgba(247, 181, 0, 0.25)',
            }
      }
      whileTap={
        disabled
          ? undefined
          : {
              scale: 0.985,
            }
      }
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className={`relative overflow-hidden rounded-xl border h-[52px] px-5 font-clean text-xs sm:text-sm font-extrabold uppercase tracking-[0.04em] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none whitespace-nowrap shrink-0 flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.45)] ${baseStyles} ${className}`}
    >
      {/* Onda luminosa interactiva en Hover y Clic */}
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{
          x: isHovered || isAnimatingBus ? ['120%', '-120%'] : '-140%',
          opacity: isHovered || isAnimatingBus ? [0, 0.35, 0] : 0,
        }}
        transition={{
          duration: 0.9,
          repeat: isHovered ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute inset-y-0 w-2/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent z-0"
      />

      {/* Pulso de choque al hacer clic */}
      <AnimatePresence>
        {clickBurst > 0 && (
          <motion.span
            key={`burst-${clickBurst}`}
            initial={{ scale: 0.2, opacity: 0.65 }}
            animate={{ scale: 2.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="pointer-events-none absolute h-12 w-12 rounded-full bg-[#F7B500]/50 z-0"
          />
        )}
      </AnimatePresence>

      {withBusIcon ? (
        <>
          <motion.span
            key={`bus-instance-${busCycleKey}`}
            initial={
              busCycleKey === 0
                ? { left: '0%', x: '-74%', y: 0, opacity: 1 }
                : { left: '0%', x: '-118%', y: 0, opacity: 1 }
            }
            animate={
              busPhase === 'EXITING'
                ? {
                    left: '108%',
                    x: '10%',
                    y: [0, -1.5, 0],
                    opacity: [1, 1, 0],
                  }
                : busPhase === 'ENTERING'
                ? {
                    left: '0%',
                    x: '-74%',
                    y: 0,
                    opacity: 1,
                  }
                : isHovered
                ? { left: '0%', x: '-68%', y: [0, -1.5, 0], opacity: 1 }
                : { left: '0%', x: '-74%', y: 0, opacity: 1 }
            }
            transition={
              busPhase === 'EXITING'
                ? { duration: 0.62, ease: [0.32, 0, 0.2, 1] }
                : busPhase === 'ENTERING'
                ? { type: 'spring', stiffness: 230, damping: 20 }
                : isHovered
                ? {
                    x: { type: 'spring', stiffness: 280, damping: 16 },
                    y: { duration: 0.55, repeat: Infinity },
                  }
                : { duration: 0.3, ease: 'easeOut' }
            }
            className="pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center"
          >
            <img
              src={defaultBtnBusImg}
              alt=""
              referrerPolicy="no-referrer"
              className="pointer-events-none h-[128%] w-auto max-w-none shrink-0 select-none object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]"
            />
          </motion.span>

          {/* TEXTO CENTRADO EN TODO EL CENTRO DEL BOTÓN */}
          <motion.span
            animate={{
              scale: busPhase === 'EXITING' ? 0.96 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-center font-clean text-xs sm:text-sm font-extrabold uppercase tracking-[0.05em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition-opacity duration-200 ${
              busPhase === 'EXITING' ? 'opacity-30' : 'opacity-100'
            }`}
          >
            {label}
          </motion.span>
        </>
      ) : (
        <motion.span
          key={`label-burst-${clickBurst}`}
          initial={{ scale: 0.94 }}
          animate={{
            scale: 1,
            x: isHovered ? 2 : 0,
          }}
          transition={{ type: 'spring', stiffness: 340, damping: 16 }}
          className="pointer-events-none relative z-10 flex items-center justify-center gap-2 font-clean text-xs sm:text-sm font-extrabold uppercase tracking-[0.04em]"
        >
          <span>{label}</span>
          <motion.span
            animate={{
              x: isHovered ? [0, 4, 0] : 0,
              scale: isHovered ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.65, repeat: isHovered ? Infinity : 0 }}
            className="inline-block text-[#F7B500]"
          >
            →
          </motion.span>
        </motion.span>
      )}
    </motion.button>
  );
};

/**
 * ANIMACIÓN DEL TRANSMILENIO VISTO DESDE ARRIBA (VISTA CENITAL) PARA "RESULTADOS SUGERIDOS":
 * - Si hay transbordo: muestra 3 cuadros (Origen + ruta inicial -> Estación de transbordo + ruta nueva -> Estación destino final).
 * - Si es directo sin transbordo: muestra 2 cuadros (Origen + ruta -> Estación destino final).
 * - A la izquierda de los cuadros, un bus articulado de TransMilenio visto desde arriba recorre de cuadro en cuadro en bucle.
 * - Cada vez que el bus llega a un cuadro, resalta qué ruta coger y en el último cuadro indica "¡Llegaste!".
 */
export interface TopDownTransbordoAnimatorProps {
  origen: string;
  destino: string;
  rutas: string[];
  transbordo: string | null;
  onSelectStepStation?: (estacion: string, ruta: string) => void;
}

export const TopDownTransbordoAnimator: React.FC<
  TopDownTransbordoAnimatorProps
> = ({ origen, destino, rutas, transbordo, onSelectStepStation }) => {
  const steps = useMemo(() => {
    const hasTransfer = Boolean(transbordo && rutas.length >= 2);
    const r1 = rutas[0] || 'B12';
    const r2 = rutas[1] || r1;
    if (hasTransfer && transbordo) {
      return [
        {
          id: 'step-origen',
          stepLabel: 'PASO 1 · ORIGEN',
          estacion: origen,
          ruta: r1,
          actionBadge: `Coge ruta ${r1}`,
          description: `Aborda el articulado ${r1}`,
          color: '#EF0014',
          isFinal: false,
        },
        {
          id: 'step-transbordo',
          stepLabel: 'PASO 2 · TRANSBORDO',
          estacion: transbordo,
          ruta: r2,
          actionBadge: `Cambia a ${r2}`,
          description: `Baja y busca la ruta ${r2}`,
          color: '#F7B500',
          isFinal: false,
        },
        {
          id: 'step-destino',
          stepLabel: 'PASO 3 · DESTINO FINAL',
          estacion: destino,
          ruta: r2,
          actionBadge: '¡Llegaste!',
          description: 'Bájate en esta estación final',
          color: '#10b981',
          isFinal: true,
        },
      ];
    }
    return [
      {
        id: 'step-origen',
        stepLabel: 'PASO 1 · ORIGEN',
        estacion: origen,
        ruta: r1,
        actionBadge: `Coge ruta ${r1}`,
        description: `Ruta directa sin transbordo`,
        color: '#EF0014',
        isFinal: false,
      },
      {
        id: 'step-destino',
        stepLabel: 'PASO 2 · DESTINO FINAL',
        estacion: destino,
        ruta: r1,
        actionBadge: '¡Llegaste!',
        description: 'Bájate en esta estación final',
        color: '#10b981',
        isFinal: true,
      },
    ];
  }, [origen, destino, rutas, transbordo]);

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
  }, [origen, destino, transbordo, rutas]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % steps.length);
    }, 2300);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  // Posición vertical porcentual del bus visto desde arriba para cada cuadro
  const busTopPercent =
    steps.length === 3
      ? activeIdx === 0
        ? '14%'
        : activeIdx === 1
        ? '50%'
        : '85%'
      : activeIdx === 0
      ? '22%'
      : '78%';

  return (
    <div className="relative grid grid-cols-[54px_1fr] gap-3 items-stretch py-1">
      {/* COLUMNA IZQUIERDA: CARRIL TRONCAL CON TRANSMILENIO VISTO DESDE ARRIBA (VISTA CENITAL) */}
      <div className="relative flex flex-col items-center justify-between py-5 rounded-2xl border border-white/[0.07] bg-[#0b0b0d] overflow-hidden shadow-inner">
        {/* Líneas de carril exclusivo */}
        <div className="pointer-events-none absolute inset-y-4 w-[18px] rounded-full bg-[#16161a] border-x border-dashed border-white/15" />

        {/* Línea de progreso activa */}
        <motion.div
          animate={{
            height:
              steps.length === 3
                ? activeIdx === 0
                  ? '18%'
                  : activeIdx === 1
                  ? '52%'
                  : '88%'
                : activeIdx === 0
                ? '25%'
                : '82%',
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="pointer-events-none absolute top-4 w-[4px] rounded-full bg-gradient-to-b from-[#EF0014] via-[#F7B500] to-[#10b981]"
        />

        {/* Puntos de estación en el carril */}
        {steps.map((st, idx) => {
          const isCurrent = idx === activeIdx;
          return (
            <motion.div
              key={st.id}
              animate={{
                scale: isCurrent ? [1, 1.35, 1.15] : 0.9,
                borderColor: isCurrent ? st.color : 'rgba(255,255,255,0.2)',
              }}
              transition={{ duration: 0.5 }}
              className="relative z-10 h-3.5 w-3.5 rounded-full border-2 bg-black"
              style={{
                backgroundColor: isCurrent ? st.color : '#111113',
                boxShadow: isCurrent ? `0 0 12px ${st.color}` : 'none',
              }}
            />
          );
        })}

        {/* BUS ARTICULADO TRANSMILENIO VISTO DESDE ARRIBA (TOP-DOWN) */}
        <motion.div
          animate={{
            top: busTopPercent,
            scale: [1, 1.06, 1],
          }}
          transition={{
            top: { type: 'spring', stiffness: 110, damping: 16 },
            scale: { duration: 1.1, repeat: Infinity },
          }}
          style={{ translateY: '-50%' }}
          className="pointer-events-none absolute z-20 flex flex-col items-center"
        >
          <svg
            width="28"
            height="64"
            viewBox="0 0 28 64"
            className="drop-shadow-[0_6px_14px_rgba(239,0,20,0.65)]"
          >
            {/* Luces delanteras proyectadas hacia abajo */}
            <polygon
              points="5,54 1,64 11,64"
              fill="rgba(247,181,0,0.45)"
            />
            <polygon
              points="23,54 17,64 27,64"
              fill="rgba(247,181,0,0.45)"
            />
            {/* Vagón trasero (techo rojo visto desde arriba) */}
            <rect
              x="4"
              y="3"
              width="20"
              height="22"
              rx="4"
              fill="#D90410"
              stroke="#ffffff"
              strokeWidth="1"
            />
            {/* Unidad de aire acondicionado trasera */}
            <rect x="8" y="8" width="12" height="7" rx="1.5" fill="#e4e4e7" />
            {/* Fuelle articulado central (acordeón gris oscuro) */}
            <rect
              x="5"
              y="25"
              width="18"
              height="6"
              rx="1.5"
              fill="#27272a"
              stroke="#52525b"
              strokeWidth="1"
            />
            <line x1="6" y1="27" x2="22" y2="27" stroke="#71717a" strokeWidth="1" />
            <line x1="6" y1="29" x2="22" y2="29" stroke="#71717a" strokeWidth="1" />
            {/* Vagón delantero (techo rojo visto desde arriba) */}
            <rect
              x="4"
              y="31"
              width="20"
              height="24"
              rx="5"
              fill="#EF0014"
              stroke="#ffffff"
              strokeWidth="1"
            />
            {/* Unidad de aire acondicionado delantera */}
            <rect x="8" y="36" width="12" height="7" rx="1.5" fill="#f4f4f5" />
            {/* Franja amarilla distintiva en el techo */}
            <rect x="6" y="45" width="16" height="2.5" rx="1" fill="#F7B500" />
            {/* Parabrisas panorámico frontal */}
            <path
              d="M 6 49 L 22 49 L 20 54 L 8 54 Z"
              fill="#090d16"
              stroke="#38bdf8"
              strokeWidth="0.8"
            />
            {/* Faros delanteros amarillos */}
            <circle cx="7.5" cy="54.2" r="1.6" fill="#F7B500" />
            <circle cx="20.5" cy="54.2" r="1.6" fill="#F7B500" />
          </svg>
        </motion.div>
      </div>

      {/* COLUMNA DERECHA: CUADROS DE CADA PUNTO DEL RECORRIDO */}
      <div className="flex flex-col justify-between gap-2.5">
        {steps.map((st, idx) => {
          const active = idx === activeIdx;
          return (
            <motion.button
              key={st.id}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                if (onSelectStepStation) {
                  onSelectStepStation(st.estacion, st.ruta);
                }
              }}
              animate={{
                scale: active ? 1.02 : 0.99,
                x: active ? 3 : 0,
                borderColor: active ? st.color : 'rgba(255,255,255,0.07)',
                backgroundColor: active
                  ? 'rgba(24, 24, 28, 0.95)'
                  : 'rgba(10, 10, 12, 0.75)',
              }}
              whileHover={{ scale: 1.025, x: 4 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="relative flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-shadow cursor-pointer overflow-hidden"
              style={{
                boxShadow: active
                  ? `0 10px 26px -6px ${st.color}40`
                  : 'none',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-white/55">
                  {st.stepLabel}
                </span>

                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${st.id}-${active ? 'on' : 'off'}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: active ? [1, 1.08, 1] : 0.95,
                      opacity: active ? 1 : 0.65,
                    }}
                    transition={{ duration: 0.4 }}
                    className="inline-flex items-center rounded-md px-2 py-0.5 font-clean text-[11px] font-extrabold uppercase tracking-tight shadow-sm"
                    style={{
                      backgroundColor: st.isFinal
                        ? '#10b981'
                        : st.color === '#F7B500'
                        ? '#F7B500'
                        : '#EF0014',
                      color: st.color === '#F7B500' ? '#000000' : '#ffffff',
                    }}
                  >
                    {st.actionBadge}
                  </motion.span>
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-clean text-sm font-extrabold uppercase tracking-tight text-white truncate">
                    {st.estacion}
                  </div>
                  <div className="font-clean text-[11px] font-semibold text-white/65">
                    {st.description}
                  </div>
                </div>

                {!st.isFinal ? (
                  <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#EF0014] px-2.5 py-1 font-clean text-base font-extrabold text-white shadow">
                    {st.ruta}
                  </span>
                ) : (
                  <motion.span
                    animate={
                      active
                        ? { scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.6 }}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#10b981]/20 border border-[#10b981]/50 px-2.5 py-1 font-clean text-xs font-extrabold uppercase text-[#10b981]"
                  >
                    FIN
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

