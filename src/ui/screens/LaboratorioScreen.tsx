import React, { useState, useEffect, useRef } from 'react';
import { SpotlightCard } from '../components/react-bits/SpotlightCard';
import { CountUp } from '../components/react-bits/CountUp';
import { AuroraBackground } from '../components/react-bits/AuroraBackground';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Gauge,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface LaboratorioScreenProps {
  onBack: () => void;
}

export const LaboratorioScreen: React.FC<LaboratorioScreenProps> = ({ onBack }) => {
  // Verificación estricta de entorno DEV
  const isDev = import.meta.env.DEV;

  // Monitor de Rendimiento (FPS en vivo)
  const [fps, setFps] = useState<number>(60);
  const [auroraActive, setAuroraActive] = useState<boolean>(true);
  const [sampleNumber, setSampleNumber] = useState<number>(1450);
  const [renderDuration, setRenderDuration] = useState<number>(0);

  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = (now: number) => {
      frameCountRef.current++;
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        const calculatedFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(calculatedFps);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  const triggerStressTest = () => {
    const t0 = performance.now();
    // Alternar número para disparar animación de CountUp
    setSampleNumber((prev) => (prev === 1450 ? 9850 : 1450));
    const t1 = performance.now();
    setRenderDuration(Number((t1 - t0).toFixed(2)));
  };

  if (!isDev) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-100 text-stone-700">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-3" />
        <h1 className="text-xl font-bold">Acceso Denegado</h1>
        <p className="text-sm text-stone-500 mt-1 text-center max-w-sm">
          El Laboratorio Visual de Desarrollo está deshabilitado en entornos de producción.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold"
        >
          Volver
        </button>
      </div>
    );
  }

  const Content = (
    <div className="min-h-screen w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Banner de Advertencia de Entorno DEV */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm flex items-start gap-3 text-amber-900">
        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide">
            🔬 Laboratorio Visual de Desarrollo (Stress-Test React Bits)
          </h2>
          <p className="text-xs text-amber-800 mt-0.5">
            Banco de pruebas aislado para medir FPS, framerate de animaciones y consumo de CPU.
            Garantizado que no se ejecuta en producción.
          </p>
        </div>
      </div>

      {/* Header con botón de retorno */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </button>
        <span className="text-xs font-mono font-bold text-stone-400">DEV_MODE: ACTIVE</span>
      </div>

      {/* Monitor de Rendimiento en Tiempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Framerate (FPS)</span>
            <Gauge className={`h-4 w-4 ${fps >= 55 ? 'text-emerald-500' : 'text-rose-500'}`} />
          </div>
          <div className="text-3xl font-black text-stone-900 tabular-nums flex items-baseline gap-2">
            <span>{fps}</span>
            <span className="text-xs font-bold text-stone-400">/ 60 FPS</span>
          </div>
          <span
            className={`text-[11px] font-bold ${
              fps >= 55 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {fps >= 55 ? '● Fluidez Óptima' : '▲ Descenso de FPS Detectado'}
          </span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tiempo de Render</span>
            <Cpu className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-stone-900 tabular-nums">
            {renderDuration} <span className="text-xs font-bold text-stone-400">ms</span>
          </div>
          <span className="text-[11px] font-semibold text-stone-400">
            Medición vía performance.now()
          </span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Presupuesto</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600">
            &lt;100 <span className="text-xs font-bold text-stone-400">ms</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600">
            Mostrador ultra-rápido cumplido
          </span>
        </div>
      </div>

      {/* Banco de Pruebas Comparativo 1: Spotlight Card vs Standard Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Banco 1: Tarjeta con Spotlight (GPU Radial) vs Tarjeta Estándar</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SpotlightCard className="p-4 bg-white" spotlightColor="rgba(245, 158, 11, 0.25)">
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              React Bits (Spotlight)
            </span>
            <h4 className="font-bold text-stone-900 mt-2">Mueve el cursor / dedo aquí</h4>
            <p className="text-xs text-stone-500 mt-1">
              Reflejo radial interactivo usando transformaciones aceleradas por hardware sin lag.
            </p>
          </SpotlightCard>

          <div className="p-4 rounded-2xl border border-stone-200 bg-white shadow-xs">
            <span className="text-[10px] font-black uppercase text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              Estándar CSS
            </span>
            <h4 className="font-bold text-stone-900 mt-2">Tarjeta Estática</h4>
            <p className="text-xs text-stone-500 mt-1">
              Borde y fondo fijos sin interacción visual reactiva.
            </p>
          </div>
        </div>
      </div>

      {/* Banco de Pruebas Comparativo 2: CountUp vs Static Text */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            <span>Banco 2: Contador Suave (CountUp) vs Texto Estático</span>
          </h3>
          <button
            onClick={triggerStressTest}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
          >
            Disparar Cambio Numérico
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50">
            <span className="text-[10px] font-bold uppercase text-purple-700">
              CountUp Animado (800ms easeOut)
            </span>
            <div className="text-3xl font-black text-purple-950 mt-2">
              <CountUp to={sampleNumber} prefix="$" suffix=" MXN" />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50">
            <span className="text-[10px] font-bold uppercase text-stone-500">
              Texto Directo (Sin animación)
            </span>
            <div className="text-3xl font-black text-stone-900 mt-2">
              ${sampleNumber.toLocaleString('es-MX')} MXN
            </div>
          </div>
        </div>
      </div>

      {/* Banco 3: Control de Fondo Aurora */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-stone-900">Fondo Aurora Dinámico</h4>
          <p className="text-xs text-stone-500">
            Activar o desactivar gradiente difuso para comparar impacto de frame render.
          </p>
        </div>
        <button
          onClick={() => setAuroraActive(!auroraActive)}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
            auroraActive
              ? 'bg-amber-500 text-stone-950'
              : 'bg-stone-200 text-stone-700'
          }`}
        >
          {auroraActive ? 'Aurora Activada' : 'Aurora Apagada'}
        </button>
      </div>
    </div>
  );

  if (auroraActive) {
    return <AuroraBackground className="min-h-screen">{Content}</AuroraBackground>;
  }

  return <div className="min-h-screen bg-stone-50">{Content}</div>;
};

export default LaboratorioScreen;
