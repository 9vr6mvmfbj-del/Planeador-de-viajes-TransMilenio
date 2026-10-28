import React, { useState } from 'react';
import { User, Lock, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TransmiActionButton,
  AnimatedBogotaOfficialLogo,
  AnimatedTransMilenioOfficialLogo,
} from './TransmiVisualAssets';
import regeneratedImg1 from '../assets/images/regenerated_image_1793015788815.png';

interface OperatorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
  inlineMode?: boolean;
}

export const OperatorLoginModal: React.FC<OperatorLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  inlineMode = false,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('transmi2026');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const u = username.trim().toLowerCase();
    const p = password.trim();
    if (!u || !p) {
      setError('Ingresa tu ID Funcionario y Llave Maestra.');
      return;
    }
    if ((u === 'admin' || u === 'operador' || u === 'control') && p.length >= 4) {
      setError(null);
      onLoginSuccess(username.trim().toUpperCase());
    } else {
      setError('Credenciales inválidas. Usa "admin" / "transmi2026".');
    }
  };

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className="relative z-10 mx-auto w-full max-w-[430px] rounded-[28px] border border-white/[0.08] bg-[#111112] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-center"
    >
      {/* Brand Header con el Logo Oficial de Bogotá + Logo PNG TransMilenio + TransMilenio */}
      <div className="mb-5 text-center flex flex-col items-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <AnimatedBogotaOfficialLogo
            className="h-8 sm:h-9 w-auto"
            replayKey="login-bogota-logo"
          />
          <span className="h-6 w-[1.5px] bg-white/15" />
          <AnimatedTransMilenioOfficialLogo
            className="h-7 sm:h-8 w-auto"
            replayKey="login-tm-logo"
          />
          <span className="font-clean text-sm font-extrabold tracking-[0.12em] text-white">
            TransMilenio
          </span>
        </div>
        <h2
          id="admin-login-title"
          className="display mt-1 text-2xl sm:text-[1.75rem] font-extrabold uppercase leading-none text-white"
        >
          Admin Login
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="operator-user"
            className="label-mono block text-center sm:text-left"
          >
            ID Funcionario
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
            <input
              id="operator-user"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="Usuario administrador"
              className="h-[50px] w-full rounded-[14px] border border-white/[0.08] bg-black pl-12 pr-5 font-clean text-sm font-semibold text-white placeholder-white/35 outline-none transition-all focus:border-[#EF0014] focus:shadow-[0_0_0_4px_rgba(239,0,20,0.15)]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="operator-pass"
            className="label-mono block text-center sm:text-left"
          >
            Llave Maestra
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
            <input
              id="operator-pass"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Contraseña de operación"
              className="h-[50px] w-full rounded-[14px] border border-white/[0.08] bg-black pl-12 pr-5 font-clean text-sm font-semibold text-white placeholder-white/35 outline-none transition-all focus:border-[#EF0014] focus:shadow-[0_0_0_4px_rgba(239,0,20,0.15)]"
            />
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
          onClick={() => {
            setUsername('admin');
            setPassword('transmi2026');
            setError(null);
          }}
          title="Autocompletar credenciales de administrador"
          className="flex items-center justify-between rounded-[12px] border border-[#F7B500]/25 bg-[#F7B500]/[0.06] px-4 py-2.5 text-left font-mono text-xs text-white/90 transition-colors hover:border-[#F7B500]/50 cursor-pointer"
        >
          <span className="pointer-events-none">
            <strong className="font-bold text-white">admin</strong> /{' '}
            <strong className="font-bold text-white">transmi2026</strong>
          </span>
          <Info className="pointer-events-none h-[18px] w-[18px] shrink-0 text-[#F7B500]" />
        </motion.button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-[12px] border border-[#EF0014]/40 bg-[#EF0014]/10 px-4 py-2.5 font-mono text-xs text-red-200 text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-1">
          <TransmiActionButton
            type="submit"
            label="Iniciar Sesión"
            iconSrc={regeneratedImg1}
            onClick={() => handleSubmit()}
            className="w-full"
          />
        </div>

        <motion.button
          type="button"
          whileHover={{ x: 4, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 16 }}
          onClick={onClose}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 px-4 font-clean text-xs font-extrabold uppercase tracking-[0.06em] text-white/80 transition-colors hover:border-white/20 hover:text-white cursor-pointer"
        >
          <span className="pointer-events-none">Modo Pasajero</span>
          <ArrowRight className="pointer-events-none h-4 w-4 text-[#F7B500]" />
        </motion.button>
      </form>
    </motion.div>
  );

  if (inlineMode) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="operator-login-inline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex flex-1 min-h-[calc(100vh-175px)] w-full items-center justify-center py-4 px-4 overflow-hidden"
          >
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
              style={{
                background:
                  'radial-gradient(circle at 20% 30%, rgba(239, 0, 20, 0.12) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(247, 181, 0, 0.08) 0%, transparent 45%)',
              }}
            />
            {cardContent}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="operator-login-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-login-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[180] flex items-center justify-center bg-[#070708]/95 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
        >
          {cardContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
