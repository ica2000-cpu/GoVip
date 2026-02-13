import { Download, Share, Smartphone, Monitor, Check } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instalar GoVip App',
  description: 'Descarga e instala la aplicación oficial de GoVip en tu dispositivo.',
};

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-900 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-900/30">
                <img src="/icons/icon-192x192.png" alt="GoVip" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Instalar GoVip</h1>
            <p className="text-gray-400 text-lg">
                Obtén la mejor experiencia instalando la aplicación en tu dispositivo. Acceso rápido, notificaciones y funcionamiento offline.
            </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            {/* Android / Chrome */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-900/20 p-3 rounded-lg text-green-500">
                        <Smartphone size={24} />
                    </div>
                    <h2 className="text-xl font-bold">Android / Chrome</h2>
                </div>
                <ol className="space-y-4 text-sm text-gray-300">
                    <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">1</span>
                        <span>Espera a que aparezca el mensaje "Instalar GoVip" en la parte inferior.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">2</span>
                        <span>Si no aparece, toca el menú de tres puntos <span className="inline-block border border-gray-600 px-1 rounded">⋮</span> en tu navegador.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">3</span>
                        <span>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
                    </li>
                </ol>
            </div>

            {/* iOS / Safari */}
            <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gray-800 p-3 rounded-lg text-gray-300">
                        <span className="text-2xl leading-none font-bold"></span>
                    </div>
                    <h2 className="text-xl font-bold">iOS (iPhone/iPad)</h2>
                </div>
                <ol className="space-y-4 text-sm text-gray-300">
                    <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">1</span>
                        <span>Abre esta página en <strong>Safari</strong>.</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">2</span>
                        <span className="flex items-center flex-wrap gap-1">
                            Toca el botón <Share size={14} className="text-blue-400" /> <strong>Compartir</strong> en la barra inferior.
                        </span>
                    </li>
                    <li className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">3</span>
                        <span>Desliza hacia arriba y selecciona <strong>"Agregar al Inicio"</strong>.</span>
                    </li>
                </ol>
            </div>

             {/* Desktop */}
             <div className="bg-[#111] border border-gray-800 rounded-xl p-6 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-900/20 p-3 rounded-lg text-blue-500">
                        <Monitor size={24} />
                    </div>
                    <h2 className="text-xl font-bold">PC / Mac</h2>
                </div>
                <p className="text-gray-400 mb-4 text-sm">
                    Puedes instalar GoVip como una aplicación de escritorio desde Chrome o Edge.
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                    <Download size={16} />
                    <span>Busca el icono de instalación <span className="inline-block border border-gray-600 px-1 rounded mx-1"><Download size={10} className="inline" /></span> en la barra de direcciones del navegador.</span>
                </div>
            </div>
        </div>

        <div className="mt-12 text-center">
            <a href="/" className="inline-block bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors">
                Ir al Inicio
            </a>
        </div>
      </div>
    </div>
  );
}
