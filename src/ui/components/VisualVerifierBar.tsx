import React, { useState } from 'react';
import {
  Eye,
  ChevronDown,
  Layers,
} from 'lucide-react';

export type ScreenId =
  | 'mostrador'
  | 'apertura'
  | 'cierre'
  | 'merma'
  | 'entrada'
  | 'panel'
  | 'sync'
  | 'config'
  | 'laboratorio';

interface VisualVerifierBarProps {
  currentView: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

const SCREENS: readonly { id: ScreenId; label: string; icon: string }[] = [
  { id: 'mostrador', label: 'Mostrador', icon: '🍦' },
  { id: 'apertura', label: 'Apertura', icon: '🔓' },
  { id: 'cierre', label: 'Cierre', icon: '🔒' },
  { id: 'merma', label: 'Merma', icon: '🗑️' },
  { id: 'entrada', label: 'Entrada', icon: '📦' },
  { id: 'panel', label: 'Panel', icon: '📊' },
  { id: 'sync', label: 'Sync & Red', icon: '☁️' },
  { id: 'config', label: 'Config', icon: '⚙️' },
  { id: 'laboratorio', label: 'Lab DEV', icon: '🔬' },
];

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNER_CLASS: Record<Corner, string> = {
  tl: 'top-1 left-1',
  tr: 'top-1 right-1',
  bl: 'bottom-1 left-1',
  br: 'bottom-1 right-1',
};
const CORNER_ORDER: Corner[] = ['tr', 'br', 'bl', 'tl'];
const CORNER_KEY = 'pos_verifier_corner';

export const VisualVerifierBar: React.FC<VisualVerifierBarProps> = ({
  currentView,
  onSelectScreen,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [corner, setCorner] = useState<Corner>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(CORNER_KEY) : null;
    return (CORNER_ORDER as string[]).includes(saved ?? '') ? (saved as Corner) : 'tr';
  });

  // UR9: oculto automáticamente al capturar (?capture=1) y fuera de DEV
  const capture =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('capture') === '1';
  if (capture || !import.meta.env.DEV) return null;

  const moveCorner = () => {
    const next: Corner = CORNER_ORDER[(CORNER_ORDER.indexOf(corner) + 1) % CORNER_ORDER.length] ?? 'tr';
    setCorner(next);
    window.localStorage.setItem(CORNER_KEY, next);
  };

  return (
    <div className={`fixed ${CORNER_CLASS[corner]} z-50 print:hidden select-none`}>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-stone-900/90 hover:bg-stone-900 text-white px-3.5 py-2 text-xs font-bold shadow-xl backdrop-blur-md border border-stone-700/50 active:scale-95 transition-all"
          title="Abrir Selector de Verificación Visual"
        >
          <Eye className="h-3.5 w-3.5 text-amber-400" />
          <span>Verificador Visual</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
        </button>
      ) : (
        <div className="w-80 rounded-2xl bg-stone-900/95 text-white p-3 shadow-2xl backdrop-blur-md border border-stone-700/70 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wide">
              <Layers className="h-3.5 w-3.5" />
              <span>Inspector de Pantallas (9)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[10px] text-stone-400 leading-tight">
            Navega directamente a cualquier pantalla para auditar su diseño y estado visual:
          </p>

          {/* Grid de Pantallas */}
          <div className="grid grid-cols-3 gap-1.5">
            {SCREENS.map((s) => {
              const isActive = currentView === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelectScreen(s.id);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 font-black shadow-md scale-105'
                      : 'bg-stone-800/80 hover:bg-stone-750 text-stone-200 hover:text-white font-medium'
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="text-[10px] leading-tight mt-0.5 truncate w-full">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer Informativo */}
          <div className="flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-800/80 pt-1.5 px-0.5">
            <span>
              Activa: <strong className="text-white capitalize">{currentView}</strong>
            </span>
            <button
              type="button"
              onClick={moveCorner}
              className="text-amber-400 hover:underline font-bold"
            >
              Mover ↻
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-amber-400 hover:underline font-bold"
            >
              Cerrar panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
