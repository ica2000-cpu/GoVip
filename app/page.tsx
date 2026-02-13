import { supabase } from '@/lib/supabase';
import { Star } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function Home() {
  // Fetch all commerces, prioritized by es_destacado
  const { data: commerces, error } = await supabase
    .from('comercios')
    .select('*')
    .order('es_destacado', { ascending: false })
    .order('created_at', { ascending: false });

  const safeCommerces = commerces || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-gray-900 to-black py-24 px-4 overflow-hidden border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 px-4 py-1.5 rounded-full mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium text-blue-300 tracking-wide uppercase">Plataforma Oficial</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
            GoVip
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Descubre y reserva tus entradas para los mejores eventos, conciertos y experiencias exclusivas.
          </p>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600 rounded-full blur-[128px]"></div>
            <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-600 rounded-full blur-[128px]"></div>
        </div>
      </div>

      {/* Commerces Grid */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-10">
            <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Nuestros Clientes</h2>
        </div>

        {safeCommerces.length === 0 ? (
            <div className="text-center py-20 bg-[#111] rounded-2xl border border-gray-800">
                <p className="text-gray-500 text-lg">Próximamente...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {safeCommerces.map((commerce) => (
                    <Link 
                        key={commerce.id} 
                        href={`/${commerce.slug}`}
                        className="group relative bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-blue-600/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col items-center text-center overflow-hidden"
                    >
                        {/* Featured Badge */}
                        {commerce.es_destacado && (
                            <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20 flex items-center gap-1 shadow-sm">
                                <Star size={12} fill="currentColor" />
                                <span>DESTACADO</span>
                            </div>
                        )}

                        <div className="mb-6 relative">
                            {commerce.logo_url ? (
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700 group-hover:border-blue-500 transition-colors bg-black shadow-xl">
                                    <img src={commerce.logo_url} alt={commerce.nombre} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-2xl font-bold text-gray-500 border-2 border-gray-700 group-hover:border-blue-500 transition-colors">
                                    {commerce.nombre.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                            {commerce.nombre}
                        </h3>
                        
                        <p className="text-sm text-gray-500 mb-6 font-mono">
                            govip.com/{commerce.slug}
                        </p>

                        <div className="w-full mt-auto">
                            <span className="block w-full py-3 bg-gray-900 text-gray-300 rounded-lg text-sm font-medium group-hover:bg-blue-600 group-hover:text-white transition-all">
                                Ver Cartelera
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </main>

      <footer className="border-t border-gray-800 bg-[#050505] py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} GoVip. Plataforma de Gestión de Eventos.
            </p>
        </div>
      </footer>
    </div>
  );
}
