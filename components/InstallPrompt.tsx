'use client'

import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS prompt if not standalone and is iOS
    if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
       // Wait a bit before showing to not annoy immediately
       setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in-up">
      <div className="bg-[#111] border border-gray-800 rounded-xl p-4 shadow-2xl flex flex-col gap-3 max-w-md mx-auto relative">
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 text-gray-500 hover:text-white p-1"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-900 rounded-xl flex items-center justify-center shadow-lg">
                <img src="/icons/icon-192x192.png" alt="App Icon" className="w-full h-full object-cover rounded-xl" onError={(e) => (e.currentTarget.src = '/logo-govip.png')} />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-white text-sm">Instalar GoVip</h3>
                <p className="text-xs text-gray-400">
                    {isIOS 
                        ? 'Instala la app para una mejor experiencia' 
                        : 'Añade la app a tu inicio para reservar más rápido'
                    }
                </p>
            </div>
        </div>

        {isIOS ? (
            <div className="bg-gray-900/50 rounded-lg p-3 text-xs text-gray-300 border border-gray-800">
                <p className="flex items-center gap-2 mb-1">
                    1. Toca el botón <Share size={14} className="text-blue-400" /> <strong>Compartir</strong>
                </p>
                <p className="flex items-center gap-2">
                    2. Selecciona <span className="font-bold border border-gray-600 rounded px-1">+ Agregar a Inicio</span>
                </p>
            </div>
        ) : (
            <button 
                onClick={handleInstallClick}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
                <Download size={18} />
                Instalar Aplicación
            </button>
        )}
      </div>
    </div>
  );
}
