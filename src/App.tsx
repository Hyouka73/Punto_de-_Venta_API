import React from 'react';

export const App: React.FC = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-paleteria-bg">
      <div className="w-full max-w-md rounded-counter bg-white p-6 shadow-xl border border-amber-100 text-center">
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">
          POS Paletería v2
        </h1>
        <p className="mt-2 text-sm font-medium text-stone-500">
          Cimientos inicializados — Vite + React 19 + Tailwind CSS + Vitest
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-touch p-4 bg-paleteria-agua text-white font-bold shadow-sm">
            Agua $15
          </div>
          <div className="rounded-touch p-4 bg-paleteria-crema text-stone-900 font-bold shadow-sm">
            Crema $20
          </div>
          <div className="rounded-touch p-4 bg-paleteria-sandwich text-white font-bold shadow-sm">
            Sándwich $25
          </div>
          <div className="rounded-touch p-4 bg-paleteria-nieve text-white font-bold shadow-sm">
            Nieve $18
          </div>
        </div>
      </div>
    </main>
  );
};

export default App;
