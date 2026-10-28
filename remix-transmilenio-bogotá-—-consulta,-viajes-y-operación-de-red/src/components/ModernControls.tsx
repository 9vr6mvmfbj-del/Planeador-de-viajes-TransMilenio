import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Check,
  Minus,
  Plus,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badgeText?: string;
  badgeColor?: string;
}

interface ModernSelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (newValue: string) => void;
  placeholder?: string;
  searchable?: boolean;
  id?: string;
  leftIcon?: React.ReactNode;
}

export function getCurrentRealTimeHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const ModernSelect: React.FC<ModernSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar...',
  searchable = true,
  id,
  leftIcon,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || options[0],
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toUpperCase().includes(q) ||
        o.value.toUpperCase().includes(q) ||
        (o.sublabel && o.sublabel.toUpperCase().includes(q)) ||
        (o.badgeText && o.badgeText.toUpperCase().includes(q))
    );
  }, [options, search]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center gap-2.5 ${open ? 'z-[140]' : 'z-10'}`}
    >
      {leftIcon && (
        <motion.div
          whileHover={{ scale: 1.1, rotate: 4 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
          onClick={() => {
            setOpen((prev) => !prev);
            setSearch('');
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#111113] text-white shadow-md cursor-pointer hover:border-[#EF0014]/60 transition-colors"
        >
          {leftIcon}
        </motion.div>
      )}

      <div className="relative flex-1 min-w-0">
        {/* TODA LA CAJA ES UN BOTÓN CLICABLE AL 100%, INCLUYENDO ESQUINAS Y BORDES */}
        <motion.button
          id={id}
          type="button"
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          aria-expanded={open}
          onClick={() => {
            setOpen((prev) => !prev);
            setSearch('');
          }}
          className={`flex w-full flex-col justify-center rounded-2xl border bg-black px-4 py-3 text-left transition-colors cursor-pointer select-none focus:outline-none ${
            open
              ? 'border-[#EF0014] shadow-[0_0_24px_rgba(239,0,20,0.25)]'
              : 'border-white/[0.08] hover:border-white/25'
          }`}
        >
          {label && (
            <span className="label-mono pointer-events-none block">
              {label}
            </span>
          )}

          <span className="pointer-events-none flex w-full items-center justify-between gap-2 text-sm font-extrabold text-white">
            <span className="flex items-center gap-2.5 min-w-0">
              {selectedOption?.badgeText && (
                <motion.span
                  key={selectedOption.value}
                  initial={{ scale: 0.7, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                  className="inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-md px-1.5 font-clean text-xs font-extrabold uppercase text-white shadow-sm"
                  style={{
                    backgroundColor: selectedOption.badgeColor || '#EF0014',
                  }}
                >
                  {selectedOption.badgeText}
                </motion.span>
              )}
              <span className="truncate font-clean text-xs sm:text-sm font-extrabold tracking-wide text-white">
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            </span>

            <motion.span
              animate={{ rotate: open ? 180 : 0, scale: open ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="shrink-0 text-[#F7B500]"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </span>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="absolute left-0 right-0 top-full z-[160] mt-2 overflow-hidden rounded-2xl border border-white/15 bg-[#111112] shadow-[0_25px_70px_rgba(0,0,0,0.95)]"
            >
              {searchable && options.length > 5 && (
                <div className="border-b border-white/[0.08] p-2.5 bg-black/70">
                  <div className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/40" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Filtrar estación o ruta..."
                      className="w-full rounded-xl border border-white/10 bg-[#111112] py-1.5 pl-8 pr-3 font-clean text-xs font-bold text-white placeholder-white/40 focus:border-[#EF0014] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                {filteredOptions.length === 0 ? (
                  <div className="py-4 text-center font-mono text-xs text-white/40">
                    No se encontraron coincidencias
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const active = opt.value === value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(opt.value);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#EF0014]/20 text-white font-bold border border-[#EF0014]/40'
                            : 'text-white/85 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        <div className="pointer-events-none flex items-center gap-2.5 min-w-0">
                          {opt.badgeText && (
                            <span
                              className="inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center rounded px-1.5 font-clean text-[10px] font-extrabold uppercase text-white"
                              style={{
                                backgroundColor: opt.badgeColor || '#EF0014',
                              }}
                            >
                              {opt.badgeText}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-clean font-extrabold text-white">
                              {opt.label}
                            </div>
                            {opt.sublabel && (
                              <div className="truncate text-[10px] text-white/45">
                                {opt.sublabel}
                              </div>
                            )}
                          </div>
                        </div>
                        {active && (
                          <Check className="pointer-events-none h-3.5 w-3.5 shrink-0 text-[#F7B500]" />
                        )}
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface ModernNumberInputProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (val: number) => void;
  id?: string;
}

export const ModernNumberInput: React.FC<ModernNumberInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  id,
}) => {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="label-mono" style={{ marginBottom: 0 }}>
          {label}
        </label>
      )}
      <div className="flex h-[48px] items-center justify-between rounded-xl border border-white/[0.08] bg-black px-1.5">
        <motion.button
          type="button"
          whileHover={{ scale: 1.06, backgroundColor: 'rgba(239, 0, 20, 0.28)' }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
          aria-label="Disminuir valor"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white transition-colors hover:bg-[#EF0014] hover:text-white disabled:opacity-25 cursor-pointer"
        >
          <Minus className="pointer-events-none h-4 w-4" />
        </motion.button>

        <div className="flex items-center gap-1.5">
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) onChange(clamp(parsed));
            }}
            className="w-12 bg-transparent text-center font-mono text-base font-extrabold text-white focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {suffix && (
            <span className="font-mono text-[11px] font-bold uppercase text-white/55">
              {suffix}
            </span>
          )}
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.06, backgroundColor: 'rgba(239, 0, 20, 0.28)' }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
          aria-label="Aumentar valor"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white transition-colors hover:bg-[#EF0014] hover:text-white disabled:opacity-25 cursor-pointer"
        >
          <Plus className="pointer-events-none h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
};

interface ModernTimeSelectorProps {
  label?: string;
  value: string; // HH:MM
  onChange: (val: string) => void;
}

const FIXED_PRESET_TIMES = ['06:00', '07:15', '12:30', '17:45', '21:00'];

export const ModernTimeSelector: React.FC<ModernTimeSelectorProps> = ({
  label,
  value,
  onChange,
}) => {
  const [realTimeStr, setRealTimeStr] = useState<string>(() =>
    getCurrentRealTimeHHMM()
  );
  const [textInput, setTextInput] = useState<string>(value);

  useEffect(() => {
    setTextInput(value);
  }, [value]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRealTimeStr(getCurrentRealTimeHHMM());
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const parts = value.split(':');
  const currentH = Math.max(
    0,
    Math.min(23, parseInt(parts[0] || '7', 10) || 0)
  );
  const currentM = Math.max(
    0,
    Math.min(59, parseInt(parts[1] || '15', 10) || 0)
  );

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  // Pasos de 5 en 5 minutos
  const adjustMinutes = (delta: number) => {
    let total = currentH * 60 + currentM + delta;
    if (total < 0) total = 24 * 60 + total;
    total = total % (24 * 60);
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    const formatted = formatTime(nh, nm);
    setTextInput(formatted);
    onChange(formatted);
  };

  const commitTextTime = (raw: string) => {
    const cleaned = raw.trim().replace(/[^0-9:]/g, '');
    if (!cleaned) {
      setTextInput(formatTime(currentH, currentM));
      return;
    }
    let h = currentH;
    let m = currentM;
    if (cleaned.includes(':')) {
      const [hStr, mStr] = cleaned.split(':');
      const parsedH = parseInt(hStr || '0', 10);
      const parsedM = parseInt(mStr || '0', 10);
      if (!Number.isNaN(parsedH)) h = Math.max(0, Math.min(23, parsedH));
      if (!Number.isNaN(parsedM)) m = Math.max(0, Math.min(59, parsedM));
    } else if (cleaned.length <= 2) {
      const parsedH = parseInt(cleaned, 10);
      if (!Number.isNaN(parsedH)) h = Math.max(0, Math.min(23, parsedH));
      m = 0;
    } else {
      const padded = cleaned.padStart(4, '0').slice(0, 4);
      const parsedH = parseInt(padded.slice(0, 2), 10);
      const parsedM = parseInt(padded.slice(2, 4), 10);
      if (!Number.isNaN(parsedH)) h = Math.max(0, Math.min(23, parsedH));
      if (!Number.isNaN(parsedM)) m = Math.max(0, Math.min(59, parsedM));
    }
    const finalStr = formatTime(h, m);
    setTextInput(finalStr);
    onChange(finalStr);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="label-mono" style={{ marginBottom: 0 }}>
          {label}
        </span>
      )}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black px-3 py-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#F7B500]" />
          <span className="font-mono text-xs text-white/60 uppercase font-bold">
            Hora:
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            type="button"
            whileHover={{
              scale: 1.08,
              backgroundColor: 'rgba(239, 0, 20, 0.28)',
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 18 }}
            onClick={() => adjustMinutes(-5)}
            className="rounded-lg bg-white/[0.08] px-3 py-1.5 font-mono text-xs font-extrabold text-white hover:text-white cursor-pointer"
          >
            -5m
          </motion.button>

          <input
            type="text"
            aria-label="Escribir hora en formato HH:MM"
            value={textInput}
            onChange={(e) => {
              const val = e.target.value;
              setTextInput(val);
              if (/^\d{2}:\d{2}$/.test(val.trim())) {
                commitTextTime(val);
              }
            }}
            onBlur={() => commitTextTime(textInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitTextTime(textInput);
              }
            }}
            placeholder="HH:MM"
            className="w-[78px] rounded-lg border border-white/15 bg-[#111112] px-2.5 py-1 text-center font-mono text-sm font-extrabold text-[#F7B500] tabular-nums focus:border-[#EF0014] focus:outline-none"
          />

          <motion.button
            type="button"
            whileHover={{
              scale: 1.08,
              backgroundColor: 'rgba(239, 0, 20, 0.28)',
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 18 }}
            onClick={() => adjustMinutes(5)}
            className="rounded-lg bg-white/[0.08] px-3 py-1.5 font-mono text-xs font-extrabold text-white hover:text-white cursor-pointer"
          >
            +5m
          </motion.button>
        </div>
      </div>

      {/* Presets rápidos de horas: Primero la hora en tiempo real y luego las horas clave */}
      <div className="flex flex-wrap items-center gap-1.5">
        <motion.button
          type="button"
          whileHover={{ scale: 1.06, y: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 340, damping: 16 }}
          onClick={() => {
            const nowStr = getCurrentRealTimeHHMM();
            setRealTimeStr(nowStr);
            setTextInput(nowStr);
            onChange(nowStr);
          }}
          title="Usar hora actual en tiempo real"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-[11px] font-extrabold transition-colors cursor-pointer ${
            value === realTimeStr
              ? 'bg-[#EF0014] text-white shadow-[0_4px_14px_rgba(239,0,20,0.4)]'
              : 'border border-[#F7B500]/40 bg-[#F7B500]/10 text-[#F7B500] hover:bg-[#F7B500]/20'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span>{realTimeStr}</span>
        </motion.button>

        {FIXED_PRESET_TIMES.filter((t) => t !== realTimeStr).map((t) => {
          const active = value === t;
          return (
            <motion.button
              key={t}
              type="button"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 340, damping: 16 }}
              onClick={() => {
                setTextInput(t);
                onChange(t);
              }}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#EF0014] text-white shadow-[0_4px_14px_rgba(239,0,20,0.4)]'
                  : 'bg-white/[0.05] text-white/75 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              {t}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
