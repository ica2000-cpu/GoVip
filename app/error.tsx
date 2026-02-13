'use client';

import { useEffect } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111] border border-gray-800 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Algo salió mal</h2>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          No pudimos cargar la información solicitada. Puede ser un problema temporal de conexión.
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-lg font-bold transition-colors w-full justify-center"
        >
          <RefreshCcw size={18} />
          Intentar nuevamente
        </button>
        
        {error.digest && (
          <p className="mt-6 text-xs text-gray-600 font-mono">
            Código de error: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
